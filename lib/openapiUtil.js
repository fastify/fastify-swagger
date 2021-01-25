'use strict'

const { URL } = require('url')
const { localRefResolve } = require('./swaggerUtil')

// TODO: improvement needed, maybe remove the depend of json-schema-resolver
function defToComponent (jsonSchema) {
  if (typeof jsonSchema === 'object') {
    Object.keys(jsonSchema).forEach(function (key) {
      if (key === '$ref') {
        jsonSchema[key] = jsonSchema[key].replace('definitions', 'components/schemas')
      } else {
        jsonSchema[key] = defToComponent(jsonSchema[key])
      }
    })
  }
  return jsonSchema
}

function plainJsonObjectToOpenapi3 (container, jsonSchema, externalSchemas) {
  const obj = defToComponent(localRefResolve(jsonSchema, externalSchemas))
  let toSwaggerProp
  switch (container) {
    case 'cookie':
    case 'query':
      toSwaggerProp = function (propertyName, jsonSchemaElement) {
        jsonSchemaElement.in = container
        jsonSchemaElement.name = propertyName
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

  return Object.keys(obj).map((propKey) => {
    const jsonSchema = toSwaggerProp(propKey, obj[propKey])
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
  })
}

function getBodyParams (parameters, body, consumes, ref) {
  const bodyResolved = defToComponent(ref.resolve(body))

  if ((Array.isArray(consumes) && consumes.length === 0) || typeof consumes === 'undefined') {
    consumes = ['application/json']
  }

  consumes.forEach((consume) => {
    parameters[consume] = {
      schema: bodyResolved
    }
  })
}

function getCommonParams (container, parameters, schema, ref, sharedSchema) {
  const resolved = defToComponent(ref.resolve(schema))
  const add = plainJsonObjectToOpenapi3(container, resolved, sharedSchema)
  add.forEach(openapiSchema => parameters.push(openapiSchema))
}

function generateResponse (fastifyResponseJson, produces, ref) {
  // if the user does not provided an out schema
  if (!fastifyResponseJson) {
    return { 200: { description: 'Default Response' } }
  }

  const responsesContainer = {}

  Object.keys(fastifyResponseJson).forEach(key => {
    const rawJsonSchema = fastifyResponseJson[key]
    const resolved = defToComponent(ref.resolve(rawJsonSchema))

    const content = {}

    if ((Array.isArray(produces) && produces.length === 0) || typeof produces === 'undefined') {
      produces = ['application/json']
    }

    produces.forEach((produce) => {
      content[produce] = {
        schema: resolved
      }
    })

    responsesContainer[key] = {
      content,
      description: rawJsonSchema.description || 'Default Response'
    }
  })

  return responsesContainer
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
  getBodyParams,
  getCommonParams,
  generateResponse,
  stripBasePathByServers
}
