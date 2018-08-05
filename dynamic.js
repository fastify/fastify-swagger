'use strict'

const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

module.exports = function (fastify, opts, next) {
  fastify.decorate('swagger', swagger)
  const routes = []

  fastify.addHook('onRoute', (routeOptions) => {
    routes.push(routeOptions)
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

  // openapi v3
  const openapi = opts.openapi || null
  const components = opts.swagger.components || {}
  const servers = opts.swagger.servers || []
  if (schemes && !components.schemes) {
    components.schemes = schemes
  }
  if (securityDefinitions && !components.securitySchemes) {
    components.securitySchemes = securityDefinitions
  }
  if (host && !servers.length) {
    const serverSchemes = schemes || ['http']
    const serverBasePath = basePath || '/'
    serverSchemes.forEach(function (scheme) {
      servers.push(scheme + '://' + host + serverBasePath)
    })
  }

  if (opts.exposeRoute === true) {
    const prefix = opts.routePrefix || '/documentation'
    fastify.register(require('./routes'), {prefix})
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
    if (openapi) {
      swaggerObject.openapi = openapi
    } else {
      swaggerObject.swagger = '2.0'
    }
    if (info) {
      swaggerObject.info = info
    } else {
      swaggerObject.info = {
        version: '1.0.0',
        title: pkg.name || '',
        description: pkg.description || ''
      }
    }
    if (openapi) {
      if (servers) swaggerObject.servers = servers
      if (components) swaggerObject.components = components
    } else {
      if (securityDefinitions) swaggerObject.securityDefinitions = securityDefinitions
      if (host) swaggerObject.host = host
      if (schemes) swaggerObject.schemes = schemes
      if (basePath) swaggerObject.basePath = basePath
      if (consumes) swaggerObject.consumes = consumes
      if (produces) swaggerObject.produces = produces
    }
    if (security) swaggerObject.security = security

    if (opts && opts.addFastifySchemas) {
      // extract definitions from fastify schemas
      const schemas = JSON.parse(JSON.stringify(fastify.getSchemas()))
      const schemaKeys = Object.keys(schemas)
      let schemasDst = swaggerObject.definitions
      if (openapi) {
        swaggerObject.components.schemas = definitions || {}
        schemasDst = swaggerObject.components.schemas
      } else {
        swaggerObject.definitions = definitions || {}
        schemasDst = swaggerObject.definitions
      }

      for (var schemaKey of schemaKeys) {
        const schema = Object.assign({}, schemas[schemaKey])
        const id = schema.$id
        delete schema.$id
        schemasDst[id] = schema
      }
    }
    if (tags) {
      swaggerObject.tags = tags
    }
    if (externalDocs) {
      swaggerObject.externalDocs = externalDocs
    }

    swaggerObject.paths = {}
    for (var route of routes) {
      if (route.schema && route.schema.hide) {
        continue
      }

      const schema = route.schema
      const url = formatParamUrl(route.url)

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
        if (schema.summary) {
          swaggerMethod.summary = schema.summary
        }

        if (schema.description) {
          swaggerMethod.description = schema.description
        }

        if (schema.tags) {
          swaggerMethod.tags = schema.tags
        }

        if (!openapi && schema.consumes) {
          swaggerMethod.consumes = schema.consumes
        }

        if (schema.querystring) {
          getQueryParams(parameters, schema.querystring, openapi)
        }

        if (schema.body) {
          if (openapi) {
            swaggerMethod.requestBody = getRequestBodyParams(schema, consumes)
          } else {
            const consumesAllFormOnly = consumesFormOnly(schema) || consumesFormOnly(swaggerObject)
            consumesAllFormOnly
              ? getFormParams(parameters, schema.body)
              : getBodyParams(parameters, schema.body)
          }
        }

        if (schema.params) {
          getPathParams(parameters, schema.params, openapi)
        }

        if (schema.headers) {
          getHeaderParams(parameters, schema.headers, openapi)
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

      swaggerMethod.responses = openapi
        ? genOpenApiResponse(schema, produces)
        : genResponse(schema ? schema.response : null)
      if (swaggerRoute) {
        swaggerObject.paths[url] = swaggerRoute
      }
    }

    if (opts && opts.yaml) {
      const swaggerString = yaml.safeDump(swaggerObject, {skipInvalid: true})
      cache.swaggerString = swaggerString
      return swaggerString
    }

    cache.swaggerObject = swaggerObject
    return swaggerObject
  }

  next()
}

function consumesFormOnly (schema) {
  const consumes = schema.consumes
  return (
    consumes &&
    consumes.length === 1 &&
    (consumes[0] === 'application/x-www-form-urlencoded' || consumes[0] === 'multipart/form-data')
  )
}

function getQueryParams (parameters, query, isOAS3) {
  if (query.type && query.properties) {
    // for the shorthand querystring declaration
    const queryProperties = Object.keys(query.properties).reduce((acc, h) => {
      const required = (query.required && query.required.indexOf(h) >= 0) || false
      const newProps = Object.assign({}, query.properties[h], {required})
      return Object.assign({}, acc, {[h]: newProps})
    }, {})
    return getQueryParams(parameters, queryProperties, isOAS3)
  }
  Object.keys(query).forEach((prop) => {
    const obj = query[prop]
    const param = obj
    param.name = prop
    param.in = 'query'
    if (isOAS3 && param.type) {
      param.schema = {type: param.type}
      delete param.type
    }
    parameters.push(param)
  })
}

function getBodyParams (parameters, body) {
  const param = {}
  param.name = 'body'
  param.in = 'body'
  param.schema = body
  parameters.push(param)
}

function getRequestBodyParams (schema, consumes) {
  const body = schema.body
  const mediaTypes = schema.consumes || consumes || ['*/*']
  const requestBody = {
    content: {}
  }
  if (schema.description) requestBody.description = schema.description
  if (schema.required) requestBody.required = body.required
  for (var mediaType of mediaTypes) {
    requestBody.content[mediaType] = {schema: body}
  }
  return requestBody
}

function getFormParams (parameters, body) {
  const formParamsSchema = body.properties
  if (formParamsSchema) {
    Object.keys(formParamsSchema).forEach((name) => {
      const param = formParamsSchema[name]
      delete param.$id
      param.in = 'formData'
      param.name = name
      parameters.push(param)
    })
  }
}

function getPathParams (parameters, params, isOAS3) {
  if (params.type && params.properties) {
    // for the shorthand querystring declaration
    return getPathParams(parameters, params.properties, isOAS3)
  }

  Object.keys(params).forEach((p) => {
    const param = {}
    param.name = p
    param.in = 'path'
    param.required = true
    param.description = params[p].description
    if (isOAS3) {
      param.schema = {type: params[p].type}
    } else {
      param.type = params[p].type
    }
    parameters.push(param)
  })
}

function getHeaderParams (parameters, headers, isOAS3) {
  if (headers.type && headers.properties) {
    // for the shorthand querystring declaration
    const headerProperties = Object.keys(headers.properties).reduce((acc, h) => {
      const required = (headers.required && headers.required.indexOf(h) >= 0) || false
      const newProps = Object.assign({}, headers.properties[h], {required})
      return Object.assign({}, acc, {[h]: newProps})
    }, {})

    return getHeaderParams(parameters, headerProperties, isOAS3)
  }

  Object.keys(headers).forEach((h) => {
    const header = {
      name: h,
      in: 'header',
      required: headers[h].required,
      description: headers[h].description
    }
    if (isOAS3) {
      header.schema = {type: headers[h].type}
    } else {
      header.type = headers[h].type
    }
    parameters.push(header)
  })
}

function genOpenApiResponse (schema, produces) {
  // if the user does not provided an out schema

  let response = schema ? schema.response : null
  if (!response) {
    return {200: {description: 'Default Response'}}
  }

  // remove previous references
  response = Object.assign({}, response)

  Object.keys(response).forEach((key) => {
    if (response[key].type) {
      var rsp = response[key]
      var description = response[key].description
      var headers = response[key].headers

      const mediaTypes = schema.produces || produces || ['*/*']
      for (var mediaType of mediaTypes) {
        response[key] = {
          content: {
            [mediaType]: {schema: rsp}
          }
        }
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

function genResponse (response) {
  // if the user does not provided an out schema
  if (!response) {
    return {200: {description: 'Default Response'}}
  }

  // remove previous references
  response = Object.assign({}, response)

  Object.keys(response).forEach((key) => {
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
    return formatParamUrl(
      url.slice(0, start) + '{' + url.slice(++start, end) + '}' + url.slice(end)
    )
  }
}
