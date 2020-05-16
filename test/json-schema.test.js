'use strict'

const { test } = require('tap')

const Fastify = require('fastify')
const fastifySwagger = require('../index')
// const Swagger = require('swagger-parser')

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

      subinstance.post('/', {
        handler () {},
        schema: {
          body: { $id: 'bug', $ref: 'example#/properties/hello' }
          // TODO
          // querystring: { $ref: 'subschema-two#/properties/hello' },
          // params: { $ref: 'subschema-two#/properties/hello' },
          // headers: { $ref: 'subschema-three#/properties/hello' }
        }
      })

      next()
    })

    next()
  })

  await fastify.ready() // ? inject ignore ready?!
  const res = await fastify.inject('/docs/json')
  t.pass('done')
  require('fs').writeFileSync('./out.json', JSON.stringify(res.json(), null, 2))
})
