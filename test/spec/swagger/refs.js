'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')

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

  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })

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

  const res = await fastify.inject('/docs/json')

  await Swagger.validate(res.json())
  t.pass('valid swagger object')
})
