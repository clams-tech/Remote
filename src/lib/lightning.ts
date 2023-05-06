import { get } from 'svelte/store'
import { firstValueFrom } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type { Invoice, OfferSummary, LnAPI } from './backends'
import type { Payment } from './@types/payments.js'
import { initLn } from '$lib/backends'
import { invoiceToPayment } from './backends/core-lightning/utils'
import type { JsonRpcSuccessResponse } from 'lnmessage/dist/types'
import { translate } from './i18n/translations'

import { LISTEN_INVOICE_STORAGE_KEY } from './constants'

import { createRandomHex, formatDecodedOffer, getDataFromStorage, logger } from './utils'

import {
  disconnect$,
  listeningForAllInvoiceUpdates$,
  paymentUpdates$,
  customNotifications$,
  loading$
} from './streams'
import { db, getLastPaymentIndex } from './db.js'
import type { Connection } from './@types/connections.js'

class Lightning {
  public ln: LnAPI

  constructor() {}

  public init(connection: Connection) {
    this.ln = initLn({ backend: 'core_lightning', auth: connection })
    return this.ln
  }

  public async initialiseData() {
    if (!this.ln) {
      const [connection] = await db.connections.toArray()
      this.init(connection)
    }

    // refresh all data on load (for now, ideally use sql plugin)
    await this.refreshData()

    const lastPayIndex = await getLastPaymentIndex()

    // start listening for payment updates again
    lightning.listenForAllInvoiceUpdates(lastPayIndex)
  }

  public async refreshData() {
    loading$.next(true)
    logger.info('Refreshing data')

    await Promise.all([
      // @TODO - need to change fetch functions to do the following
      // channels
      // nodes
      // offers
      // outputs
      // payments
      this.updateFunds(),
      this.updateInfo(),
      this.updatePayments(),
      this.getoffers()
    ])

    loading$.next(false)
    logger.info('Refresh data complete')
  }

  public async updateFunds() {
    try {
      const funds = await this.ln.listFunds()
      return funds
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      const errorMsg = get(translate)(`app.errors.${code}`, { default: message })
      // @TODO - do something with error message
    }
  }

  public async getoffers() {
    try {
      const [offers, invoiceRequests] = await Promise.all([
        this.ln.listOffers(),
        this.ln.listInvoiceRequests()
      ])

      const { default: decoder } = await import('bolt12-decoder')

      const data = [...offers, ...invoiceRequests].map((offer) => {
        const { bolt12, active, single_use, used, label } = offer as OfferSummary
        const decoded = decoder(bolt12)
        const formatted = formatDecodedOffer({ ...decoded, bolt12 })

        return {
          ...formatted,
          active,
          single_use,
          used,
          label
        }
      })

      await db.offers.bulkAdd(data)
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      const [node] = await db.nodes.toArray()

      db.errors.add({
        code,
        message,
        context: 'Trying to load offers and invoice requests',
        timestamp: Date.now(),
        nodeId: node.id
      })
    }
  }

  public async updateInfo() {
    try {
      const { alias, id, color, network, version } = await this.ln.getInfo()
      await db.nodes.add({ alias, id, color, network, version })
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      const [node] = await db.nodes.toArray()

      db.errors.add({
        code,
        message,
        context: 'Trying to load node info',
        timestamp: Date.now(),
        nodeId: node.id
      })
    }
  }

  public async updatePayments() {
    try {
      const payments = await this.ln.getPayments()
      await db.payments.bulkPut(payments)

      return payments
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      const [node] = await db.nodes.toArray()

      db.errors.add({
        code,
        message,
        context: 'Trying to load payments',
        timestamp: Date.now(),
        nodeId: node.id
      })
    }
  }

  public async updateChannels() {
    try {
      const channels = await this.ln.getChannels()

      return channels
    } catch (error) {
      const { message } = error as Error

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.update_channels')}: ${message}`
      })
    }
  }

  public async updateIncomeEvents() {
    try {
      const incomeEvents = await this.ln.bkprListIncome()

      return incomeEvents
    } catch (error) {
      const { message } = error as Error

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.bkpr_list_income')}: ${message}`
      })
    }
  }

  public async updateListBalances() {
    try {
      const balances = await this.ln.bkprListBalances()

      return balances
    } catch (error) {
      const { message } = error as Error

      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: get(translate)('app.errors.data_request'),
        message: `${get(translate)('app.errors.bkpr_list_balances')}: ${message}`
      })
    }
  }

  public async updateChannelsAPY() {
    try {
      const channelsAPY = await this.ln.bkprChannelsAPY()

      return channelsAPY
    } catch (error) {
      const { message } = error as Error

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
    const disconnectProm = firstValueFrom(disconnect$.pipe(map(() => null)))
    const listeningStorage = getDataFromStorage(LISTEN_INVOICE_STORAGE_KEY)
    const currentlyListening = listeningStorage && JSON.parse(listeningStorage)
    let invoice: Invoice | null = null

    if (currentlyListening && currentlyListening.payIndex === payIndex) {
      logger.info(
        `Already made a request to listen to pay index: ${payIndex} with reqId: ${currentlyListening.reqId}, so just waiting for response`
      )

      const resultProm = firstValueFrom(
        this.ln.connection.commandoMsgs$.pipe(
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

        invoice = await Promise.race([this.ln.waitAnyInvoice(payIndex, reqId), disconnectProm])
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
      const payment = await invoiceToPayment(invoice)
      paymentUpdates$.next(payment)
    }

    const newLastPayIndex = invoice.pay_index ? invoice.pay_index : payIndex
    this.listenForAllInvoiceUpdates(newLastPayIndex)
  }

  public async waitForAndUpdatePayment(payment: Payment): Promise<void> {
    try {
      const update = await this.ln.waitForInvoicePayment(payment)
      paymentUpdates$.next(update)
    } catch (error) {
      //
    }
  }
}

const lightning = new Lightning()

export default lightning
