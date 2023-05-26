import { Subject, take } from 'rxjs'
import type { BlocksInterface, CorelnConnectionInterface } from '../interfaces.js'
import type { GetinfoResponse } from './types.js'

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
      if (destroyed) return

      const result = await this.connection.rpc({
        method: 'waitblockheight',
        params: { blockheight: blockHeight, timeout: 7200 }
      })

      const { blockheight } = result as { blockheight: number }
      this.blockHeight$.next(blockheight)
      subscribeToBlockHeight(blockheight + 1)
    }

    const getCurrentBlock = async () => {
      const info = await this.connection.rpc({ method: 'getinfo' })
      const { blockheight } = info as GetinfoResponse
      this.blockHeight$.next(blockheight)
      subscribeToBlockHeight(blockheight + 1)
    }

    getCurrentBlock()
  }
}

export default Blocks
