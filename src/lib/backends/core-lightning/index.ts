import { initLnSocket, rpcRequest } from './utils'

import type {
	GetinfoResponse,
	InvoiceRequest,
	InvoiceResponse,
	KeysendResponse,
	ListinvoicesResponse,
	ListpaysResponse,
	PayRequest,
	PayResponse,
	WaitInvoiceResponse
} from './types'
import type { Payment } from '$lib/types'
import Big from 'big.js'

async function init(): Promise<void> {
	await initLnSocket()
}

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

async function waitForInvoicePayment(payment: Payment): Promise<Payment> {
	const { id } = payment

	const result = await rpcRequest({
		method: 'waitinvoice',
		params: {
			label: id
		}
	})

	const { status, amount_received_msat, paid_at, payment_preimage } = result as WaitInvoiceResponse

	return {
		...payment,
		status: status === 'paid' ? 'complete' : 'expired',
		value: amount_received_msat || payment.value,
		completedAt: new Date((paid_at as number) * 1000).toISOString(),
		preimage: payment_preimage
	}
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

async function listInvoices(): Promise<ListinvoicesResponse> {
	const result = await rpcRequest({ method: 'listinvoices' })
	return result as ListinvoicesResponse
}

async function listPays(): Promise<ListpaysResponse> {
	const result = await rpcRequest({ method: 'listpays' })
	return result as ListpaysResponse
}

export default {
	init,
	getInfo,
	createInvoice,
	waitForInvoicePayment,
	payInvoice,
	payKeysend,
	listInvoices,
	listPays
}
