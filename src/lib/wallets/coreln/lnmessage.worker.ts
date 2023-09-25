import LnMessage from 'lnmessage'
import type { CommandoRequest, LnWebSocketOptions } from 'lnmessage/dist/types.js'

type MessageBase = {
  id: string
}

type InitMessage = MessageBase & {
  type: 'init'
  data: LnWebSocketOptions
}

type ConnectMessage = MessageBase & {
  type: 'connect'
}

type DisconnectMessage = MessageBase & {
  type: 'disconnect'
}

type CommandoMessage = MessageBase & {
  type: 'commando'
  data: CommandoRequest
}

type Message = InitMessage | ConnectMessage | DisconnectMessage | CommandoMessage

let socket: LnMessage

onmessage = async (message: MessageEvent<Message>) => {
  switch (message.data.type) {
    case 'init': {
      socket = new LnMessage(message.data.data)
      socket.connectionStatus$.subscribe(status =>
        self.postMessage({ id: 'connectionStatus$', result: status })
      )

      self.postMessage({ id: message.data.id })
      return
    }
    case 'connect': {
      const result = await socket.connect()
      self.postMessage({ id: message.data.id, result })
      return
    }
    case 'disconnect': {
      socket.disconnect()
      self.postMessage({ id: message.data.id })
      return
    }
    case 'commando': {
      try {
        const result = await socket.commando(message.data.data)
        self.postMessage({ id: message.data.id, result })
      } catch (error) {
        self.postMessage({ id: message.data.id, error })
      }
    }
  }
}

export {}
