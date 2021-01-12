'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { formatParamUrl, plainJsonObjectToSwagger2, swagger2ParametersToOpenapi3, stripBasePathByServers } = require('./util')

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
      if (cache.swaggerString) return cache.swaggerString
    } else {
      if (cache.swaggerObject) return cache.swaggerObject
    }

    const swaggerObject = {}
    let pkg

    try {
      pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')))
    } catch (err) {
      return done(err)
    }

    // Base Openapi info
    // this info is displayed in the swagger file
    // in the same order as here
    swaggerObject.openapi = '3.0.3'
    if (info) {
      swaggerObject.info = info
    } else {
      swaggerObject.info = {
        version: '1.0.0',
        title: pkg.name || ''
      }
    }
    if (servers) {
      swaggerObject.servers = servers
    }
    if (components) {
      swaggerObject.components = Object.assign({}, components, { schemas: Object.assign({}, components.schemas) })
    } else {
      swaggerObject.components = { schemas: {} }
    }
    if (tags) {
      swaggerObject.tags = tags
    }
    if (externalDocs) {
      swaggerObject.externalDocs = externalDocs
    }

    for (const [key, value] of extensions) {
      swaggerObject[key] = value
    }

    ref = Ref()
    swaggerObject.components.schemas = {
      ...swaggerObject.components.schemas,
      ...(ref.definitions().definitions)
    }

    // Swagger doesn't accept $id on /definitions schemas.
    // The $ids are needed by Ref() to check the URI so we need
    // to remove them at the end of the process
    Object.values(swaggerObject.components.schemas)
      .forEach(_ => { delete _.$id })

    swaggerObject.paths = {}

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
        ? stripBasePathByServers(route.url, swaggerObject.servers)
        : route.url
      const url = formatParamUrl(path)

      const swaggerRoute = swaggerObject.paths[url] || {}

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
          getParams('query', parameters, schema.querystring)
        }

        if (schema.body) {
          swaggerMethod.requestBody = {
            content: {}
          }
          getBodyParams(swaggerMethod.requestBody.content, schema.body, schema.consumes)
        }

        if (schema.params) {
          getParams('path', parameters, schema.params)
        }

        if (schema.headers) {
          getParams('header', parameters, schema.headers)
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

      swaggerMethod.responses = genResponse(schema ? schema.response : null)

      swaggerObject.paths[url] = swaggerRoute
    }

    if (opts && opts.yaml) {
      const swaggerString = yaml.safeDump(swaggerObject, { skipInvalid: true })
      cache.swaggerString = swaggerString
      return swaggerString
    }

    cache.swaggerObject = swaggerObject
    return swaggerObject

    function getBodyParams (parameters, body, consumes) {
      const bodyResolved = ref.resolve(body)

      if ((Array.isArray(consumes) && consumes.length === 0) || typeof consumes === 'undefined') {
        consumes = ['application/json']
      }

      consumes.forEach((consume) => {
        parameters[consume] = {
          schema: bodyResolved
        }
      })
    }

    function getParams (container, parameters, query) {
      const resolved = ref.resolve(query)
      const add = plainJsonObjectToSwagger2(container, resolved, swaggerObject.components.schemas)
      add.forEach(_ => parameters.push(swagger2ParametersToOpenapi3(_)))
    }

    // https://swagger.io/docs/specification/2-0/describing-responses/
    function genResponse (fastifyResponseJson) {
      // if the user does not provided an out schema
      if (!fastifyResponseJson) {
        return { 200: { description: 'Default Response' } }
      }

      const responsesContainer = {}

      Object.keys(fastifyResponseJson).forEach(key => {
        // 2xx is not supported by swagger

        const rawJsonSchema = fastifyResponseJson[key]
        const resolved = ref.resolve(rawJsonSchema)

        const content = {
          'application/json': {}
        }

        content['application/json'] = {
          schema: resolved
        }

        responsesContainer[key] = {
          content,
          description: rawJsonSchema.description || 'Default Response'
        }
      })

      return responsesContainer
    }
  }
}
