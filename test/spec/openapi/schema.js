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
