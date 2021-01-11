'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const { formatParamUrl, consumesFormOnly, plainJsonObjectToSwagger2 } = require('./util')

module.exports = function (opts, routes, Ref, cache, next) {
  let ref

  const info = opts.swagger.info || null
  const host = opts.swagger.host || null
  const schemes = opts.swagger.schemes || null
  const consumes = opts.swagger.consumes || null
  const produces = opts.swagger.produces || null
  const definitions = opts.swagger.definitions || null
  const basePath = opts.swagger.basePath || null
  const securityDefinitions = opts.swagger.securityDefinitions || null
  const security = opts.swagger.security || null
  const tags = opts.swagger.tags || null
  const externalDocs = opts.swagger.externalDocs || null
  const stripBasePath = opts.stripBasePath
  const transform = opts.transform
  const hiddenTag = opts.hiddenTag
  const extensions = []

  for (const [key, value] of Object.entries(opts.swagger)) {
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
      return next(err)
    }

    // Base swagger info
    // this info is displayed in the swagger file
    // in the same order as here
    swaggerObject.swagger = '2.0'
    if (info) {
      swaggerObject.info = info
    } else {
      swaggerObject.info = {
        version: '1.0.0',
        title: pkg.name || ''
      }
    }
    if (host) swaggerObject.host = host
    if (schemes) swaggerObject.schemes = schemes
    if (basePath) swaggerObject.basePath = basePath
    if (consumes) swaggerObject.consumes = consumes
    if (produces) swaggerObject.produces = produces
    if (definitions) swaggerObject.definitions = definitions
    else swaggerObject.definitions = {}

    if (securityDefinitions) {
      swaggerObject.securityDefinitions = securityDefinitions
    }
    if (security) {
      swaggerObject.security = security
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
    swaggerObject.definitions = {
      ...swaggerObject.definitions,
      ...(ref.definitions().definitions)
    }

    // Swagger doesn't accept $id on /definitions schemas.
    // The $ids are needed by Ref() to check the URI so we need
    // to remove them at the end of the process
    Object.values(swaggerObject.definitions)
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

      let path = stripBasePath && route.url.startsWith(basePath)
        ? route.url.replace(basePath, '')
        : route.url
      if (!path.startsWith('/')) {
        path = '/' + path
      }
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

        if (schema.summary) {
          swaggerMethod.summary = schema.summary
        }

        if (schema.description) {
          swaggerMethod.description = schema.description
        }

        if (schema.tags) {
          swaggerMethod.tags = schema.tags
        }

        if (schema.produces) {
          swaggerMethod.produces = schema.produces
        }

        if (schema.consumes) {
          swaggerMethod.consumes = schema.consumes
        }

        if (schema.querystring) {
          getQueryParams(parameters, schema.querystring)
        }

        if (schema.body) {
          const consumesAllFormOnly =
              consumesFormOnly(schema) || consumesFormOnly(swaggerObject)
          consumesAllFormOnly
            ? getFormParams(parameters, schema.body)
            : getBodyParams(parameters, schema.body)
        }

        if (schema.params) {
          getPathParams(parameters, schema.params)
        }

        if (schema.headers) {
          getHeaderParams(parameters, schema.headers)
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

    function getBodyParams (parameters, body) {
      const bodyResolved = ref.resolve(body)

      const param = {}
      param.name = 'body'
      param.in = 'body'
      param.schema = bodyResolved
      parameters.push(param)
    }

    function getFormParams (parameters, form) {
      const resolved = ref.resolve(form)
      const add = plainJsonObjectToSwagger2('formData', resolved, swaggerObject.definitions)
      add.forEach(_ => parameters.push(_))
    }

    function getQueryParams (parameters, query) {
      const resolved = ref.resolve(query)
      const add = plainJsonObjectToSwagger2('query', resolved, swaggerObject.definitions)
      add.forEach(_ => parameters.push(_))
    }

    function getPathParams (parameters, path) {
      const resolved = ref.resolve(path)
      const add = plainJsonObjectToSwagger2('path', resolved, swaggerObject.definitions)
      add.forEach(_ => parameters.push(_))
    }

    function getHeaderParams (parameters, headers) {
      const resolved = ref.resolve(headers)
      const add = plainJsonObjectToSwagger2('header', resolved, swaggerObject.definitions)
      add.forEach(_ => parameters.push(_))
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

        responsesContainer[key] = {
          schema: resolved,
          description: rawJsonSchema.description || 'Default Response'
        }
      })

      return responsesContainer
    }
  }
}
