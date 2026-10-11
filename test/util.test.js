'use strict'

const { test, describe } = require('node:test')
const { formatParamUrl } = require('../lib/util/format-param-url')
const { hasParams, matchParams } = require('../lib/util/match-params')
const { generateParamsSchema, paramName } = require('../lib/util/generate-params-schema')
const { shouldRouteHide } = require('../lib/util/should-route-hide')

const cases = [
  ['/example/:userId', '/example/{userId}'],
  ['/example/:userId/:secretToken', '/example/{userId}/{secretToken}'],
  ['/example/near/:lat-:lng/radius/:r', '/example/near/{lat}-{lng}/radius/{r}'],
  ['/example/near/:lat_1-:lng_1/radius/:r_1', '/example/near/{lat_1}-{lng_1}/radius/{r_1}'],
  ['/example/*', '/example/{*}'],
  ['/example/:file(^\\d+).png', '/example/{file}.png'],
  ['/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', '/example/at/{hour}h{minute}m'],
  ['/example/at/(^\\d{2})h(^\\d{2})m', '/example/at/{regexp1}h{regexp2}m'],
  ['/example/at/(^([0-9]{2})h$)-(^([0-9]{2})m$)', '/example/at/{regexp1}-{regexp2}'],
  ['/name::verb', '/name:verb'],
  ['/api/v1/postalcode-jp/:code(^[0-9]{7}$)', '/api/v1/postalcode-jp/{code}'],
  ['/api/v1/postalcode-jp/(^[0-9]{7}$)', '/api/v1/postalcode-jp/{regexp1}']
]

describe('formatParamUrl', () => {
  for (const kase of cases) {
    test(`formatParamUrl ${kase}`, (t) => {
      t.assert.strictEqual(formatParamUrl(kase[0]), kase[1])
    })
  }
})

describe('hasParams function', () => {
  test('should return false for empty url', (t) => {
    const url = ''
    const result = hasParams(url)
    t.assert.strictEqual(result, false)
  })

  test('should return true for url with parameters', (t) => {
    const url = '/example/{userId}'
    const result = hasParams(url)
    t.assert.strictEqual(result, true)
  })

  test('should return true for url with multiple parameters', (t) => {
    const url = '/example/{userId}/{secretToken}'
    const result = hasParams(url)
    t.assert.strictEqual(result, true)
  })

  test('should return false for url without parameters', (t) => {
    const url = '/example/path'
    const result = hasParams(url)
    t.assert.strictEqual(result, false)
  })
})

describe('matchParams function', (t) => {
  test('should return an empty array for empty url', (t) => {
    const url = ''
    const result = matchParams(url)
    t.assert.deepStrictEqual(result, [])
  })

  test('should return an array of matched parameters', (t) => {
    const url = '/example/{userId}/{secretToken}'
    const result = matchParams(url)
    t.assert.deepStrictEqual(result, ['{userId}', '{secretToken}'])
  })

  test('should return an empty array for url without parameters', (t) => {
    const url = '/example/path'
    const result = matchParams(url)
    t.assert.deepStrictEqual(result, [])
  })
})

describe('generateParamsSchema function', (t) => {
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

  test('generateParamsSchema', (t) => {
    for (const [url, expectedSchema] of urlsToShemas) {
      const result = generateParamsSchema(url)

      t.assert.deepStrictEqual(result, expectedSchema)
    }
  })
})

describe('paramName function', () => {
  test('should return the captured value from the param', (t) => {
    const param = '{userId}'
    const result = paramName(param)
    t.assert.strictEqual(result, 'userId')
  })

  test('should return the same value if there are no captures', (t) => {
    const param = 'userId'
    const result = paramName(param)
    t.assert.strictEqual(result, 'userId')
  })
})

