import type { PageLoad } from './$types'

export const load: PageLoad = ({ params }) => {
  return { bolt12: params.bolt12 }
}
