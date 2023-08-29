import type { SignaturesInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, SignMessageResponse } from './types.js'

class Signatures implements SignaturesInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async signMessage(message: string): Promise<string> {
    try {
      const result = await this.connection.rpc({
        method: 'signmessage',
        params: { message }
      })

      const { zbase } = result as SignMessageResponse

      return zbase
    } catch (error) {
      const context = 'signMessage (node)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Signatures
