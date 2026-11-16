'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const yaml = require('yaml')
const fastifySwagger = require('../../../index')
const { readPackageJson } = require('../../../lib/util/read-package-json')
const { openapiOption, openapiWebHookOption } = require('../../../examples/options')

test('openapi should have default version', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: {} })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.openapi, '3.0.3')
})

test('openapi version can be overridden', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.openapi, '3.1.0')
})

test('openapi should have default info properties', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: {} })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const pkg = readPackageJson()
  t.assert.strictEqual(openapiObject.info.title, pkg.name)
  t.assert.strictEqual(openapiObject.info.version, pkg.version)
})

test('openapi basic properties', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.info, openapiOption.openapi.info)
  t.assert.strictEqual(openapiObject.servers, openapiOption.openapi.servers)
  t.assert.ok(openapiObject.paths)
  t.assert.ok(openapiObject.paths['/'])
})

test('openapi components', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  openapiOption.openapi.components.schemas = {
    ExampleModel: {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
          description: 'Some id'
        },
        name: {
          type: 'string',
          description: 'Name of smthng'
        }
      }
    }
  }

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(openapiObject.components.schemas)), openapiOption.openapi.components.schemas)
  delete openapiOption.openapi.components.schemas // remove what we just added
})

test('openapi paths', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  openapiOption.openapi.paths = {
    '/status': {
      get: {
        description: 'Status route, so we can check if server is alive',
        tags: [
          'Status'
        ],
        responses: {
          200: {
            description: 'Server is alive',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    health: {
                      type: 'boolean'
                    },
                    date: {
                      type: 'string'
                    }
                  },
                  example: {
                    health: true,
                    date: '2018-02-19T15:36:46.758Z'
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/status', () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.deepStrictEqual(openapiObject.paths, openapiOption.openapi.paths)
  delete openapiOption.openapi.paths // remove what we just added
})

test('openapi paths are merged with the registered routes', async (t) => {
  t.plan(6)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: {
      info: { title: 'Test', version: '1.0.0' },
      paths: {
        '/static': {
          post: {
            summary: 'static route',
            responses: { 200: { description: 'OK' } }
          }
        },
        '/mixed': {
          get: {
            summary: 'static get',
            responses: { 200: { description: 'OK' } }
          },
          post: {
            summary: 'static post',
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    }
  })

  fastify.get('/dynamic', { schema: { summary: 'dynamic route' } }, () => {})
  fastify.get('/mixed', { schema: { summary: 'dynamic get' } }, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.deepStrictEqual(Object.keys(openapiObject.paths).sort(), ['/dynamic', '/mixed', '/static'])
  t.assert.strictEqual(openapiObject.paths['/static'].post.summary, 'static route')
  t.assert.strictEqual(openapiObject.paths['/dynamic'].get.summary, 'dynamic route')
  t.assert.strictEqual(openapiObject.paths['/mixed'].post.summary, 'static post')
  t.assert.strictEqual(openapiObject.paths['/mixed'].get.summary, 'dynamic get')

  await Swagger.validate(structuredClone(openapiObject))
  t.assert.ok(true, 'valid openapi object')
})

test('hide support when property set in transform() - property', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    ...openapiOption,
    transform: ({ schema, url }) => {
      return { schema: { ...schema, hide: true }, url }
    }
  })

  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/'], undefined)
})

test('hide support - tags Default', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      tags: ['X-HIDDEN'],
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/'], undefined)
})

test('hide support - tags Custom', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { ...openapiOption, hiddenTag: 'NOP' })

  const opts = {
    schema: {
      tags: ['NOP'],
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/'], undefined)
})

test('hide support - hidden untagged', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { ...openapiOption, hideUntagged: true })

  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/'], undefined)
})

test('basePath support', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/prefix'
        }
      ]
    })
  })

  fastify.get('/prefix/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/prefix/endpoint'], undefined)
  t.assert.ok(openapiObject.paths['/endpoint'])
})

