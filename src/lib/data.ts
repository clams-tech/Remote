import LnMessage from 'lnmessage'
import type { JsonRpcRequest } from 'lnmessage/dist/types'
import { coreLn } from './backends'
import { WS_PROXY } from './constants'
import { auth$, connection$, funds$, nodeInfo$, payments$ } from './streams'
import { parseNodeAddress } from './utils'

export async function initialiseData() {
  // get and decrypt all data from local storage
  // fetch new data to update
}

export async function refreshData() {
  const auth = auth$.getValue()
  if (!auth) return

  const { address, token, sessionSecret } = auth
  const { publicKey, ip, port } = parseNodeAddress(address)
  let ln = connection$.getValue()

  // create connection to node if there is no connection
  if (!ln) {
    // create connection to node
    ln = new LnMessage({
      remoteNodePublicKey: publicKey,
      wsProxy: WS_PROXY,
      ip,
      port: port || 9735,
      privateKey: sessionSecret
      // logger: {
      //   info: console.log,
      //   warn: console.warn,
      //   error: console.error
      // }
    })

    await ln.connect()

    connection$.next(ln)
  }

  // init coreLn service
  coreLn.init({
    request: (request: JsonRpcRequest & { rune: string }) => (ln as LnMessage).commando(request),
    rune: token
  })

  try {
    funds$.next({ loading: true, data: funds$.getValue().data })
    const funds = await coreLn.listFunds()
    funds$.next({ loading: false, data: funds })
  } catch (error) {
    const { message } = error as Error
    funds$.next({ loading: false, data: null, error: message })
  }

  try {
    nodeInfo$.next({ loading: true, data: nodeInfo$.getValue().data })
    const info = await coreLn.getInfo()
    nodeInfo$.next({ loading: false, data: info })
  } catch (error) {
    const { message } = error as Error
    nodeInfo$.next({ loading: false, data: null, error: message })
  }

  try {
    payments$.next({ loading: true, data: payments$.getValue().data })
    const payments = await coreLn.getPayments()
    payments$.next({ loading: false, data: payments })
  } catch (error) {
    const { message } = error as Error
    payments$.next({ loading: false, data: null, error: message })
  }
}
