import type { LnWebSocketOptions, Logger } from 'lnmessage/dist/types.js'
import Offers from './offers.js'
import Signatures from './signatures.js'
import Utxos from './utxos.js'
import Channels from './channels.js'
import Transactions from './transactions.js'
import Blocks from './blocks.js'
import Invoices from './invoices.js'
import type { Wallet, CoreLnConfiguration } from '$lib/@types/wallets.js'
import type { Session } from '$lib/@types/session.js'
import { BehaviorSubject } from 'rxjs'
import { Subject } from 'rxjs'
import Forwards from './forwards.js'
import { validateCoreLnConfiguration } from './validation.js'
import type { AppError } from '$lib/@types/errors.js'
import { parseNodeAddress } from '$lib/address.js'
import handleError from './error.js'
import Network from './network.js'
import Clboss from './clboss.js'
import Prism from './prism.js'
import { createSocket } from './worker.js'

import type {
  CoreLnError,
  CorelnConnectionInterface,
  GetinfoResponse,
  SocketWrapper
} from './types.js'

import type {
  BlocksInterface,
  ChannelsInterface,
  Info,
  SignaturesInterface,
  OffersInterface,
  InvoicesInterface,
  RpcCall,
  TransactionsInterface,
  UtxosInterface,
  ForwardsInterface,
  NetworkInterface,
  ConnectionStatus,
  PluginsInterface,
  ClbossInterface,
  PrismInterface
} from '../interfaces.js'
import Plugins from './plugins.js'

class CoreLightning implements CorelnConnectionInterface {
  socket: SocketWrapper | null
  lnmessageOptions: LnWebSocketOptions
  walletId: Wallet['id']
  info: Info
  destroy$: Subject<void>
  errors$: Subject<AppError>
  rune: string
  rpc: RpcCall
  connect: () => Promise<Info | null>
  disconnect: () => void
  connectionStatus$: BehaviorSubject<
    'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'
  >
  signatures: SignaturesInterface
  offers: OffersInterface
  invoices: InvoicesInterface
  utxos: UtxosInterface
  channels: ChannelsInterface
  transactions: TransactionsInterface
  blocks: BlocksInterface
  forwards: ForwardsInterface
  network: NetworkInterface
  plugins: PluginsInterface
  clboss: ClbossInterface
  prism: PrismInterface

  constructor(
    walletId: string,
    configuration: CoreLnConfiguration,
    session: Session,
    logger?: Logger
  ) {
    validateCoreLnConfiguration(configuration, walletId)

    const { address, connection, token } = configuration
    const { publicKey, port, ip } = parseNodeAddress(address)
    const { secret } = session

    this.walletId = walletId
    this.socket = null

    this.lnmessageOptions = {
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
    }

    this.rune = token

    this.rpc = async ({
      method,
      params,
      reqId
    }: {
      method: string
      params?: unknown
      reqId?: string
    }) => {
      const socket = await this.getSocket()
      return socket.commando({ method, params, rune: this.rune, reqId })
    }

    this.connect = async () => {
      const socket = await this.getSocket()
      const connected = await socket.connect()

      if (connected) {
        try {
          const result = (await this.rpc({
            method: 'getinfo'
          })) as GetinfoResponse

          const {
            id,
            alias,
            color,
            version,
            address,
            network,
            warning_bitcoind_sync,
            warning_lightningd_sync
          } = result
          const { address: host, port: connectionPort } = address[0] || { address: ip, port }

          this.info = {
            id,
            host,
            port: connectionPort,
            alias,
            color,
            version,
            network,
            bitcoindSynced: warning_bitcoind_sync ? false : true,
            lightningdSynced: warning_lightningd_sync ? false : true
          }

          return this.info
        } catch (error) {
          const context = 'getinfo (connect)'

          const connectionError = handleError(error as CoreLnError, context, walletId)

          this.errors$.next(connectionError)
          throw connectionError
        }
      } else {
        return null
      }
    }

    this.destroy$ = new Subject()

    this.disconnect = () => {
      this.destroy$.next()
      this.getSocket().then(socket => socket.disconnect())
    }

    this.connectionStatus$ = new BehaviorSubject<ConnectionStatus>('disconnected')
    this.errors$ = new Subject()
    this.signatures = new Signatures(this)
    this.offers = new Offers(this)
    this.invoices = new Invoices(this)
    this.utxos = new Utxos(this)
    this.channels = new Channels(this)
    this.transactions = new Transactions(this)
    this.blocks = new Blocks(this)
    this.forwards = new Forwards(this)
    this.network = new Network(this)
    this.plugins = new Plugins(this)
    this.clboss = new Clboss(this)
    this.prism = new Prism(this)
  }

  updateToken(token: string): void {
    this.rune = token
    return
  }

  async getSocket() {
    if (this.socket) return this.socket

    this.socket = await createSocket(this.lnmessageOptions, this.connectionStatus$)

    return this.socket
  }
}

/** all methods this connection uses for rune creation */
export const methods = [
  'method^list', // Matches all methods that start with 'list'
  'method^wait', // Matches all methods that start with 'wait'
  'method^get', // Matches all methods that start with 'get'
  'method^bkpr', // Matches all methods that start with 'bkpr'
  'method=summary', // Exact match for 'summary'
  'method=connect', // Exact match for 'connect'
  'method=fundchannel', // Exact match for 'fundchannel'
  'method=setchannel', // Exact match for 'setchannel'
  'method=pay', // Exact match for 'pay'
  'method=keysend', // Exact match for 'keysend'
  'method=invoice', // Exact match for 'invoice'
  'method^offer', // Matches 'offer' and any method starting with 'offer'
  'method^disableoffer', // Matches 'disableoffer' specifically
  'method^invoicerequest', // Matches 'invoicerequest' and methods starting with it
  'method=fetchinvoice', // Exact match for 'fetchinvoice'
  'method=sendinvoice', // Exact match for 'sendinvoice'
  'method=signmessage', // Exact match for 'signmessage'
  'method=newaddr', // Exact match for 'newaddr'
  'method=withdraw', // Exact match for 'withdraw'
  /* Plugins */
  'method=plugin', // Exact match for 'plugin'
  'method^clboss-', // Matches all methods that start with 'clboss-'
  'method^prism-' // Matches all methods that start with 'prism-'
]

export default CoreLightning
