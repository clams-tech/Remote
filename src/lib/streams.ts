import { BehaviorSubject, defer, fromEvent, Subject } from 'rxjs'
import { map, shareReplay, startWith, take } from 'rxjs/operators'
import { onDestroy, onMount } from 'svelte'
import { invoiceToPayment } from './backends/core-lightning/utils'
import { AUTH_INTITIAL_STATE } from './constants'
import { coreLn, type GetinfoResponse, type ListfundsResponse } from './backends'
import { getAuthFromStorage, getPageVisibilityParams, getSettingsFromStorage } from './utils'

import {
  Modals,
  type BitcoinExchangeRates,
  type Notification,
  type Payment,
  type Settings,
  type Auth
} from './types'
import type LnMessage from 'lnmessage'

// Makes a BehaviourSubject compatible with Svelte stores
export class SvelteSubject<T> extends BehaviorSubject<T> {
  set: BehaviorSubject<T>['next']
  constructor(initialState: T) {
    super(initialState)
    this.set = super.next
  }
}

// when svelte component is mounted
export const onMount$ = defer(() => {
  const subject = new Subject<void>()
  onMount(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

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

// app settings$
export const settings$ = new SvelteSubject<Settings>(getSettingsFromStorage())

// current bitcoin exchange rates
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)

// current modal to be displayed
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

// all payment update events
export const paymentUpdates$ = new Subject<Payment>()

// core ln credentials
export const auth$ = new BehaviorSubject<Auth>(getAuthFromStorage() || AUTH_INTITIAL_STATE)

// connection to core ln node
export const connection$ = new BehaviorSubject<LnMessage | null>(null)

// ==== NODE DATA ==== //
export const nodeInfo$ = new BehaviorSubject<{
  data: GetinfoResponse | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

export const payments$ = new BehaviorSubject<{
  data: Payment[] | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

export const funds$ = new BehaviorSubject<{
  data: ListfundsResponse | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

const pageVisibilityParams = getPageVisibilityParams()

// indicates if the app is the current tab
export const appVisible$ = fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
  map(() => !document[pageVisibilityParams.hidden as keyof Document]),
  startWith(true),
  shareReplay(1)
)

// indicates if we are already listening for invoice updates
export const listeningForAllInvoiceUpdates$ = new BehaviorSubject<boolean>(false)

// for all custom notifications such as errors and hints
export const customNotifications$ = new Subject<Notification>()

/** ==== STATE UPDATERS ==== */
export async function waitForAndUpdatePayment(payment: Payment): Promise<void> {
  try {
    const update = await coreLn.waitForInvoicePayment(payment)
    paymentUpdates$.next(update)
  } catch (error) {
    //
  }
}

export function updatePayments(payment: Payment): void {
  const payments = payments$.getValue().data || []
  const paymentIndex = payments.findIndex(({ hash }) => hash === payment.hash)

  if (paymentIndex !== -1) {
    // if exists, the replace with update
    payments[paymentIndex] = payment
  } else {
    // otherwise put in the front of payments list
    payments.unshift(payment)
  }

  payments$.next({ data: payments })
}

export async function listenForAllInvoiceUpdates(payIndex: number): Promise<void> {
  const invoice = await coreLn.waitAnyInvoice(payIndex)

  if (invoice.status !== 'unpaid') {
    const payment = invoiceToPayment(invoice)
    paymentUpdates$.next(payment)
  }

  const newLastPayIndex = invoice.pay_index ? invoice.pay_index : payIndex

  return listenForAllInvoiceUpdates(newLastPayIndex)
}

export function updateAuth(update: Partial<Auth>): void {
  const currentAuth = auth$.getValue()
  auth$.next({ ...currentAuth, ...update })
}
