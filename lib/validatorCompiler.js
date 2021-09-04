'use strict'

const Ajv = require('ajv')
const Decimal = require('decimal.js')

const range = {

  int64Bit: {
    min: new Decimal('-9223372036854775808'),
    max: new Decimal('9223372036854775807')
  },
  int32Bit: {
    min: new Decimal('-2147483648'),
    max: new Decimal('2147483647')
  },
  bytes: {
    min: new Decimal('-128'),
    max: new Decimal('127')
  }

}

const binaryValidation = (data) => {
  const binaryRegex = /^[0-1]{1,}$/g
  return binaryRegex.test(data)
}

const byteValidation = (data) => {
  const notBase64 = /[^A-Z0-9+/=]/i

  const len = data.length
  if (!len || len % 4 !== 0 || notBase64.test(data)) {
    return false
  }

  const firstPaddingChar = data.indexOf('=')
  return firstPaddingChar === -1 ||
    firstPaddingChar === len - 1 ||
    (firstPaddingChar === len - 2 && data[len - 1] === '=')
}

const int64bitValidation = (data) => {
  return (
    Number.isInteger(+data) &&
    range.int64Bit.max.greaterThanOrEqualTo(data) &&
     range.int64Bit.min.lessThanOrEqualTo(data)
  )
}

const int32bitValidation = (data) => {
  return (
    Number.isInteger(+data) &&
    range.int32Bit.max.greaterThanOrEqualTo(data) &&
    range.int32Bit.min.lessThanOrEqualTo(data)
  )
}

const validatorCompiler = (schema) => {
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

  return ajv.compile(schema)
}

module.exports = {
  validatorCompiler,
  int32bitValidation,
  int64bitValidation,
  binaryValidation,
  byteValidation
}
