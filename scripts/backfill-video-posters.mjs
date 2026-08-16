/**
 * One-off backfill: give existing video posts a poster frame.
 *
 * Videos uploaded before poster capture existed have no still image, so a
 * shared link has nothing to show — WhatsApp, Facebook and X cannot render an
 * mp4, and the in-app thumbnail is painted onto a canvas in the viewer's own
 * browser and never stored. Those posts fall back to the branded BHOLO card.
 *
 * This walks every video post missing a posterUrl, pulls a frame with ffmpeg,
 * uploads it beside the video and patches the post's media JSON — matching
 * exactly what the upload path now does for new posts.
 *
 * Needs the service_role key: the posters belong in each author's own storage
 * folder, and the owner-write policy would reject writing into someone else's.
 * service_role bypasses RLS, so this cannot run from the browser.
 *
 *   npm i            # if you haven't
 *   brew install ffmpeg
 *   # add SUPABASE_SERVICE_ROLE_KEY=... to .env.local
 *   node scripts/backfill-video-posters.mjs --dry-run
 *   node scripts/backfill-video-posters.mjs
 *
 * Safe to re-run: posts that already have a poster are skipped, and uploads
 * use upsert so a half-finished run just resumes.
 */

import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { config } from 'dotenv';

config({ path: '.env.local' });

const execFileAsync = promisify(execFile);

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'post-media';
const MAX_EDGE = 1280;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

if (!SUPABASE_URL) fail('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
if (!SERVICE_KEY) {
  fail(
    'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.\n' +
    '  Find it in Supabase → Project Settings → API → service_role.\n' +
    '  It bypasses RLS entirely — keep it out of git and out of any client code.'
  );
}

async function requireFfmpeg() {
  try {
    await execFileAsync('ffmpeg', ['-version']);
  } catch {
    fail('ffmpeg is not installed. Install it with:  brew install ffmpeg');
  }
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Turns a public storage URL back into its path inside the bucket, so the
 * poster lands in the same author folder as the video it came from.
 */
function storagePathFromPublicUrl(url) {
  const marker = `/${BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return decodeURIComponent(url.slice(at + marker.length).split('?')[0]);
}

/**
 * Grabs a single frame, scaled down so the JPEG stays small enough for
 * crawlers to actually fetch. Tries slightly into the clip first — the opening
 * frame is often black — then falls back to the very start for short videos.
 */
async function extractFrame(videoPath, outPath) {
  const run = (seek) =>
    execFileAsync('ffmpeg', [
      '-y',
      '-ss', String(seek),
      '-i', videoPath,
      '-frames:v', '1',
      '-vf', `scale='min(${MAX_EDGE},iw)':-2`,
      '-q:v', '3',
      outPath,
    ]);

  for (const seek of [0.5, 0]) {
    try {
      await run(seek);
      const frame = await readFile(outPath);
      if (frame.length > 0) return true;
    } catch {
      // Try the next seek point; a clip shorter than the offset yields nothing.
    }
  }
  return false;
}

async function main() {
  await requireFfmpeg();

  console.log(DRY_RUN ? '\nDRY RUN — nothing will be written.\n' : '\nBackfilling video posters.\n');

  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, author_id, author_handle, media')
    .not('media', 'is', null);

  if (error) fail(`Could not read posts: ${error.message}`);

  const targets = posts.filter((post) =>
    Array.isArray(post.media) &&
    post.media.some((m) => m?.type === 'video' && !m?.posterUrl && typeof m?.url === 'string')
  );

  console.log(`${posts.length} posts scanned, ${targets.length} needing a poster.\n`);
  if (!targets.length) return;

  const workDir = await mkdtemp(join(tmpdir(), 'bholo-posters-'));
  let done = 0;
  let skipped = 0;

  try {
    for (const post of targets) {
      const label = `${post.id.slice(0, 8)} @${post.author_handle}`;
      const media = [...post.media];
      let changed = false;

      for (let i = 0; i < media.length; i++) {
        const item = media[i];
        if (item?.type !== 'video' || item?.posterUrl || typeof item?.url !== 'string') continue;

        const videoPath = storagePathFromPublicUrl(item.url);
        if (!videoPath) {
          console.log(`  ⊘ ${label} — video is not in ${BUCKET}, skipping`);
          skipped++;
          continue;
        }

        const localVideo = join(workDir, `${post.id}-${i}.mp4`);
        const localPoster = join(workDir, `${post.id}-${i}.jpg`);

        const { data: blob, error: dlError } = await supabase.storage
          .from(BUCKET)
          .download(videoPath);
        if (dlError || !blob) {
          console.log(`  ⊘ ${label} — could not download video: ${dlError?.message ?? 'no data'}`);
          skipped++;
          continue;
        }
        await writeFile(localVideo, Buffer.from(await blob.arrayBuffer()));

        if (!(await extractFrame(localVideo, localPoster))) {
          console.log(`  ⊘ ${label} — ffmpeg could not decode a frame`);
          skipped++;
          continue;
        }

        const posterPath = `${videoPath}-poster.jpg`;
        const posterBytes = await readFile(localPoster);

        if (DRY_RUN) {
          console.log(`  · ${label} — would upload ${posterPath} (${Math.round(posterBytes.length / 1024)}KB)`);
          changed = true;
          continue;
        }

        const { error: upError } = await supabase.storage
          .from(BUCKET)
          .upload(posterPath, posterBytes, { contentType: 'image/jpeg', upsert: true });
        if (upError) {
          console.log(`  ⊘ ${label} — poster upload failed: ${upError.message}`);
          skipped++;
          continue;
        }

        const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(posterPath);
        media[i] = { ...item, posterUrl: publicUrl };
        changed = true;
        console.log(`  ✓ ${label} — ${Math.round(posterBytes.length / 1024)}KB`);
      }

      if (!changed || DRY_RUN) continue;

      const { error: updateError } = await supabase
        .from('posts')
        .update({ media })
        .eq('id', post.id);

      if (updateError) {
        console.log(`  ⊘ ${label} — poster stored but post update failed: ${updateError.message}`);
        skipped++;
        continue;
      }
      done++;
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  console.log(
    DRY_RUN
      ? '\nDry run complete. Re-run without --dry-run to apply.\n'
      : `\nDone. ${done} post(s) updated, ${skipped} skipped.\n`
  );
}

main().catch((err) => fail(err?.message ?? String(err)));
