import type { CoreLnConfiguration } from '$lib/@types/connections.js'
import { nowSeconds } from '$lib/utils.js'
import type { AppError } from '$lib/@types/errors.js'
import type { CorelnConnectionInterface } from './types.js'

export const validateConfiguration = (
  coreln: CorelnConnectionInterface,
  configuration: CoreLnConfiguration
) => {
  const {
    address,
    connection: { type, value },
    token
  } = configuration

  if (!address || typeof address !== 'string') {
    const connectionError: AppError = {
      key: 'connection_configuration',
      detail: {
        timestamp: nowSeconds(),
        message: `Address: ${address} is not valid`,
        context: 'validateConfiguration (connection)'
      }
    }

    coreln.errors$.next(connectionError)
    throw connectionError
  }

  if (!token || typeof token !== 'string') {
    const connectionError: AppError = {
      key: 'connection_configuration',
      detail: {
        timestamp: nowSeconds(),
        message: `Rune: ${token} is not valid`,
        context: 'validateConfiguration (connection)'
      }
    }

    coreln.errors$.next(connectionError)
    throw connectionError
  }

  if (type !== 'proxy' && type !== 'direct') {
    const connectionError: AppError = {
      key: 'connection_configuration',
      detail: {
        timestamp: nowSeconds(),
        message: `Connection type: ${type} is not valid`,
        context: 'validateConfiguration (connection)'
      }
    }

    coreln.errors$.next(connectionError)
    throw connectionError
  }

  if (typeof value !== 'string') {
    const connectionError: AppError = {
      key: 'connection_configuration',
      detail: {
        timestamp: nowSeconds(),
        message: `Connection value: ${value} is not valid`,
        context: 'validateConfiguration (connection)'
      }
    }

    coreln.errors$.next(connectionError)
    throw connectionError
  }
}
