import { credentials$ } from '$lib/streams'
import { firstValueFrom, Subject } from 'rxjs'
import { filter, map } from 'rxjs/operators'
import type { LNRequest, LNResponse, Socket, CoreLnCredentials, ErrorResponse } from './types'

let lnsocket: Socket
let socketDestroyed = false
let processing = false

const requestQueue: { id: string; request: LNRequest }[] = []
const responseStream$ = new Subject<{
	id: string
	response: { result: LNResponse; error?: ErrorResponse }
}>()

export async function initLnSocket() {
	socketDestroyed = false
	const LNSocket = await (window as any).lnsocket_init()

	lnsocket = LNSocket()
	lnsocket.genkey()
}

async function processRequests(credentials: CoreLnCredentials) {
	processing = true

	if (socketDestroyed) {
		await initLnSocket()
	}

	const { protocol, ip, port, proxy, publicKey } = credentials
	const url = proxy ? `${protocol}//${proxy}/${ip}:${port}` : `${protocol}//${ip}:${port}`

	await lnsocket.connect_and_init(publicKey, url)

	while (requestQueue.length) {
		// take all elements from que
		const toProcess = requestQueue.splice(0)
		const responses = await Promise.all(
			toProcess.map(async ({ id, request }) => {
				const response = await lnsocket.rpc({ ...request, rune: credentials.rune })

				return { response: response, id }
			})
		)

		responses.forEach((response) => responseStream$.next(response))
	}

	processing = false
	lnsocket.destroy()
	socketDestroyed = true
}

export async function rpcRequest(request: LNRequest): Promise<LNResponse> {
	const credentials = credentials$.getValue()

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
					throw new Error(response.error.message)
				}

				return response.result
			})
		)
	)
}
