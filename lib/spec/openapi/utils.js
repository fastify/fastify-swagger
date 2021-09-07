'use strict'

const { readPackageJson, formatParamUrl, resolveLocalRef } = require('../../util/common')
const { xResponseDescription, xConsume } = require('../../constants')
const { rawRequired } = require('../../symbols')

function prepareDefaultOptions (opts) {
  const openapi = opts.openapi
  const info = openapi.info || null
  const servers = openapi.servers || null
  const components = openapi.components || null
  const security = openapi.security || null
  const tags = openapi.tags || null
  const externalDocs = openapi.externalDocs || null
  const stripBasePath = opts.stripBasePath
  const transform = opts.transform
  const hiddenTag = opts.hiddenTag
  const hideUntagged = opts.hideUntagged
  const extensions = []

  for (const [key, value] of Object.entries(opts.openapi)) {
    if (key.startsWith('x-')) {
      extensions.push([key, value])
    }
  }

  return {
    info,
    servers,
    components,
    security,
    tags,
    externalDocs,
    stripBasePath,
    transform,
    hiddenTag,
    extensions,
    hideUntagged
  }
}

function prepareOpenapiObject (opts) {
  const pkg = readPackageJson()
  const openapiObject = {
    openapi: '3.0.3',
    info: {
      version: pkg.version || '1.0.0',
      title: pkg.name || ''
    },
    components: { schemas: {} },
    paths: {}
  }

  if (opts.info) openapiObject.info = opts.info
  if (opts.servers) openapiObject.servers = opts.servers
  if (opts.components) openapiObject.components = Object.assign({}, opts.components, { schemas: Object.assign({}, opts.components.schemas) })
  if (opts.security) openapiObject.security = opts.security
  if (opts.tags) openapiObject.tags = opts.tags
  if (opts.externalDocs) openapiObject.externalDocs = opts.externalDocs

  for (const [key, value] of opts.extensions) {
    // "x-" extension can not be typed
    openapiObject[key] = value
  }

  return openapiObject
}

function normalizeUrl (url, servers, stripBasePath) {
  if (!stripBasePath) return url
  servers = Array.isArray(servers) ? servers : []
  servers.forEach(function (server) {
    const basePath = new URL(server.url).pathname
    if (url.startsWith(basePath) && basePath !== '/') {
      url = url.replace(basePath, '')
    }
  })
  return formatParamUrl(url)
}

function transformDefsToComponents (jsonSchema) {
  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    Object.keys(jsonSchema).forEach(function (key) {
      if (key === '$ref') {
        jsonSchema[key] = jsonSchema[key].replace('definitions', 'components/schemas')
      } else if (key === 'examples' && Array.isArray(jsonSchema[key]) && (jsonSchema[key].length > 1)) {
        jsonSchema.examples = convertExamplesArrayToObject(jsonSchema.examples)
      } else if (key === 'examples' && Array.isArray(jsonSchema[key]) && (jsonSchema[key].length === 1)) {
        jsonSchema.example = jsonSchema[key][0]
        delete jsonSchema[key]
      } else {
        jsonSchema[key] = transformDefsToComponents(jsonSchema[key])
      }
    })
  }
  return jsonSchema
}

function convertExamplesArrayToObject (examples) {
  return examples.reduce((examplesObject, example, index) => {
    if (typeof example === 'object') {
      examplesObject['example' + (index + 1)] = { value: example }
    } else {
      examplesObject[example] = { value: example }
    }

    return examplesObject
  }, {})
}

// For supported keys read:
// https://swagger.io/docs/specification/describing-parameters/
function plainJsonObjectToOpenapi3 (container, jsonSchema, externalSchemas) {
  const obj = transformDefsToComponents(resolveLocalRef(jsonSchema, externalSchemas))
  let toOpenapiProp
  switch (container) {
    case 'cookie':
    case 'query':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        const result = {
          in: container,
          name: propertyName,
          required: jsonSchemaElement.required
        }
        // complex serialization in query or cookie, eg. JSON
        // https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
        if (jsonSchemaElement[xConsume]) {
          result.content = {
            [jsonSchemaElement[xConsume]]: {
              schema: {
                ...jsonSchemaElement,
                required: jsonSchemaElement[rawRequired]
              }
            }
          }

          delete result.content[jsonSchemaElement[xConsume]].schema[xConsume]
        } else {
          result.schema = jsonSchemaElement
        }
        // description should be optional
        if (jsonSchemaElement.description) result.description = jsonSchemaElement.description
        return result
      }
      break
    case 'path':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        const result = {
          in: container,
          name: propertyName,
          required: true,
          schema: jsonSchemaElement
        }
        // description should be optional
        if (jsonSchemaElement.description) result.description = jsonSchemaElement.description
        return result
      }
      break
    case 'header':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        return {
          in: 'header',
          name: propertyName,
          required: jsonSchemaElement.required,
          description: jsonSchemaElement.description,
          schema: {
            type: jsonSchemaElement.type
          }
        }
      }
      break
  }

  return Object.keys(obj).map((propKey) => {
    const jsonSchema = toOpenapiProp(propKey, obj[propKey])
    if (jsonSchema.schema) {
      // it is needed as required in schema is invalid prop - delete only if needed
      if (typeof jsonSchema.schema.required !== 'undefined') delete jsonSchema.schema.required
      // it is needed as description in schema is invalid prop - delete only if needed
      if (typeof jsonSchema.schema.description !== 'undefined') delete jsonSchema.schema.description
    }
    return jsonSchema
  })
}

