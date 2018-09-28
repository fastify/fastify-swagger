'use strict'

const path = require('path')

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: { hide: true },
    handler: (request, reply) => {
      if (fastify.basePath === '/') {
        reply.redirect('/index.html')
      } else {
        reply.redirect(`${fastify.basePath}/index.html`)
      }
    }
  })

  fastify.route({
    url: '/json',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply.send(fastify.swagger())
    }
  })

  fastify.route({
    url: '/yaml',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      reply
        .type('application/x-yaml')
        .send(fastify.swagger({ yaml: true }))
    }
  })

  // serve swagger-ui with the help of fastify-static
  fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static')
  })

  next()
}

module.exports = fastifySwagger
