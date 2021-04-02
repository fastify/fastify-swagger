'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const fastifySwagger = require('../index')
const fastifyHelmet = require('fastify-helmet')
const swaggerCSP = require('../static/csp.json')
test('fastify will response swagger csp', t => {
  t.plan(2)

  const scriptCSP = swaggerCSP.script.length > 0 ? ` ${swaggerCSP.script.join(' ')}` : ''
  const styleCSP = swaggerCSP.style.length > 0 ? ` ${swaggerCSP.style.join(' ')}` : ''
  const csp = `default-src 'self';img-src 'self' data: validator.swagger.io;script-src 'self'${scriptCSP};style-src 'self' https:${styleCSP}`

  const fastify = Fastify()

  fastify.register(fastifySwagger)
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

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (err, res) => {
    t.error(err)
    t.same(res.headers['content-security-policy'], csp)
  })
})
