import type { GetinfoResponse, ListfundsResponse } from './backends'
import { FUNDS_STORAGE_KEY, INFO_STORAGE_KEY, PAYMENTS_STORAGE_KEY } from './constants'
import { auth$, funds$, nodeInfo$, payments$, pin$ } from './streams'
import type { Payment } from './types'
import { decryptWithAES, getDataFromStorage, initLn } from './utils'

export async function initialiseData() {
  const storedInfo = getDataFromStorage(INFO_STORAGE_KEY)
  const storedFunds = getDataFromStorage(FUNDS_STORAGE_KEY)
  const storedPayments = getDataFromStorage(PAYMENTS_STORAGE_KEY)

  // no stored data, so get it from node
  if (!storedInfo || !storedFunds || !storedPayments) {
    refreshData()
    return
  }

  let info: GetinfoResponse
  let funds: ListfundsResponse
  let payments: Payment[]

  const pin = pin$.getValue()

  if (pin) {
    // decrypt data
    info = JSON.parse(decryptWithAES(storedInfo, pin))
    funds = JSON.parse(decryptWithAES(storedFunds, pin))
    payments = JSON.parse(decryptWithAES(storedPayments, pin))
  } else {
    info = JSON.parse(storedInfo)
    funds = JSON.parse(storedFunds)
    payments = JSON.parse(storedPayments)
  }

  nodeInfo$.next({ data: info as GetinfoResponse, loading: false })
  funds$.next({ data: funds as ListfundsResponse, loading: false })
  payments$.next({ data: payments as Payment[], loading: false })
}

export async function refreshData() {
  const auth = auth$.getValue()
  if (!auth) return

  const coreLn = await initLn(auth)

  try {
    funds$.next({ loading: true, data: funds$.getValue().data })
    const funds = await coreLn.listFunds()
    funds$.next({ loading: false, data: funds })
  } catch (error) {
    const { message } = error as Error
    funds$.next({ loading: false, data: null, error: message })
  }

  try {
    nodeInfo$.next({ loading: true, data: nodeInfo$.getValue().data })
    const info = await coreLn.getInfo()
    nodeInfo$.next({ loading: false, data: info })
  } catch (error) {
    const { message } = error as Error
    nodeInfo$.next({ loading: false, data: null, error: message })
  }

  try {
    payments$.next({ loading: true, data: payments$.getValue().data })
    const payments = await coreLn.getPayments()
    payments$.next({ loading: false, data: payments })
  } catch (error) {
    const { message } = error as Error
    payments$.next({ loading: false, data: null, error: message })
  }
}
