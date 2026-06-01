'use client'

import Script from 'next/script'

import { buildTawkToEmbedUrl } from '@/lib/tawk-to'

const tawkToEmbedUrl = buildTawkToEmbedUrl()

export function TawkToWidget() {
  if (!tawkToEmbedUrl) {
    return null
  }

  return (
    <Script
      id="tawk-to-widget"
      src={tawkToEmbedUrl}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  )
}
