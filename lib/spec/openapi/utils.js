'use strict'

const { readPackageJson, formatParamUrl, resolveLocalRef } = require('../../util/common')
const { xResponseDescription, xConsume, xExamples } = require('../../constants')
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
    ...openapi,
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

  if (opts.openapi) openapiObject.openapi = opts.openapi
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

function normalizeUrl (url, serverUrls, stripBasePath) {
  if (!stripBasePath) return formatParamUrl(url)
  serverUrls.forEach(function (serverUrl) {
    const basePath = serverUrl.startsWith('/') ? serverUrl : new URL(serverUrl).pathname
    if (url.startsWith(basePath) && basePath !== '/') {
      url = url.replace(basePath, '')
    }
  })
  return formatParamUrl(url)
}

function resolveServerUrls (servers) {
  const resolvedUrls = []
  const findVariablesRegex = /{(.*?)}/g // As for OpenAPI v3 spec url variables are named in brackets, e.g. {foo}

  servers = Array.isArray(servers) ? servers : []
  for (const server of servers) {
    const originalUrl = server.url
    const variables = server.variables

    let url = originalUrl
    const matches = url.matchAll(findVariablesRegex)

    for (const [nameInBrackets, name] of matches) {
      const value = variables?.[name]?.default

      if (value === undefined) {
        throw new Error(`Server URL ${originalUrl} could not be resolved. Make sure to provide a default value for each URL variable.`)
      }

      url = url.replace(nameInBrackets, value)
    }

    resolvedUrls.push(url)
  }

  return resolvedUrls
}

