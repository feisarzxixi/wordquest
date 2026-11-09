import { NextRequest, NextResponse } from 'next/server';

/**
 * 单词发音强缓存与跨域代理服务
 * 1. 抓取有道真人录音原声，注入 public 强缓存头 (max-age 1年)
 * 2. 突破浏览器 CORS 限制，使客户端能够直接拉取二进制 Blob 并置入客户端 IndexedDB / 内存离线缓存
 * 3. 弱网与离线环境下秒开发音，0延迟
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word')?.trim() || '';
  const type = searchParams.get('type') || '1'; // 1 = uk, 2 = us

  if (!word) {
    return new NextResponse('Word required', { status: 400 });
  }

  try {
    const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
    const res = await fetch(youdaoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      // 启用 Next.js 服务端缓存
      next: { revalidate: 86400 * 30 },
    });

    if (!res.ok) {
      return new NextResponse('Audio fetch failed', { status: res.status });
    }

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Error fetching audio', { status: 500 });
  }
}
