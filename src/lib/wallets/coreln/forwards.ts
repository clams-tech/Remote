import type { Forward } from '$lib/@types/forwards.js'
import type { ForwardsInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListForwardsResponse } from './types.js'
import { formatForwards } from './worker.js'

class Forwards implements ForwardsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Forward[]> {
    try {
      const listForwardsResponse = await this.connection.rpc({ method: 'listforwards' })
      const { forwards } = listForwardsResponse as ListForwardsResponse

      return formatForwards(forwards, this.connection.walletId)
    } catch (error) {
      const context = 'get (forwards)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Forwards
