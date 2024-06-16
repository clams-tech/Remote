import type { PluginsInterface } from '../interfaces.js'
import type { CorelnConnectionInterface, PluginListResponse } from './types.js'

class Plugins implements PluginsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get() {
    const { plugins } = (await this.connection.rpc({
      method: 'plugin',
      params: ['list']
    })) as PluginListResponse
    return plugins
  }
}

export default Plugins
