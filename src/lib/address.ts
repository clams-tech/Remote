import type { ParsedNodeAddress } from './@types/nodes.js'

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

export function validateNodeAddress(address: string): boolean {
  try {
    const { publicKey, ip, port } = parseNodeAddress(address)
    if (!publicKey || !ip) return false

    if (port && (port < 1 || port > 65535)) return false

    if (!publicKey.match(nodePublicKeyRegex)) return false

    if (!ip.match(ipRegex) && !ip.match(domainRegex) && ip !== 'localhost') return false

    return true
  } catch (error) {
    return false
  }
}
