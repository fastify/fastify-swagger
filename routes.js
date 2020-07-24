'use strict'

const path = require('path')
const fastifyStatic = require('fastify-static')

// URI prefix to separate static assets for swagger UI
const staticPrefix = '/static'

function getRedirectPathForTheRootRoute (url) {
  let redirectPath

  if (url.substr(-1) === '/') {
    redirectPath = `.${staticPrefix}/index.html`
  } else {
    const urlPathParts = url.split('/')
    redirectPath = `./${urlPathParts[urlPathParts.length - 1]}${staticPrefix}/index.html`
  }

  return redirectPath
}

function fastifySwagger (fastify, opts, next) {
  fastify.route({
    url: '/',
    method: 'GET',
    schema: { hide: true },
    handler: (req, reply) => {
      reply.redirect(getRedirectPathForTheRootRoute(req.raw.url))
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
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'static'),
    prefix: staticPrefix,
    decorateReply: false
  })

  fastify.register(fastifyStatic, {
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
      reply.sendFile(file)
    }
  })

  next()
}

module.exports = fastifySwagger
