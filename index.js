'use strict'

const fp = require('fastify-plugin')
const yaml = require('js-yaml')
const path = require('path')

function fastifySwagger (fastify, opts, next) {
  fastify.decorate('swagger', swagger)

  opts = opts || {}
  opts.swagger = opts.swagger || {}

  const info = opts.swagger.info || null
  const servers = opts.swagger.servers || null
  const components = opts.swagger.components || null
  const security = opts.swagger.security || null
  const tags = opts.swagger.tags || null

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

    // Base swagger info
    // this info is displayed in the swagger file
    // in the same order as here
    swaggerObject.openapi = '3.0.0'
    if (info) {
      swaggerObject.info = info
    } else {
      const pkg = require(path.join(__dirname, 'package.json'))
      swaggerObject.info = {
        version: pkg.version || '1.0.0',
        title: pkg.name || '',
        description: pkg.description || ''
      }
    }
    if (servers) swaggerObject.servers = servers
    if (components) swaggerObject.components = components
    if (security) swaggerObject.security = security
    if (tags) swaggerObject.tags = tags

    swaggerObject.paths = {}

    for (var node of fastify) {
      // The node path name
      const url = formatParamUrl(Object.keys(node)[0])
      // object with all the methods of the node
      const routes = node[Object.keys(node)[0]]
      const swaggerRoute = {}
      swaggerRoute[url] = {}

      // let's iterate over the methods
      const methods = Object.keys(routes)
      for (var i = 0, len = methods.length; i < len; i++) {
        const method = methods[i]
        const route = routes[method]
        const schema = route.schema

        if (schema && schema.hide) {
          if (len === 1) delete swaggerRoute[url]
          continue
        }
        swaggerRoute[url][method] = {}

        const parameters = []

        // All the data the user can give us, is via the schema object
        if (schema) {
          // the resulting schema will be in this order
          if (schema.summary) {
            swaggerRoute[url][method].summary = schema.summary
          }

          if (schema.description) {
            swaggerRoute[url][method].description = schema.description
          }

          if (schema.tags) {
            swaggerRoute[url][method].tags = schema.tags
          }

          if (schema.querystring) {
            getQueryParams(parameters, schema.querystring)
          }

          if (schema.params) {
            getPathParams(parameters, schema.params)
          }

          if (parameters.length) {
            swaggerRoute[url][method].parameters = parameters
          }

          if (schema.body) {
            swaggerRoute[url][method].requestBody = getRequestBody(schema.body)
          }
        }

        swaggerRoute[url][method].responses = genResponse(schema ? schema.response : null)
      }

      if (swaggerRoute[url]) {
        swaggerObject.paths[url] = swaggerRoute[url]
      }
    }

    if (opts && opts.yaml) {
      const swaggerString = yaml.safeDump(swaggerObject)
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

function getRequestBody (body) {
  return {
    content: {
      'application/json': {
        schema: body
      }
    },
    required: true
  }
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
    param.schema = { type: params[p].type }
    parameters.push(param)
  })
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
        content: {
          'application/json': {
            schema: rsp
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

module.exports = fp(fastifySwagger, '>=0.14.0')
