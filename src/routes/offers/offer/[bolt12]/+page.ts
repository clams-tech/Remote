import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  return { bolt12: params.bolt12 }
}
