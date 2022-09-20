import { NoiseState } from './noise-state'
import * as secp from '@noble/secp256k1'
import type { LNRequest } from '../types'
import { BehaviorSubject } from 'rxjs'
import { take, filter } from 'rxjs/operators'
import { Buffer } from 'buffer'

export type NoiseConnectOptions = {
  /**
   * Local secret as a 32-byte secp256k1 private key
   */
  ls?: Buffer

  /**
   * Optional ephemeral 32-byte secp256k1 private key. If not provided, one is generated.
   */
  es?: Buffer

  /**
   * remote compressed public key, 33-bytes. hex
   */
  publicKey: string

  /**
   * WebSocket endpoint to connect to
   */
  wsUrl: string
}

/**
 * Connect to a remote noise socket server.
 */
export function connect({ ls, es, publicKey, wsUrl }: NoiseConnectOptions) {
  // validate wsurl

  const rpk = Buffer.from(publicKey, 'hex')

  if (!ls) {
    ls = Buffer.from(secp.utils.randomPrivateKey())
  }

  if (!es) {
    es = Buffer.from(secp.utils.randomPrivateKey())
  }

  const noise = new NoiseState({
    ls,
    es
  })

  console.log('Local public key:', noise.lpk.toString('hex'))
  const socket = new WebSocket(wsUrl)
  const connected$ = new BehaviorSubject<boolean>(false)
  socket.onopen = async () => {
    const msg = await noise.initiatorAct1(rpk)
    console.log({ msg })
    socket.send(msg)
    console.log('socket open')
  }
  socket.onclose = () => {
    console.log('socket closed')
  }
  socket.onerror = (err) => console.log('Socket error:', err)
  socket.onmessage = async (ev) => {
    const { data } = ev as { data: Buffer }
    if (data.length < 50) {
      console.log('Error with received message data. Length < 50')
    } else if (data.length === 50) {
      await noise.initiatorAct2(data)
      const msg = await noise.initiatorAct3()
      socket.send(msg)
      console.log('Connection Established!')
    } else if (data.length === 81) {
      const len = await noise.decryptLength(data.subarray(0, 18))
      const inti = data.subarray(18, 18 + len + 16)
      let initMsg = await noise.decryptMessage(inti)
      const pref = initMsg.subarray(0, 2).toString('hex')
      initMsg = initMsg.subarray(2)
      if (pref === '0010') {
        const msg = await noise.encryptMessage(initMsg)
        socket.send(msg)
        console.log('Initial Message Sent!')
        connected$.next(true)
      } else if (pref === '0011') {
        console.error({ initMsg })
        socket.close(1000, 'Delibrate Closing After Error!')
      }
    } else if (data.length === 76) {
      const len = await noise.decryptLength(data.subarray(0, 18))
      const msg = (await noise.decryptMessage(data.subarray(18, 18 + len + 16))).toString('hex')
      console.log('Message received that we do not do anything with:', { msg })
    } else {
      const len = await noise.decryptLength(data.subarray(0, 18))
      const decr = await noise.decryptMessage(data.subarray(18, 18 + len + 16))
      const hdecr = decr.subarray(0, 2).toString('hex')
      if (hdecr === '4c4f' || hdecr === '594d') {
        console.log({ result: decr.subarray(10).toString() })
      }
    }
  }
  return {
    publicKey: noise.lpk,
    call: (request: LNRequest & { rune: string }) => {
      return new Promise((res, rej) => {
        console.log('Making request:', request)
        connected$
          .pipe(
            filter((connected) => connected === true),
            take(1)
          )
          .subscribe(async () => {
            const command = { ...request, id: crypto.randomUUID() }
            const msg = await noise.encryptMessage(
              Buffer.concat([
                Buffer.from('4c4f', 'hex'),
                Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
                Buffer.from(JSON.stringify(command))
              ])
            )
            socket.send(msg)
            // listen for result and resolve or reject
          })
      })
    }
  }
}
