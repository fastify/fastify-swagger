'use strict'

const yaml = require('js-yaml')
const { formatParamUrl, readPackageJson } = require('./dynamicUtil')
const { getBodyParams, getCommonParams, generateResponse, stripBasePathByServers } = require('./openapiUtil')

// TODO: refactor for readability, reference in below
// https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two
// https://www.informit.com/articles/article.aspx?p=1398607
module.exports = function (opts, routes, Ref, cache, done) {
  let ref

  const info = opts.openapi.info || null
  const servers = opts.openapi.servers || null
  const components = opts.openapi.components || null
  const tags = opts.openapi.tags || null
  const externalDocs = opts.openapi.externalDocs || null

  const stripBasePath = opts.stripBasePath
  const transform = opts.transform
  const hiddenTag = opts.hiddenTag
  const extensions = []

  for (const [key, value] of Object.entries(opts.openapi)) {
    if (key.startsWith('x-')) {
      extensions.push([key, value])
    }
  }

  return function (opts) {
    if (opts && opts.yaml) {
      if (cache.string) return cache.string
    } else {
      if (cache.object) return cache.object
    }

    const openapiObject = {}
    const pkg = readPackageJson(done)

    // Base Openapi info
    // this info is displayed in the swagger file
    // in the same order as here
    openapiObject.openapi = '3.0.3'
    if (info) {
      openapiObject.info = info
    } else {
      openapiObject.info = {
        version: pkg.version || '1.0.0',
        title: pkg.name || ''
      }
    }
    if (servers) {
      openapiObject.servers = servers
    }
    if (components) {
      openapiObject.components = Object.assign({}, components, { schemas: Object.assign({}, components.schemas) })
    } else {
      openapiObject.components = { schemas: {} }
    }
    if (tags) {
      openapiObject.tags = tags
    }
    if (externalDocs) {
      openapiObject.externalDocs = externalDocs
    }

    for (const [key, value] of extensions) {
      openapiObject[key] = value
    }

    ref = Ref()
    openapiObject.components.schemas = {
      ...openapiObject.components.schemas,
      ...(ref.definitions().definitions)
    }

    // Swagger doesn't accept $id on /definitions schemas.
    // The $ids are needed by Ref() to check the URI so we need
    // to remove them at the end of the process
    Object.values(openapiObject.components.schemas)
      .forEach(_ => { delete _.$id })

    openapiObject.paths = {}

    for (const route of routes) {
      const schema = transform
        ? transform(route.schema)
        : route.schema

      if (schema && schema.hide) {
        continue
      }

      if (schema && schema.tags && schema.tags.includes(hiddenTag)) {
        continue
      }

      const path = stripBasePath
        ? stripBasePathByServers(route.url, openapiObject.servers)
        : route.url
      const url = formatParamUrl(path)

      const swaggerRoute = openapiObject.paths[url] || {}

      const swaggerMethod = {}
      const parameters = []

      // route.method should be either a String, like 'POST', or an Array of Strings, like ['POST','PUT','PATCH']
      const methods = typeof route.method === 'string' ? [route.method] : route.method

      for (const method of methods) {
        swaggerRoute[method.toLowerCase()] = swaggerMethod
      }

      // All the data the user can give us, is via the schema object
      if (schema) {
        // the resulting schema will be in this order
        if (schema.operationId) {
          swaggerMethod.operationId = schema.operationId
        }

        if (schema.tags) {
          swaggerMethod.tags = schema.tags
        }

        if (schema.summary) {
          swaggerMethod.summary = schema.summary
        }

        if (schema.description) {
          swaggerMethod.description = schema.description
        }

        if (schema.externalDocs) {
          swaggerMethod.externalDocs = schema.externalDocs
        }

        if (schema.querystring) {
          getCommonParams('query', parameters, schema.querystring, ref, openapiObject.components.schemas)
        }

        if (schema.body) {
          swaggerMethod.requestBody = {
            content: {}
          }
          getBodyParams(swaggerMethod.requestBody.content, schema.body, schema.consumes, ref)
        }

        if (schema.params) {
          getCommonParams('path', parameters, schema.params, ref, openapiObject.components.schemas)
        }

        if (schema.headers) {
          getCommonParams('header', parameters, schema.headers, ref, openapiObject.components.schemas)
        }

        if (parameters.length) {
          swaggerMethod.parameters = parameters
        }

        if (schema.deprecated) {
          swaggerMethod.deprecated = schema.deprecated
        }

        if (schema.security) {
          swaggerMethod.security = schema.security
        }

        if (schema.servers) {
          swaggerMethod.servers = schema.servers
        }

        for (const key of Object.keys(schema)) {
          if (key.startsWith('x-')) {
            swaggerMethod[key] = schema[key]
          }
        }
      }

      swaggerMethod.responses = generateResponse(schema ? schema.response : null, schema ? schema.produces : null, ref)

      openapiObject.paths[url] = swaggerRoute
    }

    if (opts && opts.yaml) {
      const openapiString = yaml.safeDump(openapiObject, { skipInvalid: true })
      cache.string = openapiString
      return openapiString
    }

    cache.object = openapiObject
    return openapiObject
  }
}
