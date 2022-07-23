// import { lnsocket_init } from '$lib/lnsocket'

let core
// let rune
// const requests = []

export async function initLnSocket(privateKey: string) {
	console.log(window)
	const LNSocket = await (window as any).lnsocket_init()
	core = LNSocket()
	core.genkey()

	console.log(core)
}

// export async function rpcRequest(data: unknown)

// export async function getinfo() {
// 	await ln.connect_and_init(
// 		'0369bcda5ef6271e8fb4ae75ea4fe7fca6713c9fa02c4bb05b1ad0e72cea2bef1c',
// 		'ws://122.199.32.194:8234'
// 	)
// 	console.log('after connect')
// 	const rune =
// 		'_wGpe-eBncFVYgGkhtYaUwMhBxVJ300HCHgKc0O1jCw9MCZtZXRob2RebGlzdHxtZXRob2ReZ2V0fG1ldGhvZD1zdW1tYXJ5Jm1ldGhvZC9nZXRzaGFyZWRzZWNyZXQmbWV0aG9kL2xpc3RkYXRhc3RvcmU='
// 	console.log('calling getinfo')
// 	const res = await ln.rpc({ method: 'getinfo', rune })

// 	console.log({ res })
// }
