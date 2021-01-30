'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')
const {
  openapiOption,
  schemaAllOf
} = require('../../../examples/options')

test('suport - oneOf, anyOf, allOf', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaAllOf, () => {})

  fastify.ready(err => {
    t.error(err)
    const openapiObject = fastify.swagger()
    Swagger.validate(openapiObject)
      .then(function (api) {
        const definedPath = api.paths['/'].get
        t.ok(definedPath)
        t.same(definedPath.parameters, [
          {
            required: false,
            in: 'query',
            name: 'foo',
            schema: {
              type: 'string'
            }
          }
        ])
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})

test('support 2xx response', async t => {
  const opt = {
    schema: {
      response: {
        '2XX': {
          type: 'object'
        },
        '3xx': {
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    openapi: true,
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['2XX'].description, 'Default Response')
  t.same(definedPath.responses['3XX'].description, 'Default Response')
})
