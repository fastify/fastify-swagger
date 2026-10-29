'use strict'

// JSON Schema draft 6+ (and Ajv) use numbers for `exclusiveMinimum` and
// `exclusiveMaximum`, while OpenAPI 3.0 and Swagger 2.0 only accept the draft 4
// booleans that make `minimum`/`maximum` exclusive. Keep whichever bound is the
// stricter one.
function convertExclusiveBoundsToBooleans (schema) {
  for (const [exclusive, inclusive, isStricter] of [
    ['exclusiveMinimum', 'minimum', (value, bound) => value >= bound],
    ['exclusiveMaximum', 'maximum', (value, bound) => value <= bound]
  ]) {
    const value = schema[exclusive]
    if (typeof value !== 'number') continue

    const bound = schema[inclusive]
    if (typeof bound !== 'number' || isStricter(value, bound)) {
      schema[inclusive] = value
      schema[exclusive] = true
    } else {
      delete schema[exclusive]
    }
  }

  return schema
}

module.exports = { convertExclusiveBoundsToBooleans }
