import { NoiseState } from './noise-state'
import * as secp from '@noble/secp256k1'
import type { LNRequest } from '../types'
import { BehaviorSubject } from 'rxjs'
import { take, filter } from 'rxjs/operators'
import { Buffer } from 'buffer'
import { HANDSHAKE_STATE } from './handshake-state'
import { MessageTypes } from './message-types'

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

  const rpk = Buffer.from(
    '029c4b65fb91f9acb382cc904e995117f6c6b819fc1e4568e50249ce75ec45f260',
    'hex'
  )

  if (!ls) {
    // ls = Buffer.from(secp.utils.randomPrivateKey())
    ls = Buffer.from('7d0ba38f9f6d8292bf6fd98ea878fad85394cb2c0faac9bda54c1b35e4d102b7', 'hex')
  }

  if (!es) {
    // es = Buffer.from(secp.utils.randomPrivateKey())
    es = Buffer.from('c92dda7e91564e174d9b801301801da1024277f23c528cdda0bf5a9a68c0733f', 'hex')
  }

  const noise = new NoiseState({
    ls,
    es
  })

  const socket = new WebSocket('wss://lnsocket.clams.tech/13.239.130.112:9735')
  // const socket = new WebSocket(wsUrl)

  const connected$ = new BehaviorSubject<boolean>(false)

  let handshakeState = HANDSHAKE_STATE.INITIATOR_INITIATING

  socket.onopen = async () => {
    console.log('OPEN')
    const msg = await noise.initiatorAct1(rpk)
    socket.send(msg)
    handshakeState = HANDSHAKE_STATE.AWAITING_RESPONDER_REPLY
  }

  socket.onclose = () => {
    console.log('socket closed')
  }

  socket.onerror = (err) => console.log('Socket error:', err)

  socket.onmessage = async (ev) => {
    const { data } = ev as { data: Blob }
    const arrayBuffer = await data.arrayBuffer()
    const message = Buffer.from(arrayBuffer)

    switch (handshakeState) {
      case HANDSHAKE_STATE.INITIATOR_INITIATING:
        throw new Error('Commando received data before intiialized')

      case HANDSHAKE_STATE.AWAITING_RESPONDER_REPLY: {
        if (message.length !== 50) {
          console.error('Invalid message received from remote node')
          return
        }
        console.log('initiatorAct2')
        // process reply
        await noise.initiatorAct2(message)

        // create final act of the handshake
        const reply = await noise.initiatorAct3()

        // send final handshake
        socket.send(reply)

        // transition
        handshakeState = HANDSHAKE_STATE.READY
        break
      }
      case HANDSHAKE_STATE.READY: {
        const LEN_CIPHER_BYTES = 2
        const LEN_MAC_BYTES = 16
        const len = await noise.decryptLength(message.subarray(0, LEN_CIPHER_BYTES + LEN_MAC_BYTES))
        const decrypted = await noise.decryptMessage(message.subarray(18, 18 + len + 16))

        const type = decrypted.subarray(0, 2).toString('hex')
        const payload = decrypted.subarray(2, len)
        const ext = decrypted.subarray(2 + len)

        console.log({ type, payload })

        switch (type) {
          case MessageTypes.INIT: {
            const globalFeatureslength = payload.readUInt16BE()
            const localFeaturesLength = payload.readUint16BE(2 + globalFeatureslength)
            const tlvs = payload.subarray(2 + globalFeatureslength + localFeaturesLength)
            const chainHash = tlvs.subarray(4, 4 + 32).toString('hex')

            const reply = await noise.encryptMessage(
              Buffer.from(`00100000000580082a6aa20120${chainHash}`, 'hex')
            )

            socket.send(reply)
            connected$.next(true)
            break
          }
          case MessageTypes.PING: {
            console.log('RECEIVED A PING!')
            const numPongBytes = payload.readUInt16BE()
            const pong = await noise.encryptMessage(
              Buffer.concat([
                Buffer.from(MessageTypes.PONG, 'hex'),
                Buffer.from(numPongBytes.toString(16), 'hex'),
                Buffer.from(new Array(numPongBytes).fill(0))
              ])
            )

            console.log('sending a pong')
            socket.send(pong)
            break
          }
          case MessageTypes.PONG: {
            console.log('RECEIVED A PONG!')
            break
          }
          case MessageTypes.COMMANDO_RESPONSE: {
            console.log({ result: JSON.parse(payload.subarray(8).toString()) })
          }
        }
      }
    }
  }

  return {
    publicKey: noise.lpk,
    call: (request: LNRequest & { rune: string }) => {
      return new Promise((res, rej) => {
        connected$
          .pipe(
            filter((connected) => connected === true),
            take(1)
          )
          .subscribe(async () => {
            console.log('Making request:', request)
            // const command = {
            //   rune: request.rune,
            //   method: request.method,
            //   params: [],
            //   id: crypto.randomUUID()
            // }
            // console.log({ command })
            const msg = await noise.encryptMessage(
              Buffer.concat([
                Buffer.from('4c4f', 'hex'),
                Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]),
                Buffer.from(JSON.stringify({ ...request, id: 30 }))
              ])
            )
            socket.send(msg)
            // listen for result and resolve or reject
          })
      })
    }
  }
}
