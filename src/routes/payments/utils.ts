import type { Node } from '$lib/@types/nodes.js'
import { nodePublicKeyRegex } from '$lib/address.js'
import { DAY_IN_SECS } from '$lib/constants.js'
import { db } from '$lib/db/index.js'
import { connections$ } from '$lib/streams.js'
import type { CounterPart } from '$lib/summary.js'
import { nowSeconds } from '$lib/utils.js'

export const getNodeInfo = async (
  nodePubkey: string,
  alreadyHaveNodeInfo?: boolean
): Promise<Node | null> => {
  const connection = connections$.value.find(conn => conn.network?.getNode)

  if (connection) {
    try {
      const node = await connection.network?.getNode(nodePubkey)

      if (alreadyHaveNodeInfo) {
        await db.nodes.update(
          nodePubkey,
          node ? { ...node, lastUpdated: nowSeconds() } : { lastUpdated: nowSeconds() }
        )
      } else {
        await db.nodes.put(
          node
            ? { ...node, lastUpdated: nowSeconds() }
            : { id: nodePubkey, lastUpdated: nowSeconds() }
        )
      }

      return node || null
    } catch (error) {
      return null
    }
  }

  return null
}

export const updateCounterPartyNodeInfo = async (
  counterParty: CounterPart
): Promise<Node | null> => {
  // if is node type and is more than a day old info
  if (counterParty.type === 'node' && counterParty.value.lastUpdated + DAY_IN_SECS < nowSeconds()) {
    return getNodeInfo(counterParty.value.id, true)
  }

  if (
    counterParty.type === 'unknown' &&
    nodePublicKeyRegex.test((counterParty.value as string) || '')
  ) {
    return getNodeInfo(counterParty.value as string)
  }

  return null
}
