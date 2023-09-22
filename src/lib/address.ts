import type { ParsedNodeAddress } from './@types/common.js'

export function parseNodeAddress(address: string): ParsedNodeAddress {
  const [publicKey, host] = address.split('@')
  const [ip, port] = host.split(':')

  return { publicKey, ip, port: port ? parseInt(port) : 9735 }
}

export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const bolt11Regex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/
const ipRegex = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/

const hostRegex =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/

export function validateNodeAddress(address: string): boolean {
  try {
    const { publicKey, ip, port } = parseNodeAddress(address)
    if (!publicKey || !ip) return false

    if (port && (port < 1 || port > 65535)) return false

    if (!publicKey.match(nodePublicKeyRegex)) return false

    if (!ip.match(ipRegex) && !ip.match(hostRegex) && ip !== 'localhost') return false

    return true
  } catch (error) {
    return false
  }
}
