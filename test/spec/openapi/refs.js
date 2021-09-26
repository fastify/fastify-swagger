'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')
const { openapiOption } = require('../../../examples/options')

test('support $ref schema', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)
  fastify.register(function (instance, _, done) {
    instance.addSchema({ $id: 'Order', type: 'object', properties: { id: { type: 'integer' } } })
    instance.post('/', { schema: { body: { $ref: 'Order#' }, response: { 200: { $ref: 'Order#' } } } }, () => {})
    done()
  })

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('support nested $ref schema : complex case', async (t) => {
  const fastify = Fastify()
  const openapiOption = {
    openapi: {},
    refResolver: {
      buildLocalReference: (json, baseUri, fragment, i) => {
        return json.$id || `def-${i}`
      }
    }
  }
  fastify.register(fastifySwagger, openapiOption)
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
  t.match(Object.keys(schemas), ['schemaA', 'schemaB', 'schemaC', 'schemaD'])

  // ref must be prefixed by '#/components/schemas/'
  t.equal(schemas.schemaC.properties.a.items.$ref, '#/components/schemas/schemaA')
  t.equal(schemas.schemaD.properties.b.$ref, '#/components/schemas/schemaB')
  t.equal(schemas.schemaD.properties.c.$ref, '#/components/schemas/schemaC')

  await Swagger.validate(openapiObject)
})

test('support nested $ref schema : complex case without modifying buildLocalReference', async (t) => {
  const fastify = Fastify()
  fastify.register(fastifySwagger, openapiOption)
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
  t.equal(schemas['def-2'].properties.a.items.$ref, '#/components/schemas/schemaA')
  t.equal(schemas['def-3'].properties.b.$ref, '#/components/schemas/schemaB')
  t.equal(schemas['def-3'].properties.c.$ref, '#/components/schemas/schemaC')

  await Swagger.validate(openapiObject)
})
