import { expect, test } from 'vitest'
import { parseInput } from '$lib/input-parser.js'

test('Correctly parses lightning prefixed bolt11 invoice', () => {
  const parsed = parseInput(
    'lightning:LNBCRT1PJSP7FZSP5C08M7PC4V7CYMMJG02D98N6Y23QK3AJHY5UP43A2UX59LQHQ6KLSPP59T6DW6WRQS35DK6T2C884RKFEGHPFYZRSA3KMRDK5CR5WC7FJ9SSDQQXQYZ5VQCQP2RZJQDD6LW44XK3M46D7MN54CAG2SRZE067A09G6TLHKZFMXJJHSY7XSYQQQWVQQQQGQQYQQQQQPQQQQQZSQQC9QXPQYSGQ6LRWTTPQVVV5JWMP97D2Q0YKW97FG8APJ0PKUSWTK293LFN4LAHSEYQTPVSFPT2KMM3WP842J0WD2WQX77ZK5R0EGZXDZA2DNHM72WQQPN32S0'
  )

  expect(parsed).toStrictEqual({
    type: 'invoice',
    value:
      'lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0',
    amount: 0,
    lightning: undefined,
    message: undefined,
    label: undefined
  })
})

test('Correctly parses lightning prefixed, lowercased bolt11 invoice', () => {
  const parsed = parseInput(
    'lightning:lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0'
  )

  expect(parsed).toStrictEqual({
    type: 'invoice',
    value:
      'lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0',
    amount: 0,
    lightning: undefined,
    message: undefined,
    label: undefined
  })
})

test('Correctly parses lowercased bolt11 with no prefix invoice', () => {
  const parsed = parseInput(
    'lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0'
  )

  expect(parsed).toStrictEqual({
    type: 'invoice',
    value:
      'lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0'
  })
})

test('Correctly parses uppercased bolt11 with no prefix invoice', () => {
  const parsed = parseInput(
    'LNBCRT1PJSP7FZSP5C08M7PC4V7CYMMJG02D98N6Y23QK3AJHY5UP43A2UX59LQHQ6KLSPP59T6DW6WRQS35DK6T2C884RKFEGHPFYZRSA3KMRDK5CR5WC7FJ9SSDQQXQYZ5VQCQP2RZJQDD6LW44XK3M46D7MN54CAG2SRZE067A09G6TLHKZFMXJJHSY7XSYQQQWVQQQQGQQYQQQQQPQQQQQZSQQC9QXPQYSGQ6LRWTTPQVVV5JWMP97D2Q0YKW97FG8APJ0PKUSWTK293LFN4LAHSEYQTPVSFPT2KMM3WP842J0WD2WQX77ZK5R0EGZXDZA2DNHM72WQQPN32S0'
  )

  expect(parsed).toStrictEqual({
    type: 'invoice',
    value:
      'lnbcrt1pjsp7fzsp5c08m7pc4v7cymmjg02d98n6y23qk3ajhy5up43a2ux59lqhq6klspp59t6dw6wrqs35dk6t2c884rkfeghpfyzrsa3kmrdk5cr5wc7fj9ssdqqxqyz5vqcqp2rzjqdd6lw44xk3m46d7mn54cag2srze067a09g6tlhkzfmxjjhsy7xsyqqqwvqqqqgqqyqqqqqpqqqqqzsqqc9qxpqysgq6lrwttpqvvv5jwmp97d2q0ykw97fg8apj0pkuswtk293lfn4lahseyqtpvsfpt2kmm3wp842j0wd2wqx77zk5r0egzxdza2dnhm72wqqpn32s0'
  })
})

