import { NextResponse } from 'next/server';

/**
 * Web Share Target receiver.
 *
 * Android's share sheet POSTs multipart/form-data here (see manifest.ts's
 * share_target). A POST cannot render the composer directly, so this turns
 * the shared fields into a query string and 303s to the GET page that does.
 *
 * 303 rather than 307 on purpose: the browser must re-issue the request as a
 * GET, otherwise refreshing the composer would replay the share.
 */
function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);

  const title = form ? field(form, 'title') : '';
  const sharedText = form ? field(form, 'text') : '';
  const sharedUrl = form ? field(form, 'url') : '';

  // Some apps send the link in `text` and leave `url` empty; others send both.
  // Prefer the text, fall back to the title, and append the URL once.
  let body = sharedText || title;
  if (sharedUrl && !body.includes(sharedUrl)) {
    body = body ? `${body}\n${sharedUrl}` : sharedUrl;
  }

  const destination = new URL('/share', request.url);
  if (body) destination.searchParams.set('text', body);

  return NextResponse.redirect(destination, 303);
}
