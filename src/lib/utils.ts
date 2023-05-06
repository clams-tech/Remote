import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import { randomBytes, bytesToHex } from '@noble/hashes/utils'
import Big from 'big.js'
import UAParser from 'ua-parser-js'
import { decode as bolt11Decoder } from 'light-bolt11-decoder'
import { formatDistanceToNowStrict, formatRelative, type Locale } from 'date-fns'
import { customNotifications$, log$ } from './streams'
import { get } from 'svelte/store'
import { translate } from './i18n/translations'
import { validate as isValidBitcoinAddress } from 'bitcoin-address-validation'
import { ALL_DATA_KEYS, API_URL, ENCRYPTED_DATA_KEYS } from './constants'
import type { BitcoinExchangeRates } from './@types/settings.js'
import type { ParsedNodeAddress } from './@types/nodes.js'
import { BitcoinDenomination, FiatDenomination, type Denomination } from './@types/settings.js'
import type { Offer } from './@types/offers.js'

import type {
  DecodedBolt12Invoice,
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Offer,
  DecodeResponse,
  ListfundsResponse,
  OfferCommon,
  OfferSummary
} from './backends'

import type {
  PaymentType,
  FormattedDecodedBolt11,
  Payment,
  DecodedInvoice,
  ParsedBitcoinString,
  ParsedBitcoinStringError,
  ParsedOnchainString
} from './@types/payments.js'
import { BehaviorSubject } from 'rxjs'
import { db, getSettings } from './db.js'
import type { Connection } from './@types/connections.js'

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

export const encryptWithAES = (text: string, passphrase: string) => {
  return AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(encUtf8)
  return originalText
}

export function getDataFromStorage(storageKey: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(storageKey)
  } catch (error) {
    logger.error('Could no get data from storage, access to local storage is blocked')
    return null
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

export async function formatDate(options: { date: string; language: string }): Promise<string> {
  const { date, language } = options
  const locale = await (locales[language] || locales['en-GB'])()

  return formatRelative(new Date(date), new Date(), { locale })
}

export async function formatCountdown(options: { date: Date; language: string }): Promise<string> {
  const { date, language } = options

  const locale = await (locales[language] || locales['en-GB'])()

  return formatDistanceToNowStrict(date, { locale, addSuffix: true })
}

export function formatDestination(destination: string, type: PaymentType): string {
  switch (type) {
    case 'bolt11':
    case 'keysend':
      return truncateValue(destination)
    default:
      return destination
  }
}

export const userAgent = typeof window !== 'undefined' ? new UAParser(navigator.userAgent) : null

// limited to offchain funds for the moment
export const calculateBalance = (funds: ListfundsResponse): string => {
  const offChain = funds.channels.reduce((total, channel) => {
    const { our_amount_msat } = channel

    if (!our_amount_msat) {
      logger.warn(JSON.stringify({ msg: 'no our_amount_msat value', channel }))
    }

    return total.add(formatMsat(our_amount_msat))
  }, Big('0'))

  // const onChain = funds.outputs.reduce((total, { amount_msat }) => total.add(amount_msat), Big('0'))

  // return offChain.add(onChain).toString()
  return offChain.toString()
}

export const sortPaymentsMostRecent = (payments: Payment[]): Payment[] =>
  payments.sort((a, b) => {
    return (
      new Date(b.completedAt || b.startedAt).getTime() -
      new Date(a.completedAt || a.startedAt).getTime()
    )
  })

/** Tries to get exchange rates from Coingecko first, if that fails then try Coinbase */
export async function getBitcoinExchangeRate(): Promise<BitcoinExchangeRates | null> {
  const { fiatDenomination } = await getSettings()

  try {
    const result = await fetch(`${API_URL}/exchange-rates?currency=${fiatDenomination}`).then(
      (res) => res.json()
    )
    return result
  } catch (error) {
    logger.warn(`Could not get exchange rate for currency: ${fiatDenomination} `)
    return null
  }
}

export const noop = () => {}

export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  )
}

export function parseNodeAddress(address: string): ParsedNodeAddress {
  const [publicKey, host] = address.split('@')
  const [ip, port] = host.split(':')

  return { publicKey, ip, port: port ? parseInt(port) : undefined }
}

export function validateParsedNodeAddress({ publicKey, ip, port }: ParsedNodeAddress): boolean {
  if (!publicKey || !ip) return false

  if (port && (port < 1 || port > 65535)) return false

  if (!publicKey.match(nodePublicKeyRegex)) return false

  if (!ip.match(ipRegex) && !ip.match(domainRegex) && ip !== 'localhost') return false

  return true
}

export function encryptAllData(pin: string) {
  try {
    ENCRYPTED_DATA_KEYS.forEach((key) => {
      const data = window.localStorage.getItem(key)

      if (data) {
        const encrypted = encryptWithAES(data, pin)
        window.localStorage.setItem(key, encrypted)
      }
    })
  } catch (error) {
    logger.error('Could not encrypt data, access to local storage is blocked')
  }
}

export function parseStoredAuth(storedAuth: string, pin: string): Connection | null {
  try {
    const decryptedAuth = decryptWithAES(storedAuth, pin)
    const auth = JSON.parse(decryptedAuth)
    return auth
  } catch (error) {
    // could not decrypt
    return null
  }
}

export function resetApp() {
  try {
    ALL_DATA_KEYS.forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    customNotifications$.next({
      id: createRandomHex(),
      type: 'error',
      heading: get(translate)('app.errors.reset_error'),
      message: get(translate)('app.errors.storage_access')
    })
  }

  window.location.reload()
}