function resolveBodyParams (content, schema, consumes, ref) {
  const resolved = transformDefsToComponents(ref.resolve(schema))

  if ((Array.isArray(consumes) && consumes.length === 0) || typeof consumes === 'undefined') {
    consumes = ['application/json']
  }

  consumes.forEach((consume) => {
    content[consume] = {
      schema: resolved
    }
  })
}

function resolveCommonParams (container, parameters, schema, ref, sharedSchemas) {
  const schemasPath = '#/components/schemas/'
  let resolved = transformDefsToComponents(ref.resolve(schema))

  // if the resolved definition is in global schema
  if (resolved.$ref && resolved.$ref.startsWith(schemasPath)) {
    const parts = resolved.$ref.split(schemasPath)
    resolved = ref.definitions().definitions[parts[1]]
  }

  const arr = plainJsonObjectToOpenapi3(container, resolved, sharedSchemas)
  arr.forEach(swaggerSchema => parameters.push(swaggerSchema))
}

// https://swagger.io/docs/specification/describing-responses/
function resolveResponse (fastifyResponseJson, produces, ref) {
  // if the user does not provided an out schema
  if (!fastifyResponseJson) {
    return { 200: { description: 'Default Response' } }
  }

  const responsesContainer = {}

  const statusCodes = Object.keys(fastifyResponseJson)

  statusCodes.forEach(statusCode => {
    const rawJsonSchema = fastifyResponseJson[statusCode]
    const resolved = transformDefsToComponents(ref.resolve(rawJsonSchema))

    /**
     * 2xx require to be all upper-case
     * converts statusCode to upper case only when it is not "default"
     */
    if (statusCode !== 'default') {
      statusCode = statusCode.toUpperCase()
    }

    const response = {
      description: resolved[xResponseDescription] || rawJsonSchema.description || 'Default Response'
    }

    // add headers when there are any.
    if (rawJsonSchema.headers) {
      response.headers = {}
      Object.keys(rawJsonSchema.headers).forEach(function (key) {
        const header = {
          schema: rawJsonSchema.headers[key]
        }

        if (rawJsonSchema.headers[key].description) {
          header.description = rawJsonSchema.headers[key].description
          // remove invalid field
          delete header.schema.description
        }

        response.headers[key] = header
      })
      // remove invalid field
      delete resolved.headers
    }

    // add schema when type is not 'null'
    if (rawJsonSchema.type !== 'null') {
      const content = {}

      if ((Array.isArray(produces) && produces.length === 0) || typeof produces === 'undefined') {
        produces = ['application/json']
      }

      delete resolved[xResponseDescription]
      produces.forEach((produce) => {
        content[produce] = {
          schema: resolved
        }
      })

      response.content = content
    }

    responsesContainer[statusCode] = response
  })

  return responsesContainer
}

function prepareOpenapiMethod (schema, ref, openapiObject) {
  const openapiMethod = {}
  const parameters = []

  // All the data the user can give us, is via the schema object
  if (schema) {
    if (schema.operationId) openapiMethod.operationId = schema.operationId
    if (schema.summary) openapiMethod.summary = schema.summary
    if (schema.tags) openapiMethod.tags = schema.tags
    if (schema.description) openapiMethod.description = schema.description
    if (schema.externalDocs) openapiMethod.externalDocs = schema.externalDocs
    if (schema.querystring) resolveCommonParams('query', parameters, schema.querystring, ref, openapiObject.definitions)
    if (schema.body) {
      openapiMethod.requestBody = { content: {} }
      resolveBodyParams(openapiMethod.requestBody.content, schema.body, schema.consumes, ref)
    }
    if (schema.params) resolveCommonParams('path', parameters, schema.params, ref, openapiObject.definitions)
    if (schema.headers) resolveCommonParams('header', parameters, schema.headers, ref, openapiObject.definitions)
    // TODO: need to documentation, we treat it same as the querystring
    // fastify do not support cookies schema in first place
    if (schema.cookies) resolveCommonParams('cookie', parameters, schema.cookies, ref, openapiObject.definitions)
    if (parameters.length > 0) openapiMethod.parameters = parameters
    if (schema.deprecated) openapiMethod.deprecated = schema.deprecated
    if (schema.security) openapiMethod.security = schema.security
    if (schema.servers) openapiMethod.servers = schema.servers
    for (const key of Object.keys(schema)) {
      if (key.startsWith('x-')) {
        openapiMethod[key] = schema[key]
      }
    }
  }

  openapiMethod.responses = resolveResponse(schema ? schema.response : null, schema ? schema.produces : null, ref)

  return openapiMethod
}

module.exports = {
  prepareDefaultOptions,
  prepareOpenapiObject,
  prepareOpenapiMethod,
  normalizeUrl
}
