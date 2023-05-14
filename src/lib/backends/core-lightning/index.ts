import LnMessage from 'lnmessage'
import type { Auth } from '$lib/@types/auth.js'
import type { Settings } from '$lib/@types/settings.js'
import { parseNodeAddress } from '$lib/utils.js'
import type { Logger } from 'lnmessage/dist/types.js'
import offers from './offers.js'
import node from './node.js'
import payments from './payments.js'
import outputs from './outputs.js'

const CoreLightning = (auth: Auth, settings: Settings, logger?: Logger) => {
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

  const setToken = (token: string) => {
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

  return {
    setToken,
    connect,
    disconnect,
    offers: offers(rpcCall, publicKey),
    node: node(rpcCall),
    payments: payments(rpcCall, publicKey),
    outputs: outputs(rpcCall, publicKey)
  }
}

export default CoreLightning
