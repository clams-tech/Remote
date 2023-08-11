import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params }) => {
  const { invoice } = params
  return { invoice }
}
