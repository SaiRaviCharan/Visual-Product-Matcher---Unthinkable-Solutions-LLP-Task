import { NextResponse } from 'next/server';
import { normalizeImageUrl } from '@/lib/normalizeImageUrl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url');

  if (!target) {
    return NextResponse.json({ error: 'Missing url query parameter' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizeImageUrl(target));
  } catch {
    return NextResponse.json({ error: 'Invalid URL supplied' }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only http and https protocols are allowed' }, { status: 400 });
  }

  try {
    const upstreamHeaders = new Headers({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    });

    const attemptFetch = async (headers?: HeadersInit) =>
      fetch(parsedUrl.toString(), {
        redirect: 'follow',
        headers,
        cache: 'no-store',
      });

    const upstreamResponse = await attemptFetch(upstreamHeaders);

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return NextResponse.json({ error: 'Failed to fetch remote image' }, { status: upstreamResponse.status || 502 });
    }

    const headers = new Headers();
    const contentType = upstreamResponse.headers.get('content-type');
    const contentLength = upstreamResponse.headers.get('content-length');

    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    headers.set('Cache-Control', 'public, max-age=60');
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(upstreamResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Proxy request failed', error);
    return NextResponse.json({ error: 'Unexpected proxy failure' }, { status: 502 });
  }
}
