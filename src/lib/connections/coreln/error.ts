import { nowSeconds } from '$lib/utils.js'
import type { AppError } from '$lib/@types/errors.js'
import type { CoreLnError } from './types.js'

/** a mapping of Coreln error codes -> i18n string error message */
const errorToMessageKey = (coreLnError: CoreLnError): string => {
  console.log(coreLnError)
  switch (coreLnError.code.toString()) {
    /** PAY ERRORS */
    case '205':
      return 'connection_pay_route_not_found'
    case '206':
      return 'connection_pay_route_too_expensive'
    case '207':
      return 'connection_pay_invoice_expired'
    case '212':
      return 'connection_pay_invoice_invalid'
    case '200':
    case '201':
    case '202':
    case '203':
    case '204':
    case '208':
    case '209':
    case '210':
    case '211':
    case '213':
    case '214':
      return 'connection_pay_unknown'
    /** FUND CHANNEL / WITHDRAW ERRORS */
    case '301':
      return 'connection_fund_cannot_afford'
    case '303':
      return 'connection_fund_broadcast_fail'
    case '305':
      return 'connection_fund_peer_not_connected'
    case '300':
    case '302':
    case '304':
    case '306':
    case '307':
    case '308':
    case '309':
    case '310':
    case '311':
    case '312':
      return 'connection_fund_unknown'
    /** PEER CONNECT ERRORS */
    case '400':
    case '401':
    case '402':
      return 'connection_connect_unknown'
    /** INVOICE ERRORS */
    case '905':
      return 'connection_invoice_not_found'
    case '900':
    case '901':
    case '902':
    case '903':
    case '904':
    case '906':
    case '907':
    case '908':
      return 'connection_invoice_unknown'
    /** OFFERS ERRORS */
    case '1000':
      return 'connection_offer_already_exists'
    case '1001':
      return 'connection_offer_already_disabled'
    case '1002':
      return 'connection_offer_expired'
    case '1003':
      return 'connection_offer_no_route'
    case '1004':
      return 'connection_offer_returned_error'
    case '1005':
      return 'connection_offer_timeout'
    /** SIGN MESSAGE ERRORS */
    case '1301':
      return 'connection_sign_message_unknown'
    case '19537':
      return 'connection_rate_limited'
    case '-32601':
      return 'connection_not_supported'
    case '-32602':
      return 'connection_self_payment_not_supported'
    default:
      return 'connection_unknown'
  }
}

const handleError = (error: CoreLnError, context: string, connectionId: string): AppError => {
  const key = errorToMessageKey(error)

  return {
    key,
    detail: {
      timestamp: nowSeconds(),
      message: error.message,
      context,
      connectionId
    }
  }
}

export default handleError
