'use strict'

const path = require('path')

// URI prefix to separate static assets for swagger UI
const staticPrefix = '/static'

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: { hide: true },
    handler: (request, reply) => {
      if (fastify.prefix === '/') {
        reply.redirect(`${staticPrefix}/index.html`)
      } else {
        reply.redirect(`${fastify.prefix}${staticPrefix}/index.html`)
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
    root: path.join(__dirname, 'static'),
    prefix: staticPrefix,
    decorateReply: false
  })

  fastify.register(require('fastify-static'), {
    root: opts.baseDir || __dirname,
    serve: false
  })

  // Handler for external documentation files passed via $ref
  fastify.route({
    url: '/*',
    method: 'GET',
    schema: { hide: true },
    handler: function (req, reply) {
      const file = req.params['*']
      if (file === '') {
        reply.redirect(302, `${fastify.basePath}${staticPrefix}/index.html`)
      } else {
        reply.sendFile(file)
      }
    }
  })

  next()
}

module.exports = fastifySwagger
