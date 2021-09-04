'use strict'

const Ajv = require('ajv')
const ajvOpenApi = require('ajv-openapi')

function openAjv (compileObj, data) {
  const ajvOptions = {
    schemaId: 'auto',
    format: 'full',
    coerceTypes: true,
    unknownFormats: 'ignore',
    useDefaults: true,
    nullable: true
  }

  const openApiOptions = {
    useDraft04: true
  }

  const ajv = ajvOpenApi(
    new Ajv(ajvOptions),
    openApiOptions
  )
  return ajv.compile(compileObj)(data)
}

const binaryValidation = (data) => {
  return openAjv({ format: 'binary', type: 'string' }, data)
}

const byteValidation = (data) => {
  return openAjv({ format: 'byte', type: 'string' }, data)
}

const int64bitValidation = (data) => {
  return openAjv({ format: 'int64', type: 'integer' }, data)
}

const int32bitValidation = (data) => {
  return openAjv({ format: 'int32', type: 'integer' }, data)
}

const validatorCompiler = () => {
  const ajv = new Ajv({
    removeAdditional: true,
    useDefaults: true,
    coerceTypes: true,
    nullable: true
  })

  ajv.addFormat('binary', {
    type: 'string',
    validate: binaryValidation
  })
  ajv.addFormat('byte', {
    type: 'string',
    validate: byteValidation
  })
  ajv.addFormat('int32', {
    type: 'number',
    validate: int32bitValidation
  })
  ajv.addFormat('int64', {
    type: 'number',
    validate: int64bitValidation
  })

  return function (schema) {
    return ajv.compile(schema)
  }
}

module.exports = validatorCompiler
