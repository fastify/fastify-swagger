'use strict'

const fp = require('fastify-plugin')
const readFileSync = require('fs').readFileSync
const swaggerUiAssetPath = require('swagger-ui-dist').getAbsoluteFSPath()

const files = {
  // prepare index file, so it corresponds our needs
  index: readFileSync(`${swaggerUiAssetPath}/index.html`, 'utf8')
    .replace('window.ui = ui', `window.ui = ui

  function resolveUrl (url) {
      const anchor = document.createElement('a')
      anchor.href = url
      return anchor.href
  }`)
    .replace(
      /url: "(.*)",/,
      `url: resolveUrl('./json'),
    oauth2RedirectUrl: resolveUrl('./oauth2-redirect.html'),`
    )
}

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

  // server swagger-ui with the help of fastify-static
  fastify.register(require('fastify-static'), {
    root: swaggerUiAssetPath,
    prefix: `/documentation/`
  })

  // hijak swagger index.html response
  fastify.addHook('onSend', (request, reply, payload, next) => {
    if (
      request.raw.originalUrl === `/documentation/` ||
      request.raw.originalUrl === `/documentation/index.html`
    ) {
      reply.header('Content-Type', 'text/html; charset=UTF-8')
      payload = files.index
    }
    next(null, payload)
  })

  next()
}

module.exports = fp(fastifySwagger, '>=0.14.0')
