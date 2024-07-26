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
  channel_candidates: {
    id: string
    onlineness: number
  }[]
  internet: {
    connection: string // "online" | "offline"
    checking_connectivity: boolean
  }
  onchain_feerate: {
    hi_to_lo: number
    init_mid: number
    lo_to_hi: number
    last_feerate_perkw: number
    judgment: 'high fees' | 'low fees'
  }
  peer_metrics:
    | {
        [key: string]: {
          age: number
          age_human: string
          seconds_per_attempt: number
          success_per_attempt: number | null
          success_per_day: number
          connect_rate: number
          in_fee_msat_per_day: number
          out_fee_msat_per_day: number
        }
      }
    | Record<string, never> //empty object
  should_monitor_onchain_funds: {
    status: 'notice' | 'ignore'
    now: number
    now_human: string
    disable_until: number
    disable_until_human: string
    comment: string
  }
  unmanaged: {
    comment: ''
    [key: string]: string
  }
}
