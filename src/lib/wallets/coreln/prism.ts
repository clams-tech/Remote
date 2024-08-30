import type { PrismInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Prism implements PrismInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async listPrisms(): Promise<object> {
    const result = (await this.connection.rpc({
      method: 'prism-list'
    })) as object
    return result
  }
}

export default Prism