test('Correctly parses BIP21 unified with BOLT11 invoice', () => {
  const parsed = parseInput(
    'bitcoin:BC1QYLH3U67J673H6Y6ALV70M0PL2YZ53TZHVXGG7U?amount=0.00001&label=sbddesign%3A%20For%20lunch%20Tuesday&message=For%20lunch%20Tuesday&lightning=LNBC10U1P3PJ257PP5YZTKWJCZ5FTL5LAXKAV23ZMZEKAW37ZK6KMV80PK4XAEV5QHTZ7QDPDWD3XGER9WD5KWM36YPRX7U3QD36KUCMGYP282ETNV3SHJCQZPGXQYZ5VQSP5USYC4LK9CHSFP53KVCNVQ456GANH60D89REYKDNGSMTJ6YW3NHVQ9QYYSSQJCEWM5CJWZ4A6RFJX77C490YCED6PEMK0UPKXHY89CMM7SCT66K8GNEANWYKZGDRWRFJE69H9U5U0W57RRCSYSAS7GADWMZXC8C6T0SPJAZUP6'
  )

  expect(parsed).toStrictEqual({
    type: 'onchain',
    value: 'bc1qylh3u67j673h6y6alv70m0pl2yz53tzhvxgg7u',
    amount: 0.00001,
    label: 'sbddesign: For lunch Tuesday',
    message: 'For lunch Tuesday',
    lightning:
      'lnbc10u1p3pj257pp5yztkwjcz5ftl5laxkav23zmzekaw37zk6kmv80pk4xaev5qhtz7qdpdwd3xger9wd5kwm36yprx7u3qd36kucmgyp282etnv3shjcqzpgxqyz5vqsp5usyc4lk9chsfp53kvcnvq456ganh60d89reykdngsmtj6yw3nhvq9qyyssqjcewm5cjwz4a6rfjx77c490yced6pemk0upkxhy89cmm7sct66k8gneanwykzgdrwrfje69h9u5u0w57rrcsysas7gadwmzxc8c6t0spjazup6'
  })
})

test('Correctly parses BIP21 unified with BOLT12 offer', () => {
  const parsed = parseInput(
    'bitcoin:BC1QYLH3U67J673H6Y6ALV70M0PL2YZ53TZHVXGG7U?amount=0.00001&label=sbddesign%3A%20For%20lunch%20Tuesday&message=For%20lunch%20Tuesday&lightning=LNO1PG257ENXV4EZQCNEYPE82UM50YNHXGRWDAJX283QFWDPL28QQMC78YMLVHMXCSYWDK5WRJNJ36JRYG488QWLRNZYJCZS'
  )

  expect(parsed).toStrictEqual({
    type: 'onchain',
    value: 'bc1qylh3u67j673h6y6alv70m0pl2yz53tzhvxgg7u',
    amount: 0.00001,
    label: 'sbddesign: For lunch Tuesday',
    message: 'For lunch Tuesday',
    lightning:
      'lno1pg257enxv4ezqcneype82um50ynhxgrwdajx283qfwdpl28qqmc78ymlvhmxcsywdk5wrjnj36jryg488qwlrnzyjczs'
  })
})

test('Correctly parses onchain address', () => {
  const parsed = parseInput('bitcoin:BC1QYLH3U67J673H6Y6ALV70M0PL2YZ53TZHVXGG7U')

  expect(parsed).toStrictEqual({
    type: 'onchain',
    value: 'bc1qylh3u67j673h6y6alv70m0pl2yz53tzhvxgg7u',
    label: undefined,
    lightning: undefined,
    amount: 0,
    message: undefined
  })
})

