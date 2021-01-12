'use strict'

const { URL } = require('url')
const { plainJsonObjectToSwagger2 } = require('./swaggerUtil')

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

function getBodyParams (parameters, body, consumes, ref) {
  const bodyResolved = ref.resolve(body)

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
  const resolved = ref.resolve(schema)
  const add = plainJsonObjectToSwagger2(container, resolved, sharedSchema)
  add.forEach(_ => parameters.push(swagger2ParametersToOpenapi3(_)))
}

// https://swagger.io/docs/specification/2-0/describing-responses/
function generateResponse (fastifyResponseJson, ref) {
  // if the user does not provided an out schema
  if (!fastifyResponseJson) {
    return { 200: { description: 'Default Response' } }
  }

  const responsesContainer = {}

  Object.keys(fastifyResponseJson).forEach(key => {
    const rawJsonSchema = fastifyResponseJson[key]
    const resolved = ref.resolve(rawJsonSchema)

    const content = {
      'application/json': {}
    }

    content['application/json'] = {
      schema: resolved
    }

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
