import type { ConnectionInfo } from '$lib/@types/connections.js'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { ConnectionInterface } from './interfaces.js'

export const connectionOptions: { type: ConnectionInfo['type']; icon: string }[] = [
  {
    type: 'coreln',
    icon: coreLnLogo
  }
]

export const connectionTypeToInterface = (
  type: ConnectionInfo['type']
): ConnectionInterface['constructor'] => {
  switch (type) {
    case 'coreln':
      return CoreLightning
  }

  throw new Error(`Invalid connection type: ${type}`)
}
