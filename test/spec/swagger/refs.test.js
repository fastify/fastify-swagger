'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')
const { FST_ERR_SCH_ALREADY_PRESENT } = require('fastify/lib/errors')

test('support $ref schema', async t => {
  t.plan(1)

  const fastify = Fastify()
  fastify.addSchema({
    $id: 'example',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  })

  await fastify.register(fastifySwagger)

  fastify.register((instance, _opts, next) => {
    instance.addSchema({
      $id: 'subschema-two',
      type: 'object',
      properties: {
        hello: { type: 'string' }
      }
    })

    instance.register((subinstance, _opts, next) => {
      subinstance.addSchema({
        $id: 'subschema-three',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      })

      subinstance.post('/:hello', {
        handler () {},
        schema: {
          body: { $ref: 'example#/properties/hello' },
          querystring: { $ref: 'subschema-two#/properties/hello' },
          params: { $ref: 'subschema-two#/properties/hello' },
          headers: { $ref: 'subschema-three#/properties/hello' },
          response: {
            200: { $ref: 'example#/properties/hello' }
          }
        }
      })

      next()
    })

    next()
  })

  await fastify.ready()

  await Swagger.validate(fastify.swagger())
  t.assert.ok(true, 'valid swagger object')
})

test('support nested $ref schema : complex case', async (t) => {
  const options = {
    swagger: {},
    refResolver: {
      buildLocalReference: (json, _baseUri, _fragment, i) => {
        return json.$id || `def-${i}`
      }
    }
  }
  const fastify = Fastify()
  await fastify.register(fastifySwagger, options)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string' } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.assert.strictEqual(typeof swaggerObject, 'object')
  const definitions = swaggerObject.definitions
  t.assert.deepStrictEqual(Object.keys(definitions), ['schemaA', 'schemaB', 'schemaC', 'schemaD'])

  // ref must be prefixed by '#/definitions/'
  t.assert.strictEqual(definitions.schemaC.properties.a.items.$ref, '#/definitions/schemaA')
  t.assert.strictEqual(definitions.schemaD.properties.b.$ref, '#/definitions/schemaB')
  t.assert.strictEqual(definitions.schemaD.properties.c.$ref, '#/definitions/schemaC')

  await Swagger.validate(swaggerObject)
})

test('support nested $ref schema : complex case without modifying buildLocalReference', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    instance.addSchema({ $id: 'schemaB', type: 'object', properties: { id: { type: 'string' } } })
    instance.addSchema({ $id: 'schemaC', type: 'object', properties: { a: { type: 'array', items: { $ref: 'schemaA' } } } })
    instance.addSchema({ $id: 'schemaD', type: 'object', properties: { b: { $ref: 'schemaB' }, c: { $ref: 'schemaC' } } })
    instance.post('/url1', { schema: { body: { $ref: 'schemaD' }, response: { 200: { $ref: 'schemaB' } } } }, () => {})
    instance.post('/url2', { schema: { body: { $ref: 'schemaC' }, response: { 200: { $ref: 'schemaA' } } } }, () => {})
  })

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  t.assert.strictEqual(typeof swaggerObject, 'object')

  const definitions = swaggerObject.definitions
  t.assert.deepStrictEqual(Object.keys(definitions), ['def-0', 'def-1', 'def-2', 'def-3'])

  // ref must be prefixed by '#/definitions/'
  t.assert.strictEqual(definitions['def-2'].properties.a.items.$ref, '#/definitions/def-0')
  t.assert.strictEqual(definitions['def-3'].properties.b.$ref, '#/definitions/def-1')
  t.assert.strictEqual(definitions['def-3'].properties.c.$ref, '#/definitions/def-2')

  await Swagger.validate(swaggerObject)
})

test('trying to overwriting a schema results in a FST_ERR_SCH_ALREADY_PRESENT', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } })
    t.assert.throws(() => instance.addSchema({ $id: 'schemaA', type: 'object', properties: { id: { type: 'integer' } } }), new FST_ERR_SCH_ALREADY_PRESENT('schemaA'))
  })

  await fastify.ready()
})

