import Big from 'big.js'
import { decode } from 'light-bolt11-decoder'
import { invoiceStatusToPaymentStatus, rpcRequest } from './utils'
import type { Payment, PaymentStatus } from '$lib/types'
import { formatDecodedInvoice, sortPaymentsMostRecent } from '$lib/utils'
import { firstValueFrom, timer } from 'rxjs'
import { switchMap, filter, map } from 'rxjs/operators'

import type {
	GetinfoResponse,
	InvoiceRequest,
	InvoiceResponse,
	KeysendResponse,
	ListfundsResponse,
	ListinvoicesResponse,
	ListpaysResponse,
	PayResponse
} from './types'

async function getInfo(): Promise<GetinfoResponse> {
	const result = await rpcRequest({ method: 'getinfo' })
	return result as GetinfoResponse
}

async function createInvoice(params: InvoiceRequest['params']): Promise<Payment> {
	const { label, amount_msat, description } = params
	const startedAt = new Date().toISOString()

	const result = await rpcRequest({
		method: 'invoice',
		params
	})

	const { bolt11, expires_at, payment_hash, payment_secret } = result as InvoiceResponse

	const payment: Payment = {
		id: label,
		status: 'pending',
		direction: 'receive',
		value: amount_msat,
		fee: null,
		type: 'payment_request',
		startedAt,
		completedAt: null,
		expiresAt: new Date(expires_at * 1000).toISOString(),
		bolt11,
		description,
		hash: payment_hash,
		preimage: payment_secret
	}

	return payment
}

// async function waitForInvoicePayment(payment: Payment): Promise<Payment> {
// 	const { id } = payment

// 	const result = await rpcRequest({
// 		method: 'waitinvoice',
// 		params: {
// 			label: id
// 		}
// 	})

// 	const { status, amount_received_msat, paid_at, payment_preimage } = result as WaitInvoiceResponse

// 	return {
// 		...payment,
// 		status: status === 'paid' ? 'complete' : 'expired',
// 		value: amount_received_msat || payment.value,
// 		completedAt: new Date((paid_at as number) * 1000).toISOString(),
// 		preimage: payment_preimage
// 	}
// }

// need to poll for the moment due to current limitations in lnsocket library
async function waitForInvoicePayment(payment: Payment): Promise<Payment> {
	const result$ = timer(0, 1000).pipe(
		switchMap(() =>
			rpcRequest({
				method: 'listinvoices',
				params: {
					label: payment.id
				}
			})
		),
		map((result) => {
			const { invoices } = result as ListinvoicesResponse
			return invoices[0]
		}),
		filter((invoice) => invoice.status !== 'unpaid'),
		map(({ status, amount_received_msat, paid_at, payment_preimage }) => {
			return {
				...payment,
				status: (status === 'paid' ? 'complete' : 'expired') as PaymentStatus,
				value: amount_received_msat || payment.value,
				completedAt: new Date((paid_at as number) * 1000).toISOString(),
				preimage: payment_preimage
			}
		})
	)

	return firstValueFrom(result$)
}

async function payInvoice(options: {
	bolt11: string
	id: string
	amount_msat?: string
}): Promise<Payment> {
	const { bolt11, id, amount_msat: send_msat } = options

	const result = await rpcRequest({
		method: 'pay',
		params: {
			label: id,
			bolt11,
			amount_msat: send_msat
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
		destination,
		type: 'payment_request',
		direction: 'send',
		value: amount_msat,
		completedAt: new Date().toISOString(),
		expiresAt: null,
		startedAt: new Date(created_at * 1000).toISOString(),
		fee: Big(amount_sent_msat).minus(amount_msat).toString(),
		status,
		bolt11
	}
}

async function payKeysend(options: {
	destination: string
	id: string
	amount_msat: string
}): Promise<Payment> {
	const { destination: send_destination, id, amount_msat: send_msat } = options

	const result = await rpcRequest({
		method: 'keysend',
		params: {
			label: id,
			destination: send_destination,
			amount_msat: send_msat
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
	} = result as KeysendResponse

	return {
		id,
		hash: payment_hash,
		preimage: payment_preimage,
		destination,
		type: 'payment_request',
		direction: 'send',
		value: amount_msat,
		completedAt: new Date().toISOString(),
		expiresAt: null,
		startedAt: new Date(created_at * 1000).toISOString(),
		fee: Big(amount_sent_msat).minus(amount_msat).toString(),
		status,
		bolt11: null
	}
}

async function getPayments(): Promise<Payment[]> {
	const [{ invoices }, { pays }] = await Promise.all([listInvoices(), listPays()])

	const invoicePayments: Payment[] = invoices.map(
		({
			label,
			bolt11,
			payment_hash,
			amount_received_msat,
			amount_msat,
			status,
			paid_at,
			payment_preimage,
			description,
			expires_at
		}) => {
			const decodedInvoice = decode(bolt11)
			const { timestamp } = formatDecodedInvoice(decodedInvoice)

			return {
				id: label || payment_hash,
				bolt11: bolt11 || null,
				hash: payment_hash,
				direction: 'receive',
				type: 'payment_request',
				preimage: payment_preimage,
				value: (amount_received_msat || amount_msat) as string,
				status: invoiceStatusToPaymentStatus(status),
				completedAt: paid_at ? new Date(paid_at * 1000).toISOString() : null,
				expiresAt: new Date(expires_at * 1000).toISOString(),
				description,
				destination: undefined,
				fee: null,
				startedAt: new Date(timestamp * 1000).toISOString()
			}
		}
	)

	const sentPayments: Payment[] = pays.map(
		({
			bolt11,
			destination,
			payment_hash,
			status,
			created_at,
			label,
			preimage,
			amount_msat,
			amount_sent_msat
		}) => {
			const timestamp = new Date(created_at * 1000).toISOString()

			const decodedInvoice = bolt11 && decode(bolt11)

			const { description } = decodedInvoice
				? formatDecodedInvoice(decodedInvoice)
				: { description: undefined }

			return {
				id: label || payment_hash,
				destination,
				bolt11: bolt11 || null,
				status,
				startedAt: timestamp,
				hash: payment_hash,
				preimage,
				value: amount_msat,
				fee: Big(amount_sent_msat).minus(amount_msat).toString(),
				direction: 'send',
				type: bolt11 ? 'payment_request' : 'node_public_key',
				expiresAt: null,
				completedAt: timestamp,
				description
			}
		}
	)

	return sortPaymentsMostRecent(invoicePayments.concat(sentPayments))
}

async function listInvoices(): Promise<ListinvoicesResponse> {
	const result = await rpcRequest({ method: 'listinvoices' })
	return result as ListinvoicesResponse
}

async function listPays(): Promise<ListpaysResponse> {
	const result = await rpcRequest({ method: 'listpays' })
	return result as ListpaysResponse
}

async function listFunds(): Promise<ListfundsResponse> {
	const result = await rpcRequest({ method: 'listfunds' })
	return result as ListfundsResponse
}

export default {
	getInfo,
	createInvoice,
	waitForInvoicePayment,
	payInvoice,
	payKeysend,
	getPayments,
	listFunds
}
