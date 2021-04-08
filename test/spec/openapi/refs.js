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
    instance.addSchema({ $id: 'Params', type: 'object', properties: { reqd: { type: 'string' } }, required: ['reqd'] })
    instance.post('/', {
      schema: {
        body: { $ref: 'Order#' },
        querystring: { $ref: 'Params#' },
        params: { $ref: 'Params#' },
        headers: { $ref: 'Params#' },
        cookies: { $ref: 'Params#' },
        response: { 200: { $ref: 'Order#' } }
      }
    }, () => {})
    done()
  })

  fastify.ready(err => {
    t.error(err)

    const openapiObject = fastify.swagger()
    t.equal(typeof openapiObject, 'object')

    Swagger.validate(JSON.parse(JSON.stringify(openapiObject)))
      .then(function (api) {
        t.pass('valid swagger object')
      })
      .catch(function (err) {
        t.fail(err)
      })
  })
})
