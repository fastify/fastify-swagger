'use strict'

const yaml = require('js-yaml')
const { shouldRouteHide, readPackageJson, formatParamUrl, resolveLocalRef } = require('../util/common')

module.exports = function (opts, cache, routes, Ref, done) {
  let ref

  const defOpts = prepareDefaultOptions(opts)

  return function (opts) {
    if (opts && opts.yaml) {
      if (cache.string) return cache.string
    } else {
      if (cache.object) return cache.object
    }

    // Base Openapi info
    const openapiObject = prepareOpenapiObject(defOpts, done)

    ref = Ref()
    openapiObject.components.schemas = {
      ...openapiObject.components.schemas,
      ...(ref.definitions().definitions)
    }

    // Swagger doesn't accept $id on /definitions schemas.
    // The $ids are needed by Ref() to check the URI so we need
    // to remove them at the end of the process
    Object.values(openapiObject.components.schemas)
      .forEach((_) => { delete _.$id })

    for (const route of routes) {
      const schema = defOpts.transform
        ? defOpts.transform(route.schema)
        : route.schema

      if (shouldRouteHide(schema, defOpts.hiddenTag)) continue

      const url = normalizeUrl(route.url, defOpts.servers, defOpts.stripBasePath)

      const openapiRoute = Object.assign({}, openapiObject.paths[url])

      const openapiMethod = prepareOpenapiMethod(schema, ref, openapiObject)

      // route.method should be either a String, like 'POST', or an Array of Strings, like ['POST','PUT','PATCH']
      const methods = typeof route.method === 'string' ? [route.method] : route.method

      for (const method of methods) {
        openapiRoute[method.toLowerCase()] = openapiMethod
      }

      openapiObject.paths[url] = openapiRoute
    }

    if (opts && opts.yaml) {
      cache.string = yaml.dump(openapiObject, { skipInvalid: true })
      return cache.string
    }

    cache.object = openapiObject
    return cache.object
  }
}

function prepareDefaultOptions (opts) {
  const openapi = opts.openapi
  const info = openapi.info || null
  const servers = openapi.servers || null
  const components = openapi.components || null
  const tags = openapi.tags || null
  const externalDocs = openapi.externalDocs || null
  const stripBasePath = opts.stripBasePath
  const transform = opts.transform
  const hiddenTag = opts.hiddenTag
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
    tags,
    externalDocs,
    stripBasePath,
    transform,
    hiddenTag,
    extensions
  }
}

function prepareOpenapiObject (opts, done) {
  const pkg = readPackageJson(done)
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
  if (typeof jsonSchema === 'object') {
    Object.keys(jsonSchema).forEach(function (key) {
      if (key === '$ref') {
        jsonSchema[key] = jsonSchema[key].replace('definitions', 'components/schemas')
      } else {
        jsonSchema[key] = transformDefsToComponents(jsonSchema[key])
      }
    })
  }
  return jsonSchema
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
        return {
          in: container,
          name: propertyName,
          required: jsonSchemaElement.required,
          schema: jsonSchemaElement
        }
      }
      break
    case 'path':
      toOpenapiProp = function (propertyName, jsonSchemaElement) {
        return {
          in: container,
          name: propertyName,
          required: true,
          schema: jsonSchemaElement
        }
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
    // it is needed as required in schema is invalid prop
    delete jsonSchema.schema.required
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
  const resolved = transformDefsToComponents(ref.resolve(schema))
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

  Object.keys(fastifyResponseJson).forEach(key => {
    // 2xx is not supported by swagger

    const rawJsonSchema = fastifyResponseJson[key]
    const resolved = transformDefsToComponents(ref.resolve(rawJsonSchema))

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
