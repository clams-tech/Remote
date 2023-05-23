import type { DecodedInvoice, FormattedDecodedBolt11 } from './@types/payments.js'
import { decode as bolt11Decoder } from 'light-bolt11-decoder'
import { log$ } from './streams.js'

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
