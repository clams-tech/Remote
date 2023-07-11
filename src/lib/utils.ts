/** return unix timestamp in seconds for now  */
export function nowSeconds() {
  return Math.round(Date.now() / 1000)
}

export function routeRequiresSession(path: string): boolean {
  switch (path) {
    case '/welcome':
      return false
    default:
      return true
  }
}

export function truncateValue(val: string, length = 9): string {
  return val.length <= length ? val : `${val.slice(0, length)}...${val.slice(-length)}`
}

export function simpleDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const noop = () => {}

export const wait = (time: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, time))
