'use strict'

const fp = require('fastify-plugin')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const safeStringify = require('fast-safe-stringify')

function fastifySwagger (fastify, opts, next) {
  fastify.decorate('swagger', swagger)

  opts = opts || {}
  opts.swagger = opts.swagger || {}

  const info = opts.swagger.info || null
  const host = opts.swagger.host || null
  const schemes = opts.swagger.schemes || null
  const consumes = opts.swagger.consumes || null
  const produces = opts.swagger.produces || null
  const basePath = opts.swagger.basePath || null

  const filename = opts.filename || 'swagger'
  const noop = (err) => { if (err) throw err }

  function swagger (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }
    callback = callback || noop

    const swaggerObject = {}

    // Base swagger info
    // this info is displayed in the swagger file
    // in the same order as here
    swaggerObject.swagger = '2.0'
    if (info) {
      swaggerObject.info = info
    } else {
      swaggerObject.info = {
        version: '1.0.0',
        title: require(path.join(__dirname, 'package.json')).name || ''
      }
    }
    if (host) swaggerObject.host = host
    if (schemes) swaggerObject.schemes = schemes
    if (basePath) swaggerObject.basePath = basePath
    if (consumes) swaggerObject.consumes = consumes
    if (produces) swaggerObject.produces = produces

    swaggerObject.paths = {}

    for (var node of fastify) {
      // The node path name
      const url = formatParamUrl(Object.keys(node)[0])
      // object with all the methods of the node
      const routes = node[Object.keys(node)[0]]
      const swaggerRoute = {}
      swaggerRoute[url] = {}

      // let's iterate over the methods
      Object.keys(routes).forEach(method => {
        const route = routes[method]
        swaggerRoute[url][method] = {}

        const parameters = []

        // All the data the user can give us, is via the schema object
        if (route.schema) {
          // the resulting schema will be in this order
          if (route.schema.summary) {
            swaggerRoute[url][method].summary = route.schema.summary
          }

          if (route.schema.description) {
            swaggerRoute[url][method].description = route.schema.description
          }

          if (route.schema.tags) {
            swaggerRoute[url][method].tags = route.schema.tags
          }

          if (route.schema.querystring) {
            getQueryParams(parameters, route.schema.querystring)
          }

          if (route.schema.payload) {
            getPayloadParams(parameters, route.schema.payload)
          }

          if (route.schema.params) {
            getPathParams(parameters, route.schema.params)
          }

          if (parameters.length) {
            swaggerRoute[url][method].parameters = parameters
          }
        }

        swaggerRoute[url][method].responses = genResponse(route.schema)
      })

      swaggerObject.paths[url] = swaggerRoute[url]
    }

    if (opts) {
      if (opts.json && opts.return) {
        return swaggerObject
      }

      if (opts.json) {
        fs.writeFile(path.join(process.cwd(), `${filename}.json`), safeStringify(swaggerObject), 'utf8', callback)
        return
      }
    }

    const swaggerString = yaml.safeDump(swaggerObject)

    if (opts && opts.return) {
      return swaggerString
    }

    fs.writeFile(path.join(process.cwd(), `${filename}.yaml`), swaggerString, 'utf8', callback)
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

function getPayloadParams (parameters, payload) {
  const param = {}
  param.name = 'body'
  param.in = 'body'
  param.schema = payload
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

function genResponse (schema) {
  // if the user does not provided an out schema
  if (!schema.out && !schema.response) {
    return {
      200: {
        description: 'Default Response'
      }
    }
  }

  if (schema.out) {
    const response = {}
    response[schema.out.code || 200] = {
      description: schema.out.description || 'Out response',
      schema: schema.out
    }
    // we remove the code and description key from the out schema,
    // otherwise it will be wrote two time.
    if (schema.out.code) delete schema.out.code
    if (schema.out.description) delete schema.out.description

    return response
  }

  if (schema.response) {
    return schema.response
  }
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
