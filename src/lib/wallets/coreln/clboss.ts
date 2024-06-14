import type { ClbossInterface } from '../interfaces.js'
import type { CorelnConnectionInterface, GetinfoResponse } from './types.js'

class Clboss implements ClbossInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<[]> {
    const result = (await this.connection.rpc({
      method: 'getinfo'
    })) as GetinfoResponse
    console.log('getinfo response from clboss interface = ', result)
    return []
  }
}

export default Clboss