test('basePath maintained when stripBasePath is set to false', async (t) => {
  t.plan(3)

  const fastify = Fastify()

  await fastify.register(fastifySwagger, {
    stripBasePath: false,
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/foo'
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths.endpoint, undefined)
  t.assert.strictEqual(openapiObject.paths['/endpoint'], undefined)
  t.assert.ok(openapiObject.paths['/foo/endpoint'])
})

test('relative basePath support', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: '/foo'
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/foo/endpoint'], undefined)
  t.assert.ok(openapiObject.paths['/endpoint'])
})

test('basePath containing variables support', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost:{port}/{basePath}',
          variables: {
            port: {
              default: 8080
            },
            basePath: {
              default: 'foo'
            }
          }
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.paths['/foo/endpoint'], undefined)
  t.assert.ok(openapiObject.paths['/endpoint'])
})

test('throw when a basePath with variables but no corresponding default values is provided', async (t) => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: Object.assign({}, openapiOption.openapi, {
      servers: [
        {
          url: 'http://localhost/{basePath}/foo',
          variables: {
            basePath: {}
          }
        }
      ]
    })
  })

  fastify.get('/foo/endpoint', {}, () => {})

  await fastify.ready()
  t.assert.throws(fastify.swagger)
})

test('cache - json', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger()
  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.assert.ok(true, 'valid swagger object')
})

test('cache - yaml', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger({ yaml: true })
  const swaggerYaml = fastify.swagger({ yaml: true })
  t.assert.strictEqual(typeof swaggerYaml, 'string')
  yaml.parse(swaggerYaml)
  t.assert.ok(true, 'valid swagger yaml')
})

