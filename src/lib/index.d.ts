import type { Socket } from '$lib/backends'

declare global {
  interface Window {
    lnsocket_init: () => Promise<() => Socket>
  }
}
