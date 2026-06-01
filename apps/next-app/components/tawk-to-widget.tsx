'use client'

import { useEffect } from 'react'

import { buildTawkToEmbedUrl } from '@/lib/tawk-to'

const tawkToEmbedUrl = buildTawkToEmbedUrl()

export function TawkToWidget() {
  useEffect(() => {
    if (!tawkToEmbedUrl || document.getElementById('tawk-to-widget')) {
      return
    }

    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    const script = document.createElement('script')
    script.id = 'tawk-to-widget'
    script.async = true
    script.src = tawkToEmbedUrl
    script.charset = 'UTF-8'

    const firstScript = document.getElementsByTagName('script')[0]
    firstScript?.parentNode?.insertBefore(script, firstScript)

    return () => {
      script.remove()
    }
  }, [])

  if (!tawkToEmbedUrl) {
    return null
  }

  return null
}
