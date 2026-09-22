'use strict'

// Keywords whose value is a map of `name -> schema`.
// The keys of these maps are user defined names, not JSON Schema keywords.
const SCHEMA_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'definitions',
  '$defs',
  'dependencies'
])

// Keywords holding reusable schemas: not allowed by Swagger and OpenAPI 3.0
const DEFINITIONS_KEYWORDS = ['definitions', '$defs']

// Keywords whose value is a schema or an array of schemas.
const SCHEMA_KEYWORDS = new Set([
  'items',
  'additionalItems',
  'additionalProperties',
  'contains',
  'propertyNames',
  'not',
  'if',
  'then',
  'else',
  'allOf',
  'anyOf',
  'oneOf'
])

function isObject (value) {
  return typeof value === 'object' && value !== null
}

function escapeToken (token) {
  return token.replace(/~/g, '~0').replace(/\//g, '~1')
}

/**
 * Visits a schema and all its subschemas. Differently from a plain deep walk,
 * it does not mistake data (`enum`, `default`, `examples`...) or property
 * names (a property called `definitions`) for JSON Schema keywords.
 */
function walkSchema (schema, visit, pointer = [], baseId, baseDepth = 0) {
  if (!isObject(schema)) return

  if (Array.isArray(schema)) {
    schema.forEach((item, i) => walkSchema(item, visit, [...pointer, `${i}`], baseId, baseDepth))
    return
  }

  // A fragment-only $id (draft-07 anchor) does not change the base URI
  if (typeof schema.$id === 'string' && schema.$id[0] !== '#') {
    baseId = schema.$id.split('#', 1)[0]
    // JSON pointers are relative to the closest schema resource
    baseDepth = pointer.length
  }

  visit(schema, pointer, baseId, baseDepth)

  for (const key of Object.keys(schema)) {
    const value = schema[key]
    if (SCHEMA_KEYWORDS.has(key)) {
      walkSchema(value, visit, [...pointer, key], baseId, baseDepth)
    } else if (SCHEMA_MAP_KEYWORDS.has(key) && isObject(value)) {
      for (const name of Object.keys(value)) {
        walkSchema(value[name], visit, [...pointer, key, name], baseId, baseDepth)
      }
    }
  }
}

/**
 * In JSON Schema a local reference (`#/definitions/foo`) is relative to the
 * closest schema resource. When a shared schema lands into the Swagger/OpenAPI
 * document, `#` becomes the root of the whole document instead, so the
 * reference would point to nowhere. Turning it into `<$id>#/definitions/foo`
 * lets the ref resolver handle it as any other reference to a shared schema.
 */
function absolutizeLocalRefs (schema) {
  walkSchema(schema, (subschema, _pointer, baseId) => {
    if (baseId !== undefined && typeof subschema.$ref === 'string' && subschema.$ref[0] === '#') {
      subschema.$ref = baseId + subschema.$ref
    }
  })
  return schema
}

/**
 * A fragment-only `$id` (`{ $id: '#address' }`) is a draft-07 anchor: the
 * subschema can be referenced as `<base>#address`. The ref resolver does not
 * support it: it appends the fragment to the definition name as it is,
 * producing `#/definitions/def-0address`. Since an anchor is nothing more than
 * an alias of a JSON pointer, this function returns the map
 * `<base>#anchor -> <base>#/json/pointer` to convert those references to the
 * form the ref resolver (and then the hoisting) understands.
 *
 * The anchors are removed from the (cloned) schemas: once the references are
 * converted nothing points to them anymore, the ref resolver would list each
 * of them as a duplicated definition and Swagger does not accept `$id` at all.
 */
function collectAnchors (schemas) {
  const anchors = new Map()
  for (const schema of schemas) {
    walkSchema(schema, (subschema, pointer, baseId, baseDepth) => {
      const { $id } = subschema
      if (baseId === undefined || typeof $id !== 'string' || $id[0] !== '#') return

      delete subschema.$id
      const anchor = baseId + $id
      // `#` is not an anchor and, as for the ref resolver, the first one wins
      if ($id.length === 1 || anchors.has(anchor)) return
      anchors.set(anchor, `${baseId}#${pointer.slice(baseDepth).map(token => `/${escapeToken(token)}`).join('')}`)
    })
  }
  return anchors
}

/**
 * Converts the references to an anchor into references to its JSON pointer.
 * The input is not always a schema (eg: the map of the responses), so this is
 * a plain deep walk: only the `$ref`s equal to a known anchor are touched.
 */
function rewriteAnchorRefs (node, anchors) {
  if (!isObject(node)) return node

  if (Array.isArray(node)) {
    for (const item of node) rewriteAnchorRefs(item, anchors)
    return node
  }

  if (typeof node.$ref === 'string' && anchors.has(node.$ref)) {
    node.$ref = anchors.get(node.$ref)
  }

  for (const key of Object.keys(node)) {
    rewriteAnchorRefs(node[key], anchors)
  }
  return node
}

/**
 * Returns the schemas the ref resolver does not know yet (i.e. the user ones,
 * not the shared schemas), since passing shared schemas as external ones
 * resolves them against the wrong base URI.
 * @param {Record<string, object>} schemas
 * @param {object} ref - Ref resolver instance.
 * @returns {Record<string, object>}
 */
function unknownSchemas (schemas, ref) {
  const known = ref.definitions().definitions
  const unknown = {}
  for (const name of Object.keys(schemas)) {
    if (schemas[name] !== known[name]) unknown[name] = schemas[name]
  }
  return unknown
}

/**
 * Moves nested `definitions`/`$defs` (not allowed by Swagger/OpenAPI) out of
 * a resolved and cloned schema, so they can become top-level definitions.
 * @param {string} schemaName
 * @param {object} schema - Resolved and cloned schema; mutated in place.
 * @param {Record<string, object>} sharedSchemas
 * @param {Map<string, string>} hoisted - Tracks `old pointer -> new name`; mutated.
 * @returns {Array<[string, object]>} Hoisted `[name, schema]` pairs.
 */
function hoistDefinitions (schemaName, schema, sharedSchemas, hoisted) {
  const result = []
  const owners = []
  const taken = new Set(hoisted.values())

  // The ref resolver adds the referenced shared schemas to the root
  // `definitions`: those are top-level definitions already.
  if (isObject(schema.definitions)) {
    for (const key of Object.keys(schema.definitions)) {
      if (schema.definitions[key] === sharedSchemas[key]) {
        delete schema.definitions[key]
      }
    }
  }

  walkSchema(schema, (subschema, pointer) => {
    for (const keyword of DEFINITIONS_KEYWORDS) {
      if (!isObject(subschema[keyword])) continue
      owners.push([subschema, keyword])

      for (const key of Object.keys(subschema[keyword])) {
        const from = [schemaName, ...pointer.map(escapeToken), keyword, escapeToken(key)].join('/')

        let name = `${schemaName}-${key}`
        for (let i = 1; Object.hasOwn(sharedSchemas, name) || taken.has(name); i++) {
          name = `${schemaName}-${key}-${i}`
        }

        taken.add(name)
        hoisted.set(from, name)
        result.push([name, subschema[keyword][key]])
      }
    }
  })

  for (const [owner, keyword] of owners) {
    delete owner[keyword]
  }

  return result
}

/**
 * Rewrites all the references to a hoisted definition.
 * `prefix` is `#/definitions/` for Swagger and `#/components/schemas/` for OpenAPI.
 */
function rewriteHoistedRefs (node, prefix, hoisted) {
  if (hoisted.size === 0 || !isObject(node)) return

  if (Array.isArray(node)) {
    for (const item of node) rewriteHoistedRefs(item, prefix, hoisted)
    return
  }

  if (typeof node.$ref === 'string' && node.$ref.startsWith(prefix)) {
    const pointer = node.$ref.slice(prefix.length)
    // longest match first, so definitions nested in definitions are supported
    for (let end = pointer.length; end > 0; end = pointer.lastIndexOf('/', end - 1)) {
      const name = hoisted.get(pointer.slice(0, end))
      if (name !== undefined) {
        node.$ref = prefix + name + pointer.slice(end)
        break
      }
    }
  }

  for (const key of Object.keys(node)) {
    rewriteHoistedRefs(node[key], prefix, hoisted)
  }
}

module.exports = {
  absolutizeLocalRefs,
  collectAnchors,
  rewriteAnchorRefs,
  hoistDefinitions,
  unknownSchemas,
  rewriteHoistedRefs
}
