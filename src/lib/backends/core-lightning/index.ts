import LnMessage from 'lnmessage'
import type { Auth } from '$lib/@types/auth.js'
import type { Settings } from '$lib/@types/settings.js'
import { parseNodeAddress } from '$lib/utils.js'
import type { Logger } from 'lnmessage/dist/types.js'
import offers from './offers.js'
import node from './node.js'
import payments from './payments.js'
import outputs from './outputs.js'
import type { GetinfoResponse } from './types.js'
import channels from './channels.js'
import peers from './peers.js'

const CoreLightning = async (auth: Auth, settings: Settings, logger?: Logger) => {
  const { address, token, sessionSecret } = auth
  const { wsProxy, directConnection } = settings
  const { publicKey, ip, port } = parseNodeAddress(address)

  const connection = new LnMessage({
    remoteNodePublicKey: publicKey,
    wsProxy: directConnection ? undefined : wsProxy,
    wsProtocol: directConnection,
    ip,
    port: port || 9735,
    privateKey: sessionSecret,
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
  }) => connection.commando({ method, params, rune, reqId })

  const connect = () => connection.connect()
  const disconnect = () => connection.disconnect()

  await connect()
  const info = (await rpcCall({ method: 'getinfo' })) as GetinfoResponse

  return {
    updateToken,
    connect,
    disconnect,
    connectionStatus$: connection.connectionStatus$,
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
