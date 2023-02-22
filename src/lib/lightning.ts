import { get } from 'svelte/store'
import { firstValueFrom } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type { GetinfoResponse, Invoice, ListfundsResponse, LnAPI } from './backends'
import type { Auth, Payment } from './types'
import { initLn } from '$lib/backends'
import { invoiceToPayment } from './backends/core-lightning/utils'
import type { JsonRpcSuccessResponse } from 'lnmessage/dist/types'
import { translate } from './i18n/translations'

import {
  FUNDS_STORAGE_KEY,
  INFO_STORAGE_KEY,
  LISTEN_INVOICE_STORAGE_KEY,
  PAYMENTS_STORAGE_KEY
} from './constants'

import {
  createRandomHex,
  decryptWithAES,
  deriveLastPayIndex,
  getDataFromStorage,
  logger
} from './utils'

import {
  auth$,
  disconnect$,
  funds$,
  listeningForAllInvoiceUpdates$,
  nodeInfo$,
  payments$,
  paymentUpdates$,
  customNotifications$,
  pin$,
  incomeEvents$,
  channelsAPY$
} from './streams'

class Lightning {
  public ln: LnAPI

  constructor() {}

  public getLn(initialAuth?: Auth): LnAPI {
    if (!this.ln || initialAuth) {
      const auth = initialAuth || auth$.getValue()

      if (!auth) {
        throw new Error('Authentication needed to create connection to node')
      }

      this.ln = initLn({ backend: 'core_lightning', auth })
    }

    return this.ln
  }

  public async initialiseData() {
    // 1. get and decrypt all cached data
    const storedInfo = getDataFromStorage(INFO_STORAGE_KEY)
    const storedFunds = getDataFromStorage(FUNDS_STORAGE_KEY)
    const storedPayments = getDataFromStorage(PAYMENTS_STORAGE_KEY)

    let info: GetinfoResponse
    let funds: ListfundsResponse
    let payments: Payment[] = []

    if (storedInfo && storedFunds && storedPayments) {
      const pin = pin$.getValue()

      if (pin) {
        // decrypt data
        info = JSON.parse(decryptWithAES(storedInfo, pin))
        funds = JSON.parse(decryptWithAES(storedFunds, pin))
        payments = JSON.parse(decryptWithAES(storedPayments, pin))
      } else {
        info = JSON.parse(storedInfo)
        funds = JSON.parse(storedFunds)
        payments = JSON.parse(storedPayments)
      }

      // 2. Set state so app is loaded with cached data
      nodeInfo$.next({ data: info as GetinfoResponse, loading: false })
      funds$.next({ data: funds as ListfundsResponse, loading: false })
      payments$.next({ data: payments as Payment[], loading: false })
    }

    // refresh all data on load
    await this.refreshData()

    const updatedPayments = payments$.getValue().data

    // 5. listen for invoices based on the last index of updated payments
    const lastPayIndex = updatedPayments ? deriveLastPayIndex(updatedPayments) : undefined
    this.listenForAllInvoiceUpdates(lastPayIndex)
  }

  public async refreshData() {
    logger.info('Refreshing data')
    await Promise.all([this.updateFunds(), this.updateInfo(), this.updatePayments()])

    logger.info('Refresh data complete')
  }

