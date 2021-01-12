'use strict'

const { URL } = require('url')
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
      return Ref({ clone: true, applicationUri: 'todo.com', externalSchemas })
    }
  }
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

function consumesFormOnly (schema) {
  const consumes = schema.consumes
  return (
    consumes &&
      consumes.length === 1 &&
      (consumes[0] === 'application/x-www-form-urlencoded' ||
        consumes[0] === 'multipart/form-data')
  )
}

// For supported keys read:
// https://swagger.io/docs/specification/2-0/describing-parameters/
function plainJsonObjectToSwagger2 (container, jsonSchema, externalSchemas) {
  const obj = localRefResolve(jsonSchema, externalSchemas)
  let toSwaggerProp
  switch (container) {
    case 'query':
      toSwaggerProp = function (propertyName, jsonSchemaElement) {
        jsonSchemaElement.in = container
        jsonSchemaElement.name = propertyName
        return jsonSchemaElement
      }
      break
    case 'formData':
      toSwaggerProp = function (propertyName, jsonSchemaElement) {
        delete jsonSchemaElement.$id
        jsonSchemaElement.in = container
        jsonSchemaElement.name = propertyName

        // https://json-schema.org/understanding-json-schema/reference/non_json_data.html#contentencoding
        if (jsonSchemaElement.contentEncoding === 'binary') {
          delete jsonSchemaElement.contentEncoding // Must be removed
          jsonSchemaElement.type = 'file'
        }

        return jsonSchemaElement
      }
      break
    case 'path':
      toSwaggerProp = function (propertyName, jsonSchemaElement) {
        jsonSchemaElement.in = container
        jsonSchemaElement.name = propertyName
        jsonSchemaElement.required = true
        return jsonSchemaElement
      }
      break
    case 'header':
      toSwaggerProp = function (propertyName, jsonSchemaElement) {
        return {
          in: 'header',
          name: propertyName,
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

function swagger2ParametersToOpenapi3 (jsonSchema) {
  jsonSchema.schema = {}
  jsonSchema.schema.type = jsonSchema.type
  if (jsonSchema.type === 'object') {
    jsonSchema.schema.properties = jsonSchema.properties
  }
  if (jsonSchema.type === 'array') {
    jsonSchema.schema.items = jsonSchema.items
  }
  delete jsonSchema.type
  delete jsonSchema.properties
  delete jsonSchema.items
  return jsonSchema
}

function localRefResolve (jsonSchema, externalSchemas) {
  if (jsonSchema.type && jsonSchema.properties) {
    // for the shorthand querystring/params/headers declaration
    const propertiesMap = Object.keys(jsonSchema.properties).reduce((acc, headers) => {
      const required = (jsonSchema.required && jsonSchema.required.indexOf(headers) >= 0) || false
      const newProps = Object.assign({}, jsonSchema.properties[headers], { required })
      return Object.assign({}, acc, { [headers]: newProps })
    }, {})

    return propertiesMap
  }

  // $ref is in the format: #/definitions/<resolved definition>/<optional fragment>
  const localReference = jsonSchema.$ref.split('/')[2]
  return localRefResolve(externalSchemas[localReference], externalSchemas)
}

function stripBasePathByServers (path, servers) {
  servers = Array.isArray(servers) ? servers : []
  servers.forEach(function (server) {
    const basePath = new URL(server.url).pathname
    if (path.startsWith(basePath) && basePath !== '/') {
      path = path.replace(basePath, '')
    }
  })
  return path
}

module.exports = {
  addHook,
  formatParamUrl,
  consumesFormOnly,
  plainJsonObjectToSwagger2,
  swagger2ParametersToOpenapi3,
  localRefResolve,
  stripBasePathByServers
}
