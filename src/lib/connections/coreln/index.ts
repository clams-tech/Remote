import LnMessage from 'lnmessage'
import type { LnWebSocketOptions, Logger } from 'lnmessage/dist/types.js'
import offers from './offers.js'
import node from './node.js'
import payments from './payments.js'
import outputs from './outputs.js'
import type { GetinfoResponse } from './types.js'
import channels from './channels.js'
import peers from './peers.js'
import type { CoreLnConnection } from '$lib/@types/connections.js'
import type { Session } from '$lib/@types/session.js'

const CoreLightning = async (options: CoreLnConnection, session: Session, logger?: Logger) => {
  const {
    data: { publicKey, ip, port, connection, token },
    id: connectionId
  } = options
  const { secret } = session

  const socket = new LnMessage({
    remoteNodePublicKey: publicKey,
    wsProxy: connection.type === 'proxy' ? connection.value : undefined,
    wsProtocol:
      connection.type === 'direct'
        ? (connection.value as LnWebSocketOptions['wsProtocol'])
        : undefined,
    ip,
    port: port || 9735,
    privateKey: secret,
    logger: logger
  })

  let rune = token

  const updateToken = (token: string) => {
    rune = token
  }

  const rpcCall = ({
    method,
    params,
    reqId
  }: {
    method: string
    params?: unknown
    reqId?: string
  }) => socket.commando({ method, params, rune, reqId })

  const connect = () => socket.connect()
  const disconnect = () => socket.disconnect()

  await connect()

  const { id, alias, color, version } = (await rpcCall({ method: 'getinfo' })) as GetinfoResponse
  const info = { id, alias, color, version, connectionId }

  return {
    updateToken,
    connect,
    disconnect,
    connectionStatus$: socket.connectionStatus$,
    info,
    node: node(rpcCall),
    offers: offers(rpcCall, info),
    payments: payments(rpcCall, info),
    outputs: outputs(rpcCall, info),
    channels: channels(rpcCall, info),
    peers: peers(rpcCall, info)
  }
}

export default CoreLightning