test('move examples from "x-examples" to examples field', async (t) => {
  t.plan(3)
  const fastify = Fastify({
    ajv: {
      plugins: [
        function (ajv) {
          ajv.addKeyword({ keyword: 'x-examples' })
        }
      ]
    }
  })

  await fastify.register(fastifySwagger, openapiOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        required: ['hello'],
        properties: {
          hello: {
            type: 'object',
            properties: {
              lorem: {
                type: 'string'
              }
            }
          }
        },
        'x-examples': {
          'lorem ipsum': {
            summary: 'Roman statesman',
            value: { lorem: 'ipsum' }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.assert.ok(schema)
  t.assert.strictEqual(schema['x-examples'], undefined)
  t.assert.deepStrictEqual(content.examples, {
    'lorem ipsum': {
      summary: 'Roman statesman',
      value: { lorem: 'ipsum' }
    }
  })
})

test('parameter & header examples', async t => {
  await t.test('uses .example if has single example', async t => {
    t.plan(2)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const [params, querystring, headers] = Array(3).fill({
      type: 'object',
      properties: {
        hello: {
          type: 'string',
          examples: ['world']
        }
      }
    })
    fastify.post('/', { schema: { params, querystring, headers } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const { parameters } = openapiObject.paths['/'].post

    t.assert.ok(parameters.every(({ example }) => example === 'world'))
    t.assert.ok(parameters.every(param => !Object.hasOwn(param, 'examples')))
  })

  await t.test('uses .examples if has multiple examples', async t => {
    t.plan(2)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const [params, querystring, headers] = Array(3).fill({
      type: 'object',
      properties: {
        hello: {
          type: 'string',
          examples: ['world', 'universe']
        }
      }
    })
    fastify.post('/', { schema: { params, querystring, headers } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const { parameters } = openapiObject.paths['/'].post
    const examples = parameters.map(({ examples }) => examples)
    t.assert.deepStrictEqual(examples, Array(3).fill({
      world: { value: 'world' },
      universe: { value: 'universe' }
    }))
    t.assert.ok(parameters.every(param => !Object.hasOwn(param, 'example')))
  })
  await t.test('uses .example in nested parameter schemas', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const querystring = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'string',
            examples: ['alpha', 'beta']
          }
        }
      }
    }
    fastify.get('/', { schema: { querystring } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))
    t.assert.ok(true, 'valid openapi document')

    const paramSchema = openapiObject.paths['/'].get.parameters[0].schema
    t.assert.strictEqual(paramSchema.items.examples, undefined)
    t.assert.strictEqual(paramSchema.items.example, 'alpha')
    t.assert.strictEqual(openapiObject.paths['/'].get.parameters[0].example, undefined)
  })
})

test('request body examples', async t => {
  await t.test('uses .example field if has single top-level string example', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'string',
      examples: ['hello']
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, 'hello')
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level string examples', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'string',
      examples: ['hello', 'world']
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.deepStrictEqual(content.examples, {
      hello: { value: 'hello' },
      world: { value: 'world' }
    })
  })

  await t.test('uses .example field if has single top-level numeric example', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'number',
      examples: [0]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, 0)
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level numeric examples', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'number',
      examples: [0, 1]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.deepStrictEqual(content.examples, {
      0: { value: 0 },
      1: { value: 1 }
    })
  })

  await t.test('uses .example field if has single top-level object example', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      },
      examples: [{ hello: 'world' }]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, { hello: 'world' })
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level object examples', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      },
      examples: [{ hello: 'world' }, { hello: 'universe' }]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.examples, {
      example1: { value: { hello: 'world' } },
      example2: { value: { hello: 'universe' } }
    })
    t.assert.strictEqual(content.example, undefined)
  })

  await t.test('uses .example field if has single top-level array example', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      },
      examples: [[{ hello: 'world' }]]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, [{ hello: 'world' }])
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level array examples', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      },
      examples: [[{ hello: 'world' }], [{ hello: 'universe' }]]
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.examples, {
      example1: { value: [{ hello: 'world' }] },
      example2: { value: [{ hello: 'universe' }] }
    })
    t.assert.strictEqual(content.example, undefined)
  })

  await t.test('uses .example field if has single nested string example', async t => {
    t.plan(9)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        flat: {
          type: 'string',
          examples: ['world']
        },
        deep: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              examples: ['universe']
            }
          }
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.flat.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.properties.field.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.flat.example, 'world')
    t.assert.deepStrictEqual(schema.properties.deep.properties.field.example, 'universe')
  })

  await t.test('uses .example field if has multiple nested numeric examples', async t => {
    t.plan(9)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        flat: {
          type: 'number',
          examples: [0, 1]
        },
        deep: {
          type: 'object',
          properties: {
            field: {
              type: 'number',
              examples: [1, 0]
            }
          }
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.flat.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.properties.field.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.flat.example, 0)
    t.assert.deepStrictEqual(schema.properties.deep.properties.field.example, 1)
  })

  await t.test('uses .example if has single nested array example', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'string'
        },
        examples: [['world', 'universe']]
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.items.examples, undefined)
    t.assert.deepStrictEqual(schema.items.example, ['world', 'universe'])
  })

  await t.test('uses .example if has multiple nested array examples', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'array',
      contains: {
        type: 'array',
        items: {
          type: 'string'
        },
        examples: [['world', 'universe'], ['world', 'universe']]
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.contains)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.contains.examples, undefined)
    t.assert.deepStrictEqual(schema.contains.example, ['world', 'universe'])
  })

  await t.test('uses .example if has single nested object example', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        deep: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          examples: [{ hello: 'world' }]
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.deep.example, { hello: 'world' })
  })

  await t.test('uses .example if has multiple nested object examples', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      properties: {
        deep: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          examples: [{ hello: 'world' }, { hello: 'universe' }]
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.requestBody.content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.deep.example, { hello: 'world' })
  })

  await t.test('resolves examples inside additionalProperties and preserves a property named examples', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      additionalProperties: {
        type: 'object',
        examples: [{ field: 'val', examples: 'prop-val' }],
        properties: {
          field: { type: 'string', examples: ['val'] },
          examples: { type: 'string', examples: ['prop-val'] }
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))
    t.assert.ok(true, 'valid openapi document')

    const addl = openapiObject.paths['/'].post.requestBody.content['application/json'].schema.additionalProperties
    t.assert.strictEqual(addl.examples, undefined)
    t.assert.deepStrictEqual(addl.example, { field: 'val', examples: 'prop-val' })
    t.assert.strictEqual(addl.properties.field.examples, undefined)
    t.assert.strictEqual(addl.properties.field.example, 'val')
    t.assert.strictEqual(addl.properties.examples.examples, undefined)
    t.assert.strictEqual(addl.properties.examples.example, 'prop-val')
  })

  await t.test('resolves examples inside patternProperties', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const body = {
      type: 'object',
      patternProperties: {
        '^x-': {
          type: 'string',
          examples: ['custom-a', 'custom-b']
        }
      }
    }
    fastify.post('/', { schema: { body } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))
    t.assert.ok(true, 'valid openapi document')

    const addl = openapiObject.paths['/'].post.requestBody.content['application/json'].schema.additionalProperties
    t.assert.strictEqual(addl.examples, undefined)
    t.assert.strictEqual(addl.example, 'custom-a')
    t.assert.strictEqual(openapiObject.paths['/'].post.requestBody.content['application/json'].schema.patternProperties, undefined)
  })

  await t.test('resolves examples inside tuple items, additionalItems, prefixItems, and untyped schemas', async t => {
    t.plan(9)
    const fastify = Fastify({ ajv: { customOptions: { strict: false } } })
    await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })
    const body = {
      prefixItems: [
        { type: 'string', examples: ['first'] }
      ],
      items: [
        { type: 'string', examples: ['tuple-0'] },
        { type: 'integer', examples: [42] }
      ],
      additionalItems: { type: 'boolean', examples: [true] },
      unevaluatedItems: { type: 'string', examples: ['extra-item'] }
    }
    fastify.post('/tuple31', { schema: { body } }, () => {})

    const fastify30 = Fastify({ ajv: { customOptions: { strict: false } } })
    await fastify30.register(fastifySwagger, openapiOption)
    fastify30.post('/tuple30', {
      schema: {
        body: {
          type: 'array',
          items: [
            { type: 'string', examples: ['tuple-0'] }
          ],
          additionalItems: { type: 'integer', examples: [7] },
          unevaluatedItems: { type: 'string', examples: ['extra-30'] }
        }
      }
    }, () => {})

    await fastify.ready()
    await fastify30.ready()

    const doc31 = fastify.swagger()
    const schema31 = doc31.paths['/tuple31'].post.requestBody.content['application/json'].schema
    t.assert.deepStrictEqual(schema31.prefixItems[0].examples, ['first'])
    t.assert.deepStrictEqual(schema31.items[0].examples, ['tuple-0'])
    t.assert.deepStrictEqual(schema31.additionalItems.examples, [true])
    t.assert.deepStrictEqual(schema31.unevaluatedItems.examples, ['extra-item'])

    const doc30 = fastify30.swagger()
    const schema30 = doc30.paths['/tuple30'].post.requestBody.content['application/json'].schema
    t.assert.strictEqual(schema30.items[0].example, 'tuple-0')
    t.assert.strictEqual(schema30.items[0].examples, undefined)
    t.assert.strictEqual(schema30.additionalItems.example, 7)
    t.assert.strictEqual(schema30.additionalItems.examples, undefined)
    t.assert.strictEqual(schema30.unevaluatedItems.example, 'extra-30')
  })

  await t.test('resolves examples inside combinators, conditionals, propertyNames, and dependencies without explicit type', async t => {
    t.plan(14)
    const fastify = Fastify({ ajv: { customOptions: { strict: false } } })
    await fastify.register(fastifySwagger, openapiOption)
    fastify.addSchema({
      $id: 'UnionShared',
      anyOf: [
        { type: 'object', additionalProperties: { type: 'string', examples: ['map-val'] } },
        { type: 'string', examples: ['shared-str'] }
      ]
    })
    const body = {
      allOf: [{ properties: { a: { type: 'string', examples: ['a1'] } } }],
      anyOf: [{ properties: { b: { type: 'integer', examples: [2] } } }],
      oneOf: [{ properties: { c: { type: 'boolean', examples: [true] } } }],
      not: { type: 'string', examples: ['forbidden'] },
      if: { properties: { kind: { type: 'string', examples: ['k'] } } },
      then: { properties: { val: { type: 'number', examples: [1.5] } } },
      else: { properties: { val: { type: 'string', examples: ['fallback'] } } },
      propertyNames: { type: 'string', examples: ['keyName'] },
      unevaluatedProperties: { type: 'string', examples: ['extra-prop'] },
      dependencies: {
        a: ['b'],
        kind: { properties: { extra: { type: 'string', examples: ['dep-val'] } } }
      },
      dependentSchemas: {
        b: { properties: { dep2: { type: 'string', examples: ['dep2-val'] } } }
      }
    }
    fastify.post('/', { schema: { body, response: { 200: { $ref: 'UnionShared#' } } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema
    const sharedSchema = openapiObject.components.schemas['def-0']

    t.assert.strictEqual(schema.allOf[0].properties.a.example, 'a1')
    t.assert.strictEqual(schema.anyOf[0].properties.b.example, 2)
    t.assert.strictEqual(schema.oneOf[0].properties.c.example, true)
    t.assert.strictEqual(schema.not.example, 'forbidden')
    t.assert.strictEqual(schema.if.properties.kind.example, 'k')
    t.assert.strictEqual(schema.then.properties.val.example, 1.5)
    t.assert.strictEqual(schema.else.properties.val.example, 'fallback')
    t.assert.strictEqual(schema.propertyNames.example, 'keyName')
    t.assert.strictEqual(schema.unevaluatedProperties.example, 'extra-prop')
    t.assert.deepStrictEqual(schema.dependencies.a, ['b'])
    t.assert.strictEqual(schema.dependencies.kind.properties.extra.example, 'dep-val')
    t.assert.strictEqual(schema.dependentSchemas.b.properties.dep2.example, 'dep2-val')
    t.assert.strictEqual(sharedSchema.anyOf[0].additionalProperties.example, 'map-val')
    t.assert.strictEqual(sharedSchema.anyOf[1].example, 'shared-str')
  })
})

test('response examples', async t => {
  await t.test('uses .example field if has single top-level string example', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'string',
      examples: ['hello']
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, 'hello')
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level string examples', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'string',
      examples: ['hello', 'world']
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.deepStrictEqual(content.examples, {
      hello: { value: 'hello' },
      world: { value: 'world' }
    })
  })

  await t.test('uses .example field if has single top-level numeric example', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'number',
      examples: [0]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, 0)
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level numeric examples', async t => {
    t.plan(4)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'number',
      examples: [0, 1]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.deepStrictEqual(content.examples, {
      0: { value: 0 },
      1: { value: 1 }
    })
  })

  await t.test('uses .example field if has single top-level object example', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      },
      examples: [{ hello: 'world' }]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, { hello: 'world' })
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level object examples', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        hello: {
          type: 'string'
        }
      },
      examples: [{ hello: 'world' }, { hello: 'universe' }]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.examples, {
      example1: { value: { hello: 'world' } },
      example2: { value: { hello: 'universe' } }
    })
    t.assert.strictEqual(content.example, undefined)
  })

  await t.test('uses .example field if has single top-level array example', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      },
      examples: [[{ hello: 'world' }]]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.example, [{ hello: 'world' }])
    t.assert.strictEqual(content.examples, undefined)
  })

  await t.test('uses .examples field if has multiple top-level array examples', async t => {
    t.plan(5)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      },
      examples: [[{ hello: 'world' }], [{ hello: 'universe' }]]
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.deepStrictEqual(content.examples, {
      example1: { value: [{ hello: 'world' }] },
      example2: { value: [{ hello: 'universe' }] }
    })
    t.assert.strictEqual(content.example, undefined)
  })

  await t.test('uses .example field if has single nested string example', async t => {
    t.plan(9)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        flat: {
          type: 'string',
          examples: ['world']
        },
        deep: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              examples: ['universe']
            }
          }
        }
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.flat.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.properties.field.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.flat.example, 'world')
    t.assert.deepStrictEqual(schema.properties.deep.properties.field.example, 'universe')
  })

  await t.test('uses .example field if has multiple nested numeric examples', async t => {
    t.plan(9)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        flat: {
          type: 'number',
          examples: [0, 1]
        },
        deep: {
          type: 'object',
          properties: {
            field: {
              type: 'number',
              examples: [1, 0]
            }
          }
        }
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.flat.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.properties.field.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.flat.example, 0)
    t.assert.deepStrictEqual(schema.properties.deep.properties.field.example, 1)
  })

  await t.test('uses .example if has single nested array example', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'array',
      items: {
        type: 'array',
        items: {
          type: 'string'
        },
        examples: [['world', 'universe']]
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.items)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.items.examples, undefined)
    t.assert.deepStrictEqual(schema.items.example, ['world', 'universe'])
  })

  await t.test('uses .example if has multiple nested array examples', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'array',
      contains: {
        type: 'array',
        items: {
          type: 'string'
        },
        examples: [['world', 'universe'], ['world', 'universe']]
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.contains)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.contains.examples, undefined)
    t.assert.deepStrictEqual(schema.contains.example, ['world', 'universe'])
  })

  await t.test('uses .example if has single nested object example', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        deep: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          examples: [{ hello: 'world' }]
        }
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.deep.example, { hello: 'world' })
  })

  await t.test('uses .example if has multiple nested object examples', async t => {
    t.plan(7)
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    const response = {
      type: 'object',
      properties: {
        deep: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          examples: [{ hello: 'world' }, { hello: 'universe' }]
        }
      }
    }
    fastify.post('/', { schema: { response: { 200: response } } }, () => {})
    await fastify.ready()
    const openapiObject = fastify.swagger()
    const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
    const schema = content.schema

    t.assert.ok(schema.properties)
    t.assert.strictEqual(schema.example, undefined)
    t.assert.strictEqual(schema.examples, undefined)
    t.assert.strictEqual(content.example, undefined)
    t.assert.strictEqual(content.examples, undefined)
    t.assert.strictEqual(schema.properties.deep.examples, undefined)
    t.assert.deepStrictEqual(schema.properties.deep.example, { hello: 'world' })
  })
})

