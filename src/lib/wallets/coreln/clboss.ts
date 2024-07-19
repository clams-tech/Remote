import type { ClbossStatus } from '$lib/@types/plugins.js'
import type { ClbossInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Clboss implements ClbossInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async getStatus(): Promise<ClbossStatus> {
    const result = (await this.connection.rpc({
      method: 'clboss-status'
    })) as ClbossStatus
    return result
  }

  async ignoreOnchain(hours: number): Promise<object> {
    const result = (await this.connection.rpc({
      method: 'clboss-ignore-onchain',
      params: { hours }
    })) as object
    return result
  }

  async noticeOnchain(): Promise<object> {
    const result = (await this.connection.rpc({
      method: 'clboss-notice-onchain'
    })) as object
    return result
  }
}

export default Clboss
