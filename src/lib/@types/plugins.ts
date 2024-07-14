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
  channel_candidates: []
  internet: {
    connection: string // "online" | "offline"
    checking_connectivity: boolean
  }
  onchain_feerate: {
    hi_to_lo: number
    init_mid: number
    lo_to_hi: number
    last_feerate_perkw: number
    judgment: string // "low fees" | "high fees"
  }
  peer_metrics: {
    '025bc9015cc657efbcd1ae9d687d8f02d73c12b3c24229810909c999c72d08fbb3': {
      age: 321535
      age_human: '3 days, 17 hours, 18 minutes, 55 seconds'
      seconds_per_attempt: 0
      success_per_attempt: null
      success_per_day: 0
      connect_rate: 1
      in_fee_msat_per_day: 0
      out_fee_msat_per_day: 0
    }
  }
}
