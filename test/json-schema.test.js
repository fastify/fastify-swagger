'use strict'

const { test } = require('tap')

const Fastify = require('fastify')
const fastifySwagger = require('../index')
// const Swagger = require('swagger-parser')

test('support $ref schema', t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.register(fastifySwagger, { exposeRoute: true })

  fastify.addSchema({
    $id: 'http://example.com/',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  fastify.post('/', {
    handler () {},
    schema: {
      body: { $ref: 'http://example.com#/properties/hello' }
    }
  })

  fastify.ready(err => {
    t.error(err)
  })
})
