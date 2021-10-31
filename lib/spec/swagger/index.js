'use strict'

const yaml = require('js-yaml')
const { shouldRouteHide } = require('../../util/common')
const { prepareDefaultOptions, prepareSwaggerObject, prepareSwaggerMethod, normalizeUrl, prepareSwaggerDefinitions } = require('./utils')

function processRouteSchema (route, schema, defOpts, swaggerObject, ref) {
  const shouldRouteHideOpts = {
    hiddenTag: defOpts.hiddenTag,
    hideUntagged: defOpts.hideUntagged
  }

  if (shouldRouteHide(schema, shouldRouteHideOpts)) return { url: null, swaggerRoute: null }

  const url = normalizeUrl(route.url, defOpts.basePath, defOpts.stripBasePath)

  const swaggerRoute = Object.assign({}, swaggerObject.paths[url])

  const swaggerMethod = prepareSwaggerMethod(schema, ref, swaggerObject)

  if (route.links) {
    throw new Error('Swagger (Open API v2) does not support Links. Upgrade to OpenAPI v3 (see fastify-swagger readme)')
  }

  // route.method should be either a String, like 'POST', or an Array of Strings, like ['POST','PUT','PATCH']
  const methods = typeof route.method === 'string' ? [route.method] : route.method

  for (const method of methods) {
    swaggerRoute[method.toLowerCase()] = swaggerMethod
  }

  return { url, swaggerRoute }
}

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

    const routePromises = []

    for (const route of routes) {
      const schema = defOpts.transform
        ? defOpts.transform(route.schema)
        : route.schema

      if (schema instanceof Promise) {
        routePromises.push(
          schema
            .then(schema => processRouteSchema(route, schema, defOpts, swaggerObject, ref))
            .then(({ url, swaggerRoute }) => {
              if (url && swaggerRoute) {
                swaggerObject.paths[url] = swaggerRoute
              }
            }))

        continue
      }

      const { url, swaggerRoute } = processRouteSchema(route, schema, defOpts, swaggerObject, ref)

      if (url && swaggerRoute) {
        swaggerObject.paths[url] = swaggerRoute
      }
    }

    function finish () {
      if (opts && opts.yaml) {
        cache.string = yaml.dump(swaggerObject, { skipInvalid: true })
        return cache.string
      }

      cache.object = swaggerObject
      return cache.object
    }

    if (routePromises.length) {
      return Promise.all(routePromises).then(finish)
    }

    return finish()
  }
}
