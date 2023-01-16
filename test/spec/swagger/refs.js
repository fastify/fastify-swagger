'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')
const { FST_ERR_SCH_ALREADY_PRESENT } = require('fastify/lib/errors')

test('support $ref schema', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({
    $id: 'example',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  await fastify.register(fastifySwagger)

  fastify.register((instance, opts, next) => {
    instance.addSchema({
      $id: 'subschema-two',
      type: 'object',
      properties: {
        hello: { type: 'string' }
      }
    })

    instance.register((subinstance, opts, next) => {
      subinstance.addSchema({
        $id: 'subschema-three',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      })

      subinstance.post('/:hello', {
        handler () {},
        schema: {
          body: { $ref: 'example#/properties/hello' },
          querystring: { $ref: 'subschema-two#/properties/hello' },
          params: { $ref: 'subschema-two#/properties/hello' },
          headers: { $ref: 'subschema-three#/properties/hello' },
          response: {
            200: { $ref: 'example#/properties/hello' }
          }
        }
      })

      next()
    })

    next()
  })

  await fastify.ready()

  await Swagger.validate(fastify.swagger())
  t.pass('valid swagger object')
})

test('support nested $ref schema : complex case', async (t) => {
  const options = {
    swagger: {},
    refResolver: {
      buildLocalReference: (json, baseUri, fragment, i) => {
        return json.$id || `def-${i}`
      }
    }
  }
  const fastify = Fastify()
  await fastify.register(fastifySwagger, options)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string' } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')
  const definitions = swaggerObject.definitions
  t.match(Object.keys(definitions), ['schemaA', 'schemaB', 'schemaC', 'schemaD'])

  // ref must be prefixed by '#/definitions/'
  t.equal(definitions.schemaC.properties.a.items.$ref, '#/definitions/schemaA')
  t.equal(definitions.schemaD.properties.b.$ref, '#/definitions/schemaB')
  t.equal(definitions.schemaD.properties.c.$ref, '#/definitions/schemaC')

  await Swagger.validate(swaggerObject)
})

test('support nested $ref schema : complex case without modifying buildLocalReference', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string' } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.equal(typeof swaggerObject, 'object')

  const definitions = swaggerObject.definitions
  t.match(Object.keys(definitions), ['def-0', 'def-1', 'def-2', 'def-3'])

  // ref must be prefixed by '#/definitions/'
  t.equal(definitions['def-2'].properties.a.items.$ref, '#/definitions/def-0')
  t.equal(definitions['def-3'].properties.b.$ref, '#/definitions/def-1')
  t.equal(definitions['def-3'].properties.c.$ref, '#/definitions/def-2')

  await Swagger.validate(swaggerObject)
})

test('trying to overwriting a schema results in a FST_ERR_SCH_ALREADY_PRESENT', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    t.throws(() => instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } }), new FST_ERR_SCH_ALREADY_PRESENT('schemaA'))
  })

  await fastify.ready()
})

test('renders $ref schema with enum in headers', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'headerA', type: 'object', properties: { 'x-enum-header': { type: 'string', enum: ['OK', 'NOT_OK'] } } })
    instance.get('/url1', { schema: { headers: { $ref: 'headerA#' }, response: { 200: { type: 'object' } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const swagger = fastify.swagger()

  await Swagger.validate(swagger)

  t.match(swagger.paths['/url1'].get.parameters[0], { type: 'string', enum: ['OK', 'NOT_OK'] })
})
