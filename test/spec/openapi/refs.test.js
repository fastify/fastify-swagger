'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')

const openapiOption = {
  openapi: {},
  refResolver: {
    buildLocalReference: (json, _baseUri, _fragment, i) => {
      return json.$id || `def-${i}`
    }
  }
}

test('support $ref schema', async (t) => {
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'Order', type: 'object', properties: { id: { type: 'integer', examples: [25] } } })
    instance.post('/', { schema: { body: { $ref: 'Order#' }, response: { 200: { $ref: 'Order#' } } } }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')
  t.assert.deepStrictEqual(Object.keys(openapiObject.components.schemas), ['Order'])
  t.assert.strictEqual(openapiObject.components.schemas.Order.properties.id.example, 25)

  await Swagger.validate(openapiObject)
})

test('support $ref relative pointers in params', async (t) => {
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(async (instance) => {
    instance.addSchema({
      $id: 'Order',
      type: 'object',
      properties: {
        OrderId: {
          type: 'object',
          properties: {
            id: {
              type: 'string'
            }
          }
        }
      }
    })
    instance.get('/:id', { schema: { params: { $ref: 'Order#/properties/OrderId' }, response: { 200: { $ref: 'Order#' } } } }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')
  t.assert.deepStrictEqual(Object.keys(openapiObject.components.schemas), ['Order'])

  await Swagger.validate(openapiObject)
})

test('support nested $ref schema : simple test', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'OrderItem', type: 'object', properties: { id: { type: 'integer' } }, examples: [{ id: 1 }] })
    instance.addSchema({ $id: 'ProductItem', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'Order', type: 'object', properties: { products: { type: 'array', items: { $ref: 'OrderItem' } } } })
    instance.post('/', { schema: { body: { $ref: 'Order' }, response: { 200: { $ref: 'Order' } } } }, () => {})
    instance.post('/other', { schema: { body: { $ref: 'ProductItem' } } }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['OrderItem', 'ProductItem', 'Order'])

  //  ref must be prefixed by '#/components/schemas/'
  t.assert.strictEqual(schemas.Order.properties.products.items.$ref, '#/components/schemas/OrderItem')
  t.assert.deepStrictEqual(schemas.OrderItem.example, { id: 1 })

  await Swagger.validate(openapiObject)
})

test('support nested $ref schema : complex case', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string', examples: ['ABC'] } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['schemaA', 'schemaB', 'schemaC', 'schemaD'])

  // ref must be prefixed by '#/components/schemas/'
  t.assert.strictEqual(schemas.schemaC.properties.a.items.$ref, '#/components/schemas/schemaA')
  t.assert.strictEqual(schemas.schemaD.properties.b.$ref, '#/components/schemas/schemaB')
  t.assert.strictEqual(schemas.schemaD.properties.c.$ref, '#/components/schemas/schemaC')
  t.assert.strictEqual(schemas.schemaB.properties.id.example, 'ABC')

  await Swagger.validate(openapiObject)
})

