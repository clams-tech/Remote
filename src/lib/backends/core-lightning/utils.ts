import { lnsocketProxy } from '$lib/constants'
import { credentials$ } from '$lib/streams'
import type { Payment } from '$lib/types'
import type { LNRequest, LNResponse, InvoiceStatus, Socket, ConnectOptions } from './types'

export async function connect({ publicKey, wsUrl }: ConnectOptions): Promise<Socket> {
	const LNSocket = await (window as any).lnsocket_init()
	const lnsocket = LNSocket()
	lnsocket.genkey()

	await lnsocket.connect_and_init(publicKey, wsUrl)

	return lnsocket
}

export function connectionToConnectOptions(connection: string): ConnectOptions {
	const [publicKey, host] = connection.split('@')
	const wsUrl = `${lnsocketProxy}/${host}`

	return { publicKey, wsUrl }
}

export async function rpcRequest(request: LNRequest): Promise<LNResponse> {
	const credentials = credentials$.getValue()

	if (!credentials.rune) {
		throw new Error('Credentials must be set before making rpc requests')
	}

	const { connection, rune } = credentials
	const connectOptions = connectionToConnectOptions(connection)
	const lnsocket = await connect(connectOptions)

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
