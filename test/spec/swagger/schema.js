'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('swagger-parser')
const fastifySwagger = require('../../../index')

test('support file in json schema', async t => {
  const opts7 = {
    schema: {
      consumes: ['application/x-www-form-urlencoded'],
      body: {
        type: 'object',
        properties: {
          hello: {
            description: 'hello',
            type: 'string',
            contentEncoding: 'binary'
          }
        },
        required: ['hello']
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts7, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [{
    in: 'formData',
    name: 'hello',
    description: 'hello',
    required: true,
    type: 'file'
  }])
})

test('support response description', async t => {
  const opts8 = {
    schema: {
      response: {
        200: {
          description: 'Response OK!',
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts8, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Response OK!')
})

test('response default description', async t => {
  const opts9 = {
    schema: {
      response: {
        200: {
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  fastify.register(fastifySwagger, {
    routePrefix: '/docs',
    exposeRoute: true
  })
  fastify.get('/', opts9, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Default Response')
})