describe('shouldRouteHide', () => {
  test('shouldRouteHide should return true for hidden route', (t) => {
    t.assert.ok(shouldRouteHide({ hide: true }, {}))
  })

  test('shouldRouteHide should return true for hideUntagged', (t) => {
    t.assert.ok(shouldRouteHide({ tags: [] }, { hideUntagged: true }))
  })

  test('shouldRouteHide should return true for hiddenTag', (t) => {
    t.assert.ok(shouldRouteHide({ tags: ['x-test'] }, { hiddenTag: 'x-test' }))
  })

  test('shouldRouteHide should return false for non hidden route', (t) => {
    t.assert.equal(shouldRouteHide({}, {}), false)
  })
})

describe('resolveLocalRef', () => {
  const { resolveLocalRef } = require('../lib/util/resolve-local-ref')
  const definition = { type: 'object', properties: { a: { type: 'string' } } }

  test('falls back to the definition when the pointer cannot be followed', (t) => {
    const expected = { a: { type: 'string', required: false } }
    t.assert.deepStrictEqual(resolveLocalRef({ $ref: '#/definitions/def-0/definitions/missing/deep' }, { 'def-0': definition }), expected)
    t.assert.deepStrictEqual(resolveLocalRef({ $ref: '#/definitions/def-0/properties/a' }, { 'def-0': definition }), expected)
    t.assert.deepStrictEqual(resolveLocalRef({ $ref: '#/components/schemas/def-0' }, { 'def-0': definition }), expected)
  })
})

