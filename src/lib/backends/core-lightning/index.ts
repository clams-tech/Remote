import { initLnSocket, rpcRequest } from './utils'
import type { GetinfoResponse, ListinvoicesResponse, ListpaysResponse } from './types'

async function init(): Promise<void> {
	await initLnSocket()
}

async function getInfo(): Promise<GetinfoResponse> {
	const result = await rpcRequest({ method: 'getinfo' })
	return result as GetinfoResponse
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
	listInvoices,
	listPays
}
