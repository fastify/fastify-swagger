'use strict'

function resolveSchemaReference (rawSchema, ref) {
  const resolvedReference = ref.resolve(rawSchema)

  // Ref has format `#/definitions/id`
  const schemaId = resolvedReference?.$ref?.split('/', 3)[2]

  if (schemaId === undefined) {
    return undefined
  }

  return ref.definitions().definitions[schemaId]
}

module.exports = {
  resolveSchemaReference
}
