import type { LnWebSocketOptions } from 'lnmessage/dist/types.js'
import LnMessage from 'lnmessage'
import Offers from './offers.js'
import Node from './node.js'
import Utxos from './utxos.js'
import Channels from './channels.js'
import Transactions from './transactions.js'
import Blocks from './blocks.js'
import Invoices from './invoices.js'
import type { CorelnConnectionInterface, GetinfoResponse } from './types.js'
import type { CoreLnConfiguration } from '$lib/@types/connections.js'
import type { Session } from '$lib/@types/session.js'
import type { Logger } from '$lib/@types/util.js'
import type { BehaviorSubject } from 'rxjs'
import { Subject } from 'rxjs'
import { parseNodeAddress } from '$lib/utils.js'
import Forwards from './forwards.js'
import { validateConfiguration } from './validation.js'

import type {
  BlocksInterface,
  ChannelsInterface,
  Info,
  NodeInterface,
  OffersInterface,
  InvoicesInterface,
  RpcCall,
  TransactionsInterface,
  UtxosInterface,
  ForwardsInterface
} from '../interfaces.js'

class CoreLightning implements CorelnConnectionInterface {
  info: Required<Info>
  destroy$: Subject<void>
  rune: string
  rpc: RpcCall
  connect: () => Promise<Info | null>
  disconnect: () => void
  connectionStatus$: BehaviorSubject<
    'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'
  >
  node: NodeInterface
  offers: OffersInterface
  invoices: InvoicesInterface
  utxos: UtxosInterface
  channels: ChannelsInterface
  transactions: TransactionsInterface
  blocks: BlocksInterface
  forwards: ForwardsInterface

  constructor(
    connectionDetailsId: string,
    configuration: CoreLnConfiguration,
    session: Session,
    logger?: Logger
  ) {
    validateConfiguration(configuration)

    const { address, connection, token } = configuration
    const { publicKey, port, ip } = parseNodeAddress(address)
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

        this.info = { id, alias, color, version, connectionDetailsId }

        return this.info
      } else {
        return null
      }
    }

    this.destroy$ = new Subject()

    this.disconnect = () => {
      socket.disconnect()
      this.destroy$.next()
    }

    this.connectionStatus$ = socket.connectionStatus$

    this.node = new Node(this)
    this.offers = new Offers(this)
    this.invoices = new Invoices(this)
    this.utxos = new Utxos(this)
    this.channels = new Channels(this)
    this.transactions = new Transactions(this)
    this.blocks = new Blocks(this)
    this.forwards = new Forwards(this)
  }

  updateToken(token: string): void {
    this.rune = token
    return
  }
}

export default CoreLightning
