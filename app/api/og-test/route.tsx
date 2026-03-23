import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') || 'HELLO';
    
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: 'blue', color: 'white', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
          {text}
        </div>
      ),
      {
        width: 1280,
        height: 720,
      }
    );
  } catch (error) {
    return new Response('Failed', { status: 500 });
  }
}