  public async updateFunds() {
    const lnApi = this.getLn()

    try {
      funds$.next({ loading: true, data: funds$.getValue().data })
      const funds = await lnApi.listFunds()
      funds$.next({ loading: false, data: funds })

      return funds
    } catch (error) {
      const { message } = error as Error
      funds$.next({ loading: false, data: null, error: message })

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.list_funds')}: ${message}`
      })
    }
  }

  public async updateInfo() {
    const lnApi = this.getLn()

    try {
      nodeInfo$.next({ loading: true, data: nodeInfo$.getValue().data })
      const info = await lnApi.getInfo()
      nodeInfo$.next({ loading: false, data: info })

      return info
    } catch (error) {
      const { message } = error as Error
      nodeInfo$.next({ loading: false, data: null, error: message })

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.get_info')}: ${message}`
      })
    }
  }

  public async updatePayments() {
    const lnApi = this.getLn()

    try {
      payments$.next({ loading: true, data: payments$.getValue().data })
      const payments = await lnApi.getPayments()
      payments$.next({ loading: false, data: payments })

      return payments
    } catch (error) {
      const { message } = error as Error
      payments$.next({ loading: false, data: null, error: message })

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.bkpr_list_income')}: ${message}`
      })
    }
  }

  public async updateIncomeEvents() {
    const lnApi = this.getLn()

    try {
      incomeEvents$.next({ loading: true, data: incomeEvents$.getValue().data })
      const { income_events } = await lnApi.bkprListIncome()
      incomeEvents$.next({ loading: false, data: income_events })

      return income_events
    } catch (error) {
      const { message } = error as Error
      incomeEvents$.next({ loading: false, data: null, error: message })

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.bkpr_list_income')}: ${message}`
      })
    }
  }

  public async updateChannelsAPY() {
    const lnApi = this.getLn()

    try {
      channelsAPY$.next({ loading: true, data: channelsAPY$.getValue().data })
      const { channels_apy } = await lnApi.bkprChannelsAPY()
      channelsAPY$.next({ loading: false, data: channels_apy })

      return channels_apy
    } catch (error) {
      const { message } = error as Error
      channelsAPY$.next({ loading: false, data: null, error: message })

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.bkpr_channels_apy')}: ${message}`
      })
    }
  }

  public async listenForAllInvoiceUpdates(payIndex?: number): Promise<void> {
    listeningForAllInvoiceUpdates$.next(true)
    const lnApi = this.getLn()
    const disconnectProm = firstValueFrom(disconnect$.pipe(map(() => null)))
    const listeningStorage = getDataFromStorage(LISTEN_INVOICE_STORAGE_KEY)
    const currentlyListening = listeningStorage && JSON.parse(listeningStorage)
    let invoice: Invoice | null = null

    if (currentlyListening && currentlyListening.payIndex === payIndex) {
      logger.info(
        `Already made a request to listen to pay index: ${payIndex} with reqId: ${currentlyListening.reqId}, so just waiting for response`
      )

      const resultProm = firstValueFrom(
        lnApi.connection.commandoMsgs$.pipe(
          filter(({ reqId }) => reqId === currentlyListening.reqId),
          map((response) => (response as JsonRpcSuccessResponse).result as Invoice)
        )
      )

      invoice = (await Promise.race([resultProm, disconnectProm])) as Invoice | null
    } else {
      // make a listen request for this pay index
      try {
        logger.info(`Listening for invoice updates after pay index: ${payIndex}`)

        const reqId = createRandomHex(8)

        try {
          localStorage.setItem(LISTEN_INVOICE_STORAGE_KEY, JSON.stringify({ payIndex, reqId }))
        } catch (error) {
          throw new Error(
            'Could not save invoice index to local storage, so will not listen for all invoices'
          )
        }

        invoice = await Promise.race([lnApi.waitAnyInvoice(payIndex, reqId), disconnectProm])
      } catch (error) {
        const { message } = error as { message: string }

        customNotifications$.next({
          id: createRandomHex(),
          type: 'error',
          heading: get(translate)('app.errors.data_request'),
          message: `${get(translate)('app.errors.listen_invoice')}: ${message}`
        })

        listeningForAllInvoiceUpdates$.next(false)
      }
    }
    // disconnected
    if (!invoice) return
    logger.info(`Invoice update received with status: ${invoice.status}`)

    if (invoice.status !== 'unpaid') {
      const payment = invoiceToPayment(invoice)
      paymentUpdates$.next(payment)
    }

    const newLastPayIndex = invoice.pay_index ? invoice.pay_index : payIndex
    this.listenForAllInvoiceUpdates(newLastPayIndex)
  }

  public async waitForAndUpdatePayment(payment: Payment): Promise<void> {
    const lnApi = this.getLn()
    try {
      const update = await lnApi.waitForInvoicePayment(payment)
      paymentUpdates$.next(update)
    } catch (error) {
      //
    }
  }
}

const lightning = new Lightning()

export default lightning
