'use strict'

const fp = require('fastify-plugin')
const path = require('path')

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/documentation/json',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply.send(fastify.swagger())
    }
  })

  fastify.route({
    url: '/documentation/yaml',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply
        .type('application/x-yaml')
        .send(fastify.swagger({ yaml: true }))
    }
  })

  fastify.route({
    url: '/documentation',
    method: 'GET',
    schema: { hide: true },
    handler: (request, reply) => reply.redirect('./documentation/')
  })

  // serve swagger-ui with the help of fastify-static
  fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static'),
    prefix: `/documentation/`
  })

  next()
}

module.exports = fp(fastifySwagger, '>=0.14.0')
