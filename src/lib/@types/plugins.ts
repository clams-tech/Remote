export interface PluginListResponse {
  command: 'list'
  plugins: Plugin[]
}

export type Plugin = {
  name: string
  active: boolean
  dynamic: boolean
}

/* ----- 
CLBOSS
----- */
export type ClbossStatus = {
  channel_candidates: {
    id: string
    onlineness: number
  }[]
  internet: {
    connection: 'online' | 'offline'
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

/* -----
Prism
----- */
export type PrismMember = {
  member_id?: string
  description: string
  destination: string
  split: number
  fees_incurred_by: 'local' | 'remote' | string
  payout_threshold_msat: number
}

export type PrismType = {
  id?: string
  prism_id: string
  description: string
  timestamp: number
  outlay_factor: number
  prism_members: PrismMember[]
}

export interface ListPrismsResponse {
  prisms: PrismType[]
}

export type DeletedPrism = {
  key: string[] // Array of strings representing key elements
  generation: number // Generation number (possibly version control?)
  hex: string // Hexadecimal representation of some data
  string: string // Stringified JSON object (containing prism details)
}

export interface DeletePrismResponse {
  deleted: DeletedPrism
}

export type PrismBinding = {
  offer_id: string
  prism_id: string
  timestamp: number
  member_outlays: [
    {
      member_id: string
      outlay_msat: number
    },
    {
      member_id: string
      outlay_msat: number
    },
    {
      member_id: string
      outlay_msat: number
    }
  ]
}

export interface ListPrismBindingsResponse {
  bolt12_prism_bindings: PrismBinding[]
}

export type CreateBindingReponse = {
  status: 'must-replace' | string
  timestamp: 1726125745
  offer_id: string
  prism_id: string
  prism_binding_key: string[]
  prism_members: PrismMember[]
}

type Payout = {
  destination: string
  payment_hash: string
  created_at: number
  parts: number
  amount_msat: number
  amount_sent_msat: number
  payment_preimage: string
  status: string
}

export type PrismMemberPayouts = {
  [key: string]: Payout
}

export interface PrismPayResponse {
  prism_member_payouts: PrismMemberPayouts
}
