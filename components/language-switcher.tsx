'use client'

import { useI18n } from '@/lib/i18n/context'
import { Button } from './ui/button'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={locale === 'en' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocale('en')}
        className="min-w-[60px]"
      >
        EN
      </Button>
      <Button
        variant={locale === 'bg' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocale('bg')}
        className="min-w-[60px]"
      >
        BG
      </Button>
    </div>
  )
}

