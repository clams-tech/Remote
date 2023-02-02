import { from, timer } from 'rxjs'
import { distinctUntilChanged, filter, skip, switchMap } from 'rxjs/operators'
import { deriveLastPayIndex, encryptWithAES, getBitcoinExchangeRate, logger } from './utils'
import lightning from '$lib/lightning'

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
      const lnApi = lightning.getLn()
      // delay 1 second to allow for updated data from node
      setTimeout(() => lightning.updateFunds(lnApi), 1000)
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

  // get and update bitcoin exchange rate
  timer(0, 1 * MIN_IN_MS)
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
