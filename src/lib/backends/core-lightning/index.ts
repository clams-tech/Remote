import { initLnSocket, rpcRequest } from './utils'

import type {
	GetinfoResponse,
	InvoiceRequest,
	InvoiceResponse,
	ListinvoicesResponse,
	ListpaysResponse,
	WaitInvoiceResponse
} from './types'
import type { Payment } from '$lib/types'

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
		status: status === 'paid' ? 'completed' : 'expired',
		value: amount_received_msat || payment.value,
		completedAt: new Date((paid_at as number) * 1000).toISOString(),
		preimage: payment_preimage
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
	listInvoices,
	listPays
}
