// ─── QR Code API route ────────────────────────────────────────────────────────
// GET /api/qr?url=<encoded-url>&size=<px>&dark=<hex>&light=<hex>
//
// Returns an SVG QR code for the given URL.
// - size:  pixel size (default 256, max 512)
// - dark:  foreground color hex without # (default 0f1117)
// - light: background color hex without # (default transparent → ffffff00)
//
// No auth required — URL is the public booking link, not sensitive.

import { NextRequest, NextResponse } from 'next/server'
import QRCode                        from 'qrcode'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl
  const url   = searchParams.get('url')
  const size  = Math.min(Number(searchParams.get('size') ?? 256), 512)
  const dark  = `#${(searchParams.get('dark')  ?? '0f1117').replace('#', '')}`
  const light = `#${(searchParams.get('light') ?? 'ffffff').replace('#', '')}`

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const svg = await QRCode.toString(url, {
      type:          'svg',
      width:         size,
      margin:        2,
      color: {
        dark,
        light,
      },
    })

    return new NextResponse(svg, {
      status:  200,
      headers: {
        'Content-Type':  'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'QR generation failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