test('copy example of body from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }]
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.assert.ok(schema)
  t.assert.ok(schema.properties)
  t.assert.strictEqual(schema.example, undefined)
  t.assert.deepStrictEqual(content.example, { hello: 'world' })
})

test('copy example of response from component to media', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const response = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }]
  }

  const opts = {
    schema: {
      response: { 200: response }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
  const schema = content.schema

  t.assert.ok(schema)
  t.assert.ok(schema.properties)
  t.assert.deepStrictEqual(content.example, { hello: 'world' })
})

test('copy example of parameters from component to media', async (t) => {
  t.plan(7)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const portSchema = {
    type: 'number',
    examples: [8080]
  }

  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'X-Port': portSchema
        }
      },
      querystring: {
        type: 'object',
        properties: {
          port: portSchema
        }
      },
      params: {
        type: 'object',
        properties: {
          port: portSchema
        }
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.assert.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const headerParam = paramsMap.get('header')
  t.assert.ok(headerParam)
  t.assert.deepStrictEqual(headerParam.example, 8080)

  const queryParam = paramsMap.get('query')
  t.assert.ok(queryParam)
  t.assert.deepStrictEqual(queryParam.example, 8080)

  const pathParam = paramsMap.get('path')
  t.assert.ok(pathParam)
  t.assert.deepStrictEqual(pathParam.example, 8080)
})

