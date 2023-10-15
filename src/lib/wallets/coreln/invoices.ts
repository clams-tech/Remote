import Big from 'big.js'
import { nowSeconds } from '$lib/utils.js'
import { formatInvoice, formatMsatString } from './utils.js'
import type { InvoicesInterface } from '../interfaces.js'
import handleError from './error.js'
import { filter, firstValueFrom, from, map, merge, take, takeUntil } from 'rxjs'
import { isBolt12Invoice } from '$lib/invoices.js'
import { msatsToSats, satsToMsats } from '$lib/conversion.js'
import { formatPayments } from './worker.js'
import type { InvoicePayment } from '$lib/@types/payments.js'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions
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

  async get(): Promise<InvoicePayment[]> {
    try {
      const [invoicesResponse, paysResponse] = await Promise.all([
        this.connection.rpc({ method: 'listinvoices' }),
        this.connection.rpc({ method: 'listpays' })
      ])

      const { invoices } = invoicesResponse as ListinvoicesResponse
      const { pays } = paysResponse as ListpaysResponse

      const formatted = await formatPayments(
        invoices,
        pays,
        this.connection.walletId,
        this.connection.info.network
      )
      return formatted
    } catch (error) {
      const context = 'get (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async create(options: CreateInvoiceOptions): Promise<InvoicePayment> {
    try {
      const { id, amount, description, expiry } = options
      const createdAt = nowSeconds()

      const result = await this.connection.rpc({
        method: 'invoice',
        params: {
          label: id,
          amount_msat: amount === 0 ? 'any' : satsToMsats(amount),
          description,
          expiry
        }
      })

      const { bolt11, expires_at, payment_hash, payment_secret } = result as InvoiceResponse

      const payment: InvoicePayment = {
        id: payment_hash,
        status: 'pending',
        timestamp: createdAt,
        direction: 'receive',
        walletId: this.connection.walletId,
        network: this.connection.info.network,
        type: 'invoice',
        data: {
          amount,
          fee: undefined,
          type: 'bolt11',
          createdAt,
          completedAt: undefined,
          expiresAt: expires_at,
          request: bolt11,
          description,
          preimage: payment_secret
        }
      }

      return payment
    } catch (error) {
      const context = 'createInvoice (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async pay(options: PayInvoiceOptions): Promise<InvoicePayment> {
    try {
      const { request, id, amount, description } = options

      const result = await this.connection.rpc({
        method: 'pay',
        params: {
          label: id,
          bolt11: request,
          amount_msat: amount && satsToMsats(amount),
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

      const completedAt = nowSeconds()

      return {
        id: payment_hash,
        timestamp: completedAt,
        direction: 'send',
        status,
        walletId: this.connection.walletId,
        network: this.connection.info.network,
        type: 'invoice',
        data: {
          preimage: payment_preimage,
          counterpartyNode: destination,
          type: isBolt12Invoice(request) ? 'bolt12' : 'bolt11',
          amount: msatsToSats(formatMsatString(amount_msat)),
          completedAt,
          expiresAt: undefined,
          createdAt: created_at,
          fee: msatsToSats(
            Big(formatMsatString(amount_sent_msat)).minus(formatMsatString(amount_msat)).toString()
          ),
          request
        }
      }
    } catch (error) {
      const context = 'payInvoice (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async keysend(options: PayKeysendOptions): Promise<InvoicePayment> {
    try {
      const { destination, id, amount, tlvs } = options
      const amountMsat = satsToMsats(amount)

      const result = await this.connection.rpc({
        method: 'keysend',
        params: {
          label: id,
          destination,
          amount_msat: amountMsat,
          extratlvs: tlvs
        }
      })

      const { payment_hash, payment_preimage, created_at, amount_sent_msat, status } =
        result as KeysendResponse

      const completedAt = nowSeconds()

      return {
        id: payment_hash,
        direction: 'send',
        timestamp: completedAt,
        status,
        walletId: this.connection.walletId,
        network: this.connection.info.network,
        type: 'invoice',
        data: {
          preimage: payment_preimage,
          counterpartyNode: destination,
          type: 'bolt11',
          amount,
          completedAt,
          expiresAt: undefined,
          createdAt: created_at,
          fee: msatsToSats(Big(formatMsatString(amount_sent_msat)).minus(amountMsat).toString())
        }
      }
    } catch (error) {
      const context = 'payKeysend (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForInvoicePayment(payment: InvoicePayment): Promise<InvoicePayment> {
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
        data: {
          ...payment.data,
          amount: msatsToSats(formatMsatString(amount_received_msat || payment.data.amount)),
          completedAt: paid_at as number,
          preimage: payment_preimage
        }
      }
    } catch (error) {
      const context = 'listenForInvoicePayment (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForAnyInvoicePayment(
    onPayment: (payment: InvoicePayment) => Promise<void>,
    payIndex?: number
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
        filter(status => status === 'disconnected'),
        map(() => ({ disconnected: true }))
      )

      const response = await firstValueFrom(merge(request$, disconnect$))

      const { disconnected } = response as { disconnected: boolean }

      // if socket disconnected and not destroyed, relisten for invoice payment
      if (disconnected) {
        if (!this.destroyed) {
          await firstValueFrom(
            this.connection.connectionStatus$.pipe(
              filter(status => status === 'connected'),
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
          this.connection.walletId,
          this.connection.info.network
        )

        onPayment(formattedInvoice)

        // only listen for next pay index if not already listening
        if (this.listeningPayIndex !== formattedInvoice.data.payIndex) {
          return this.listenForAnyInvoicePayment(onPayment, formattedInvoice.data.payIndex)
        }
      }
    } catch (error) {
      const context = 'listenForAnyInvoicePayment (payments)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Invoices
