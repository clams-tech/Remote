import type { BalanceInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListfundsResponse } from './types.js'
import { formatMsatString } from './utils.js'
import { msatsToSats } from '$lib/conversion.js'
import Big from 'big.js'

class Balance implements BalanceInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<number> {
    try {
      const { channels, outputs } = (await this.connection.rpc({
        method: 'listfunds'
      })) as ListfundsResponse

      const offChain = channels.reduce((total, channel) => {
        const { our_amount_msat } = channel

        return total.add(formatMsatString(our_amount_msat))
      }, Big('0'))

      const onChain = outputs.reduce(
        (total, { amount_msat }) => total.add(formatMsatString(amount_msat)),
        Big('0')
      )

      const total = offChain.add(onChain).toString()

      return msatsToSats(total)
    } catch (error) {
      const context = 'get (balance)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Balance
