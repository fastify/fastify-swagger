'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')

const openapiOption = {
  openapi: {},
  refResolver: {
    buildLocalReference: (json, baseUri, fragment, i) => {
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
  t.equal(typeof openapiObject, 'object')
  t.match(Object.keys(openapiObject.components.schemas), ['Order'])
  t.equal(openapiObject.components.schemas.Order.properties.id.example, 25)

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
  t.equal(typeof openapiObject, 'object')
  t.match(Object.keys(openapiObject.components.schemas), ['Order'])

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
  t.equal(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.match(Object.keys(schemas), ['OrderItem', 'ProductItem', 'Order'])

  //  ref must be prefixed by '#/components/schemas/'
  t.equal(schemas.Order.properties.products.items.$ref, '#/components/schemas/OrderItem')
  t.match(schemas.OrderItem.example, { id: 1 })

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
  t.equal(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.match(Object.keys(schemas), ['schemaA', 'schemaB', 'schemaC', 'schemaD'])

  // ref must be prefixed by '#/components/schemas/'
  t.equal(schemas.schemaC.properties.a.items.$ref, '#/components/schemas/schemaA')
  t.equal(schemas.schemaD.properties.b.$ref, '#/components/schemas/schemaB')
  t.equal(schemas.schemaD.properties.c.$ref, '#/components/schemas/schemaC')
  t.equal(schemas.schemaB.properties.id.example, 'ABC')

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
  t.equal(typeof openapiObject, 'object')

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

  t.equal(responseBeforeSwagger.statusCode, 200)
  const openapiObject = fastify.swagger()

  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'POST', url: '/', payload: { order: 'foo' } })

  t.equal(responseAfterSwagger.statusCode, 200)
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
  t.equal(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.match(Object.keys(schemas), ['def-0', 'def-1', 'def-2', 'def-3'])

  // ref must be prefixed by '#/components/schemas/'
  t.equal(schemas['def-2'].properties.a.items.$ref, '#/components/schemas/def-0')
  t.equal(schemas['def-3'].properties.b.$ref, '#/components/schemas/def-1')
  t.equal(schemas['def-3'].properties.c.$ref, '#/components/schemas/def-2')

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
  t.equal(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.match(Object.keys(schemas), ['def-0'])

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'GET', url: '/url1', query: { field1: 10, field3: false } })

  t.equal(responseAfterSwagger.statusCode, 200)
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
  t.equal(typeof openapiObject, 'object')

  const schemas = openapiObject.components.schemas
  t.match(Object.keys(schemas), ['def-0'])

  await Swagger.validate(openapiObject)

  const responseAfterSwagger = await fastify.inject({ method: 'GET', url: '/url1', headers: { 'x-header-1': 'test', 'x-header-2': 'test' } })

  t.equal(responseAfterSwagger.statusCode, 200)
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
  }, (req, reply) => ({ result: 'OK' }))

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].get

  t.ok(schema)
  t.ok(schema.parameters)
  t.same(schema.parameters[0].in, 'query')
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
  t.match(openapiObject.paths['/url1'].get.parameters[0].schema, { type: 'string', enum: ['OK', 'NOT_OK'] })
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

  t.match(openapiObject.paths['/url1'].get.parameters[0].schema, cookie)

  let res = await fastify.inject({ method: 'GET', url: 'url1', cookies: { a: 'hi', b: 'asd' } })

  t.match(res.statusCode, 200)

  res = await fastify.inject({ method: 'GET', url: 'url1', cookies: { a: 'hi' } })

  t.match(res.statusCode, 400)
  t.match(openapiObject.paths['/url1'].get.parameters[0].schema, cookie)
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

  t.equal(typeof openapiObject, 'object')
  t.match(Object.keys(openapiObject.components.schemas), ['Subscription', 'Event'])
  t.equal(openapiObject.components.schemas.Subscription.properties.callbackUrl.example, 'https://example.com')
  t.equal(openapiObject.components.schemas.Event.properties.message.example, 'Some event happened')

  await Swagger.validate(openapiObject)
})
