import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'SkillJack — Turn YouTube videos into AI skills';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          padding: '60px 80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#e0c866',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textAlign: 'center',
            }}
          >
            SkillJack
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 400,
              color: '#ffffff',
              textAlign: 'center',
              lineHeight: 1.4,
              maxWidth: '800px',
              opacity: 0.9,
            }}
          >
            Turn any YouTube video into a Claude Code skill in 10 seconds
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: 18,
              color: '#ffffff',
              opacity: 0.5,
            }}
          >
            skilljacked.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