test('move examples of body from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }, { hello: 'lorem' }]
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.requestBody.content['application/json']
  const schema = content.schema

  t.assert.ok(schema)
  t.assert.ok(schema.properties)
  t.assert.strictEqual(schema.examples, undefined)
  t.assert.deepStrictEqual(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
})

test('move examples of response from component to media', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const response = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    },
    examples: [{ hello: 'world' }, { hello: 'lorem' }]
  }

  const opts = {
    schema: {
      response: { 200: response }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const content = openapiObject.paths['/'].post.responses['200'].content['application/json']
  const schema = content.schema

  t.assert.ok(schema)
  t.assert.ok(schema.properties)
  t.assert.strictEqual(schema.examples, undefined)
  t.assert.deepStrictEqual(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
})

test('move examples of parameters from component to media', async (t) => {
  t.plan(7)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const portSchema = {
    type: 'number',
    examples: [8080, 80]
  }

  const opts = {
    schema: {
      headers: {
        type: 'object',
        properties: {
          'X-Port': portSchema
        }
      },
      querystring: {
        type: 'object',
        properties: {
          port: portSchema
        }
      },
      params: {
        type: 'object',
        properties: {
          port: portSchema
        }
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.assert.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const expectedExamples = {
    80: { value: 80 },
    8080: { value: 8080 }
  }

  const headerParam = paramsMap.get('header')
  t.assert.ok(headerParam)
  t.assert.deepStrictEqual(headerParam.examples, expectedExamples)

  const queryParam = paramsMap.get('query')
  t.assert.ok(queryParam)
  t.assert.deepStrictEqual(queryParam.examples, expectedExamples)

  const pathParam = paramsMap.get('path')
  t.assert.ok(pathParam)
  t.assert.deepStrictEqual(pathParam.examples, expectedExamples)
})

test('marks request body as required', async (t) => {
  t.plan(4)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    required: ['hello'],
    properties: {
      hello: {
        type: 'string'
      }
    }
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()
  const openapiObject = fastify.swagger()
  const schema = openapiObject.paths['/'].post.requestBody.content['application/json'].schema
  const requestBody = openapiObject.paths['/'].post.requestBody

  t.assert.ok(schema)
  t.assert.ok(schema.properties)
  t.assert.deepStrictEqual(body.required, ['hello'])
  t.assert.deepStrictEqual(requestBody.required, true)
})

test('marks request body as required even when all properties are optional', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const body = {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
    }
  }

  const opts = {
    schema: {
      body
    }
  }

  fastify.put('/', opts, () => {})

  await fastify.ready()
  const openapiObject = fastify.swagger()
  const requestBody = openapiObject.paths['/'].put.requestBody

  t.assert.ok(requestBody)
  t.assert.strictEqual(requestBody.required, true)
  t.assert.ok(requestBody.content['application/json'].schema)
})

test('openapi webhooks properties', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiWebHookOption)

  const opts = {
    schema: {
      body: {
        type: 'object',
        properties: {
          hello: { type: 'string' },
          obj: {
            type: 'object',
            properties: {
              some: { type: 'string' }
            }
          }
        }
      }
    },
    webhooks: {
      newPet: {
        post: {
          requestBody: {
            description: 'Information about a new pet in the system',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Pet'
                }
              }
            }
          },
          responses: {
            200: {
              description:
                'Return a 200 status to indicate that the data was received successfully'
            }
          }
        }
      }
    }
  }

  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.webhooks, openapiWebHookOption.openapi.webhooks)
})

