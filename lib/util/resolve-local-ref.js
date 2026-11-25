'use strict'

const { rawRequired } = require('../symbols')
const { xConsume } = require('../constants')

function unescapeToken (token) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

// Reads the parameters from a schema: `undefined` is returned when the schema
// does not describe any (a scalar schema, an object without properties...)
function resolveParams (jsonSchema, externalSchemas) {
  if (jsonSchema.properties !== undefined) {
    // expand object properties into parameters (`type` may be omitted)
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
    // a member without parameters (eg. `{ type: 'object' }`) contributes nothing:
    // its keywords must not be mistaken for parameters
    return schemas.reduce((acc, schema) => Object.assign(acc, resolveParams(schema, externalSchemas)), {})
  }

  // $ref is in the format: #/definitions/<resolved definition>/<optional pointer>
  // or in the format: #/components/schemas/<resolved definition>/<optional pointer>
  if (jsonSchema.$ref) {
    const tokens = jsonSchema.$ref.split('/')
    // the position of the name depends on the prefix of the pointer only:
    // a schema may be legitimately named `schemas` or `components`
    const nameIndex = tokens[1] === 'components' && tokens[2] === 'schemas' ? 3 : 2
    const definition = externalSchemas[tokens[nameIndex]]
    const target = tokens
      .slice(nameIndex + 1)
      .reduce((schema, token) => schema?.[unescapeToken(token)], definition)

    // when the pointer does not lead to a set of parameters (it cannot be
    // followed, or its target is a scalar schema, a keyword value...)
    // the resolved definition is used, as it has always been
    const params = target !== definition && typeof target === 'object' && target !== null
      ? resolveParams(target, externalSchemas)
      : undefined
    return params ?? resolveParams(definition, externalSchemas) ?? {}
  }
}

function resolveLocalRef (jsonSchema, externalSchemas) {
  // a schema that is none of the above is a plain map of parameters already
  return resolveParams(jsonSchema, externalSchemas) ?? jsonSchema
}

module.exports = {
  resolveLocalRef
}
