import { combineLatest, from, timer } from 'rxjs'

import {
  distinctUntilKeyChanged,
  filter,
  skip,
  switchMap,
  take,
  withLatestFrom
} from 'rxjs/operators'

import { coreLn } from './backends'
import LnMessage from 'lnmessage'
import { AUTH_STORAGE_KEY, lnsocketProxy, MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { deriveLastPayIndex, getBitcoinExchangeRate, parseNodeAddress } from './utils'
import type { JsonRpcRequest } from 'lnmessage/dist/types'

import {
  appVisible$,
  bitcoinExchangeRates$,
  auth$,
  listeningForAllInvoiceUpdates$,
  nodeInfo$,
  payments$,
  paymentUpdates$,
  funds$,
  settings$,
  updatePayments,
  listenForAllInvoiceUpdates,
  connection$
} from './streams'

function registerSideEffects() {
  // once we have credentials, go ahead and fetch initial data
  auth$
    .pipe(
      filter(({ address, token }) => !!(address && token)),
      withLatestFrom(connection$),
      take(1)
    )
    .subscribe(async ([{ address, token, sessionSecret }, ln]) => {
      // store credentials when they change
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ address, token, sessionSecret }))

      const { publicKey, ip, port } = parseNodeAddress(address)

      if (!ln) {
        // create connection to node
        ln = new LnMessage({
          remoteNodePublicKey: publicKey,
          wsProxy: lnsocketProxy,
          ip,
          port: port || 9735,
          privateKey: sessionSecret
          // logger: {
          //   info: console.log,
          //   warn: console.warn,
          //   error: console.error
          // }
        })

        await ln.connect()

        connection$.next(ln)
      }

      // init coreLn service
      coreLn.init({
        request: (request: JsonRpcRequest & { rune: string }) =>
          (ln as LnMessage).commando(request),
        rune: token
      })

      try {
        const funds = await coreLn.listFunds()
        funds$.next({ loading: false, data: funds })
      } catch (error) {
        const { message } = error as Error
        funds$.next({ loading: false, data: null, error: message })
      }

      try {
        const info = await coreLn.getInfo()
        nodeInfo$.next({ loading: false, data: info })
      } catch (error) {
        const { message } = error as Error
        nodeInfo$.next({ loading: false, data: null, error: message })
      }

      try {
        const payments = await coreLn.getPayments()
        payments$.next({ loading: false, data: payments })
      } catch (error) {
        const { message } = error as Error
        payments$.next({ loading: false, data: null, error: message })
      }
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

  // when app is focused and have credentials and have payments, start listening if not already
  combineLatest([appVisible$, auth$, payments$])
    .pipe(withLatestFrom(listeningForAllInvoiceUpdates$))
    .subscribe(([[visible, auth, payments], listening]) => {
      if (payments.data && !payments.error && visible && auth.token && !listening) {
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
