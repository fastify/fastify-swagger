'use strict'

const { test } = require('tap')
const { formatParamUrl } = require('../lib/util/format-param-url')
const { hasParams, matchParams } = require('../lib/util/match-params')
const { generateParamsSchema, paramName } = require('../lib/util/generate-params-schema')

const cases = [
  ['/example/:userId', '/example/{userId}'],
  ['/example/:userId/:secretToken', '/example/{userId}/{secretToken}'],
  ['/example/near/:lat-:lng/radius/:r', '/example/near/{lat}-{lng}/radius/{r}'],
  ['/example/near/:lat_1-:lng_1/radius/:r_1', '/example/near/{lat_1}-{lng_1}/radius/{r_1}'],
  ['/example/*', '/example/{wildcard}'],
  ['/example/:file(^\\d+).png', '/example/{file}.png'],
  ['/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', '/example/at/{hour}h{minute}m'],
  ['/example/at/(^\\d{2})h(^\\d{2})m', '/example/at/{regexp1}h{regexp2}m'],
  ['/example/at/(^([0-9]{2})h$)-(^([0-9]{2})m$)', '/example/at/{regexp1}-{regexp2}'],
  ['/name::verb', '/name:verb'],
  ['/api/v1/postalcode-jp/:code(^[0-9]{7}$)', '/api/v1/postalcode-jp/{code}'],
  ['/api/v1/postalcode-jp/(^[0-9]{7}$)', '/api/v1/postalcode-jp/{regexp1}']
]

test('formatParamUrl', async (t) => {
  t.plan(cases.length)

  for (const kase of cases) {
    t.equal(formatParamUrl(kase[0]), kase[1])
  }
})

test('hasParams function', (t) => {
  t.test('should return false for empty url', (t) => {
    const url = ''
    const result = hasParams(url)
    t.equal(result, false)
    t.end()
  })

  t.test('should return true for url with parameters', (t) => {
    const url = '/example/{userId}'
    const result = hasParams(url)
    t.equal(result, true)
    t.end()
  })

  t.test('should return true for url with multiple parameters', (t) => {
    const url = '/example/{userId}/{secretToken}'
    const result = hasParams(url)
    t.equal(result, true)
    t.end()
  })

  t.test('should return false for url without parameters', (t) => {
    const url = '/example/path'
    const result = hasParams(url)
    t.equal(result, false)
    t.end()
  })

  t.end()
})

test('matchParams function', (t) => {
  t.test('should return an empty array for empty url', (t) => {
    const url = ''
    const result = matchParams(url)
    t.same(result, [])
    t.end()
  })

  t.test('should return an array of matched parameters', (t) => {
    const url = '/example/{userId}/{secretToken}'
    const result = matchParams(url)
    t.same(result, ['{userId}', '{secretToken}'])
    t.end()
  })

  t.test('should return an empty array for url without parameters', (t) => {
    const url = '/example/path'
    const result = matchParams(url)
    t.same(result, [])
    t.end()
  })

  t.end()
})

const urlsToShemas = [
  [
    '/example/{userId}', {
      params: {
        type: 'object',
        properties: {
          userId: {
            type: 'string'
          }
        }
      }
    }
  ],
  [
    '/example/{userId}/{secretToken}', {
      params: {
        type: 'object',
        properties: {
          userId: {
            type: 'string'
          },
          secretToken: {
            type: 'string'
          }
        }
      }
    }
  ],
  [
    '/example/near/{lat}-{lng}', {
      params: {
        type: 'object',
        properties: {
          lat: {
            type: 'string'
          },
          lng: {
            type: 'string'
          }
        }
      }
    }
  ]
]

test('generateParamsSchema function', (t) => {
  t.plan(urlsToShemas.length)
  for (const [url, expectedSchema] of urlsToShemas) {
    const result = generateParamsSchema(url)

    t.same(result, expectedSchema)
  }
})

test('paramName function', (t) => {
  t.test('should return the captured value from the param', (t) => {
    const param = '{userId}'
    const result = paramName(param)
    t.equal(result, 'userId')
    t.end()
  })

  t.test('should return the same value if there are no captures', (t) => {
    const param = 'userId'
    const result = paramName(param)
    t.equal(result, 'userId')
    t.end()
  })

  t.end()
})
