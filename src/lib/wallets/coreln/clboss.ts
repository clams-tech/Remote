import type { ClbossInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Clboss implements ClbossInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<[]> {
    console.log('clboss-status called!')
    const result = await this.connection.rpc({
      method: 'clboss-status'
    })
    console.log(`result = `, result)
    return result // TODO add GetClbossStatusResponse type
  }
}

export default Clboss
