'use strict'

const yaml = require('js-yaml')
const { shouldRouteHide } = require('../../util/common')
const { prepareDefaultOptions, prepareSwaggerObject, prepareSwaggerMethod, normalizeUrl, prepareSwaggerDefinitions } = require('./utils')
const merge = require('lodash.merge')

function recursiveCustomPropertyReplacement (schema) {
  if (typeof schema === 'object') {
    if (schema.customSwaggerProps !== undefined) {
      // Update with the custom swagger props, if any
      schema = merge(schema, schema.customSwaggerProps)
      delete schema.customSwaggerProps
    }
    // Recursively replace properties on children if required
    const fullyReplaced = Object.fromEntries(
      Object.entries(schema).map(([key, value]) => {
        // A reliable way of ensuring it is an object (May not be performant but only used in openapi)
        if (Object.prototype.toString.call(value) === '[object Object]') {
          return [key, recursiveCustomPropertyReplacement(value)]
        }

        return [key, value]
      })
    )
    return fullyReplaced
  } else {
    // No further children, return
    return schema
  }
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

    if (defOpts.transform && defOpts.customPropertyOverrides) {
      throw new Error('Using custom property overrides implements a custom transformer. Thus it is not compatible with other custom transformers, see https://github.com/fastify/fastify-swagger/issues/518 on how you could implement custom property overrides into your own transformer')
    }

    for (const route of routes) {
      let schema

      if (defOpts.transform) {
        schema = defOpts.transform(route.schema)
      } else if (defOpts.customPropertyOverrides) {
        schema = recursiveCustomPropertyReplacement(route.schema)
      } else {
        schema = route.schema
      }

      const shouldRouteHideOpts = {
        hiddenTag: defOpts.hiddenTag,
        hideUntagged: defOpts.hideUntagged
      }

      if (shouldRouteHide(schema, shouldRouteHideOpts)) continue

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
