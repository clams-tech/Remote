import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import type { DecodedInvoice, FormattedDecodedBolt11, Invoice } from './@types/invoices.js'
import { decode as bolt11Decoder } from 'light-bolt11-decoder'
import { log$, settings$ } from './streams.js'
import type { Offer } from './@types/offers.js'
import { BitcoinDenomination, FiatDenomination, type Denomination } from './@types/settings.js'
import { randomBytes, bytesToHex } from '@noble/hashes/utils'
import { BehaviorSubject } from 'rxjs'
import Big from 'big.js'
import { formatDistanceToNowStrict, formatRelative } from 'date-fns'
import type { ParsedNodeAddress } from './@types/util.js'

import type {
  DecodedBolt12Invoice,
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Offer,
  DecodedType
} from 'bolt12-decoder/@types/types.js'

/**Will strip the msat suffix from msat values if there */
export function formatMsat(val: string | number): string {
  if (!val) return '0'
  return typeof val === 'string' ? val.replace('msat', '') : val.toString()
}

/** return unix timestamp in seconds for now  */
export function nowSeconds() {
  return Math.round(Date.now() / 1000)
}

export function convertVersionNumber(version: string): number {
  const [withoutDash] = version.split('-')
  const withoutDots = withoutDash.replace('.', '')
  return Number(withoutDots)
}

export function decodeBolt11(bolt11: string): (FormattedDecodedBolt11 & { bolt11: string }) | null {
  // Remove prepended string if found
  if (bolt11.includes('lightning:')) {
    bolt11 = bolt11.replace('lightning:', '')
  }

  try {
    const { sections } = bolt11Decoder(bolt11) as DecodedInvoice

    const formatted = sections.reduce((acc, { name, value }) => {
      if (name && value) {
        acc[name] = value
      }

      return acc
    }, {} as FormattedDecodedBolt11)

    return { bolt11, ...formatted }
  } catch (error) {
    return null
  }
}

export function formatLog(type: 'INFO' | 'WARN' | 'ERROR', msg: string): string {
  return `[${type} - ${new Date().toLocaleTimeString()}]: ${msg}`
}

export const logger = {
  info: (msg: string) => log$.next(formatLog('INFO', msg)),
  warn: (msg: string) => log$.next(formatLog('WARN', msg)),
  error: (msg: string) => log$.next(formatLog('ERROR', msg))
}

export function decodedOfferTypeToOfferType(type: DecodedType): 'pay' | 'withdraw' {
  if (type === 'bolt12 invoice_request') {
    return 'withdraw'
  } else {
    return 'pay'
  }
}

