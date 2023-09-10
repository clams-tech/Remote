import i18n from 'sveltekit-i18n'
import parser from '@sveltekit-i18n/parser-default'
import lang from './lang.json'
import type { Config, Parser } from '@sveltekit-i18n/parser-default'

export interface Payload extends Parser.PayloadDefault {
  paymentType?: string
  paymentAction?: 'create' | 'fulfill'
  offerType?: string
  direction?: string
  status?: string
  feeType?: string
  max?: string
  min?: string
  tag?: string
  wallet?: string
  amount?: number
  request?: string
}

const config: Config<Payload> = {
  translations: {
    en: { lang }
  },
  loaders: [
    {
      locale: 'en',
      key: 'app',
      loader: async () => import('./en.json')
    }
  ],
  parser: parser()
}

export const {
  t: translate,
  locale,
  locales,
  loading,
  loadTranslations
} = new i18n<Parser.Params<Payload>>(config)
