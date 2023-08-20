import type { Utxo } from '$lib/@types/utxos.js'
import type { UtxosInterface } from '../interfaces.js'
import handleError from './error.js'
import { stripMsatSuffix } from './utils.js'
import { inPlaceSort } from 'fast-sort'

import type {
  ChainEvent,
  CorelnConnectionInterface,
  CoreLnError,
  ListAccountEventsResponse,
  ListfundsResponse
} from './types.js'

class Utxos implements UtxosInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Utxo[]> {
    try {
      const funds = await this.connection.rpc({ method: 'listfunds', params: { spent: true } })
      const { outputs } = funds as ListfundsResponse

      let accountEvents: ListAccountEventsResponse | null

      try {
        accountEvents = (await this.connection.rpc({
          method: 'bkpr-listaccountevents'
        })) as ListAccountEventsResponse
      } catch (error) {
        // don't have permissions to get account events, so set to null
        accountEvents = null
      }

      return outputs.map(
        ({ txid, output, amount_msat, scriptpubkey, address, status, reserved, blockheight }) => {
          let timestamp: number | null = null
          let spendingTxid: string | undefined = undefined

          if (accountEvents) {
            const events = inPlaceSort(
              accountEvents.events.filter((event) => {
                const { type, outpoint, account } = event as ChainEvent
                return account === 'wallet' && type === 'chain' && outpoint === `${txid}:${output}`
              })
            ).desc(({ timestamp }) => timestamp)

            const [lastEvent] = events as ChainEvent[]

            if (lastEvent) {
              timestamp = lastEvent.timestamp || null

              if (lastEvent.tag === 'withdrawal') {
                spendingTxid = lastEvent.txid
              }
            }
          }

          return {
            id: `${txid}:${output}`,
            txid: txid,
            output,
            spendingTxid,
            amount: stripMsatSuffix(amount_msat),
            scriptpubkey,
            address,
            status: reserved ? 'spent_unconfirmed' : status,
            blockHeight: blockheight,
            connectionId: this.connection.connectionId,
            timestamp
          } as Utxo
        }
      )
    } catch (error) {
      const context = 'get (utxos)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Utxos
