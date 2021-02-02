'use strict'

const { addHook, resolveSwaggerFunction } = require('../util/common')

module.exports = function (fastify, opts, done) {
  const { routes, Ref } = addHook(fastify)

  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    stripBasePath: true,
    openapi: null,
    swagger: {},
    transform: null
  }, opts)

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    const uiConfig = opts.uiConfig || {}
    fastify.register(require('../routes'), { prefix, uiConfig })
  }

  const cache = {
    object: null,
    string: null
  }

  const swagger = resolveSwaggerFunction(opts, cache, routes, Ref, done)
  fastify.decorate('swagger', swagger)

  done()
}
