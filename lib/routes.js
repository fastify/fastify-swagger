'use strict'

const path = require('path')
const fastifyStatic = require('@fastify/static')

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

function fastifySwagger (fastify, opts, done) {
  const hooks = Object.create(null)
  if (opts.hooks) {
    const additionalHooks = [
      'onRequest',
      'preHandler'
    ]
    for (const hook of additionalHooks) {
      hooks[hook] = opts.hooks[hook]
    }
  }

  fastify.route({
    url: '/',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: (req, reply) => {
      reply.redirect(getRedirectPathForTheRootRoute(req.raw.url))
    }
  })

  fastify.route({
    url: '/uiConfig',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: (req, reply) => {
      reply.send(opts.uiConfig)
    }
  })

  fastify.route({
    url: '/initOAuth',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: (req, reply) => {
      reply.send(opts.initOAuth)
    }
  })

  fastify.route({
    url: '/json',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: function (req, reply) {
      reply.send(fastify.swagger())
    }
  })

  fastify.route({
    url: '/yaml',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: function (req, reply) {
      reply
        .type('application/x-yaml')
        .send(fastify.swagger({ yaml: true }))
    }
  })

  // serve swagger-ui with the help of @fastify/static
  fastify.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'static'),
    prefix: staticPrefix,
    decorateReply: false
  })

  fastify.register(fastifyStatic, {
    root: opts.baseDir || path.join(__dirname, '..'),
    serve: false
  })

  // Handler for external documentation files passed via $ref
  fastify.route({
    url: '/*',
    method: 'GET',
    schema: { hide: true },
    ...hooks,
    handler: function (req, reply) {
      const file = req.params['*']
      reply.sendFile(file)
    }
  })

  done()
}

module.exports = fastifySwagger
