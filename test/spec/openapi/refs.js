'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')
const { openapiOption } = require('../../../examples/options')

test('support $ref schema', (t) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)
  fastify.register(function (instance, _, done) {
    instance.addSchema({ $id: 'Order', type: 'object', properties: { id: { type: 'integer' } } })
    instance.post('/', { schema: { body: { $ref: 'Order#' }, response: { 200: { $ref: 'Order#' } } } }, () => {})
    done()
  })

  fastify.ready((err) => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')
    t.match(Object.keys(openapiObject.components.schemas), ['def-0'])

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('support nested $ref schema', (t) => {
  t.plan(5)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)
  fastify.register(function (instance, _, done) {
    instance.addSchema({ $id: 'OrderItem', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'Order', type: 'object', properties: { products: { type: 'array', items: { $ref: 'OrderItem' } } } })
    instance.post('/', { schema: { body: { $ref: 'Order' }, response: { 200: { $ref: 'Order' } } } }, () => {})
    done()
  })

  fastify.ready((err) => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')
    t.match(Object.keys(openapiObject.components.schemas), ['def-0', 'def-1'])

    // OrderItem ref must be prefixed by '#/components/schemas/'
    t.equal(openapiObject.components.schemas['def-1'].properties.products.items.$ref, '#/components/schemas/def-0')

    Swagger.validate(openapiObject)
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})
