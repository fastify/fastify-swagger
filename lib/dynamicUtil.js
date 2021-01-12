'use strict'

const fs = require('fs')
const path = require('path')
const Ref = require('json-schema-resolver')

function addHook (fastify) {
  const routes = []
  const sharedSchemasMap = new Map()

  fastify.addHook('onRoute', (routeOptions) => {
    routes.push(routeOptions)
  })

  fastify.addHook('onRegister', async (instance) => {
    // we need to wait the ready event to get all the .getSchemas()
    // otherwise it will be empty
    // TODO: better handle for schemaId
    // when schemaId is the same in difference instance
    // the latter will lost
    instance.addHook('onReady', (done) => {
      const allSchemas = instance.getSchemas()
      for (const schemaId of Object.keys(allSchemas)) {
        if (!sharedSchemasMap.has(schemaId)) {
          sharedSchemasMap.set(schemaId, allSchemas[schemaId])
        }
      }
      done()
    })
  })

  return {
    routes,
    Ref () {
      const externalSchemas = Array.from(sharedSchemasMap.values())
      // TODO: hardcoded applicationUri is not a ideal solution
      return Ref({ clone: true, applicationUri: 'todo.com', externalSchemas })
    }
  }
}

function resolveSwaggerFunction (opts, routes, Ref, cache, done) {
  let build
  if (Object.keys(opts.openapi).length > 0 && opts.openapi.constructor === Object) {
    build = require('./openapi')
  } else {
    build = require('./swagger')
  }
  return build(opts, routes, Ref, cache, done)
}

// The swagger standard does not accept the url param with ':'
// so '/user/:id' is not valid.
// This function converts the url in a swagger compliant url string
// => '/user/{id}'
function formatParamUrl (url) {
  let start = url.indexOf('/:')
  if (start === -1) return url

  const end = url.indexOf('/', ++start)

  if (end === -1) {
    return url.slice(0, start) + '{' + url.slice(++start) + '}'
  } else {
    return formatParamUrl(url.slice(0, start) + '{' + url.slice(++start, end) + '}' + url.slice(end))
  }
}

function readPackageJson (done) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json')))
  } catch (err) {
    return done(err)
  }
}

module.exports = {
  addHook,
  resolveSwaggerFunction,
  formatParamUrl,
  readPackageJson
}
