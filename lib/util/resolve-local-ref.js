'use strict'

const { rawRequired } = require('../symbols')
const { xConsume } = require('../constants')

function unescapeToken (token) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

function resolveLocalRef (jsonSchema, externalSchemas) {
  if (jsonSchema.type !== undefined && jsonSchema.properties !== undefined) {
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
    return schemas.reduce((acc, schema) => Object.assign(acc, resolveLocalRef(schema, externalSchemas)), {})
  }

  // $ref is in the format: #/definitions/<resolved definition>/<optional pointer>
  // or in the format: #/components/schemas/<resolved definition>/<optional pointer>
  if (jsonSchema.$ref) {
    const tokens = jsonSchema.$ref.split('/')
    const nameIndex = externalSchemas[tokens[2]] ? 2 : 3
    const definition = externalSchemas[tokens[nameIndex]]
    const target = tokens
      .slice(nameIndex + 1)
      .reduce((schema, token) => schema?.[unescapeToken(token)], definition)

    if (target !== definition && typeof target === 'object' && target !== null) {
      const properties = resolveLocalRef(target, externalSchemas)
      if (Object.values(properties).every((property) => typeof property === 'object' && property !== null)) {
        return properties
      }
    }
    // the pointer does not lead to a set of parameters:
    // the resolved definition is used, as it has always been
    return resolveLocalRef(definition, externalSchemas)
  }
  return jsonSchema
}

module.exports = {
  resolveLocalRef
}
