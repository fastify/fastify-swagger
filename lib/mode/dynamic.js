'use strict'

const { addHook, resolveSwaggerFunction } = require('../util/common')

module.exports = function (fastify, opts, done) {
  const { routes, Ref } = addHook(fastify)

  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    hideUntagged: false,
    stripBasePath: true,
    openapi: null,
    swagger: {},
    transform: null
  }, opts)

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    const uiConfig = opts.uiConfig || {}
    const initOAuth = opts.initOAuth || {}
    const staticCSP = opts.staticCSP
    const transformStaticCSP = opts.transformStaticCSP
    fastify.register(require('../routes'), { prefix, uiConfig, initOAuth, staticCSP, transformStaticCSP })
  }

  const cache = {
    object: null,
    string: null
  }

  const swagger = resolveSwaggerFunction(opts, cache, routes, Ref, done)
  fastify.decorate('swagger', swagger)

  done()
}