export async function bolt12ToOffer(bolt12: string, offerId?: string): Promise<Offer> {
  const { default: decoder } = await import('bolt12-decoder')
  const decoded = decoder(bolt12)

  const {
    type,
    offer_currency,
    offer_amount,
    offer_description,
    offer_node_id,
    offer_issuer,
    offer_absolute_expiry,
    offer_quantity_max
  } = decoded

  const expiry = offer_absolute_expiry
  const description = offer_description
  const issuer = offer_issuer

  let denomination: BitcoinDenomination.msats | FiatDenomination
  let nodeId: string
  let quantityMax: number | undefined
  let amount: string
  let id = offerId || ''

  if (type === 'bolt12 invoice_request') {
    const { invreq_amount, invreq_payer_id, invreq_id } = decoded as DecodedBolt12InvoiceRequest
    denomination = BitcoinDenomination.msats
    amount = formatMsat(invreq_amount as string)
    nodeId = invreq_payer_id
    quantityMax = offer_quantity_max
    id = invreq_id
  } else {
    const { invreq_amount } = decoded as DecodedBolt12Invoice
    const { offer_id } = decoded as DecodedBolt12Offer
    denomination = (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats
    amount = formatMsat((offer_amount || invreq_amount) as string)
    nodeId = offer_node_id
    quantityMax = offer_quantity_max
    id = offer_id || id
  }

  return {
    id,
    bolt12,
    type: decodedOfferTypeToOfferType(type),
    expiry,
    description,
    issuer,
    denomination,
    amount,
    nodeId,
    quantityMax
  }
}

export function isBolt12Invoice(invoice: string): boolean {
  return invoice.toLowerCase().startsWith('lni')
}

// Used in background animation
export class Particle {
  x: number
  y: number
  d: number
  w: number
  h: number
  level: number

  constructor(x: number, y: number, d: number, level: number, w: number, h: number) {
    this.x = x
    this.y = y
    this.d = d
    this.h = h
    this.w = w
    this.level = level
  }

  respawn(): void {
    this.x = Math.random() * (this.w * 0.8) + 0.1 * this.w
    this.y = Math.random() * 30 + this.h - ((this.h - 100) * this.level) / 100 - 50 + 50
    this.d = Math.random() * 5 + 5
  }
}

export function routeRequiresSession(path: string): boolean {
  switch (path) {
    case '/welcome':
      return false
    default:
      return true
  }
}

export const encryptWithAES = (text: string, passphrase: string) => {
  return AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(encUtf8)
  return originalText
}

export function createRandomHex(length = 32) {
  return bytesToHex(randomBytes(length))
}

// Makes a BehaviourSubject compatible with Svelte stores
export class SvelteSubject<T> extends BehaviorSubject<T> {
  set: BehaviorSubject<T>['next']
  constructor(initialState: T) {
    super(initialState)
    this.set = super.next
  }
}

export function truncateValue(val: string, length = 9): string {
  return val.length <= length ? val : `${val.slice(0, length)}...${val.slice(-length)}`
}

export function supportsNotifications(): boolean {
  return 'Notification' in window
}

export function notificationsPermissionsGranted(): boolean {
  return Notification.permission === 'granted'
}

export function formatValueForDisplay({
  value,
  denomination,
  commas = false,
  input = false
}: {
  value: string | null
  denomination: Denomination
  commas?: boolean
  input?: boolean
}): string {
  if (!value) return ''
  if (value === 'any') return '0'

  switch (denomination) {
    case 'btc': {
      const formatted = value === '0' ? value : Big(value).round(8).toString()
      return commas ? formatWithCommas(formatted) : formatted
    }

    case 'sats':
    case 'msats': {
      const formatted = Big(value).toString()
      return commas ? formatWithCommas(formatted) : formatted
    }

    // fiat
    default: {
      let formatted

      // if live input don't round or format just yet
      if (input) {
        formatted = value
      } else if (String(value).includes('.')) {
        const rounded = Big(value).round(2).toString()
        const decimalIndex = rounded.indexOf('.')
        formatted =
          decimalIndex >= 1 && decimalIndex === rounded.length - 2 ? `${rounded}0` : rounded
      } else {
        formatted = value
      }

      return commas ? formatWithCommas(formatted) : formatted
    }
  }
}

export function isFiatDenomination(denomination: Denomination): boolean {
  switch (denomination) {
    case 'btc':
    case 'sats':
    case 'msats':
      return false
    default:
      return true
  }
}

export function formatWithCommas(val: string, commasAfterDecimal?: boolean) {
  if (commasAfterDecimal) {
    return val.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const parts = val.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')

  return parts.join('.')
}

export async function getClipboardPermissions(): Promise<boolean> {
  try {
    const name = 'clipboard-read' as PermissionName
    const { state } = await navigator.permissions.query({ name })

    return state === 'granted'
  } catch (error) {
    return false
  }
}

export async function readClipboardValue(): Promise<string | null> {
  try {
    const clipboardText = await navigator.clipboard.readText()
    return clipboardText || null
  } catch (error) {
    return null
  }
}

/**
 *
 * @returns boolean indicating if write was successful
 */
export async function writeClipboardValue(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    return false
  }
}

// Svelte action to use when wanting to do something when there is a click outside of element
export function clickOutside(element: HTMLElement, callbackFunction: () => void) {
  function onClick(event: MouseEvent) {
    if (!element.contains(event.target as HTMLElement)) {
      callbackFunction()
    }
  }

  document.body.addEventListener('click', onClick)

  return {
    update(newCallbackFunction: () => void) {
      callbackFunction = newCallbackFunction
    },
    destroy() {
      document.body.removeEventListener('click', onClick)
    }
  }
}

// https://github.com/date-fns/date-fns/blob/9bb51691f201c3ec05ab832acbc5d478f2e5c47a/docs/i18nLocales.md
const locales: Record<string, () => Promise<Locale>> = {
  'en-GB': () => import('date-fns/esm/locale/en-GB/index.js').then((mod) => mod.default), // British English
  'en-US': () => import('date-fns/esm/locale/en-US/index.js').then((mod) => mod.default), // American English
  'zh-CN': () => import('date-fns/esm/locale/zh-CN/index.js').then((mod) => mod.default), // Chinese (mainland)
  es: () => import('date-fns/esm/locale/es/index.js').then((mod) => mod.default), // Spanish
  hi: () => import('date-fns/esm/locale/hi/index.js').then((mod) => mod.default), // Hindi
  ar: () => import('date-fns/esm/locale/ar/index.js').then((mod) => mod.default), // Arabic
  bn: () => import('date-fns/esm/locale/bn/index.js').then((mod) => mod.default), // Bengali
  fr: () => import('date-fns/esm/locale/fr/index.js').then((mod) => mod.default), // French
  pt: () => import('date-fns/esm/locale/pt/index.js').then((mod) => mod.default), // Portuguese
  ru: () => import('date-fns/esm/locale/ru/index.js').then((mod) => mod.default), // Russian
  ja: () => import('date-fns/esm/locale/ja/index.js').then((mod) => mod.default), // Japanese
  id: () => import('date-fns/esm/locale/id/index.js').then((mod) => mod.default), // Indonesian
  de: () => import('date-fns/esm/locale/de/index.js').then((mod) => mod.default), // German
  te: () => import('date-fns/esm/locale/te/index.js').then((mod) => mod.default), // Telugu
  tr: () => import('date-fns/esm/locale/tr/index.js').then((mod) => mod.default), // Turkish
  ta: () => import('date-fns/esm/locale/ta/index.js').then((mod) => mod.default), // Tamil
  ko: () => import('date-fns/esm/locale/ko/index.js').then((mod) => mod.default) // Korean
}

export async function formatDate(date: number | string): Promise<string> {
  const { language } = settings$.value
  const locale = await (locales[language] || locales['en-GB'])()

  return formatRelative(new Date(date), new Date(), { locale })
}

export async function formatCountdown(options: { date: Date; language: string }): Promise<string> {
  const { date, language } = options

  const locale = await (locales[language] || locales['en-GB'])()

  return formatDistanceToNowStrict(date, { locale, addSuffix: true })
}

export function formatDestination(destination: string, type: Invoice['type']): string {
  switch (type) {
    case 'bolt11':
    case 'keysend':
      return truncateValue(destination)
    default:
      return destination
  }
}

export function parseNodeAddress(address: string): ParsedNodeAddress {
  const [publicKey, host] = address.split('@')
  const [ip, port] = host.split(':')

  return { publicKey, ip, port: port ? parseInt(port) : undefined }
}

export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const bolt11Regex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/
const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/

const domainRegex =
  /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/

export function validateParsedNodeAddress({ publicKey, ip, port }: ParsedNodeAddress): boolean {
  if (!publicKey || !ip) return false

  if (port && (port < 1 || port > 65535)) return false

  if (!publicKey.match(nodePublicKeyRegex)) return false

  if (!ip.match(ipRegex) && !ip.match(domainRegex) && ip !== 'localhost') return false

  return true
}

export function simpleDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const noop = () => {}

export const wait = (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time))
