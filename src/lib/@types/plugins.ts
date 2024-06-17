export interface PluginListResponse {
  command: 'list'
  plugins: Plugin[]
}

export type Plugin = {
  name: string
  active: boolean
  dynamic: boolean
}

export type ClbossStatus = {
  incoming_capacity_swapper: {
    status: string
  }
}
