import { Subject } from 'rxjs'
import type { BlocksInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, GetinfoResponse } from './types.js'

class Blocks implements BlocksInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async subscribeToBlockHeight() {
    try {
      const currentBlockHeight = await this.getCurrentBlockHeight()
      const blockHeight$ = new Subject<number>()
      const observable = blockHeight$.asObservable()
      let complete = false

      observable.subscribe({ complete: () => (complete = true) })

      const waitBlockHeight = async (height: number) => {
        if (complete) return

        const result = await this.connection.rpc({
          method: 'waitblockheight',
          params: { blockheight: height, timeout: 7200 }
        })

        const { blockheight } = result as { blockheight: number }
        blockHeight$.next(blockheight)
        waitBlockHeight(blockheight + 1)
      }

      waitBlockHeight(currentBlockHeight)

      return observable
    } catch (error) {
      const context = 'subscribeToBlockHeight (blocks)'
      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async getCurrentBlockHeight() {
    try {
      const info = await this.connection.rpc({ method: 'getinfo' })
      const { blockheight } = info as GetinfoResponse
      return blockheight
    } catch (error) {
      const context = 'getCurrentBlock (blocks)'
      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Blocks