test('Correctly parses LNURL with lightning prefix', () => {
  const parsed = parseInput(
    'lightning:LNURL1DP68GURN8GHJ7VTZXGMJ6VFN95ERXWFDXYENQTF3XYEZUMN8WFHKKTTXWFJK2TNPWPCZ7AFLWY7NVDMRVF3RVEPCVSURGCTZXGERJDEJVG6NQDEEV33RZENZV3NRSDTRXCEXGVRXVGEXVDMZX9SKXVNZXYENQDFJVVERJDPHVFJXXV3NXGN3TEAW'
  )

  expect(parsed).toStrictEqual({
    type: 'lnurl',
    value:
      'lnurl1dp68gurn8ghj7vtzxgmj6vfn95erxwfdxyenqtf3xyezumn8wfhkkttxwfjk2tnpwpcz7aflwy7nvdmrvf3rvepcvsurgctzxgerjdejvg6nqdeev33rzenzv3nrsdtrxcexgvrxvgexvdmzx9skxvnzxyenqdfjvverjdphvfjxxv3nxgn3teaw',
    label: undefined,
    lightning: undefined,
    amount: 0,
    message: undefined
  })
})

test('Correctly parses LNURL without lightning prefix', () => {
  const parsed = parseInput(
    'LNURL1DP68GURN8GHJ7VTZXGMJ6VFN95ERXWFDXYENQTF3XYEZUMN8WFHKKTTXWFJK2TNPWPCZ7AFLWY7NVDMRVF3RVEPCVSURGCTZXGERJDEJVG6NQDEEV33RZENZV3NRSDTRXCEXGVRXVGEXVDMZX9SKXVNZXYENQDFJVVERJDPHVFJXXV3NXGN3TEAW'
  )

  expect(parsed).toStrictEqual({
    type: 'lnurl',
    value:
      'lnurl1dp68gurn8ghj7vtzxgmj6vfn95erxwfdxyenqtf3xyezumn8wfhkkttxwfjk2tnpwpcz7aflwy7nvdmrvf3rvepcvsurgctzxgerjdejvg6nqdeev33rzenzv3nrsdtrxcexgvrxvgexvdmzx9skxvnzxyenqdfjvverjdphvfjxxv3nxgn3teaw'
  })
})

test('Correctly parses lightning address', () => {
  const parsed = parseInput('ab@stacker.news')

  expect(parsed).toStrictEqual({
    type: 'lightning_address',
    value: 'ab@stacker.news'
  })
})

test('Correctly parses node connection address', () => {
  const parsed = parseInput(
    '02d7db295027b0e4d8ba84e551fdf11afa502b5c072c1a2312d026f2a0e1c6bec8@localhost:7000'
  )

  expect(parsed).toStrictEqual({
    type: 'node_address',
    value: '02d7db295027b0e4d8ba84e551fdf11afa502b5c072c1a2312d026f2a0e1c6bec8@localhost:7000'
  })
})

test('Correctly parses node pubkey for keysend', () => {
  const parsed = parseInput('02d7db295027b0e4d8ba84e551fdf11afa502b5c072c1a2312d026f2a0e1c6bec8')

  expect(parsed).toStrictEqual({
    type: 'node_publickey',
    value: '02d7db295027b0e4d8ba84e551fdf11afa502b5c072c1a2312d026f2a0e1c6bec8'
  })
})

test('Correctly parses lightning prefixed BOLT12 offer', () => {
  const parsed = parseInput(
    'lightning:lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qqtzzqkhmv54qfasunvt4p89287lzxh62q44cpevrg3395px72swr347eq'
  )

  expect(parsed).toStrictEqual({
    type: 'offer',
    value:
      'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qqtzzqkhmv54qfasunvt4p89287lzxh62q44cpevrg3395px72swr347eq',
    label: undefined,
    lightning: undefined,
    amount: 0,
    message: undefined
  })
})

test('Correctly parses BOLT12 offer', () => {
  const parsed = parseInput(
    'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qqtzzqkhmv54qfasunvt4p89287lzxh62q44cpevrg3395px72swr347eq'
  )

  expect(parsed).toStrictEqual({
    type: 'offer',
    value:
      'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2qqtzzqkhmv54qfasunvt4p89287lzxh62q44cpevrg3395px72swr347eq'
  })
})

test('Correctly parses unknown input', () => {
  const parsed = parseInput('hello there')

  expect(parsed).toStrictEqual({
    type: 'unknown',
    value: 'hello there'
  })
})
