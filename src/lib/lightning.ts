import { firstValueFrom } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type { GetinfoResponse, Invoice, ListfundsResponse, LnAPI } from './backends'
import type { Payment } from './types'
import { initLn } from '$lib/backends'
import { invoiceToPayment } from './backends/core-lightning/utils'
import type { JsonRpcSuccessResponse } from 'lnmessage/dist/types'

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
  pin$
} from './streams'

let LN: LnAPI | null = null

export async function getLn(newInstance?: boolean): Promise<LnAPI> {
  if (!LN || newInstance) {
    const auth = auth$.getValue()

    if (!auth) {
      throw new Error('Authentication needed to create connection to node')
    }

    LN = initLn({ backend: 'core_lightning', auth })
  }

  return LN
}

export async function initialiseData() {
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
  await refreshData()

  const updatedPayments = payments$.getValue().data

  // 5. listen for invoices based on the last index of updated payments
  const lastPayIndex = updatedPayments ? deriveLastPayIndex(updatedPayments) : undefined
  listenForAllInvoiceUpdates(lastPayIndex)
}

export async function refreshData() {
  logger.info('Refreshing data')
  const lnApi = await getLn()

  await updateFunds(lnApi)
  await updateInfo(lnApi)
  await updatePayments(lnApi)

  logger.info('Refresh data complete')
}

export async function updateFunds(lnApi: LnAPI) {
  try {
    funds$.next({ loading: true, data: funds$.getValue().data })
    const funds = await lnApi.listFunds()
    funds$.next({ loading: false, data: funds })

    return funds
  } catch (error) {
    const { message } = error as Error
    funds$.next({ loading: false, data: null, error: message })
  }
}

export async function updateInfo(lnApi: LnAPI) {
  try {
    nodeInfo$.next({ loading: true, data: nodeInfo$.getValue().data })
    const info = await lnApi.getInfo()
    nodeInfo$.next({ loading: false, data: info })

    return info
  } catch (error) {
    const { message } = error as Error
    nodeInfo$.next({ loading: false, data: null, error: message })
  }
}

export async function updatePayments(lnApi: LnAPI) {
  try {
    payments$.next({ loading: true, data: payments$.getValue().data })
    const payments = await lnApi.getPayments()
    payments$.next({ loading: false, data: payments })

    return payments
  } catch (error) {
    const { message } = error as Error
    payments$.next({ loading: false, data: null, error: message })
  }
}

export async function listenForAllInvoiceUpdates(payIndex?: number): Promise<void> {
  listeningForAllInvoiceUpdates$.next(true)
  const lnApi = await getLn()
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
    invoice = await Promise.race([resultProm, disconnectProm])
  } else {
    // make a listen request for this pay index
    try {
      logger.info(`Listening for invoice updates after pay index: ${payIndex}`)

      const reqId = createRandomHex(8)
      localStorage.setItem(LISTEN_INVOICE_STORAGE_KEY, JSON.stringify({ payIndex, reqId }))
      invoice = await Promise.race([lnApi.waitAnyInvoice(payIndex, reqId), disconnectProm])
    } catch (error) {
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
  listenForAllInvoiceUpdates(newLastPayIndex)
}

export async function waitForAndUpdatePayment(payment: Payment): Promise<void> {
  const lnApi = await getLn()
  try {
    const update = await lnApi.waitForInvoicePayment(payment)
    paymentUpdates$.next(update)
  } catch (error) {
    //
  }
}
