import { fromEvent } from 'rxjs'

export const appWorker = new Worker(new URL('./app.worker.ts', import.meta.url), {
  type: 'module'
})

export const appWorkerMessages$ = fromEvent<MessageEvent<{ id: string; result: unknown }>>(
  appWorker,
  'message'
)
