export const clipboard = {
  permission: async (name: PermissionName): Promise<boolean> => {
    try {
      const { state } = await navigator.permissions.query({ name })

      return state === 'granted'
    } catch (error) {
      return false
    }
  },
  read: async (): Promise<string> => {
    if (window.__TAURI__) {
      const { readText } = await import('@tauri-apps/api/clipboard')
      return readText() as Promise<string>
    } else {
      const clipboardText = await navigator.clipboard.readText()
      return clipboardText
    }
  },
  write: async (text: string): Promise<void> => {
    if (window.__TAURI__) {
      const { writeText } = await import('@tauri-apps/api/clipboard')
      await writeText(text)
    } else {
      await navigator.clipboard.writeText(text)
    }
  },
  writeImage: async (image: Blob | Promise<Blob>): Promise<void> => {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': image
      })
    ])
  }
}

export const notification = {
  supported: (): boolean => 'Notification' in window,
  permission: () => Notification.permission === 'granted',
  create: (options: { heading: string; message: string }) =>
    new Notification(options.heading, {
      body: options.message,
      icon: '/icons/icon.png'
    })
}

export const file = {
  save: async (blob: Blob, fileName: string) => {
    if (window.__TAURI__) {
      const { writeBinaryFile } = await import('@tauri-apps/api/fs')
      const { save } = await import('@tauri-apps/api/dialog')

      const filePath = await save({
        filters: [
          {
            name: fileName,
            extensions: ['png']
          }
        ]
      })

      if (!filePath) {
        throw new Error('No file path provided')
      }

      const contents = await blob.arrayBuffer()

      await writeBinaryFile(filePath, contents)
    } else {
      const fileUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}

export const storage = {
  get: (storageKey: string): string | null => {
    return window.localStorage.getItem(storageKey)
  },
  write: (storageKey: string, data: string): void => {
    window.localStorage.setItem(storageKey, data)
  }
}

export const log = {
  info: (msg: string) => {
    console.log(msg)
  },
  warn: (msg: string) => {
    console.warn(msg)
  },
  error: (msg: string) => {
    console.error(msg)
  }
}
