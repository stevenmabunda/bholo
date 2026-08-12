import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const alt = 'BHOLO — South African Football Banter';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const logoData = readFileSync(join(process.cwd(), 'public', 'bholo_logo.png'));
  const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

  const bgData = readFileSync(join(process.cwd(), 'public', 'og-stadium-bg.png'));
  const bgSrc = `data:image/png;base64,${bgData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
        }}
      >
        <img
          src={bgSrc}
          width={1200}
          height={630}
          style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundImage:
              'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.75) 55%, rgba(10,10,10,0.92) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingBottom: 70,
          }}
        >
          <img src={logoSrc} width={460} height={140} style={{ objectFit: 'contain' }} />
          <div
            style={{
              marginTop: 28,
              fontSize: 38,
              color: '#F5F5F5',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            South African Football Banter
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
