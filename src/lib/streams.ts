import { BehaviorSubject, defer, Subject, take } from 'rxjs'
import { onDestroy } from 'svelte'
import type { Session } from './@types/session.js'

export const session$ = new BehaviorSubject<Session | null>(null)

// when svelte component is destroyed
export const onDestroy$ = defer(() => {
  const subject = new Subject<void>()
  onDestroy(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

// the last url path
export const lastPath$ = new BehaviorSubject('/')

// debug logs
export const log$ = new Subject<string>()
