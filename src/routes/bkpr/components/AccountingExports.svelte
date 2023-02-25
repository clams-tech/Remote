<script lang="ts">
  import type { IncomeEvent } from '$lib/backends'
  import { msatsToBtc } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { customNotifications$, incomeEvents$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import download from '$lib/icons/download'
  import { createRandomHex } from '$lib/utils'

  type Format = 'koinly' | 'cointracker' | 'quickbooks' | 'harmony'

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

  // spinner state for when formatting and downloading csv
  let formatting = ''

  // formatted so that fee events are combined with invoice events
  let combinedPaymentsFees: IncomeEvent[]

  // will combine fee events with invoice events
  function combineInvoicePaymentsWithFees(events: IncomeEvent[]): IncomeEvent[] {
    if (!combinedPaymentsFees) {
      combinedPaymentsFees = events.reduce((acc, event) => {
        const { tag } = event

        if (tag === 'invoice_fee') {
          // grab the invoice this fee belongs to
          const invoice = acc.pop()

          if (invoice && invoice.payment_id === event.payment_id) {
            invoice.fee_amount = msatsToBtc(event.debit_msat.toString())
          }

          // put back in the collection
          invoice && acc.push(invoice)
        } else {
          acc.push(event)
        }

        return acc
      }, [] as IncomeEvent[])
    }

    return combinedPaymentsFees
  }

  async function createKoinlyRow(event: IncomeEvent) {
    const { formatInTimeZone } = await import('date-fns-tz')

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

    return [
      formatInTimeZone(new Date(timestamp * 1000), 'UTC', 'yyyy-MM-dd HH:mm') + ' UTC', // Date
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

  async function createCointrackerRow(event: IncomeEvent) {
    const { formatInTimeZone } = await import('date-fns-tz')
    const { timestamp, debit_msat, credit_msat, tag, account, fee_amount } = event

    return [
      formatInTimeZone(new Date(timestamp * 1000), 'UTC', 'MM/dd/yyyy HH:mm:ss'), // Date
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

  async function createQuickbooksRow(event: IncomeEvent) {
    const { formatInTimeZone } = await import('date-fns-tz')
    const { timestamp, description, debit_msat, credit_msat, tag, account } = event

    return [
      formatInTimeZone(new Date(timestamp * 1000), 'UTC', 'dd/MM/yyyy'), // Date
      `${tag} (${account}) bc: ${description || 'no desc'}`, // Description
      credit_msat ? msatsToBtc(credit_msat.toString()) : '', // Credit
      debit_msat ? msatsToBtc(debit_msat.toString()) : '' // Debit
    ]
  }

  async function createHarmonyRow(event: IncomeEvent) {
    const { formatInTimeZone } = await import('date-fns-tz')

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

    function formatType(tag: string, credit: number | string) {
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

    function formatAmount(credit_msat: number | string, debit_msat: number | string) {
      // zero fee route
      if (debit_msat.toString() === '0' && credit_msat.toString() === '0') {
        return 0
      }

      if (debit_msat) {
        return `-${msatsToBtc(debit_msat.toString())}`
      }

      return msatsToBtc(credit_msat.toString())
    }

    return [
      formatInTimeZone(new Date(timestamp * 1000), 'UTC', 'dd-MM-yyyy HH:mm:ss').replace(' ', 'T') +
        'Z', // Timestamp
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

  async function createCSVString(format: Format) {
    switch (format) {
      case 'koinly': {
        const formattedIncomeEvents = combineInvoicePaymentsWithFees($incomeEvents$.data!)
        const rows = await Promise.all(formattedIncomeEvents.map(createKoinlyRow))

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
          ...rows
        ]
          .map((item) => item.join(','))
          .join('\r\n')
      }
      case 'cointracker': {
        const formattedIncomeEvents = combineInvoicePaymentsWithFees($incomeEvents$.data!)
        const rows = await Promise.all(formattedIncomeEvents.map(createCointrackerRow))

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
          ...rows
        ]
          .map((item) => item.join(','))
          .join('\r\n')
      }
      case 'quickbooks': {
        const rows = await Promise.all($incomeEvents$.data!.map(createQuickbooksRow))

        return [['Date', 'Description', 'Credit', 'Debit'], ...rows]
          .map((item) => item.join(','))
          .join('\r\n')
      }
      case 'harmony': {
        const rows = await Promise.all($incomeEvents$.data!.map(createHarmonyRow))

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
          ...rows
        ]
          .map((item) => item.join(','))
          .join('\r\n')
      }
    }
  }

  function downloadCSV(format: Format): () => Promise<void> {
    return async () => {
      try {
        formatting = format
        const csvString = await createCSVString(format)
        downloadFile(csvString, `${format}.csv`)
        formatting = ''
      } catch (error) {
        const { message } = error as { message: string }

        customNotifications$.next({
          id: createRandomHex(),
          type: 'error',
          heading: $translate('app.errors.download'),
          message: message
        })
      }
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

<section
  class="p-4 border border-current flex flex-col w-full rounded-md shadow-sm shadow-purple-400 md:row-span-1 md:col-span-1"
>
  <h1 class="text-4xl w-full mb-6 font-bold">
    {$translate('app.headings.accounting_exports')}
  </h1>
  <p>
    {$translate('app.subheadings.accounting_exports')}
  </p>

  {#if $incomeEvents$.loading}
    <div class="flex flex-col w-full h-full items-center justify-center mt-6">
      <Spinner />
    </div>
  {:else if $incomeEvents$.error}
    <div class="flex items-center justify-center">
      <ErrorMsg message={$incomeEvents$.error} closable={false} />
    </div>
  {:else}
    <div class="w-full mt-6">
      {#each links as { website, text, format }}
        <div class="flex items-center justify-between pb-4">
          <a class="underline" href={website} target="_blank" rel="noopener noreferrer">{text}</a>
          <div class="text-center">
            <Button
              requesting={formatting === format}
              text={$translate('app.buttons.download')}
              on:click={downloadCSV(format)}
              small
            >
              <div class="w-4 mr-1" slot="iconLeft">{@html download}</div>
            </Button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
