'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('..')
const fastifyHelmet = require('@fastify/helmet')
const swaggerCSP = require('../static/csp.json')
test('fastify will response swagger csp', async (t) => {
  t.plan(1)

  const scriptCSP = swaggerCSP.script.length > 0 ? ` ${swaggerCSP.script.join(' ')}` : ''
  const styleCSP = swaggerCSP.style.length > 0 ? ` ${swaggerCSP.style.join(' ')}` : ''
  const csp = `default-src 'self';img-src 'self' data: validator.swagger.io;script-src 'self'${scriptCSP};style-src 'self' https:${styleCSP};base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';object-src 'none';script-src-attr 'none';upgrade-insecure-requests`

  const fastify = Fastify()

  await fastify.register(fastifySwagger)
  fastify.register(fastifyHelmet, instance => {
    return {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
          scriptSrc: ["'self'"].concat(instance.swaggerCSP.script),
          styleSrc: ["'self'", 'https:'].concat(instance.swaggerCSP.style)
        }
      }
    }
  })

  // route for testing CSP headers
  fastify.get('/', (req, reply) => {
    reply.send({
      foo: 'bar'
    })
  })

  const res = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  t.same(res.headers['content-security-policy'], csp)
})
