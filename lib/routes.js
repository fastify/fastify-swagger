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
  let staticCSP = false
  if (opts.staticCSP === true) {
    const csp = require('../static/csp.json')
    staticCSP = `default-src 'self'; base-uri 'self'; block-all-mixed-content; font-src 'self' https: data:; frame-ancestors 'self'; img-src 'self' data: validator.swagger.io; object-src 'none'; script-src 'self' ${csp.script.join(' ')}; script-src-attr 'none'; style-src 'self' https: ${csp.style.join(' ')}; upgrade-insecure-requests;`
  }
  if (typeof opts.staticCSP === 'string') {
    staticCSP = opts.staticCSP
  }
  if (typeof opts.staticCSP === 'object' && opts.staticCSP !== null) {
    staticCSP = ''
    Object.keys(opts.staticCSP).forEach(function (key) {
      const value = Array.isArray(opts.staticCSP[key]) ? opts.staticCSP[key].join(' ') : opts.staticCSP[key]
      staticCSP += `${key.toLowerCase()} ${value}; `
    })
  }

  if (typeof staticCSP === 'string' || typeof opts.transformStaticCSP === 'function') {
    fastify.addHook('onSend', function (request, reply, payload, done) {
      // set static csp when it is passed
      if (typeof staticCSP === 'string') {
        reply.header('content-security-policy', staticCSP.trim())
      }
      // mutate the header when it is passed
      const header = reply.getHeader('content-security-policy')
      if (header && typeof opts.transformStaticCSP === 'function') {
        reply.header('content-security-policy', opts.transformStaticCSP(header))
      }
      done()
    })
  }

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
