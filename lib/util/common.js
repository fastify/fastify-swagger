'use strict'

const fs = require('fs')
const path = require('path')
const Ref = require('json-schema-resolver')
const { rawRequired } = require('../symbols')
const { xConsume } = require('../constants')

function addHook (fastify, pluginOptions) {
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
      return Ref(Object.assign(
        { applicationUri: 'todo.com' },
        pluginOptions.refResolver,
        { clone: true, externalSchemas })
      )
    }
  }
}

function shouldRouteHide (schema, opts) {
  const { hiddenTag, hideUntagged } = opts

  if (schema && schema.hide) {
    return true
  }

  const tags = (schema && schema.tags) || []

  if (tags.length === 0 && hideUntagged) {
    return true
  }

  if (tags.includes(hiddenTag)) {
    return schema.tags.includes(hiddenTag)
  }

  return false
}

// The swagger standard does not accept the url param with ':'
// so '/user/:id' is not valid.
// This function converts the url in a swagger compliant url string
// => '/user/{id}'
// custom verbs at the end of a url are okay => /user::watch but should be rendered as /user:watch in swagger
function formatParamUrl (url) {
  const regex = /(?<!:):([a-zA-Z0-9_]+)/g
  let found = regex.exec(url)
  while (found !== null) {
    const [full, param] = found
    url = url.replace(full, '{' + param + '}')
    found = regex.exec(url)
  }

  return url.replace(/::/g, ':')
}

function resolveLocalRef (jsonSchema, externalSchemas) {
  if (typeof jsonSchema.type !== 'undefined' && typeof jsonSchema.properties !== 'undefined') {
    // for the shorthand querystring/params/headers declaration
    const propertiesMap = Object.keys(jsonSchema.properties).reduce((acc, headers) => {
      const rewriteProps = {}
      rewriteProps.required = (Array.isArray(jsonSchema.required) && jsonSchema.required.indexOf(headers) >= 0) || false
      // save raw required for next restore in the content/<media-type>
      if (jsonSchema.properties[headers][xConsume]) {
        rewriteProps[rawRequired] = jsonSchema.properties[headers].required
      }
      const newProps = Object.assign({}, jsonSchema.properties[headers], rewriteProps)

      return Object.assign({}, acc, { [headers]: newProps })
    }, {})

    return propertiesMap
  }

  // for oneOf, anyOf, allOf support in querystring/params/headers
  if (jsonSchema.oneOf || jsonSchema.anyOf || jsonSchema.allOf) {
    const schemas = jsonSchema.oneOf || jsonSchema.anyOf || jsonSchema.allOf
    return schemas.reduce(function (acc, schema) {
      const json = resolveLocalRef(schema, externalSchemas)
      return { ...acc, ...json }
    }, {})
  }

  // $ref is in the format: #/definitions/<resolved definition>/<optional fragment>
  const localRef = jsonSchema.$ref.split('/')[2]
  return resolveLocalRef(externalSchemas[localRef], externalSchemas)
}

function readPackageJson () {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json')))
  } catch (err) {
    return {}
  }
}

function resolveSwaggerFunction (opts, cache, routes, Ref, done) {
  if (typeof opts.openapi === 'undefined' || opts.openapi === null) {
    return require('../spec/swagger')(opts, cache, routes, Ref, done)
  } else {
    return require('../spec/openapi')(opts, cache, routes, Ref, done)
  }
}

module.exports = {
  addHook,
  shouldRouteHide,
  readPackageJson,
  formatParamUrl,
  resolveLocalRef,
  resolveSwaggerFunction
}
