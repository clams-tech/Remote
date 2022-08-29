import { from, timer } from 'rxjs'

import {
  distinctUntilKeyChanged,
  filter,
  skip,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators'

import { coreLightning } from './backends'
import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { Modals } from './types'

import { getBitcoinExchangeRate, supportsNotifications } from './utils'

import {
  appVisible$,
  bitcoinExchangeRates$,
  credentials$,
  funds$,
  listeningForAllInvoiceUpdates$,
  modal$,
  nodeInfo$,
  payments$,
  paymentUpdates$,
  settings$,
  updatePayments,
  listenForAllInvoiceUpdates
} from './streams'

function registerSideEffects() {
  // once we have credentials, go ahead and fetch initial data
  credentials$
    .pipe(
      filter(({ connection, rune }) => !!(connection && rune)),
      take(1)
    )
    .subscribe(async (credentials) => {
      // store credentials
      localStorage.setItem('credentials', JSON.stringify(credentials))

      coreLightning
        .getInfo()
        .then((data) => {
          nodeInfo$.next({ loading: false, data })
        })
        .catch((error) => {
          nodeInfo$.next({ loading: false, data: null, error: error && error.message })
        })

      coreLightning
        .getPayments()
        .then((data) => {
          payments$.next({ loading: false, data })
        })
        .catch((error) => {
          payments$.next({ loading: false, data: null, error: error && error.message })
        })

      coreLightning
        .listFunds()
        .then((data) => {
          funds$.next({ loading: false, data })
        })
        .catch((error) => {
          funds$.next({ loading: false, data: null, error: error && error.message })
        })
    })

  // update payments when payment update comes through
  paymentUpdates$.subscribe(updatePayments)

  // handle dark mode toggle
  settings$.pipe(distinctUntilKeyChanged('darkmode')).subscribe(({ darkmode }) => {
    document.documentElement.classList[darkmode ? 'add' : 'remove']('dark')
  })

  // update settings in storage
  settings$
    .pipe(skip(1))
    .subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

  // get and update bitcoin exchange rate
  timer(0, 1 * MIN_IN_MS)
    .pipe(switchMap(() => from(getBitcoinExchangeRate())))
    .subscribe(bitcoinExchangeRates$)

  // when app is focused, start listening if not already
  appVisible$
    .pipe(withLatestFrom(listeningForAllInvoiceUpdates$, credentials$))
    .subscribe(([visible, listening, credentials]) => {
      if (visible && credentials.rune && !listening) {
        listeningForAllInvoiceUpdates$.next(true)

        listenForAllInvoiceUpdates().catch(() => {
          listeningForAllInvoiceUpdates$.next(false)
        })
      }
    })
}

export default registerSideEffects
