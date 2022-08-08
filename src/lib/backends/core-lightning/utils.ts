import { lnsocketProxy } from '$lib/constants'
import { credentials$ } from '$lib/streams'
import type { Payment } from '$lib/types'
import type { LNRequest, LNResponse, InvoiceStatus } from './types'

export async function rpcRequest(request: LNRequest): Promise<LNResponse> {
	const credentials = credentials$.getValue()

	if (!credentials.rune) {
		throw new Error('Credentials must be set before making rpc requests')
	}

	const LNSocket = await (window as any).lnsocket_init()
	const lnsocket = LNSocket()
	lnsocket.genkey()

	const { connection, rune } = credentials
	const [publicKey, host] = connection.split('@')

	await lnsocket.connect_and_init(publicKey, `${lnsocketProxy}/${host}`)

	const response = await lnsocket.rpc({ ...request, rune })

	lnsocket.destroy()

	if (response.error) {
		throw response.error
	}

	return response.result
}

export function invoiceStatusToPaymentStatus(status: InvoiceStatus): Payment['status'] {
	switch (status) {
		case 'paid':
			return 'complete'
		case 'unpaid':
			return 'pending'
		default:
			return 'expired'
	}
}