test('support $ref in response schema', async (t) => {
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(function (instance, _, done) {
    instance.addSchema({ $id: 'order', type: 'string', enum: ['foo'] })
    instance.post('/', { schema: { response: { 200: { type: 'object', properties: { order: { $ref: 'order' } } } } } }, () => {})

    done()
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
})

test('support $ref for enums in other schemas', async (t) => {
  const fastify = Fastify()

  const enumSchema = { $id: 'order', anyOf: [{ type: 'string', const: 'foo' }, { type: 'string', const: 'bar' }] }
  const enumRef = { $ref: 'order' }
  const objectWithEnumSchema = { $id: 'object', type: 'object', properties: { type: enumRef }, required: ['type'] }

  await fastify.register(fastifySwagger, openapiOption)
  await fastify.register(async (instance) => {
    instance.addSchema(enumSchema)
    instance.addSchema(objectWithEnumSchema)
    instance.post('/', { schema: { body: { type: 'object', properties: { order: { $ref: 'order' } } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const responseBeforeSwagger = await fastify.inject({ method: 'POST', url: '/', payload: { order: 'foo' } })

  t.assert.strictEqual(responseBeforeSwagger.statusCode, 200)
  const openapiObject = fastify.swagger()

  t.assert.strictEqual(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'POST', url: '/', payload: { order: 'foo' } })

  t.assert.strictEqual(responseAfterSwagger.statusCode, 200)
})

test('support nested $ref schema : complex case without modifying buildLocalReference', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string' } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['def-0', 'def-1', 'def-2', 'def-3'])

  // ref must be prefixed by '#/components/schemas/'
  t.assert.strictEqual(schemas['def-2'].properties.a.items.$ref, '#/components/schemas/def-0')
  t.assert.strictEqual(schemas['def-3'].properties.b.$ref, '#/components/schemas/def-1')
  t.assert.strictEqual(schemas['def-3'].properties.c.$ref, '#/components/schemas/def-2')

  await Swagger.validate(openapiObject)
})

test('support nested $ref with patternProperties', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', patternProperties: { '^[A-z]{1,10}$': { $ref: 'schemaA#' } } })
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['def-0', 'def-1'])

  // ref must be prefixed by '#/components/schemas/'
  t.assert.strictEqual(schemas['def-1'].additionalProperties.$ref, '#/components/schemas/def-0')

  await Swagger.validate(openapiObject)
})

test('support $ref schema in allOf in querystring', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { field1: { type: 'integer' } } })
    instance.get('/url1', { schema: { query: { type: 'object', allOf: [{ $ref: 'schemaA#' }, { type: 'object', properties: { field3: { type: 'boolean' } } }] }, response: { 200: { type: 'object' } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['def-0'])

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'GET', url: '/url1', query: { field1: 10, field3: false } })

  t.assert.strictEqual(responseAfterSwagger.statusCode, 200)
})

test('support $ref schema in allOf in headers', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'headerA', type: 'object', properties: { 'x-header-1': { type: 'string' } } })
    instance.get('/url1', { schema: { headers: { allOf: [{ $ref: 'headerA#' }, { type: 'object', properties: { 'x-header-2': { type: 'string' } } }] }, response: { 200: { type: 'object' } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.assert.deepStrictEqual(Object.keys(schemas), ['def-0'])

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'GET', url: '/url1', headers: { 'x-header-1': 'test', 'x-header-2': 'test' } })

  t.assert.strictEqual(responseAfterSwagger.statusCode, 200)
})

test('uses examples if has property required in body', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', {
    schema: {
      query: {
        type: 'object',
        oneOf: [
          {
            properties: {
              bar: { type: 'number' }
            }
          },
          {
            properties: {
              foo: { type: 'string' }
            }
          }
        ]
      },
      response: {
        200: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      }
    }
  }, () => ({ result: 'OK' }))

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].get

  t.assert.ok(schema)
  t.assert.ok(schema.parameters)
  t.assert.deepStrictEqual(schema.parameters[0].in, 'query')
})

test('renders required query parameter when property is a $ref', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })

  fastify.addSchema({
    $id: 'CoringUploadTypeApiModel',
    type: 'string',
    enum: ['health_safety', 'coring']
  })

  fastify.get('/some-route', {
    schema: {
      query: {
        type: 'object',
        required: ['thing'],
        properties: {
          thing: { $ref: 'CoringUploadTypeApiModel' },
          other: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            hello: { type: 'string' }
          }
        }
      }
    }
  }, () => ({ hello: 'world' }))

  await fastify.ready()

  const openapiObject = fastify.swagger()
  await Swagger.validate(openapiObject)

  const thingQueryParam = openapiObject.paths['/some-route'].get.parameters.find(parameter => parameter.name === 'thing')
  const otherQueryParam = openapiObject.paths['/some-route'].get.parameters.find(parameter => parameter.name === 'other')

  t.assert.strictEqual(thingQueryParam.required, true)
  t.assert.strictEqual(otherQueryParam.required, false)
})

test('renders $ref schema with enum in headers', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'headerA', type: 'object', properties: { 'x-enum-header': { type: 'string', enum: ['OK', 'NOT_OK'] } } })
    instance.get('/url1', { schema: { headers: { $ref: 'headerA#' }, response: { 200: { type: 'object' } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()

  await Swagger.validate(openapiObject)

  // the OpenAPI spec should show the enum
  t.assert.deepStrictEqual(openapiObject.paths['/url1'].get.parameters[0].schema, { type: 'string', enum: ['OK', 'NOT_OK'] })
})

test('renders $ref schema with additional keywords', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: {} })
  await fastify.register(require('@fastify/cookie'))

  const cookie = {
    type: 'object',
    properties: {
      a: { type: 'string' },
      b: { type: 'string' },
      c: { type: 'string' }
    },
    minProperties: 2
  }

  fastify.register(async (instance) => {
    instance.addSchema({
      $id: 'headerA',
      type: 'object',
      properties: {
        cookie
      }
    })

    instance.get('/url1', {
      preValidation: async (request) => {
        request.headers.cookie = request.cookies
      },
      schema: {
        headers: {
          $ref: 'headerA#'
        }
      }
    }, async (req) => (req.headers))
  })

  await fastify.ready()
  const openapiObject = fastify.swagger()
  await Swagger.validate(openapiObject)

  t.assert.deepStrictEqual(openapiObject.paths['/url1'].get.parameters[0].schema, cookie)

  let res = await fastify.inject({ method: 'GET', url: 'url1', cookies: { a: 'hi', b: 'asd' } })

  t.assert.deepStrictEqual(res.statusCode, 200)

  res = await fastify.inject({ method: 'GET', url: 'url1', cookies: { a: 'hi' } })

  t.assert.deepStrictEqual(res.statusCode, 400)
  t.assert.deepStrictEqual(openapiObject.paths['/url1'].get.parameters[0].schema, cookie)
})

