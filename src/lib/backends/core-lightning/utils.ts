import { lnsocketProxy } from '$lib/constants'
import { credentials$ } from '$lib/streams'
import type { Payment } from '$lib/types'
import { firstValueFrom, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type {
	LNRequest,
	LNResponse,
	Socket,
	CoreLnCredentials,
	ErrorResponse,
	InvoiceStatus
} from './types'

let lnsocket: Socket
let processing = false

const requestQueue: { id: string; request: LNRequest }[] = []

const responseStream$ = new Subject<{
	id: string
	response: { result: LNResponse; error?: ErrorResponse }
}>()

export async function initLnSocket() {
	console.log('CREATING SOCKET')
	const LNSocket = await (window as any).lnsocket_init()

	lnsocket = LNSocket()
	lnsocket.genkey()
}

async function processRequests(credentials: CoreLnCredentials) {
	console.log('PROCESSING REQUESTS')
	processing = true

	await initLnSocket()

	const { connection, rune } = credentials

	const [publicKey, host] = connection.split('@')

	console.log('INITIATING CONNECTION TO NODE')
	try {
		await lnsocket.connect_and_init(publicKey, `${lnsocketProxy}/${host}`)
	} catch (error) {
		console.log('ERROR CONNECTING TO NODE:', error)
		return
	}

	while (requestQueue.length) {
		const { id, request } = requestQueue.shift() as { id: string; request: LNRequest }
		const response = await lnsocket.rpc({ ...request, rune })

		responseStream$.next({ id, response })
	}

	lnsocket.destroy()
	processing = false
	console.log('FINISHED PROCESSING REQUESTS')
}

export async function rpcRequest(request: LNRequest): Promise<LNResponse> {
	const credentials = credentials$.getValue()

	if (!credentials.rune) {
		throw new Error('Credentials must be set before making rpc requests')
	}

	const id = crypto.randomUUID()
	requestQueue.push({ request, id })

	if (!processing) {
		processRequests(credentials)
	}

	return firstValueFrom(
		responseStream$.pipe(
			filter((response) => response.id === id),
			map(({ response }) => {
				if (response.error) {
					throw response.error
				}

				return response.result
			})
		)
	)
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
