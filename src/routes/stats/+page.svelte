<script lang="ts">
  import listIncome from '$lib/bkpr-listincome.json'
  import { msatsToBtc } from '$lib/conversion'
  import { format } from 'date-fns-tz'

  type IncomeEvent = {
    account: string
    tag: string
    credit_msat: number
    debit_msat: number
    currency: string
    timestamp: number
    description?: string
    outpoint?: string
    txid?: string
    payment_id?: string
  }

  let incomeEvents: IncomeEvent[] = []

  // @TODO fetch from node with bkpr-listincome
  incomeEvents = listIncome.income_events

  const invoiceFeeEvents: IncomeEvent[] = incomeEvents.filter((incomeEvent) => {
    return incomeEvent.tag === 'invoice_fee'
  })

  function createKoinlyRow(event: IncomeEvent) {
    const { timestamp, debit_msat, credit_msat, tag, description, outpoint, txid, payment_id } =
      event
    let feeAmount = ''
    let feeEvents = [...invoiceFeeEvents]

    feeEvents.forEach((invoiceFee, i) => {
      if (event.payment_id === invoiceFee.payment_id) {
        feeAmount = msatsToBtc(invoiceFee.debit_msat.toString())
        feeEvents.splice(i, 1)
      }
    })

    function koinlyDate(timestamp: number) {
      return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm', { timeZone: 'UTC' }) + 'UTC'
    }

    return [
      koinlyDate(timestamp), // Date
      debit_msat ? msatsToBtc(debit_msat.toString()) : '', // Sent Amount
      debit_msat ? 'btc' : '', // Sent Currency
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Received Amount
      credit_msat ? 'btc' : '', // Received Currency
      feeAmount, // Fee Amount
      feeAmount ? 'btc' : '', // Fee Currency
      tag, // Label
      description || '', // Description
      outpoint || txid || payment_id || '' // TxHash
    ]
  }

  function createCointrackerRow(event: IncomeEvent) {
    const { timestamp, debit_msat, credit_msat, tag, account } = event
    let feeAmount = ''
    let feeEvents = [...invoiceFeeEvents]

    feeEvents.forEach((invoiceFee, i) => {
      if (event.payment_id === invoiceFee.payment_id) {
        feeAmount = msatsToBtc(invoiceFee.debit_msat.toString())
        feeEvents.splice(i, 1)
      }
    })

    function cointrackerDate(timestamp: number) {
      // @todo fix date
      return format(new Date(timestamp * 1000), 'MM/dd/yyyy HH:mm:ss', { timeZone: 'UTC' })
    }

    return [
      cointrackerDate(timestamp), // Date
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Received Quantity
      credit_msat ? 'btc' : '', // Received Currency
      debit_msat ? msatsToBtc(debit_msat.toString()) : '', // Sent Quantity
      debit_msat ? 'btc' : '', // Sent Currency
      feeAmount, // Fee Amount
      feeAmount ? 'btc' : '', // Fee Currency
      tag === 'invoice' || tag === 'routed' ? 'payment' : '', // Tag
      account || '' // Account
    ]
  }

  // Remove 'invoice_fee' tagged events from CSVs
  const filteredIncomeEvents = incomeEvents.filter((incomeEvent) => {
    if (incomeEvent.tag === 'invoice_fee') {
      return false
    }
    return true
  })

  const koinlyCSV = [
    [
      'Date',
      'Sent Amount',
      'Sent Currency',
      'Received Amount',
      'Received Currency',
      'Fee Amount',
      'Fee Currency',
      'Label',
      'Description',
      'TxHash'
    ],
    ...filteredIncomeEvents.map(createKoinlyRow)
  ]
    .map((item) => item.join(','))
    .join('\r\n')

  const cointrackerCSV = [
    [
      'Date',
      'Received Quantity',
      'Received Currency',
      'Sent Quantity',
      'Sent Currency',
      'Fee Amount',
      'Fee Currency',
      'Tag',
      'Account'
    ],
    ...filteredIncomeEvents.map(createCointrackerRow)
  ]
    .map((item) => item.join(','))
    .join('\r\n')
</script>

<a
  href={window.URL.createObjectURL(new Blob([koinlyCSV], { type: 'text/csv' }))}
  target="_blank"
  rel="noopener noreferrer"
  download="koinly.csv">Koinly CSV</a
>
<a
  href={window.URL.createObjectURL(new Blob([cointrackerCSV], { type: 'text/csv' }))}
  target="_blank"
  rel="noopener noreferrer"
  download="cointracker.csv">Cointracker CSV</a
>