function transformDefsToComponents (jsonSchema) {
  if (typeof jsonSchema === 'object' && jsonSchema !== null) {
    // Handle patternProperties, that is not part of OpenAPI definitions
    if (jsonSchema.patternProperties) {
      jsonSchema.additionalProperties = Object.values(jsonSchema.patternProperties)[0]
      delete jsonSchema.patternProperties
    } else if (jsonSchema.const) {
      // OAS 3.1 supports `const` but it is not supported by `swagger-ui`
      // https://swagger.io/docs/specification/data-models/keywords/
      jsonSchema.enum = [jsonSchema.const]
      delete jsonSchema.const
    }

    Object.keys(jsonSchema).forEach(function (key) {
      if (key === 'properties') {
        Object.keys(jsonSchema[key]).forEach(function (prop) {
          jsonSchema[key][prop] = transformDefsToComponents(jsonSchema[key][prop])
        })
      } else if (key === '$ref') {
        jsonSchema[key] = jsonSchema[key].replace('definitions', 'components/schemas')
      } else if (key === '$id' || key === '$schema') {
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
function plainJsonObjectToOpenapi3 (container, jsonSchema, externalSchemas, securityIgnores = []) {
  const obj = transformDefsToComponents(resolveLocalRef(jsonSchema, externalSchemas))
  let toOpenapiProp
  switch (container) {
    case 'cookie':
    case 'header':
    case 'query':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        let result = {
          in: container,
          name: propertyName,
          required: jsonSchemaElement.required
        }

        const media = schemaToMedia(jsonSchemaElement)

        // complex serialization in query or cookie, eg. JSON
        // https://swagger.io/docs/specification/describing-parameters/#schema-vs-content
        if (jsonSchemaElement[xConsume]) {
          media.schema.required = jsonSchemaElement[rawRequired]

          result.content = {
            [jsonSchemaElement[xConsume]]: media
          }

          delete result.content[jsonSchemaElement[xConsume]].schema[xConsume]
        } else {
          result = { ...media, ...result }
        }
        // description should be optional
        if (jsonSchemaElement.description) result.description = jsonSchemaElement.description
        // optionally add serialization format style
        if (jsonSchema.style) result.style = jsonSchema.style
        if (jsonSchema.explode != null) result.explode = jsonSchema.explode
        if (jsonSchema.allowReserved === true && container === 'query') {
          result.allowReserved = jsonSchema.allowReserved
        }
        return result
      }
      break
    case 'path':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        const media = schemaToMedia(jsonSchemaElement)

        const result = {
          ...media,
          in: container,
          name: propertyName,
          required: true
        }

        // description should be optional
        if (jsonSchemaElement.description) result.description = jsonSchemaElement.description
        return result
      }
      break
  }

  return Object.keys(obj)
    .filter((propKey) => (!securityIgnores.includes(propKey)))
    .map((propKey) => {
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

function schemaToMedia (schema) {
  const media = { schema }

  if (schema.examples?.length === 1) {
    media.example = schema.examples[0]
    delete schema.examples
  } else if (schema.examples?.length > 1) {
    media.examples = convertExamplesArrayToObject(schema.examples)
    // examples is invalid property of media object schema
    delete schema.examples
  }

  if (schema[xExamples]) {
    media.examples = schema[xExamples]
    delete schema[xExamples]
  }

  return media
}

function resolveBodyParams (body, schema, consumes, ref) {
  const resolved = transformDefsToComponents(ref.resolve(schema))
  if ((Array.isArray(consumes) && consumes.length === 0) || typeof consumes === 'undefined') {
    consumes = ['application/json']
  }

  const media = schemaToMedia(resolved)
  consumes.forEach((consume) => {
    body.content[consume] = media
  })

  if (resolved && resolved.required && resolved.required.length) {
    body.required = true
  }
}

function resolveCommonParams (container, parameters, schema, ref, sharedSchemas, securityIgnores) {
  const schemasPath = '#/components/schemas/'
  let resolved = transformDefsToComponents(ref.resolve(schema))

  // if the resolved definition is in global schema
  if (resolved.$ref && resolved.$ref.startsWith(schemasPath)) {
    const parts = resolved.$ref.split(schemasPath)
    const pathParts = parts[1].split('/')
    resolved = pathParts.reduce((resolved, pathPart) => resolved[pathPart], ref.definitions().definitions)
  }

  const arr = plainJsonObjectToOpenapi3(container, resolved, { ...sharedSchemas, ...ref.definitions().definitions }, securityIgnores)
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
      if (resolved.content && resolved.content[Object.keys(resolved.content)[0]].schema) {
        response.content = resolved.content
      } else {
        const content = {}

        if ((Array.isArray(produces) && produces.length === 0) || typeof produces === 'undefined') {
          produces = ['application/json']
        }

        delete resolved[xResponseDescription]

        const media = schemaToMedia(resolved)

        for (const produce of produces) {
          content[produce] = media
        }

        response.content = content
      }
    }

    responsesContainer[statusCode] = response
  })

  return responsesContainer
}

function prepareOpenapiMethod (schema, ref, openapiObject) {
  const openapiMethod = {}
  const parameters = []

  // Parse out the security prop keys to ignore
  const securityIgnores = [
    ...(openapiObject && openapiObject.security ? openapiObject.security : []),
    ...(schema && schema.security ? schema.security : [])
  ]
    .reduce((acc, securitySchemeGroup) => {
      Object.keys(securitySchemeGroup).forEach((securitySchemeLabel) => {
        const { name, in: category } = openapiObject.components.securitySchemes[securitySchemeLabel]
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(name)
      })
      return acc
    }, {})

  // All the data the user can give us, is via the schema object
  if (schema) {
    if (schema.operationId) openapiMethod.operationId = schema.operationId
    if (schema.summary) openapiMethod.summary = schema.summary
    if (schema.tags) openapiMethod.tags = schema.tags
    if (schema.description) openapiMethod.description = schema.description
    if (schema.externalDocs) openapiMethod.externalDocs = schema.externalDocs
    if (schema.querystring) resolveCommonParams('query', parameters, schema.querystring, ref, openapiObject.definitions, securityIgnores.query)
    if (schema.body) {
      openapiMethod.requestBody = { content: {} }
      resolveBodyParams(openapiMethod.requestBody, schema.body, schema.consumes, ref)
    }
    if (schema.params) resolveCommonParams('path', parameters, schema.params, ref, openapiObject.definitions)
    if (schema.headers) resolveCommonParams('header', parameters, schema.headers, ref, openapiObject.definitions, securityIgnores.header)
    // TODO: need to documentation, we treat it same as the querystring
    // fastify do not support cookies schema in first place
    if (schema.cookies) resolveCommonParams('cookie', parameters, schema.cookies, ref, openapiObject.definitions, securityIgnores.cookie)
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

function prepareOpenapiSchemas (schemas, ref) {
  return Object.entries(schemas)
    .reduce((res, [name, schema]) => {
      const _ = { ...schema }
      const resolved = transformDefsToComponents(ref.resolve(_, { externalSchemas: [schemas] }))

      // Swagger doesn't accept $id on /definitions schemas.
      // The $ids are needed by Ref() to check the URI so we need
      // to remove them at the end of the process
      // definitions are added by resolve but they are replace by components.schemas
      delete resolved.$id
      delete resolved.definitions

      res[name] = resolved
      return res
    }, {})
}

module.exports = {
  prepareDefaultOptions,
  prepareOpenapiObject,
  prepareOpenapiMethod,
  prepareOpenapiSchemas,
  resolveServerUrls,
  normalizeUrl
}
