'use strict'

const path = require('path')
const fs = require('fs')
const yaml = require('yaml')

module.exports = function (fastify, opts, done) {
  if (!opts.specification) return done(new Error('specification is missing in the module options'))
  if (typeof opts.specification !== 'object') return done(new Error('specification is not an object'))

  let swaggerObject = {}

  if (!opts.specification.path && !opts.specification.document) {
    return done(new Error('both specification.path and specification.document are missing, should be path to the file or swagger document spec'))
  } else if (opts.specification.path) {
    if (typeof opts.specification.path !== 'string') return done(new Error('specification.path is not a string'))

    if (!fs.existsSync(path.resolve(opts.specification.path))) return done(new Error(`${opts.specification.path} does not exist`))

    const extName = path.extname(opts.specification.path).toLowerCase()
    if (['.yaml', '.json'].indexOf(extName) === -1) return done(new Error("specification.path extension name is not supported, should be one from ['.yaml', '.json']"))

    if (opts.specification.postProcessor && typeof opts.specification.postProcessor !== 'function') return done(new Error('specification.postProcessor should be a function'))

    if (opts.specification.baseDir && typeof opts.specification.baseDir !== 'string') return done(new Error('specification.baseDir should be string'))

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
        swaggerObject = yaml.parse(source)
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
    if (typeof opts.specification.document !== 'object') return done(new Error('specification.document is not an object'))

    swaggerObject = opts.specification.document
  }

  fastify.decorate('swagger', swagger)

  if (opts.exposeRoute === true) {
    const options = {
      prefix: opts.routePrefix || '/documentation',
      uiConfig: opts.uiConfig || {},
      initOAuth: opts.initOAuth || {},
      baseDir: opts.specification.baseDir,
      staticCSP: opts.staticCSP,
      transformStaticCSP: opts.transformStaticCSP,
      hooks: opts.uiHooks,
      logLevel: opts.logLevel
    }

    fastify.register(require('../routes'), options)
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
      const swaggerString = yaml.stringify(swaggerObject, { strict: false })
      cache.swaggerString = swaggerString
      return swaggerString
    }

    cache.swaggerObject = swaggerObject
    return swaggerObject
  }

  done()
}