test('support $ref in callbacks', async (t) => {
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'Subscription', type: 'object', properties: { callbackUrl: { type: 'string', examples: ['https://example.com'] } } })
    instance.addSchema({ $id: 'Event', type: 'object', properties: { message: { type: 'string', examples: ['Some event happened'] } } })
    instance.post('/subscribe', {
      schema: {
        body: {
          $ref: 'Subscription#'
        },
        response: {
          200: {
            $ref: 'Subscription#'
          }
        },
        callbacks: {
          myEvent: {
            '{$request.body#/callbackUrl}': {
              post: {
                requestBody: {
                  content: {
                    'application/json': {
                      schema: { $ref: 'Event#' }
                    }
                  }
                },
                responses: {
                  200: {
                    description: 'Success'
                  }
                }
              }
            }
          }
        }
      }
    }, () => {})
  })

  await fastify.ready()

  const openapiObject = fastify.swagger()

  t.assert.strictEqual(typeof openapiObject, 'object')
  t.assert.deepStrictEqual(Object.keys(openapiObject.components.schemas), ['Subscription', 'Event'])
  t.assert.strictEqual(openapiObject.components.schemas.Subscription.properties.callbackUrl.example, 'https://example.com')
  t.assert.strictEqual(openapiObject.components.schemas.Event.properties.message.example, 'Some event happened')

  await Swagger.validate(openapiObject)
})

test('should return only ref if defs and ref is defined', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })

  fastify.addSchema({
    $id: 'sharedSchema',
    humanModule: {
      $defs: {
        AddressSchema: {
          type: 'object',
          properties: {
            street: {
              type: 'string',
            },
            streetNumber: {
              type: 'number',
            },
          },
          required: [
            'street',
            'streetNumber',
          ],
          $id: 'AddressSchema',
        },
        PersonSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
            homeAddress: {
              $ref: 'AddressSchema',
            },
            workAddress: {
              $ref: 'AddressSchema',
            },
          },
          required: [
            'name',
            'homeAddress',
            'workAddress',
          ],
          $id: 'PersonSchema',
        },
        PostRequestSchema: {
          type: 'object',
          properties: {
            person: {
              $ref: 'PersonSchema',
            },
          },
          required: [
            'person',
          ],
          $id: 'PostRequestSchema',
        },
      },
    },
  })
  fastify.get('/person', {
    schema: {
      response: {
        200:
        {
          $defs: {
            AddressSchema: {
              type: 'object',
              properties: {
                street: {
                  type: 'string',
                },
                streetNumber: {
                  type: 'number',
                },
              },
              required: [
                'street',
                'streetNumber',
              ],
              $id: 'AddressSchema',
            },
            PersonSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                homeAddress: {
                  $ref: 'AddressSchema',
                },
                workAddress: {
                  $ref: 'AddressSchema',
                },
              },
              required: [
                'name',
                'homeAddress',
                'workAddress',
              ],
              $id: 'PersonSchema',
            },
            PostRequestSchema: {
              type: 'object',
              properties: {
                person: {
                  $ref: 'PersonSchema',
                },
              },
              required: [
                'person',
              ],
              $id: 'PostRequestSchema',
            },
          },
          $ref: 'PersonSchema',
        }
      }
    },
  }, async () => ({ result: 'OK' }))

  await fastify.ready()

  const openapiObject = fastify.swagger()

  t.assert.strictEqual(typeof openapiObject, 'object')

  const expectedPathContent = { 'application/json': { schema: { $ref: '#/components/schemas/def-2' } } }
  t.assert.deepStrictEqual(openapiObject.paths['/person'].get.responses[200].content, expectedPathContent)

  await Swagger.validate(openapiObject)
})

// https://github.com/fastify/fastify-swagger/issues/639
const definitionsCases = [
  ['openapi', { openapi: {} }, (document) => document.components.schemas, '#/components/schemas/']
]

