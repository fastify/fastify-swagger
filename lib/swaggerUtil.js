'use strict'

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

  return Object.keys(obj).map((propKey) => {
    return toSwaggerProp(propKey, obj[propKey])
  })
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

function getBodyParams (parameters, body, ref) {
  const bodyResolved = ref.resolve(body)

  const param = {}
  param.name = 'body'
  param.in = 'body'
  param.schema = bodyResolved
  parameters.push(param)
}

function getCommonParams (container, parameters, schema, ref, sharedSchemas) {
  const resolved = ref.resolve(schema)
  const add = plainJsonObjectToSwagger2(container, resolved, sharedSchemas)
  add.forEach(_ => parameters.push(_))
}

// https://swagger.io/docs/specification/2-0/describing-responses/
function generateResponse (fastifyResponseJson, ref) {
  // if the user does not provided an out schema
  if (!fastifyResponseJson) {
    return { 200: { description: 'Default Response' } }
  }

  const responsesContainer = {}

  Object.keys(fastifyResponseJson).forEach(key => {
    // 2xx is not supported by swagger

    const rawJsonSchema = fastifyResponseJson[key]
    const resolved = ref.resolve(rawJsonSchema)

    responsesContainer[key] = {
      schema: resolved,
      description: rawJsonSchema.description || 'Default Response'
    }
  })

  return responsesContainer
}

module.exports = {
  consumesFormOnly,
  plainJsonObjectToSwagger2,
  getBodyParams,
  getCommonParams,
  generateResponse
}
