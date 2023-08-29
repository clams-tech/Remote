import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const lnurl = params.value

  return {
    lnurl
  }
}
