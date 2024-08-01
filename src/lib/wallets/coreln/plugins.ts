import type { PluginsInterface } from '../interfaces.js'
import type { CorelnConnectionInterface, PluginListResponse } from './types.js'

class Plugins implements PluginsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async list() {
    const { plugins } = (await this.connection.rpc({
      method: 'plugin',
      params: ['list']
    })) as PluginListResponse
    return plugins
  }

  async start(plugin: string) {
    const { plugins } = (await this.connection.rpc({
      method: 'plugin',
      params: { subcommand: 'stop', plugin }
    })) as PluginListResponse
    return plugins
  }

  async stop(plugin: string) {
    const response = (await this.connection.rpc({
      method: 'plugin',
      params: { subcommand: 'stop', plugin }
    })) as string
    return response
  }
}

export default Plugins
