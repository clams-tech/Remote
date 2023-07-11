export const clipboard = {
  permission: async (name: PermissionName): Promise<boolean> => {
    try {
      const { state } = await navigator.permissions.query({ name })

      return state === 'granted'
    } catch (error) {
      return false
    }
  },
  read: async (): Promise<string | null> => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      return clipboardText || null
    } catch (error) {
      return null
    }
  },
  write: async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      return false
    }
  }
}

export const notifications = {
  supported: (): boolean => 'Notification' in window,
  permission: () => Notification.permission === 'granted',
  create: (options: { heading: string; message: string }) =>
    new Notification(options.heading, {
      body: options.message,
      icon: '/icons/icon.png'
    })
}
