<script lang="ts">
  import type { IncomeEvent } from '$lib/backends'
  import { msatsToBtc } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { incomeEvents$ } from '$lib/streams'
  import lightning from '$lib/lightning'
  import { translate } from '$lib/i18n/translations'

  type Format = 'koinly' | 'cointracker' | 'quickbooks' | 'harmony'
  type InvoiceFeeEvent = IncomeEvent & { used_fee_amount?: boolean }

  const links: {
    format: Format
    text: string
    website: string
  }[] = [
    {
      format: 'koinly',
      text: 'Koinly',
      website: 'https://koinly.io/'
    },
    {
      format: 'cointracker',
      text: 'Cointracker',
      website: 'https://www.cointracker.io/'
    },
    {
      format: 'quickbooks',
      text: 'Quickbooks',
      website: 'https://quickbooks.intuit.com/'
    },
    {
      format: 'harmony',
      text: 'Harmony',
      website: 'https://www.harmony.co.id/' // @TODO verify
    }
  ]

  let formatInTZ: (arg0: Date, arg1: string, arg2: string) => string

  // Fetch bookkeeper income events
  lightning.updateIncomeEvents(lightning.getLn())

  $: incomeEvents = $incomeEvents$.data?.income_events || []

  $: invoiceFeeEvents =
    incomeEvents &&
    incomeEvents.filter((incomeEvent) => {
      return incomeEvent.tag === 'invoice_fee'
    })
  // "Fee Amount" column for Koinly & Cointracker rows
  $: incomeEvents?.forEach((incomeEvent) => {
    invoiceFeeEvents?.forEach((invoiceFeeEvent: InvoiceFeeEvent) => {
      if (!incomeEvent.fee_amount && !invoiceFeeEvent.used_fee_amount) {
        if (incomeEvent.payment_id === invoiceFeeEvent.payment_id) {
          incomeEvent.fee_amount = msatsToBtc(invoiceFeeEvent.debit_msat.toString())
          invoiceFeeEvent.used_fee_amount = true
        }
      }
    })
  })
  // Remove 'invoice_fee' tagged events for Koinly & Cointracker CSVs
  $: filteredIncomeEvents =
    incomeEvents?.filter((incomeEvent) => {
      return incomeEvent.tag !== 'invoice_fee'
    }) || []

  async function importFormatInTimeZone() {
    if (!formatInTZ) {
      const { formatInTimeZone } = await import('date-fns-tz')
      formatInTZ = formatInTimeZone
    }
    return
  }

  function createKoinlyRow(event: IncomeEvent) {
    const {
      timestamp,
      debit_msat,
      credit_msat,
      tag,
      description,
      outpoint,
      txid,
      payment_id,
      fee_amount
    } = event

    function formatDate(timestamp: number) {
      return formatInTZ(new Date(timestamp * 1000), 'UTC', 'yyyy-MM-dd HH:mm') + ' UTC'
    }

    return [
      formatDate(timestamp), // Date
      debit_msat ? msatsToBtc(debit_msat.toString()) : '', // Sent Amount
      debit_msat ? 'btc' : '', // Sent Currency
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Received Amount
      credit_msat ? 'btc' : '', // Received Currency
      fee_amount, // Fee Amount
      fee_amount ? 'btc' : '', // Fee Currency
      tag, // Label
      description || '', // Description
      outpoint || txid || payment_id || '' // TxHash
    ]
  }

  function createCointrackerRow(event: IncomeEvent) {
    const { timestamp, debit_msat, credit_msat, tag, account, fee_amount } = event

    function formatDate(timestamp: number) {
      return formatInTZ(new Date(timestamp * 1000), 'UTC', 'MM/dd/yyyy HH:mm:ss')
    }

    return [
      formatDate(timestamp), // Date
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Received Quantity
      credit_msat ? 'btc' : '', // Received Currency
      debit_msat ? msatsToBtc(debit_msat.toString()) : '', // Sent Quantity
      debit_msat ? 'btc' : '', // Sent Currency
      fee_amount, // Fee Amount
      fee_amount ? 'btc' : '', // Fee Currency
      tag === 'invoice' || tag === 'routed' ? 'payment' : '', // Tag
      account || '' // Account
    ]
  }

  function createQuickbooksRow(event: IncomeEvent) {
    const { timestamp, description, debit_msat, credit_msat, tag, account } = event

    function formatDate(timestamp: number) {
      return formatInTZ(new Date(timestamp * 1000), 'UTC', 'dd/MM/yyyy')
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
      const date = formatInTZ(new Date(timestamp * 1000), 'UTC', 'dd-MM-yyyy HH:mm:ss')
      return date.replace(' ', 'T') + 'Z'
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

  function createCSVString(format: Format) {
    switch (format) {
      case 'koinly':
        return [
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
      case 'cointracker':
        return [
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
      case 'quickbooks':
        return [
          ['Date', 'Description', 'Credit', 'Debit'],
          ...incomeEvents.map(createQuickbooksRow)
        ]
          .map((item) => item.join(','))
          .join('\r\n')
      case 'harmony':
        return [
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
  }

  function downloadFile(csvString: string, fileName: string) {
    const blob = new Blob([csvString], { type: 'text/csv' })
    const URL = window.URL || window.webkitURL
    const objectURL = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectURL
    a.download = fileName
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
    URL.revokeObjectURL(objectURL)
  }
</script>

<section class="max-w-m p-6">
  {#if $incomeEvents$.loading && !$incomeEvents$.data}
    <div class="w-full h-full flex items-center justify-center">
      <Spinner />
      <p class="ml-2">{$translate('app.loading.accounting_exports')}</p>
    </div>
  {:else if $incomeEvents$.error}
    <div class="w-full h-full flex items-center justify-center">
      <ErrorMsg message={$incomeEvents$.error} />
    </div>
  {:else if links}
    <h1 class="text-4xl w-full mb-6 font-bold">
      {$translate('app.headings.accounting_exports')}
    </h1>
    <p>
      {$translate('app.subheadings.accounting_exports')}
    </p>
    <div class="w-full mt-6">
      {#each links as link}
        <div class="flex items-center p-3">
          <a
            class="w-1/2 text-center underline text-lg"
            href={link.website}
            target="_blank"
            rel="noopener noreferrer">{link.text}</a
          >
          <div class="text-center">
            <Button
              text={$translate('app.buttons.download_csv')}
              on:click={async () => {
                await importFormatInTimeZone()
                downloadFile(createCSVString(link.format), `${link.format}.csv`)
              }}
            />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
