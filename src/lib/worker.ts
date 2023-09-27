import AppWorker from '$lib/app.worker?worker'
import { fromEvent } from 'rxjs'

export const appWorker = new AppWorker()

export const appWorkerMessages$ = fromEvent<MessageEvent<{ id: string; result: unknown }>>(
  appWorker,
  'message'
)
