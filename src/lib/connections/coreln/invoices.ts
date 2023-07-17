import Big from 'big.js'
import { nowSeconds } from '$lib/utils.js'
import { formatInvoice, payToPayment, stripMsatSuffix } from './utils.js'
import type { InvoicesInterface } from '../interfaces.js'
import handleError from './error.js'
import { filter, firstValueFrom, from, map, merge, take, takeUntil } from 'rxjs'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions,
  Invoice
} from '$lib/@types/invoices.js'

import type {
  CorelnConnectionInterface,
  CoreLnError,
  InvoiceResponse,
  KeysendResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types.js'
import { isBolt12Invoice } from '$lib/invoices.js'

class Invoices implements InvoicesInterface {
  connection: CorelnConnectionInterface
  destroyed: boolean
  listeningPayIndex: number | null

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
    this.destroyed = false
    this.listeningPayIndex = null

    this.connection.destroy$.pipe(take(1)).subscribe(() => {
      this.destroyed = true
    })
  }

  async get(): Promise<Invoice[]> {
    try {
      const [invoicesResponse, paysResponse] = await Promise.all([
        this.connection.rpc({ method: 'listinvoices' }),
        this.connection.rpc({ method: 'listpays' })
      ])

      const { invoices } = invoicesResponse as ListinvoicesResponse
      const { pays } = paysResponse as ListpaysResponse

      const invoicePayments: Invoice[] = await Promise.all(
        invoices.map((invoice) => formatInvoice(invoice, this.connection.info.connectionId))
      )

      const sentPayments: Invoice[] = await Promise.all(
        pays.map((pay) => payToPayment(pay, this.connection.info.connectionId))
      )

      return invoicePayments.concat(sentPayments)
    } catch (error) {
      const context = 'get (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async createInvoice(options: CreateInvoiceOptions): Promise<Invoice> {
    try {
      const { id, amount, description, expiry } = options
      const startedAt = nowSeconds()

      const result = await this.connection.rpc({
        method: 'invoice',
        params: {
          label: id,
          amount_msat: amount,
          description,
          expiry
        }
      })

      const { bolt11, expires_at, payment_hash, payment_secret } = result as InvoiceResponse

      const payment: Invoice = {
        id,
        status: 'pending',
        direction: 'receive',
        value: amount,
        fee: null,
        type: 'bolt11',
        startedAt,
        completedAt: null,
        expiresAt: expires_at,
        request: bolt11,
        nodeId: this.connection.info.id,
        description,
        hash: payment_hash,
        preimage: payment_secret,
        connectionId: this.connection.info.connectionId
      }

      return payment
    } catch (error) {
      const context = 'createInvoice (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async payInvoice(options: PayInvoiceOptions): Promise<Invoice> {
    try {
      const { request, id, amount, description } = options

      const result = await this.connection.rpc({
        method: 'pay',
        params: {
          label: id,
          bolt11: request,
          amount_msat: amount,
          description
        }
      })

      const {
        payment_hash,
        payment_preimage,
        created_at,
        amount_msat,
        amount_sent_msat,
        status,
        destination
      } = result as PayResponse

      return {
        id,
        hash: payment_hash,
        preimage: payment_preimage,
        nodeId: destination,
        type: isBolt12Invoice(request) ? 'bolt12' : 'bolt11',
        direction: 'send',
        value: stripMsatSuffix(amount_msat),
        completedAt: nowSeconds(),
        expiresAt: null,
        startedAt: created_at,
        fee: Big(stripMsatSuffix(amount_sent_msat)).minus(stripMsatSuffix(amount_msat)).toString(),
        status,
        request,
        connectionId: this.connection.info.connectionId
      }
    } catch (error) {
      const context = 'payInvoice (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async payKeysend(options: PayKeysendOptions): Promise<Invoice> {
    try {
      const { destination, id, amount } = options

      const result = await this.connection.rpc({
        method: 'keysend',
        params: {
          label: id,
          destination,
          amount_msat: amount
        }
      })

      const { payment_hash, payment_preimage, created_at, amount_msat, amount_sent_msat, status } =
        result as KeysendResponse

      const amountMsat = stripMsatSuffix(amount_msat)

      // get the invoice by payment_hash for request parameter of Invoice type
      const listInvoiceResult = await this.connection.rpc({
        method: 'listinvoice',
        params: { payment_hash }
      })

      const {
        invoices: [{ bolt11 }]
      } = listInvoiceResult as ListinvoicesResponse

      return {
        id,
        hash: payment_hash,
        preimage: payment_preimage,
        nodeId: destination,
        type: 'bolt11',
        direction: 'send',
        value: amountMsat,
        completedAt: nowSeconds(),
        expiresAt: null,
        startedAt: created_at,
        fee: Big(stripMsatSuffix(amount_sent_msat)).minus(amountMsat).toString(),
        status,
        connectionId: this.connection.info.connectionId,
        request: bolt11 as string
      }
    } catch (error) {
      const context = 'payKeysend (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForInvoicePayment(payment: Invoice): Promise<Invoice> {
    try {
      const { id } = payment

      const result = await this.connection.rpc({
        method: 'waitinvoice',
        params: {
          label: id
        }
      })

      const { status, amount_received_msat, paid_at, payment_preimage } =
        result as WaitInvoiceResponse

      return {
        ...payment,
        status: status === 'paid' ? 'complete' : 'expired',
        value: stripMsatSuffix(amount_received_msat || payment.value),
        completedAt: paid_at as number,
        preimage: payment_preimage
      }
    } catch (error) {
      const context = 'listenForInvoicePayment (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForAnyInvoicePayment(
    onPayment: (invoice: Invoice) => Promise<void>,
    payIndex?: Invoice['payIndex']
  ): Promise<void> {
    try {
      this.listeningPayIndex = payIndex || null

      const request$ = from(
        this.connection.rpc({
          method: 'waitanyinvoice',
          params: { lastpay_index: payIndex }
        })
      )

      const disconnect$ = this.connection.connectionStatus$.pipe(
        filter((status) => status === 'disconnected'),
        map(() => ({ disconnected: true }))
      )

      const response = await firstValueFrom(merge(request$, disconnect$))

      const { disconnected } = response as { disconnected: boolean }

      // if socket disconnected and not destroyed, relisten for invoice payment
      if (disconnected) {
        if (!this.destroyed) {
          await firstValueFrom(
            this.connection.connectionStatus$.pipe(
              filter((status) => status === 'connected'),
              takeUntil(this.connection.destroy$)
            )
          )

          if (!this.destroyed) {
            return this.listenForAnyInvoicePayment(onPayment, payIndex)
          }
        }
      } else {
        const formattedInvoice = await formatInvoice(
          response as WaitAnyInvoiceResponse,
          this.connection.info.connectionId
        )

        onPayment(formattedInvoice)

        // only listen for next pay index if not already listening
        if (this.listeningPayIndex !== formattedInvoice.payIndex) {
          return this.listenForAnyInvoicePayment(onPayment, formattedInvoice.payIndex)
        }
      }
    } catch (error) {
      console.error(error)
      const context = 'listenForAnyInvoicePayment (payments)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Invoices