describe('definitions', () => {
  const {
    prepareSharedSchemas,
    hoistDefinitions,
    rewriteAnchorRefs,
    rewriteHoistedRefs
  } = require('../lib/util/definitions')

  test('prepareSharedSchemas absolutizes the local refs using the closest non-fragment $id', (t) => {
    const schema = {
      $id: 'http://example.com/root.json#',
      properties: {
        a: { $ref: '#/definitions/a' },
        b: { $id: '#anchor', properties: { c: { $ref: '#' } } },
        d: { $id: 'other.json', items: [{ $ref: '#/items/1' }, { type: 'string' }] },
        e: { $ref: 'external#' },
        f: { enum: [{ $ref: '#/not/a/schema' }], dependencies: { a: ['b'] } }
      }
    }
    prepareSharedSchemas([schema])

    t.assert.strictEqual(schema.properties.a.$ref, 'http://example.com/root.json#/definitions/a')
    t.assert.strictEqual(schema.properties.b.properties.c.$ref, 'http://example.com/root.json#')
    t.assert.strictEqual(schema.properties.d.items[0].$ref, 'other.json#/items/1')
    t.assert.strictEqual(schema.properties.e.$ref, 'external#')
    t.assert.strictEqual(schema.properties.f.enum[0].$ref, '#/not/a/schema')
  })

  test('prepareSharedSchemas ignores schemas without $id', (t) => {
    const schema = { $ref: '#/definitions/a' }
    t.assert.deepStrictEqual(prepareSharedSchemas([schema, true]), new Map())
    t.assert.deepStrictEqual(schema, { $ref: '#/definitions/a' })
  })

  test('hoistDefinitions escapes the JSON pointer tokens', (t) => {
    const hoisted = new Map()
    const shared = { type: 'string' }
    const schema = {
      definitions: { shared, 'a/b~c': { type: 'integer' } },
      properties: { 'x/y': { definitions: { z: { type: 'boolean' } } } }
    }

    const result = hoistDefinitions('root', schema, { shared }, hoisted)

    t.assert.deepStrictEqual(result, [
      ['root-a/b~c', { type: 'integer' }],
      ['root-z', { type: 'boolean' }]
    ])
    t.assert.deepStrictEqual(Object.fromEntries(hoisted), {
      'root/definitions/a~1b~0c': 'root-a/b~c',
      'root/properties/x~1y/definitions/z': 'root-z'
    })
    t.assert.deepStrictEqual(schema, { properties: { 'x/y': {} } })
  })

  test('rewriteHoistedRefs rewrites only the hoisted references', (t) => {
    const hoisted = new Map([['a/definitions/b', 'a-b'], ['a/definitions/b/definitions/c', 'a-c']])
    const document = {
      list: [
        { $ref: '#/definitions/a/definitions/b/definitions/c/properties/d' },
        { $ref: '#/definitions/a/definitions/b' },
        { $ref: '#/definitions/a/properties/b' },
        { $ref: '#/parameters/a/definitions/b' },
        { $ref: 42 },
        null
      ]
    }

    rewriteHoistedRefs(document, '#/definitions/', hoisted)
    t.assert.deepStrictEqual(document.list, [
      { $ref: '#/definitions/a-c/properties/d' },
      { $ref: '#/definitions/a-b' },
      { $ref: '#/definitions/a/properties/b' },
      { $ref: '#/parameters/a/definitions/b' },
      { $ref: 42 },
      null
    ])

    const untouched = { $ref: '#/definitions/a/definitions/b' }
    rewriteHoistedRefs(untouched, '#/definitions/', new Map())
    t.assert.deepStrictEqual(untouched, { $ref: '#/definitions/a/definitions/b' })
  })

  test('prepareSharedSchemas maps the anchors to the JSON pointer of their schema resource', (t) => {
    const orphan = { definitions: { noBase: { $id: '#orphan' } } }
    const root = {
      $id: 'http://example.com/root.json',
      definitions: {
        'a/b': { $id: '#escaped' },
        first: { $id: '#twice' },
        second: { $id: '#twice' },
        empty: { $id: '#' },
        nested: {
          $id: 'http://example.com/nested.json',
          properties: { c: { $id: '#inner' } }
        }
      },
      enum: [{ $id: '#data' }]
    }
    const anchors = prepareSharedSchemas([root, orphan, true])

    t.assert.deepStrictEqual(Object.fromEntries(anchors), {
      'http://example.com/root.json#escaped': 'http://example.com/root.json#/definitions/a~1b',
      'http://example.com/root.json#twice': 'http://example.com/root.json#/definitions/first',
      'http://example.com/nested.json#inner': 'http://example.com/nested.json#/properties/c'
    })

    // the anchors are removed, data and schemas without a base URI are left untouched
    t.assert.deepStrictEqual(root.definitions.first, {})
    t.assert.deepStrictEqual(root.definitions.empty, {})
    t.assert.strictEqual(root.definitions.nested.$id, 'http://example.com/nested.json')
    t.assert.deepStrictEqual(root.definitions.nested.properties.c, {})
    t.assert.deepStrictEqual(root.enum, [{ $id: '#data' }])
    t.assert.strictEqual(orphan.definitions.noBase.$id, '#orphan')
  })

  test('prepareSharedSchemas rewrites the refs to an anchor declared later', (t) => {
    const schema = {
      $id: 'http://example.com/root.json',
      properties: {
        a: { $ref: '#address' },
        b: { $ref: 'http://example.com/root.json#address' },
        c: { $ref: '#missing' }
      },
      definitions: { address: { $id: '#address', type: 'object' } }
    }
    prepareSharedSchemas([schema])

    t.assert.strictEqual(schema.properties.a.$ref, 'http://example.com/root.json#/definitions/address')
    t.assert.strictEqual(schema.properties.b.$ref, 'http://example.com/root.json#/definitions/address')
    t.assert.strictEqual(schema.properties.c.$ref, 'http://example.com/root.json#missing')
    t.assert.deepStrictEqual(schema.definitions.address, { type: 'object' })
  })

  test('rewriteAnchorRefs only touches the references to a known anchor', (t) => {
    const anchors = new Map([['common#address', 'common#/definitions/foo']])
    const responses = {
      200: { $ref: 'common#address' },
      404: { oneOf: [{ $ref: 'common#address' }, { $ref: 'common#unknown' }, { $ref: 42 }, null] }
    }

    t.assert.strictEqual(rewriteAnchorRefs(responses, anchors), responses)
    t.assert.deepStrictEqual(responses, {
      200: { $ref: 'common#/definitions/foo' },
      404: { oneOf: [{ $ref: 'common#/definitions/foo' }, { $ref: 'common#unknown' }, { $ref: 42 }, null] }
    })
    t.assert.strictEqual(rewriteAnchorRefs(true, anchors), true)
  })
})
