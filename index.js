'use strict'

const fp = require('fastify-plugin')
const yaml = require('js-yaml')
const fs = require('fs')
const path = require('path')
const safeStringify = require('fast-safe-stringify')

function fastifySwagger (fastify, opts, next) {
  fastify.decorate('swagger', swagger)

  const info = opts.swagger ? opts.swagger.info || null : null
  const host = opts.swagger ? opts.swagger.host || null : null
  const schemes = opts.swagger ? opts.swagger.schemes || [] : []
  const produces = opts.swagger ? opts.swagger.produces || [] : []
  const filename = opts.filename || 'swagger'
  const noop = (err) => { if (err) throw err }

  function swagger (opts, callback) {
    if (typeof opts === 'function') {
      callback = opts
      opts = {}
    }
    callback = callback || noop

    const swaggerObject = {}

    swaggerObject.swagger = '2.0'
    swaggerObject.info = info
    swaggerObject.host = host
    swaggerObject.schemes = schemes
    swaggerObject.produces = produces
    swaggerObject.paths = {}

    for (var node of fastify) {
      const routeName = formatParamUrl(Object.keys(node)[0])
      const routeObject = node[Object.keys(node)[0]]
      const swaggerRoute = {}
      swaggerRoute[routeName] = {}

      Object.keys(routeObject).forEach(key => {
        const route = routeObject[key]
        const method = route.method.toLowerCase()
        swaggerRoute[routeName][method] = {}

        const parameters = []

        // querystring
        if (route.schema && route.schema.querystring) {
          getQueryParams(parameters, route.schema.querystring)
        }

        // payload
        if (route.schema && route.schema.payload) {
          getPayloadParams(parameters, route.schema.payload)
        }

        // params
        if (route.schema && route.schema.params) {
          getPathParams(parameters, route.schema.params)
        }

        if (route.summary) {
          swaggerRoute[routeName][method].summary = route.summary
        }

        if (route.description) {
          swaggerRoute[routeName][method].description = route.description
        }

        if (route.tags) {
          swaggerRoute[routeName][method].tags = route.tags
        }

        if (parameters.length) {
          swaggerRoute[routeName][method].parameters = parameters
        }

        swaggerRoute[routeName][method].responses = genResponse(route.schema)
      })

      swaggerObject.paths[routeName] = swaggerRoute[routeName]
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
  if (!schema.out) {
    return {
      200: {
        description: 'Default Response'
      }
    }
  }

  const response = {}
  response[schema.out.code || 200] = {
    description: schema.out.description || 'Out response',
    schema: schema.out
  }

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
