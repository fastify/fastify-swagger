'use strict'

const { addHook } = require('./util')
const buildSwagger = require('./swagger')

module.exports = function (fastify, opts, next) {
  const { routes, Ref } = addHook(fastify)

  opts = Object.assign({}, {
    exposeRoute: false,
    hiddenTag: 'X-HIDDEN',
    stripBasePath: true,
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

  fastify.decorate('swagger', buildSwagger(opts, routes, Ref, cache, next))

  next()
}
