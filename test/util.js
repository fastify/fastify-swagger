'use strict'

const { test } = require('tap')
const { formatParamUrl } = require('../lib/util/common')

test('formatParamUrl', t => {
  t.plan(4)

  t.test('support /example/:userId', t => {
    t.plan(1)
    const url = formatParamUrl('/example/:userId')
    t.equal(url, '/example/{userId}')
  })

  t.test('support /example/:userId/:secretToken', t => {
    t.plan(1)
    const url = formatParamUrl('/example/:userId/:secretToken')
    t.equal(url, '/example/{userId}/{secretToken}')
  })

  t.test('support /example/near/:lat-:lng/radius/:r', t => {
    t.plan(1)
    const url = formatParamUrl('/example/near/:lat-:lng/radius/:r')
    t.equal(url, '/example/near/{lat}-{lng}/radius/{r}')
  })

  t.test('support /example/near/:lat_1-:lng_1/radius/:r_1', t => {
    t.plan(1)
    const url = formatParamUrl('/example/near/:lat_1-:lng_1/radius/:r_1')
    t.equal(url, '/example/near/{lat_1}-{lng_1}/radius/{r_1}')
  })
})
