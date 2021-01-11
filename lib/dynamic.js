'use strict'

const { addHook } = require('./util')
const buildSwagger = require('./swagger')
const buildOpenapi = require('./openapi')

module.exports = function (fastify, opts, next) {
  const { routes, Ref } = addHook(fastify)

  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    stripBasePath: true,
    openapi: {},
    swagger: {},
    transform: null
  }, opts || {})

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    fastify.register(require('./routes'), { prefix })
  }

  const cache = {
    swaggerObject: null,
    swaggerString: null
  }

  if (Object.keys(opts.openapi).length > 0 && opts.openapi.constructor === Object) {
    fastify.decorate('swagger', buildOpenapi(opts, routes, Ref, cache, next))
  } else {
    fastify.decorate('swagger', buildSwagger(opts, routes, Ref, cache, next))
  }

  next()
}
