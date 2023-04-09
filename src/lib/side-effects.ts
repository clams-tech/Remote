import { from, merge, timer } from 'rxjs'
import lightning from '$lib/lightning'
import { deriveLastPayIndex, encryptWithAES, getBitcoinExchangeRate, logger } from './utils'

import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  skip,
  switchMap
} from 'rxjs/operators'

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
  payments$,
  paymentUpdates$,
  settings$,
  updatePayments,
  nodeInfo$,
  funds$,
  pin$,
  disconnect$
} from './streams'

function registerSideEffects() {
  // update payments when payment update comes through
  paymentUpdates$.subscribe(async (update) => {
    updatePayments(update)

    if (update.status === 'complete') {
      // delay 1 second to allow for updated data from node
      setTimeout(() => lightning.updateFunds(), 1000)
    }
  })

  // update settings in storage
  settings$.pipe(filter((x) => !!x)).subscribe((update) => {
    try {
      document.documentElement.classList[update.darkmode ? 'add' : 'remove']('dark')
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update))
    } catch (error) {
      logger.error('Could not save settings to storage, access to local storage denied')
    }
  })

  // update auth in storage
  auth$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe((auth) => {
      try {
        const { encrypt } = settings$.getValue()
        const pin = pin$.getValue()

        const dataString = JSON.stringify(auth)

        localStorage.setItem(
          AUTH_STORAGE_KEY,
          encrypt && pin ? encryptWithAES(dataString, pin) : dataString
        )
      } catch (error) {
        logger.error('Could not save auth to storage, access to local storage denied')
      }
    })

  // update info in storage
  nodeInfo$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe(({ data }) => {
      try {
        const { encrypt } = settings$.getValue()
        const pin = pin$.getValue()

        const dataString = JSON.stringify(data)

        localStorage.setItem(
          INFO_STORAGE_KEY,
          encrypt && pin ? encryptWithAES(dataString, pin) : dataString
        )
      } catch (error) {
        logger.error('Could not save node info to storage, access to local storage denied')
      }
    })

  // update funds in storage
  funds$
    .pipe(
      skip(1),
      filter((x) => !!x)
    )
    .subscribe(({ data }) => {
      try {
        const { encrypt } = settings$.getValue()
        const pin = pin$.getValue()

        const dataString = JSON.stringify(data)

        localStorage.setItem(
          FUNDS_STORAGE_KEY,
          encrypt && pin ? encryptWithAES(dataString, pin) : dataString
        )
      } catch (error) {
        logger.error('Could not save funds to storage, access to local storage denied')
      }
    })

  // update payments in storage
  payments$.pipe(skip(1)).subscribe(({ data }) => {
    try {
      const { encrypt } = settings$.getValue()
      const pin = pin$.getValue()

      const dataString = JSON.stringify(data)

      localStorage.setItem(
        PAYMENTS_STORAGE_KEY,
        encrypt && pin ? encryptWithAES(dataString, pin) : dataString
      )
    } catch (error) {
      logger.error('Could not save payments to storage, access to local storage denied')
    }
  })

  const exchangeRatePoll$ = timer(0, 5 * MIN_IN_MS)

  const fiatDenominationChange$ = settings$.pipe(
    distinctUntilKeyChanged('fiatDenomination'),
    skip(1)
  )

  // get and update bitcoin exchange rate by poll or if fiat denomination changes
  merge(exchangeRatePoll$, fiatDenominationChange$)
    .pipe(switchMap(() => from(getBitcoinExchangeRate())))
    .subscribe(bitcoinExchangeRates$)

  // manage connection based on app visibility
  appVisible$.pipe(skip(1), distinctUntilChanged()).subscribe(async (visible) => {
    const auth = auth$.getValue()
    if (!auth || !auth.token) return
    const lnApi = lightning.getLn()

    if (visible) {
      logger.info('App is visible, reconnecting to node')
      // reconnect
      lnApi.connect()
      const payments = payments$.getValue().data
      if (payments) {
        // start listening for payment updates again
        const lastPayIndex = deriveLastPayIndex(payments)
        lightning.listenForAllInvoiceUpdates(lastPayIndex)
      }
    } else {
      logger.info(
        'App is hidden, disconnecting from node and cancelling listening for any invoice updates'
      )
      // disconnect
      lnApi.disconnect()
      disconnect$.next()
    }
  })
}

export default registerSideEffects
