'use strict'

const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

module.exports = function (fastify, opts, next) {
  if (!opts.specification) return next(new Error('specification is missing in the module options'))
  if (typeof opts.specification !== 'object') return next(new Error('specification is not an object'))

  let swaggerObject = {}

  if (!opts.specification.path && !opts.specification.document) {
    return next(new Error('both specification.path and specification.document are missing, should be path to the file or swagger document spec'))
  } else if (opts.specification.path) {
    if (typeof opts.specification.path !== 'string') return next(new Error('specification.path is not a string'))

    if (!fs.existsSync(path.resolve(opts.specification.path))) return next(new Error(`${opts.specification.path} does not exist`))

    const extName = path.extname(opts.specification.path).toLowerCase()
    if (['.yaml', '.json'].indexOf(extName) === -1) return next(new Error("specification.path extension name is not supported, should be one from ['.yaml', '.json']"))

    if (opts.specification.postProcessor && typeof opts.specification.postProcessor !== 'function') return next(new Error('specification.postProcessor should be a function'))

    if (opts.specification.baseDir && typeof opts.specification.baseDir !== 'string') return next(new Error('specification.baseDir should be string'))

    if (!opts.specification.baseDir) {
      opts.specification.baseDir = path.resolve(path.dirname(opts.specification.path))
    } else {
      while (opts.specification.baseDir.endsWith('/')) {
        opts.specification.baseDir = opts.specification.baseDir.slice(0, -1)
      }
    }

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

    // apply postProcessor, if one was passed as an argument
    if (opts.specification.postProcessor) {
      swaggerObject = opts.specification.postProcessor(swaggerObject)
    }
  } else {
    if (typeof opts.specification.document !== 'object') return next(new Error('specification.document is not an object'))

    swaggerObject = opts.specification.document
  }

  fastify.decorate('swagger', swagger)

  if (opts.exposeRoute === true) {
    const options = {
      prefix: opts.routePrefix || '/documentation',
      baseDir: opts.specification.baseDir
    }

    fastify.register(require('./routes'), options)
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
