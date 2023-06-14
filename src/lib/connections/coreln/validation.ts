import type { CoreLnConfiguration } from '$lib/@types/connections.js'

export const validateConfiguration = (configuration: CoreLnConfiguration) => {
  const {
    address,
    connection: { type, value },
    token
  } = configuration

  if (!address || typeof address !== 'string') throw new Error(`Address: ${address} is not valid`)
  if (!token || typeof token !== 'string') throw new Error(`Rune: ${token} is not valid`)

  if (type !== 'proxy' && type !== 'direct')
    throw new Error(`Connection type: ${type} is not valid`)

  if (typeof value !== 'string') throw new Error(`Connection value: ${value} is not valid`)
}
