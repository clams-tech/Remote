import type { ClbossStatus } from '$lib/@types/plugins.js'
import type { ClbossInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Clboss implements ClbossInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<ClbossStatus> {
    const result = (await this.connection.rpc({
      method: 'clboss-status'
    })) as ClbossStatus
    return result
  }
}

export default Clboss