export function isProtectedRoute(route: string): boolean {
  switch (route) {
    case '/connect':
    case '/welcome':
      return false
    default:
      return true
  }
}

export function hexStringToByte(str: string) {
  const match = str.match(/.{1,2}/g) || []
  return new Uint8Array(match.map((byte) => parseInt(byte, 16)))
}

export function createRandomHex(length = 32) {
  return bytesToHex(randomBytes(length))
}

export function formatLog(type: 'INFO' | 'WARN' | 'ERROR', msg: string): string {
  return `[${type} - ${new Date().toLocaleTimeString()}]: ${msg}`
}

export const logger = {
  info: (msg: string) => log$.next(formatLog('INFO', msg)),
  warn: (msg: string) => log$.next(formatLog('WARN', msg)),
  error: (msg: string) => log$.next(formatLog('ERROR', msg))
}

export async function loadVConsole() {
  const { default: VConsole } = await import('vconsole')
  new VConsole()
}

/**Will strip the msat suffix from msat values if there */
export function formatMsat(val: string | number): string {
  if (!val) return '0'
  return typeof val === 'string' ? val.replace('msat', '') : val.toString()
}

export function firstLetterUpperCase(str: string): string {
  return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`
}

export function mainDomain(host: string): string {
  return host.split('.').reverse().splice(0, 2).reverse().join('.')
}

const usernameRegex = /^[a-z0-9-_.]+$/

const domainRegex =
  /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/

export function decodeLightningAddress(val: string): { username: string; domain: string } | null {
  const [username, domain] = val.split('@')

  // check valid username && valid domain
  if (!usernameRegex.test(username) || !domainRegex.test(domain)) {
    return null
  }

  return { username, domain }
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

export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const bolt11Regex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/
const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/

export function getPaymentDetails(destination: string, protocol = ''): ParsedBitcoinString {
  destination = destination.toLowerCase()
  protocol = protocol.toLowerCase()

  // LNURL
  if (
    destination.startsWith('lnurl') ||
    protocol.startsWith('lnurl') ||
    protocol.startsWith('keyauth') ||
    decodeLightningAddress(destination)
  ) {
    return { value: destination, type: 'lnurl' }
  }

  // Keysend
  if (nodePublicKeyRegex.test(destination)) {
    return { value: destination, type: 'keysend' }
  }

  // Bolt11
  if (bolt11Regex.test(destination)) {
    return { value: destination, type: 'bolt11' }
  }

  // Bolt 12
  if (
    // Offer
    destination.startsWith('lno1') ||
    // Invoice
    destination.startsWith('lni1') ||
    // Invoice request
    destination.startsWith('lnr1')
  ) {
    return {
      type: 'bolt12',
      value: destination
    }
  }

  // Onchain
  if (isValidBitcoinAddress(destination)) {
    return {
      type: 'onchain',
      value: {
        address: destination
      }
    }
  }

  return { error: get(translate)('app.errors.unrecognized_payment_type') }
}

export function parseBitcoinUrl(input: string): ParsedBitcoinString {
  // try parsing as URL first
  try {
    const { pathname, searchParams } = new URL(input)
    const lightningParam = searchParams.get('lightning')

    const details = getPaymentDetails(pathname.toLowerCase())

    if ((details as ParsedBitcoinStringError).error) {
      return details
    }

    const { type, value } = details as ParsedOnchainString

    if (type === 'onchain') {
      value.amount = searchParams.get('amount')
      value.label = searchParams.get('label')
      value.message = searchParams.get('message')
    }

    const lightning = lightningParam ? getPaymentDetails(lightningParam.toLowerCase()) : {}

    return { type, value, ...lightning }
  } catch (error) {
    return getPaymentDetails(input)
  }
}

export function formatDecodedOffer(
  decoded: DecodeResponse & Partial<OfferSummary> & { bolt12: string }
): Offer {
  const {
    type,
    active,
    single_use,
    offer_currency,
    offer_amount,
    offer_amount_msat,
    offer_description,
    offer_node_id,
    offer_issuer,
    offer_absolute_expiry,
    offer_quantity_max,
    used,
    bolt12
  } = decoded

  const { offer_id } = decoded as DecodedBolt12Offer
  const { invreq_id } = decoded as DecodedBolt12InvoiceRequest

  let denomination: BitcoinDenomination.msats | FiatDenomination
  let nodeId: OfferCommon['offer_node_id']
  let quantityMax: OfferCommon['offer_quantity_max']
  let amount: OfferCommon['offer_amount']

  if (type === 'bolt12 invoice_request') {
    const { invreq_amount_msat, invreq_amount, invreq_payer_id } =
      decoded as DecodedBolt12InvoiceRequest
    denomination = BitcoinDenomination.msats
    amount = formatMsat((invreq_amount_msat || invreq_amount) as string)
    nodeId = invreq_payer_id
    quantityMax = offer_quantity_max
  } else {
    const { invreq_amount_msat, invreq_amount } = decoded as DecodedBolt12Invoice
    denomination = (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats
    amount =
      offer_amount?.toString() ||
      formatMsat((offer_amount_msat || invreq_amount_msat || invreq_amount) as string)
    nodeId = offer_node_id
    quantityMax = offer_quantity_max
  }

  return {
    id: offer_id || invreq_id,
    type,
    expiry: offer_absolute_expiry,
    description: offer_description,
    issuer: offer_issuer,
    denomination,
    amount,
    nodeId,
    quantityMax,
    active,
    singleUse: single_use,
    used,
    bolt12
  }
}

/** return unix timestamp in seconds for now  */
export function now() {
  return Math.round(Date.now() / 1000)
}
