import type { Forward } from '$lib/@types/forwards.js'
import type { ForwardsInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError } from './types.js'

class Forwards implements ForwardsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  get(): Promise<Forward[]> {
    try {
      // @TODO - Implement this
    } catch (error) {
      const context = 'get (forwards)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Forwards
