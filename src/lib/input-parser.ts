import { toOutputScript } from 'bitcoinjs-lib/src/address.js'
import { networks } from 'bitcoinjs-lib'
import type { ParsedInput } from './@types/common.js'

import {
  bolt11Regex,
  hostRegex,
  nodeConnectRegex,
  nodePublicKeyRegex,
  usernameRegex
} from './regex.js'

export function decodeLightningAddress(val: string): { username: string; domain: string } | null {
  const [username, domain] = val.split('@')
  if (!username || !domain) return null

  // check valid username && valid domain
  if (!usernameRegex.test(username) || !hostRegex.test(domain)) {
    return null
  }

  return { username, domain }
}

export function isValidBitcoinAddress(val: string) {
  try {
    toOutputScript(val)
    return true
  } catch (e) {
    try {
      toOutputScript(val, networks.testnet)
      return true
    } catch (e) {
      try {
        toOutputScript(val, networks.regtest)
        return true
      } catch (e) {
        return false
      }
    }
  }
}

export const isBolt12Offer = (input: string): boolean =>
  input.startsWith('lno1') || input.startsWith('lni1') || input.startsWith('lnr1')

export function getInputType(destination: string): ParsedInput {
  destination = destination.toLowerCase()

  // LNURL
  if (destination.startsWith('lnurl') || destination.startsWith('keyauth')) {
    return { value: destination, type: 'lnurl' }
  }

  if (decodeLightningAddress(destination)) {
    return { value: destination, type: 'lightning_address' }
  }

  // Keysend
  if (nodePublicKeyRegex.test(destination)) {
    return { value: destination, type: 'node_publickey' }
  }

  if (nodeConnectRegex.test(destination)) {
    return { value: destination, type: 'node_address' }
  }

  // Bolt11
  if (bolt11Regex.test(destination)) {
    return { value: destination, type: 'invoice' }
  }

  // Bolt 12
  if (isBolt12Offer(destination)) {
    return {
      type: 'offer',
      value: destination
    }
  }

  // Onchain
  if (isValidBitcoinAddress(destination)) {
    return {
      type: 'onchain',
      value: destination
    }
  }

  return { type: 'unknown', value: destination }
}

/** takes input from scanner, keyboard, image and returns the value and type */
export function parseInput(input: string): ParsedInput {
  // try parsing as URL first
  try {
    const { pathname, searchParams } = new URL(input)
    const lightningParam = searchParams.get('lightning')
    const result = getInputType(pathname.toLowerCase())
    let amount: string | undefined
    let label: string | undefined
    let message: string | undefined

    if (!result) return { type: 'unknown', value: input }

    const { type, value } = result as ParsedInput

    if (type === 'onchain') {
      amount = searchParams.get('amount') || undefined
      label = searchParams.get('label') || undefined
      message = searchParams.get('message') || undefined
    }

    const lightning = lightningParam ? getInputType(lightningParam.toLowerCase())?.value : undefined

    return { type, value, lightning, amount, label, message }
  } catch (error) {
    return getInputType(input)
  }
}
