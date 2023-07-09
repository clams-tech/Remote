import type { ChannelStatus } from '$lib/types.js'

export const channelStatusTolabel = (status: ChannelStatus) => {
  switch (status) {
    case 'CHANNEL_NORMAL':
      return 'active'
    case 'CHANNEL_AWAITING_LOCKIN':
    case 'OPENING':
    case 'DUALOPEN_AWAITING_LOCKIN':
    case 'DUALOPEN_OPEN_INIT':
    case 'FUNDING_SPEND_SEEN':
    case 'ONCHAIN':
      return 'pending'
    case 'AWAITING_UNILATERAL':
    case 'CHANNEL_SHUTTING_DOWN':
    case 'CLOSING_SIGEXCHANGE':
      return 'closing'
    default:
      return 'closed'
  }
}