for (const [name, option, getSchemas, prefix] of definitionsCases) {
  test(`${name}: support $ref to the definitions of a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'http://foo/common.json',
      type: 'object',
      definitions: {
        foo: {
          $id: '#address',
          type: 'object',
          properties: { city: { type: 'string' } }
        }
      }
    })
    fastify.post('/', {
      schema: {
        body: { $ref: 'http://foo/common.json#/definitions/foo' },
        response: { 200: { $ref: 'http://foo/common.json#/definitions/foo/properties/city' } }
      }
    }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.strictEqual(schemas['def-0'].definitions, undefined)
    t.assert.deepStrictEqual(schemas['def-0-foo'].properties, { city: { type: 'string' } })
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0-foo"`))
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0-foo/properties/city"`))
  })

  test(`${name}: support local $ref and nested definitions in a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'tree',
      type: 'object',
      definitions: {
        node: {
          type: 'object',
          definitions: {
            leaf: { type: 'string', enum: ['a', 'b'], default: 'a' }
          },
          properties: {
            // a property named as a keyword must not be hoisted
            definitions: { type: 'string' },
            value: { $ref: '#/definitions/node/definitions/leaf' },
            children: { type: 'array', items: { $ref: '#/definitions/node' } }
          }
        }
      },
      properties: {
        self: { $ref: '#' },
        root: { $ref: '#/definitions/node' },
        nested: {
          type: 'object',
          $defs: { node: { type: 'integer' } },
          properties: { id: { $ref: '#/properties/nested/$defs/node' } }
        },
        sibling: { $ref: '#/properties/nested' }
      }
    })
    // takes the name that would be assigned to the hoisted definition
    fastify.addSchema({ $id: 'other', type: 'object', properties: { tree: { $ref: 'tree#' } } })
    fastify.get('/', { schema: { response: { 200: { $ref: 'tree#' } } } }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.deepStrictEqual(Object.keys(schemas).sort(), [
      'def-0', 'def-0-leaf', 'def-0-node', 'def-0-node-1', 'def-1'
    ])
    t.assert.deepStrictEqual(schemas['def-0'].properties, {
      self: { $ref: `${prefix}def-0` },
      root: { $ref: `${prefix}def-0-node` },
      nested: { type: 'object', properties: { id: { $ref: `${prefix}def-0-node-1` } } },
      sibling: { $ref: `${prefix}def-0/properties/nested` }
    })
    t.assert.deepStrictEqual(schemas['def-0-node'].properties, {
      definitions: { type: 'string' },
      value: { $ref: `${prefix}def-0-leaf` },
      children: { type: 'array', items: { $ref: `${prefix}def-0-node` } }
    })
    t.assert.deepStrictEqual(schemas['def-0-node-1'], { type: 'integer' })
  })
}

for (const [name, option, getSchemas, prefix] of definitionsCases) {
  test(`${name}: support $ref to the anchor of a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    // same shape of the schemas of the Fastify "Fluent Schema" guide
    fastify.addSchema({
      $id: 'https://fastify/demo',
      type: 'object',
      definitions: {
        addressSchema: {
          $id: '#address',
          type: 'object',
          properties: { city: { type: 'string' } }
        },
        userSchema: {
          $id: '#user',
          type: 'object',
          properties: { home: { $ref: '#address' } }
        }
      }
    })

    const body = {
      type: 'object',
      properties: {
        residence: { $ref: 'https://fastify/demo#address' },
        office: { $ref: 'https://fastify/demo#/definitions/addressSchema' },
        owner: { $ref: 'https://fastify/demo#user' }
      }
    }
    fastify.post('/', {
      schema: {
        body,
        response: { 200: { $ref: 'https://fastify/demo#address' } }
      }
    }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    // the anchored subschemas are not listed twice
    t.assert.deepStrictEqual(Object.keys(schemas), ['def-0', 'def-0-addressSchema', 'def-0-userSchema'])
    t.assert.deepStrictEqual(schemas['def-0-userSchema'].properties.home, { $ref: `${prefix}def-0-addressSchema` })

    const operation = JSON.stringify(document.paths['/'].post)
    t.assert.doesNotMatch(operation, /def-0address/)
    t.assert.strictEqual(operation.split(`"$ref":"${prefix}def-0-addressSchema"`).length - 1, 3)
    t.assert.match(operation, new RegExp(`"\\$ref":"${prefix}def-0-userSchema"`))

    // the schema of the route is left untouched
    t.assert.strictEqual(body.properties.residence.$ref, 'https://fastify/demo#address')
  })

  test(`${name}: support $ref to an anchor outside of the definitions`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'order',
      type: 'object',
      properties: {
        shipping: { $id: '#shipping', type: 'object', properties: { city: { type: 'string' } } },
        billing: { $ref: '#shipping' }
      }
    })
    fastify.post('/', { schema: { body: { $ref: 'order#shipping' } } }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.deepStrictEqual(Object.keys(schemas), ['def-0'])
    t.assert.deepStrictEqual(schemas['def-0'].properties.billing, { $ref: `${prefix}def-0/properties/shipping` })
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0/properties/shipping"`))
  })
}
