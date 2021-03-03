'use strict'

const { test } = require('tap')
const { formatParamUrl } = require('../lib/util/common')

test('formatParamUrl', t => {
  t.plan(3)

  t.test('support /example/:userId', t => {
    t.plan(1)
    const url = formatParamUrl('/example/:userId')
    t.strictEqual(url, '/example/{userId}')
  })

  t.test('support /example/:userId/:secretToken', t => {
    t.plan(1)
    const url = formatParamUrl('/example/:userId/:secretToken')
    t.strictEqual(url, '/example/{userId}/{secretToken}')
  })

  t.test('support /example/near/:lat-:lng/radius/:r', t => {
    t.plan(1)
    const url = formatParamUrl('/example/near/:lat-:lng/radius/:r')
    t.strictEqual(url, '/example/near/{lat}-{lng}/radius/{r}')
  })
})
