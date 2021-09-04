'use strict'

const fp = require('fastify-plugin')
const validatorCompiler = require('./lib/validatorCompiler')

function fastifySwagger (fastify, opts, next) {
  // enabling custom or validator complier form opts object
  const customCompiler = opts.customCompiler || null
  console.log(customCompiler)

  if (customCompiler) {
    console.log('custom com')

    fastify.setValidatorCompiler(validatorCompiler)
  }

  // by default the mode is dynamic, as plugin initially was developed
  opts.mode = opts.mode || 'dynamic'

  switch (opts.mode) {
    case 'static': {
      const setup = require('./lib/mode/static')
      setup(fastify, opts, next)
      break
    }
    case 'dynamic': {
      const setup = require('./lib/mode/dynamic')
      setup(fastify, opts, next)
      break
    }
    default: {
      return next(new Error("unsupported mode, should be one of ['static', 'dynamic']"))
    }
  }

  fastify.decorate('swaggerCSP', require('./static/csp.json'))
}

const plugin = fp(fastifySwagger, {
  fastify: '>=3.x',
  name: 'fastify-swagger'
})

module.exports.default = plugin
module.exports.fastifySwagger = plugin
module.exports.validatorCompiler = validatorCompiler
