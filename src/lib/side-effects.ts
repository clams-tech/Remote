import { combineLatest, from, timer } from 'rxjs'
import { distinctUntilKeyChanged, filter, skip, switchMap, withLatestFrom } from 'rxjs/operators'
import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { deriveLastPayIndex, getBitcoinExchangeRate } from './utils'

import {
  appVisible$,
  bitcoinExchangeRates$,
  auth$,
  listeningForAllInvoiceUpdates$,
  payments$,
  paymentUpdates$,
  settings$,
  updatePayments,
  listenForAllInvoiceUpdates,
  connection$
} from './streams'
import type LnMessage from 'lnmessage'

function registerSideEffects() {
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

  // when app is focused and have credentials and have payments, start listening if not already
  combineLatest([appVisible$, auth$, payments$])
    .pipe(withLatestFrom(listeningForAllInvoiceUpdates$))
    .subscribe(([[visible, auth, payments], listening]) => {
      if (payments.data && !payments.error && visible && auth && auth.token && !listening) {
        const lastPayIndex = deriveLastPayIndex(payments.data)

        listeningForAllInvoiceUpdates$.next(true)

        listenForAllInvoiceUpdates(lastPayIndex).catch(() => {
          listeningForAllInvoiceUpdates$.next(false)
        })
      }
    })

  combineLatest([appVisible$, connection$])
    .pipe(
      filter(
        // app is visible, we have a connection, but it is not currently connected
        ([visible, connection]) => !!(visible && connection && !connection.connected$.getValue())
      )
    )
    .subscribe(async (values) => {
      const ln = values[1]
      console.log('RECONNECTING TO NODE')
      await (ln as LnMessage).connect()
    })
}

export default registerSideEffects
