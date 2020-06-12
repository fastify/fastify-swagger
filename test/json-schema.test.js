'use strict'

const { test } = require('tap')

const Fastify = require('fastify')
const fastifySwagger = require('../index')
const Swagger = require('swagger-parser')

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