test('webhooks options for openapi 3.1.0 must valid format', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiWebHookOption)

  await fastify.ready()

  fastify.swagger()
  const openapiObject = fastify.swagger()
  t.assert.strictEqual(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.assert.ok(true, 'valid swagger object')
})

test('openapi 3.2.0: $self and tag summary, parent and kind are passed through', async (t) => {
  t.plan(3)
  const fastify = Fastify()

  const openapi32Option = {
    openapi: {
      openapi: '3.2.0',
      $self: 'https://example.com/openapi.json',
      info: {
        title: 'Test openapi 3.2',
        version: '1.0.0'
      },
      tags: [
        { name: 'products', summary: 'Products', kind: 'nav' },
        { name: 'books', summary: 'Books', parent: 'products', kind: 'nav' }
      ]
    }
  }

  await fastify.register(fastifySwagger, openapi32Option)

  fastify.get('/books', { schema: { tags: ['books'] } }, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual(openapiObject.openapi, '3.2.0')
  t.assert.strictEqual(openapiObject.$self, 'https://example.com/openapi.json')
  t.assert.deepStrictEqual(openapiObject.tags, openapi32Option.openapi.tags)
})

test('$self is not added when it is not configured', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.assert.strictEqual('$self' in openapiObject, false)
})

module.exports = { openapiOption }