test('renders $ref schema with enum in headers', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger)
  fastify.register(async (instance) => {
    instance.addSchema({ $id: 'headerA', type: 'object', properties: { 'x-enum-header': { type: 'string', enum: ['OK', 'NOT_OK'] } } })
    instance.get('/url1', { schema: { headers: { $ref: 'headerA#' }, response: { 200: { type: 'object' } } } }, async () => ({ result: 'OK' }))
  })

  await fastify.ready()

  const swagger = fastify.swagger()

  await Swagger.validate(swagger)

  t.assert.deepStrictEqual(
    swagger.paths['/url1'].get.parameters[0],
    {
      type: 'string',
      enum: ['OK', 'NOT_OK'],
      in: 'header',
      name: 'x-enum-header',
      required: false
    }
  )
})

// https://github.com/fastify/fastify-swagger/issues/639
const definitionsCases = [
  ['swagger', { swagger: {} }, (document) => document.definitions, '#/definitions/']
]

for (const [name, option, getSchemas, prefix] of definitionsCases) {
  test(`${name}: support $ref to the definitions of a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'http://foo/common.json',
      type: 'object',
      definitions: {
        foo: {
          $id: '#address',
          type: 'object',
          properties: { city: { type: 'string' } }
        }
      }
    })
    fastify.post('/', {
      schema: {
        body: { $ref: 'http://foo/common.json#/definitions/foo' },
        response: { 200: { $ref: 'http://foo/common.json#/definitions/foo/properties/city' } }
      }
    }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.strictEqual(schemas['def-0'].definitions, undefined)
    t.assert.deepStrictEqual(schemas['def-0-foo'].properties, { city: { type: 'string' } })
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0-foo"`))
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0-foo/properties/city"`))
  })

  test(`${name}: support local $ref and nested definitions in a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'tree',
      type: 'object',
      definitions: {
        node: {
          type: 'object',
          definitions: {
            leaf: { type: 'string', enum: ['a', 'b'], default: 'a' }
          },
          properties: {
            // a property named as a keyword must not be hoisted
            definitions: { type: 'string' },
            value: { $ref: '#/definitions/node/definitions/leaf' },
            children: { type: 'array', items: { $ref: '#/definitions/node' } }
          }
        }
      },
      properties: {
        self: { $ref: '#' },
        root: { $ref: '#/definitions/node' },
        nested: {
          type: 'object',
          $defs: { node: { type: 'integer' } },
          properties: { id: { $ref: '#/properties/nested/$defs/node' } }
        },
        sibling: { $ref: '#/properties/nested' }
      }
    })
    // takes the name that would be assigned to the hoisted definition
    fastify.addSchema({ $id: 'other', type: 'object', properties: { tree: { $ref: 'tree#' } } })
    fastify.get('/', { schema: { response: { 200: { $ref: 'tree#' } } } }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.deepStrictEqual(Object.keys(schemas).sort(), [
      'def-0', 'def-0-leaf', 'def-0-node', 'def-0-node-1', 'def-1'
    ])
    t.assert.deepStrictEqual(schemas['def-0'].properties, {
      self: { $ref: `${prefix}def-0` },
      root: { $ref: `${prefix}def-0-node` },
      nested: { type: 'object', properties: { id: { $ref: `${prefix}def-0-node-1` } } },
      sibling: { $ref: `${prefix}def-0/properties/nested` }
    })
    t.assert.deepStrictEqual(schemas['def-0-node'].properties, {
      definitions: { type: 'string' },
      value: { $ref: `${prefix}def-0-leaf` },
      children: { type: 'array', items: { $ref: `${prefix}def-0-node` } }
    })
    t.assert.deepStrictEqual(schemas['def-0-node-1'], { type: 'integer' })
  })
}

for (const [name, option, getSchemas, prefix] of definitionsCases) {
  test(`${name}: support $ref to the anchor of a shared schema`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    // same shape of the schemas of the Fastify "Fluent Schema" guide
    fastify.addSchema({
      $id: 'https://fastify/demo',
      type: 'object',
      definitions: {
        addressSchema: {
          $id: '#address',
          type: 'object',
          properties: { city: { type: 'string' } }
        },
        userSchema: {
          $id: '#user',
          type: 'object',
          properties: { home: { $ref: '#address' } }
        }
      }
    })

    const body = {
      type: 'object',
      properties: {
        residence: { $ref: 'https://fastify/demo#address' },
        office: { $ref: 'https://fastify/demo#/definitions/addressSchema' },
        owner: { $ref: 'https://fastify/demo#user' }
      }
    }
    fastify.post('/', {
      schema: {
        body,
        response: { 200: { $ref: 'https://fastify/demo#address' } }
      }
    }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    // the anchored subschemas are not listed twice
    t.assert.deepStrictEqual(Object.keys(schemas), ['def-0', 'def-0-addressSchema', 'def-0-userSchema'])
    t.assert.deepStrictEqual(schemas['def-0-userSchema'].properties.home, { $ref: `${prefix}def-0-addressSchema` })

    const operation = JSON.stringify(document.paths['/'].post)
    t.assert.doesNotMatch(operation, /def-0address/)
    t.assert.strictEqual(operation.split(`"$ref":"${prefix}def-0-addressSchema"`).length - 1, 3)
    t.assert.match(operation, new RegExp(`"\\$ref":"${prefix}def-0-userSchema"`))

    // the schema of the route is left untouched
    t.assert.strictEqual(body.properties.residence.$ref, 'https://fastify/demo#address')
  })

  test(`${name}: support $ref to an anchor outside of the definitions`, async (t) => {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.addSchema({
      $id: 'order',
      type: 'object',
      properties: {
        shipping: { $id: '#shipping', type: 'object', properties: { city: { type: 'string' } } },
        billing: { $ref: '#shipping' }
      }
    })
    fastify.post('/', { schema: { body: { $ref: 'order#shipping' } } }, () => {})

    await fastify.ready()

    const document = fastify.swagger()
    const schemas = getSchemas(document)
    await Swagger.validate(JSON.parse(JSON.stringify(document)))

    t.assert.deepStrictEqual(Object.keys(schemas), ['def-0'])
    t.assert.deepStrictEqual(schemas['def-0'].properties.billing, { $ref: `${prefix}def-0/properties/shipping` })
    t.assert.match(JSON.stringify(document.paths['/'].post), new RegExp(`"\\$ref":"${prefix}def-0/properties/shipping"`))
  })
}

// https://github.com/fastify/fastify-swagger/issues/865
test('swagger: support recursive schemas with an `$id` nested in a route schema', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { swagger: {} })

  // what TypeBox `Type.Recursive(..., { $id: 'Node' })` produces
  const node = {
    $id: 'Node',
    type: 'object',
    properties: {
      name: { type: 'string' },
      children: { type: 'array', items: { $ref: 'Node' } }
    }
  }
  const body = { type: 'object', properties: { treeNodes: { type: 'array', items: node } } }
  fastify.post('/', { schema: { body } }, () => {})
  fastify.put('/', { schema: { body } }, () => {})

  await fastify.ready()

  const document = fastify.swagger()
  await Swagger.validate(JSON.parse(JSON.stringify(document)))

  const schemas = document.definitions
  t.assert.deepStrictEqual(Object.keys(schemas), ['def-0'])
  t.assert.deepStrictEqual(schemas['def-0'].properties.children.items, { $ref: '#/definitions/def-0' })
  t.assert.deepStrictEqual(document.paths['/'].post.parameters[0].schema.properties.treeNodes.items, { $ref: '#/definitions/def-0' })
  t.assert.deepStrictEqual(document.paths['/'].put, document.paths['/'].post)
})

test('swagger: support schemas with an `$id` nested in another one', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { swagger: {} })

  fastify.addSchema({ $id: 'Shared', type: 'object', properties: { name: { type: 'string' } } })
  const leaf = { $id: 'Leaf', type: 'object', properties: { shared: { $ref: 'Shared#' } } }
  const tree = { $id: 'Tree', type: 'object', properties: { leaf, leaves: { type: 'array', items: { $ref: 'Leaf' } } } }
  fastify.post('/', { schema: { body: { type: 'object', properties: { tree } } } }, () => {})

  await fastify.ready()

  const document = fastify.swagger()
  await Swagger.validate(JSON.parse(JSON.stringify(document)))

  const schemas = document.definitions
  t.assert.deepStrictEqual(Object.keys(schemas).sort(), ['def-0', 'def-1', 'def-2'])
  t.assert.deepStrictEqual(document.paths['/'].post.parameters[0].schema.properties.tree, { $ref: '#/definitions/def-1' })
  t.assert.deepStrictEqual(schemas['def-1'].properties, { leaf: { $ref: '#/definitions/def-2' }, leaves: { type: 'array', items: { $ref: '#/definitions/def-2' } } })
  t.assert.deepStrictEqual(schemas['def-2'].properties, { shared: { $ref: '#/definitions/def-0' } })
})
