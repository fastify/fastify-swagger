'use strict'

const fp = require('fastify-plugin')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')

function fastifySwagger (fastify, opts, next) {
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
  const basePath = opts.swagger.basePath || null
  const securityDefinitions = opts.swagger.securityDefinitions || null

  if (opts.exposeRoute === true) {
    fastify.register(require('./routes'))
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
    if (securityDefinitions) {
      swaggerObject.securityDefinitions = securityDefinitions
    }

    swaggerObject.paths = {}
    for (var route of routes) {
      const url = formatParamUrl(route.url)
      const method = route.method.toLowerCase()
      const schema = route.schema

      const swaggerRoute = swaggerObject.paths[url] || {}

      if (schema && schema.hide) {
        continue
      }

      const swaggerMethod = swaggerRoute[method] = {}
      const parameters = []

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

        if (schema.consumes) {
          swaggerMethod.consumes = schema.consumes
        }

        if (schema.querystring) {
          getQueryParams(parameters, schema.querystring)
        }

        if (schema.body) {
          getBodyParams(parameters, schema.body)
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
  }

  next()
}

function getQueryParams (parameters, query) {
  if (query.type && query.properties) {
    // for the shorthand querystring declaration
    return getQueryParams(parameters, query.properties)
  }

  Object.keys(query).forEach(prop => {
    const obj = query[prop]
    const param = obj
    param.name = prop
    param.in = 'query'
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

function getPathParams (parameters, params) {
  if (params.type && params.properties) {
    // for the shorthand querystring declaration
    return getPathParams(parameters, params.properties)
  }

  Object.keys(params).forEach(p => {
    const param = {}
    param.name = p
    param.in = 'path'
    param.required = true
    param.description = params[p].description
    param.type = params[p].type
    parameters.push(param)
  })
}

function getHeaderParams (parameters, headers) {
  if (headers.type && headers.properties) {
    // for the shorthand querystring declaration
    const headerProperties = Object.keys(headers.properties).reduce((acc, h) => {
      const required = (headers.required && headers.required.indexOf(h) >= 0) || false
      const newProps = Object.assign({}, headers.properties[h], { required })
      return Object.assign({}, acc, { [h]: newProps })
    }, {})

    return getHeaderParams(parameters, headerProperties)
  }

  Object.keys(headers).forEach(h =>
    parameters.push({
      name: h,
      in: 'header',
      required: headers[h].required,
      description: headers[h].description,
      type: headers[h].type
    })
  )
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

module.exports = fp(fastifySwagger, {
  fastify: '>=0.39.0',
  name: 'fastify-swagger'
})
