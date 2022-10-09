import { combineLatest, from, timer } from 'rxjs'
import { filter, skip, switchMap, withLatestFrom } from 'rxjs/operators'
import { deriveLastPayIndex, encryptWithAES, getBitcoinExchangeRate, initLn } from './utils'
import type LnMessage from 'lnmessage'

import {
  AUTH_STORAGE_KEY,
  FUNDS_STORAGE_KEY,
  INFO_STORAGE_KEY,
  MIN_IN_MS,
  PAYMENTS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY
} from './constants'

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
  connection$,
  nodeInfo$,
  funds$,
  pin$
} from './streams'

function registerSideEffects() {
  // update payments when payment update comes through
  paymentUpdates$.subscribe(updatePayments)

  // update settings in storage
  settings$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

  // update auth in storage
  auth$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe((auth) => {
      const { encrypt } = settings$.getValue()
      const pin = pin$.getValue()

      const dataString = JSON.stringify(auth)

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        encrypt && pin ? encryptWithAES(dataString, pin) : dataString
      )
    })

  // update info in storage
  nodeInfo$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe(({ data }) => {
      const { encrypt } = settings$.getValue()
      const pin = pin$.getValue()

      const dataString = JSON.stringify(data)

      localStorage.setItem(
        INFO_STORAGE_KEY,
        encrypt && pin ? encryptWithAES(dataString, pin) : dataString
      )
    })

  // update funds in storage
  funds$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe(({ data }) => {
      const { encrypt } = settings$.getValue()
      const pin = pin$.getValue()

      const dataString = JSON.stringify(data)

      localStorage.setItem(
        FUNDS_STORAGE_KEY,
        encrypt && pin ? encryptWithAES(dataString, pin) : dataString
      )
    })

  // update payments in storage
  payments$.pipe(skip(1)).subscribe(({ data }) => {
    const { encrypt } = settings$.getValue()
    const pin = pin$.getValue()

    const dataString = JSON.stringify(data)

    localStorage.setItem(
      PAYMENTS_STORAGE_KEY,
      encrypt && pin ? encryptWithAES(dataString, pin) : dataString
    )
  })

  // get and update bitcoin exchange rate
  timer(0, 1 * MIN_IN_MS)
    .pipe(switchMap(() => from(getBitcoinExchangeRate())))
    .subscribe(bitcoinExchangeRates$)

  // when app is focused and have credentials and have payments, start listening if not already
  combineLatest([appVisible$, auth$, payments$])
    .pipe(withLatestFrom(listeningForAllInvoiceUpdates$))
    .subscribe(async ([[visible, auth, payments], listening]) => {
      if (payments.data && !payments.error && visible && auth && auth.token && !listening) {
        const lastPayIndex = deriveLastPayIndex(payments.data)

        initLn(auth)

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
      alert('RECONNECTING WEBSOCKET')
      await (ln as LnMessage).connect()
    })
}

export default registerSideEffects
