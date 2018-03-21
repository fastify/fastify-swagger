'use strict'

const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

module.exports = function (fastify, opts, next) {
  if (!opts.specification) return next(new Error('specification is missing in the module options'))
  if (typeof opts.specification !== 'object') return next(new Error('specification is not an object'))

  let swaggerObject = {}

  if (!opts.specification.path) return next(new Error('specification.path is missing, should be path to the file'))
  if (typeof opts.specification.path !== 'string') return next(new Error('specification.path is not a string'))

  if (!fs.existsSync(path.resolve(opts.specification.path))) return next(new Error(`${opts.specification.path} does not exist`))

  const extName = path.extname(opts.specification.path).toLowerCase()
  if (['.yaml', '.json'].indexOf(extName) === -1) return next(new Error("specification.path extension name is not supported, should be one from ['.yaml', '.json']"))

  // read
  const source = fs.readFileSync(
    path.resolve(opts.specification.path),
    'utf8'
  )
  switch (extName) {
    case '.yaml':
      swaggerObject = yaml.safeLoad(source)
      break
    case '.json':
      swaggerObject = JSON.parse(source)
      break
  }

  fastify.decorate('swagger', swagger)

  if (opts.exposeRoute === true) {
    fastify.register(require('./routes'))
  }

  const cache = {
    swaggerObject: null,
    swaggerString: null
  }

  function swagger (opts) {
    if (opts && opts.yaml) {
      if (cache.swaggerString) return cache.swaggerString
    } else {
      if (cache.swaggerObject) return cache.swaggerObject
    }

    if (opts && opts.yaml) {
      const swaggerString = yaml.safeDump(swaggerObject, { skipInvalid: true })
      cache.swaggerString = swaggerString
      return swaggerString
    }

    cache.swaggerObject = swaggerObject
    return swaggerObject
  }

  next()
}
