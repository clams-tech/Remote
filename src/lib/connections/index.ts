export const connections = [
  {
    label: 'Core Lightning',
    icon: '',
    module: async () => (await import('./coreln/index.js')).default
  }
]
