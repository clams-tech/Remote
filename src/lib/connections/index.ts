import type {
  ConnectionConfiguration,
  ConnectionInfo,
  CoreLnConfiguration
} from '$lib/@types/connections.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { ConnectionInterface } from './interfaces.js'

export const connectionOptions: { type: ConnectionInfo['type']; icon: string }[] = [
  {
    type: 'coreln',
    icon: coreLnLogo
  }
]

export const connectionInfoToInterface = (
  info: ConnectionInfo,
  session: Session
): ConnectionInterface => {
  switch (info.type) {
    case 'coreln':
      return new CoreLightning(info.id, info.configuration as CoreLnConfiguration, session)
  }

  throw new Error(`Invalid connection type: ${info.type}`)
}

export const connectionTypeToInitialConfiguration = (
  type: ConnectionInfo['type']
): ConnectionInfo['configuration'] => {
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
