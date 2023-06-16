import { Subject, take } from 'rxjs'
import type { BlocksInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, GetinfoResponse } from './types.js'

class Blocks implements BlocksInterface {
  connection: CorelnConnectionInterface
  blockHeight$: Subject<number>

  // @TODO - need to test this works correctly and without memory leaks
  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
    this.blockHeight$ = new Subject()

    let destroyed = false

    this.connection.destroy$.pipe(take(1)).subscribe(() => {
      destroyed = true
    })

    const subscribeToBlockHeight = async (blockHeight: number) => {
      try {
        if (destroyed) return

        const result = await this.connection.rpc({
          method: 'waitblockheight',
          params: { blockheight: blockHeight, timeout: 7200 }
        })

        const { blockheight } = result as { blockheight: number }
        this.blockHeight$.next(blockheight)
        subscribeToBlockHeight(blockheight + 1)
      } catch (error) {
        const context = 'subscribeToBlockHeight (blocks)'
        const connectionError = handleError(error as CoreLnError, context)
        this.connection.errors$.next(connectionError)
        throw connectionError
      }
    }

    const getCurrentBlock = async () => {
      try {
        const info = await this.connection.rpc({ method: 'getinfo' })
        const { blockheight } = info as GetinfoResponse
        this.blockHeight$.next(blockheight)
        subscribeToBlockHeight(blockheight + 1)
      } catch (error) {
        const context = 'getCurrentBlock (blocks)'
        const connectionError = handleError(error as CoreLnError, context)
        this.connection.errors$.next(connectionError)
        throw connectionError
      }
    }

    getCurrentBlock()
  }
}

export default Blocks
