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

    function formatDate(timestamp: number) {
      return format(new Date(timestamp * 1000), 'yyyy-MM-dd HH:mm', { timeZone: 'UTC' }) + 'UTC'
    }

    return [
      formatDate(timestamp), // Date
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

    function formatDate(timestamp: number) {
      // @todo fix date
      return format(new Date(timestamp * 1000), 'MM/dd/yyyy HH:mm:ss', { timeZone: 'UTC' })
    }

    return [
      formatDate(timestamp), // Date
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

  function createQuickbooksRow(event: IncomeEvent) {
    const { timestamp, description, debit_msat, credit_msat, tag, account } = event

    function formatDate(timestamp: number) {
      return format(new Date(timestamp * 1000), 'dd/MM/yyyy', { timeZone: 'UTC' })
    }

    return [
      formatDate(timestamp), // Date
      `${tag} (${account}) bc: ${description || 'no desc'}`, // Description
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Credit
      debit_msat ? msatsToBtc(debit_msat.toString()) : '' // Debit
    ]
  }

  function createHarmonyRow(event: IncomeEvent) {
    const {
      timestamp,
      description,
      debit_msat,
      credit_msat,
      tag,
      account,
      outpoint,
      txid,
      payment_id
    } = event

    function formatDate(timestamp: number) {
      // @TODO fix date
      return new Date(timestamp * 1000).toISOString()
    }

    function formatType(tag: string, credit: number | '') {
      switch (tag) {
        case 'deposit':
          return 'transfer:desposit'
        case 'withdrawal':
          return 'transfer:withdrawal'
        case 'onchain_fee':
          return 'fee:network'
        case 'invoice':
          return credit ? 'income:invoice' : 'expense:invoice'
        case 'invoice_fee':
          return 'expense:invoice_fee'
        case 'routed':
          return 'income:routed'
        default:
          return ''
      }
    }

    function formatAmount(credit_msat: number, debit_msat: number) {
      // zero fee route
      if (debit_msat === 0 && credit_msat === 0) {
        return 0
      }

      if (debit_msat) {
        return `-${msatsToBtc(debit_msat.toString())}`
      }

      return msatsToBtc(credit_msat.toString())
    }

    return [
      formatDate(timestamp), // Timestamp
      'cln', // Venue
      formatType(tag, credit_msat || ''), // Type
      formatAmount(credit_msat, debit_msat), // Amount
      'btc', // Asset
      outpoint || txid || payment_id || '', // Transaction ID
      payment_id || '', // Order ID
      account, // Account
      outpoint || '', // Network ID
      description // Note
    ]
  }

  // Remove 'invoice_fee' tagged events for Koinly & Cointracker CSVs
  const filteredIncomeEvents = incomeEvents.filter((incomeEvent) => {
    if (incomeEvent.tag === 'invoice_fee') {
      return false
    }
    return true
  })

  const links = [
    {
      text: 'Koinly',
      fileName: 'koinly.csv',
      csvString: [
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
    },
    {
      text: 'Cointracker',
      fileName: 'cointracker.csv',
      csvString: [
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
    },
    {
      text: 'Quickbooks',
      fileName: 'quickbooks.csv',
      csvString: [
        ['Date', 'Description', 'Credit', 'Debit'],
        ...incomeEvents.map(createQuickbooksRow)
      ]
        .map((item) => item.join(','))
        .join('\r\n')
    },
    {
      text: 'Harmony',
      fileName: 'harmony.csv',
      csvString: [
        ['HarmonyCSV v0.2'],
        ['Provenance', 'cln-bookkeeper'],
        [
          'Timestamp',
          'Venue',
          'Type',
          'Amount',
          'Asset',
          'Transaction ID',
          'Order ID',
          'Account',
          'Network ID',
          'Note'
        ],
        ...incomeEvents.map(createHarmonyRow)
      ]
        .map((item) => item.join(','))
        .join('\r\n')
    }
  ]
</script>

{#each links as link}
  <a
    href={window.URL.createObjectURL(new Blob([link.csvString], { type: 'text/csv' }))}
    target="_blank"
    rel="noopener noreferrer"
    download={link.fileName}>{link.text}</a
  >
{/each}
