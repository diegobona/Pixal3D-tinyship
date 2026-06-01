'use client'

import { SharedAppProvider } from '@libs/react-shared/providers/app-context'
import { NotifyHost } from '@/components/notify-host'
import { TawkToWidget } from '@/components/tawk-to-widget'
import { useTranslation } from '@/hooks/use-translation'

export function SharedAppWrapper({ children }: { children: React.ReactNode }) {
  const { t, locale } = useTranslation()
  return (
    <SharedAppProvider value={{ t, locale }}>
      <NotifyHost />
      <TawkToWidget />
      {children}
    </SharedAppProvider>
  )
}
