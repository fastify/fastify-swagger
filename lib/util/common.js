'use strict'

const fs = require('fs')
const path = require('path')
const Ref = require('json-schema-resolver')
const cloner = require('rfdc')({ proto: true, circles: false })
const { rawRequired } = require('../symbols')
const { xConsume } = require('../constants')

function addHook (fastify, pluginOptions) {
  const routes = []
  const sharedSchemasMap = new Map()

  fastify.addHook('onRoute', (routeOptions) => {
    // we need to skip HEAD route
    // since it may automatically added by fastify
    // and will conflict with the existing route
    if (routeOptions.method === 'HEAD') return
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

  fastify.addHook('onReady', (done) => {
    const allSchemas = fastify.getSchemas()
    for (const schemaId of Object.keys(allSchemas)) {
      // it is the top-level, we do not expect to have duplicate id
      sharedSchemasMap.set(schemaId, allSchemas[schemaId])
    }
    done()
  })

  return {
    routes,
    Ref () {
      const externalSchemas = cloner(Array.from(sharedSchemasMap.values()))
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
const COLON = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'
function formatParamUrl (str) {
  let i, char
  let state = 'skip'
  let path = ''
  let param = ''
  let level = 0
  // count for regex if no param exist
  let regexp = 0
  for (i = 0; i < str.length; i++) {
    char = str[i]
    switch (state) {
      case 'colon': {
        // we only accept a-zA-Z0-9_ in param
        if (COLON.indexOf(char) !== -1) {
          param += char
        } else if (char === '(') {
          state = 'regexp'
          level++
        } else {
          // end
          state = 'skip'
          path += '{' + param + '}'
          path += char
          param = ''
        }
        break
      }
      case 'regexp': {
        if (char === '(') {
          level++
        } else if (char === ')') {
          level--
        }
        // we end if the level reach zero
        if (level === 0) {
          state = 'skip'
          if (param === '') {
            regexp++
            param = 'regexp' + String(regexp)
          }
          path += '{' + param + '}'
          param = ''
        }
        break
      }
      default: {
        // we check if we need to change state
        if (char === ':' && str[i + 1] === ':') {
          // double colon -> single colon
          path += char
          // skip one more
          i++
        } else if (char === ':') {
          // single colon -> state colon
          state = 'colon'
        } else if (char === '(') {
          state = 'regexp'
          level++
        } else if (char === '*') {
          // * -> wildcard
          // should be exist once only
          path += '{wildcard}'
        } else {
          path += char
        }
      }
    }
  }
  // clean up
  if (state === 'colon' && param !== '') {
    path += '{' + param + '}'
  }
  return path
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
  if (externalSchemas[localRef]) return resolveLocalRef(externalSchemas[localRef], externalSchemas)
  // $ref is in the format: #/components/schemas/<resolved definition>
  return resolveLocalRef(externalSchemas[jsonSchema.$ref.split('/')[3]], externalSchemas)
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
