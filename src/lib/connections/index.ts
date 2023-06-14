import type {
  ConnectionConfiguration,
  ConnectionDetails,
  CoreLnConfiguration
} from '$lib/@types/connections.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import { logger } from '$lib/utils.js'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { ConnectionInterface } from './interfaces.js'

export const connectionOptions: { type: ConnectionDetails['type']; icon: string }[] = [
  {
    type: 'coreln',
    icon: coreLnLogo
  }
]

export const connectionDetailsToInterface = (
  info: ConnectionDetails,
  session: Session
): ConnectionInterface => {
  switch (info.type) {
    case 'coreln':
      return new CoreLightning(info.id, info.configuration as CoreLnConfiguration, session, logger)
  }

  throw new Error(`Invalid connection type: ${info.type}`)
}

export const connectionTypeToInitialConfiguration = (
  type: ConnectionDetails['type']
): ConnectionDetails['configuration'] => {
  switch (type) {
    case 'coreln':
      return {
        address: '',
        connection: {
          type: 'proxy',
          value: WS_PROXY
        },
        token: ''
      }
    default:
      return null
  }
}
