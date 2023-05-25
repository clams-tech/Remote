import type { LnWebSocketOptions } from 'lnmessage/dist/types.js'
import LnMessage from 'lnmessage'
import Offers from './offers.js'
import Node from './node.js'
import Payments from './payments.js'
import Utxos from './utxos.js'
import Channels from './channels.js'
import Transactions from './transactions.js'
import type { GetinfoResponse } from './types.js'
import type { CoreLnConnectionInfo } from '$lib/@types/connections.js'
import type {
  ChannelsInterface,
  ConnectionInterface,
  Info,
  NodeInterface,
  OffersInterface,
  PaymentsInterface,
  RpcCall,
  TransactionsInterface,
  UtxosInterface
} from '../interfaces.js'
import type { Session } from '$lib/@types/session.js'
import type { Logger } from '$lib/@types/util.js'

class CoreLightning implements ConnectionInterface {
  info: Info
  rune: string
  rpc: RpcCall
  connect: () => Promise<Info | null>
  disconnect: () => void
  node: NodeInterface
  offers: OffersInterface
  payments: PaymentsInterface
  utxos: UtxosInterface
  channels: ChannelsInterface
  transactions: TransactionsInterface

  constructor(options: CoreLnConnectionInfo, session: Session, logger?: Logger) {
    const {
      data: { publicKey, ip, port, connection, token },
      id: connectionId
    } = options as CoreLnConnectionInfo

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

    this.rune = token

    this.rpc = ({ method, params, reqId }: { method: string; params?: unknown; reqId?: string }) =>
      socket.commando({ method, params, rune: this.rune, reqId })

    this.connect = async () => {
      const connected = await socket.connect()

      if (connected) {
        const { id, alias, color, version } = (await this.rpc({
          method: 'getinfo'
        })) as GetinfoResponse

        this.info = { id, alias, color, version, connectionId }

        return this.info
      } else {
        return null
      }
    }

    this.disconnect = () => socket.disconnect()

    this.node = new Node(this)
    this.offers = new Offers(this)
    this.payments = new Payments(this)
    this.utxos = new Utxos(this)
    this.channels = new Channels(this)
    this.transactions = new Transactions(this)
  }

  updateToken(token: string): void {
    this.rune = token
    return
  }
}

export default CoreLightning
