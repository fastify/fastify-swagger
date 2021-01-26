'use strict'

const { addHook, resolveSwaggerFunction } = require('./dynamicUtil')

module.exports = function (fastify, opts, done) {
  const { routes, Ref } = addHook(fastify)

  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    stripBasePath: true,
    openapi: {},
    swagger: {},
    transform: null
  }, opts)

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    fastify.register(require('./routes'), { prefix })
  }

  const cache = {
    object: null,
    string: null
  }

  const swagger = resolveSwaggerFunction(opts, routes, Ref, cache, done)
  fastify.decorate('swagger', swagger)

  done()
}
