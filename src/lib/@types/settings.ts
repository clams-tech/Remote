export type Settings = {
  language: Language
  fiatDenomination: FiatDenomination
  notifications: boolean
  tiles: Record<Tile, boolean>
  lavaLamp: boolean
}

export type Tile =
  | 'wallets'
  | 'payments'
  | 'utxos'
  | 'channels'
  | 'offers'
  | 'forwards'
  | 'settings'
  | 'plugins'

export type Language =
  | 'en'
  | 'en-AU'
  | 'en-US'
  | 'en-GB'
  | 'zh-CN'
  | 'es'
  | 'hi'
  | 'ar'
  | 'bn'
  | 'fr'
  | 'pt'
  | 'ru'
  | 'ja'
  | 'id'
  | 'de'
  | 'te'
  | 'tr'
  | 'ta'
  | 'ko'

export enum BitcoinDenomination {
  btc = 'btc',
  sats = 'sats',
  msats = 'msats'
}

// https://www.statista.com/statistics/1189498/share-of-global-payments-by-currency/
export enum FiatDenomination {
  'none' = 'none',
  'usd' = 'usd'
}

export type Denomination = BitcoinDenomination | FiatDenomination

export type BitcoinExchangeRates = Record<FiatDenomination, number>
