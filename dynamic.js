'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const Ref = require('json-schema-resolver')

module.exports = function (fastify, opts, next) {
  fastify.decorate('swagger', swagger)

  const routes = []
  const sharedSchemasMap = new Map()
  let ref

  fastify.addHook('onRoute', (routeOptions) => {
    routes.push(routeOptions)
  })

  fastify.addHook('onRegister', async (instance) => {
    instance.ready((err) => {
      if (err) {
        throw err
      }

      const allSchemas = instance.getSchemas()
      for (const schemaId of Object.keys(allSchemas)) {
        if (!sharedSchemasMap.has(schemaId)) {
          sharedSchemasMap.set(schemaId, allSchemas[schemaId])
        }
      }
    }) // wait the addSchema
  })

  opts = opts || {}

  opts.swagger = opts.swagger || {}

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
  const transform = opts.transform || null

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    fastify.register(require('./routes'), { prefix })
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

    const swaggerObject = {}
    var pkg

    try {
      pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')))
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

    if (!ref) {
      const externalSchemas = Array.from(sharedSchemasMap.values())

      ref = Ref({ clone: true, applicationUri: 'todo.com', externalSchemas })
      swaggerObject.definitions = {
        ...swaggerObject.definitions,
        ...(ref.definitions().definitions)
      }

      // Swagger doesn't accept $id on /definitions schemas.
      // The $ids are needed by Ref() to check the URI so we need
      // to remove them at the end of the process
      Object.values(swaggerObject.definitions)
        .forEach(_ => { delete _.$id })
    }

    swaggerObject.paths = {}
    for (var route of routes) {
      if (route.schema && route.schema.hide) {
        continue
      }

      const schema = transform
        ? transform(route.schema)
        : route.schema
      let path = route.url.startsWith(basePath)
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

      for (var method of methods) {
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
      }

      swaggerMethod.responses = genResponse(schema ? schema.response : null)
      if (swaggerRoute) {
        swaggerObject.paths[url] = swaggerRoute
      }
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
  }

  next()
}

function consumesFormOnly (schema) {
  const consumes = schema.consumes
  return (
    consumes &&
      consumes.length === 1 &&
      (consumes[0] === 'application/x-www-form-urlencoded' ||
        consumes[0] === 'multipart/form-data')
  )
}

// TODO check this form + file support
function getFormParams (parameters, body) {
  const formParamsSchema = body.properties
  if (formParamsSchema) {
    Object.keys(formParamsSchema).forEach(name => {
      const param = formParamsSchema[name]
      delete param.$id
      param.in = 'formData'
      param.name = name
      parameters.push(param)
    })
  }
}

function genResponse (response) {
  // if the user does not provided an out schema
  if (!response) {
    return { 200: { description: 'Default Response' } }
  }

  // remove previous references
  response = Object.assign({}, response)

  Object.keys(response).forEach(key => {
    if (response[key].type) {
      var rsp = response[key]
      var description = response[key].description
      var headers = response[key].headers
      response[key] = {
        schema: rsp
      }
      response[key].description = description || 'Default Response'
      if (headers) response[key].headers = headers
    }

    if (!response[key].description) {
      response[key].description = 'Default Response'
    }
  })

  return response
}

// The swagger standard does not accept the url param with ':'
// so '/user/:id' is not valid.
// This function converts the url in a swagger compliant url string
// => '/user/{id}'
function formatParamUrl (url) {
  var start = url.indexOf('/:')
  if (start === -1) return url

  var end = url.indexOf('/', ++start)

  if (end === -1) {
    return url.slice(0, start) + '{' + url.slice(++start) + '}'
  } else {
    return formatParamUrl(url.slice(0, start) + '{' + url.slice(++start, end) + '}' + url.slice(end))
  }
}

// For supported keys read:
// https://swagger.io/docs/specification/2-0/describing-parameters/
function plainJsonObjectToSwagger2 (container, jsonSchema, externalSchemas) {
  const obj = localRefResolve(jsonSchema, externalSchemas)
  let toSwaggerProp
  switch (container) {
    case 'query':
      toSwaggerProp = function (properyName, jsonSchemaElement) {
        jsonSchemaElement.in = container
        jsonSchemaElement.name = properyName
        return jsonSchemaElement
      }
      break
    case 'path':
      toSwaggerProp = function (properyName, jsonSchemaElement) {
        jsonSchemaElement.in = container
        jsonSchemaElement.name = properyName
        jsonSchemaElement.required = true
        return jsonSchemaElement
      }
      break
    case 'header':
      toSwaggerProp = function (properyName, jsonSchemaElement) {
        return {
          in: 'header',
          name: properyName,
          required: jsonSchemaElement.required,
          description: jsonSchemaElement.description,
          type: jsonSchemaElement.type
        }
      }
      break
  }

  return Object.keys(obj).reduce((acc, propKey) => {
    acc.push(toSwaggerProp(propKey, obj[propKey]))
    return acc
  }, [])
}

function localRefResolve (jsonSchema, externalSchemas) {
  if (jsonSchema.type && jsonSchema.properties) {
    // for the shorthand querystring/params/headers declaration
    const propertiesMap = Object.keys(jsonSchema.properties).reduce((acc, h) => {
      const required = (jsonSchema.required && jsonSchema.required.indexOf(h) >= 0) || false
      const newProps = Object.assign({}, jsonSchema.properties[h], { required })
      return Object.assign({}, acc, { [h]: newProps })
    }, {})

    return propertiesMap
  }

  if (jsonSchema.$ref) {
    // $ref is in the format: #/definitions/<resolved definition>/<optional fragment>
    const localReference = jsonSchema.$ref.split('/')[2]
    return localRefResolve(externalSchemas[localReference], externalSchemas)
  }
  return jsonSchema
}
