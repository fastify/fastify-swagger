'use strict'

const yaml = require('js-yaml')
const { shouldRouteHide } = require('../../util/common')
const { prepareDefaultOptions, prepareSwaggerObject, prepareSwaggerMethod, normalizeUrl, prepareSwaggerDefinitions } = require('./utils')

module.exports = function (opts, cache, routes, Ref, done) {
  let ref

  const defOpts = prepareDefaultOptions(opts)

  return function (opts) {
    if (opts && opts.yaml) {
      if (cache.string) return cache.string
    } else {
      if (cache.object) return cache.object
    }

    const swaggerObject = prepareSwaggerObject(defOpts, done)

    ref = Ref()
    swaggerObject.definitions = prepareSwaggerDefinitions({
      ...swaggerObject.definitions,
      ...(ref.definitions().definitions)
    }, ref)

    swaggerObject.paths = {}
    for (const route of routes) {
      const transformResult = defOpts.transform
        ? defOpts.transform({ schema: route.schema, url: route.url })
        : {}

      const schema = transformResult.schema || route.schema
      const shouldRouteHideOpts = {
        hiddenTag: defOpts.hiddenTag,
        hideUntagged: defOpts.hideUntagged
      }

      if (shouldRouteHide(schema, shouldRouteHideOpts)) continue

      let url = transformResult.url || route.url
      url = normalizeUrl(url, defOpts.basePath, defOpts.stripBasePath)

      const swaggerRoute = Object.assign({}, swaggerObject.paths[url])

      const swaggerMethod = prepareSwaggerMethod(schema, ref, swaggerObject)

      if (route.links) {
        throw new Error('Swagger (Open API v2) does not support Links. Upgrade to OpenAPI v3 (see @fastify/swagger readme)')
      }

      // route.method should be either a String, like 'POST', or an Array of Strings, like ['POST','PUT','PATCH']
      const methods = typeof route.method === 'string' ? [route.method] : route.method

      for (const method of methods) {
        swaggerRoute[method.toLowerCase()] = swaggerMethod
      }

      swaggerObject.paths[url] = swaggerRoute
    }

    if (opts && opts.yaml) {
      cache.string = yaml.dump(swaggerObject, { skipInvalid: true })
      return cache.string
    }

    cache.object = swaggerObject
    return cache.object
  }
}
