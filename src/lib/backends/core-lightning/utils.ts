import { firstValueFrom, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type { LNRequest, LNResponse, Socket, CoreLnCredentials, ErrorResponse } from './types'

let credentials: CoreLnCredentials
let lnsocket: Socket
let socketDestroyed = false
let processing = false

const requestQueue: { id: string; request: LNRequest }[] = []
let awaitingResponseQueue: string[] = []

const responseStream$ = new Subject<{
	id: string
	response: { result: LNResponse; error?: ErrorResponse }
}>()

responseStream$.subscribe(({ id }) => {
	// remove from awaiting reponse queue
	console.log(`REMOVING RESPONSE ID: ${id} FROM AWAITING RESPONSE QUEUE`)
	awaitingResponseQueue = awaitingResponseQueue.filter((responseId) => id !== responseId)

	// if not waiting on anymore responses a not processing more requests
	if (awaitingResponseQueue.length === 0 && !processing) {
		console.log('RESPONSE QUEUE IS EMPTY AND NOT PROCESSING, SO DESTROYING CONNECTION')
		lnsocket.destroy()
		socketDestroyed = true
	}
})

export async function initLnSocket(creds: CoreLnCredentials) {
	if (!credentials) {
		credentials = creds
	}

	console.log('CREATING SOCKET')
	socketDestroyed = false
	const LNSocket = await (window as any).lnsocket_init()

	lnsocket = LNSocket()
	lnsocket.genkey()
}

async function processRequests(credentials: CoreLnCredentials) {
	console.log('PROCESSING REQUESTS')
	processing = true

	if (!lnsocket || socketDestroyed) {
		await initLnSocket(credentials)
	}

	const { protocol, ip, port, proxy, publicKey } = credentials
	const url = proxy ? `${protocol}//${proxy}/${ip}:${port}` : `${protocol}//${ip}:${port}`

	console.log('INITIATING CONNECTION TO NODE')
	await lnsocket.connect_and_init(publicKey, url)

	while (requestQueue.length) {
		// take all elements from queue
		const toProcess = requestQueue.splice(0)

		const responses = toProcess.map(({ id, request }) => {
			lnsocket
				.rpc({ ...request, rune: credentials.rune })
				.then((response) => responseStream$.next({ id, response }))

			return id
		})

		awaitingResponseQueue.push(...responses)
	}

	processing = false
	console.log('FINISHED PROCESSING REQUESTS')
}

export async function rpcRequest(request: LNRequest): Promise<LNResponse> {
	if (!credentials) {
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
