export const connections = [
  {
    label: 'Core Lightning',
    icon: () => import('./coreln/logo.js').then(({ default: logo }) => logo),
    module: () => import('./coreln/index.js').then(({ default: connection }) => connection)
  }
]
