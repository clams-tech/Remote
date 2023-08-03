export const usernameRegex = /^[a-z0-9-_.]+$/

export const hostRegex =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/

export const nodePublicKeyRegex = /^[0-9a-fA-F]{66}$/
export const bolt11Regex = /^(lnbcrt|lnbc|lntbs|lntb)[a-zA-HJ-NP-Z0-9]{1,}$/
export const nodeConnectRegex =
  /[0-9a-fA-F]{66}@(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9]):[0-9]{4,}/
