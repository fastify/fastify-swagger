'use strict'

const { test } = require('tap')
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
  t.equal(openapiObject.openapi, '3.0.3')
})

test('openapi version can be overridden', async (t) => {
  t.plan(1)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  t.equal(openapiObject.openapi, '3.1.0')
})

test('openapi should have default info properties', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, { openapi: {} })

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const pkg = readPackageJson()
  t.equal(openapiObject.info.title, pkg.name)
  t.equal(openapiObject.info.version, pkg.version)
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
  t.equal(openapiObject.info, openapiOption.openapi.info)
  t.equal(openapiObject.servers, openapiOption.openapi.servers)
  t.ok(openapiObject.paths)
  t.ok(openapiObject.paths['/'])
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
  t.same(openapiObject.components.schemas, openapiOption.openapi.components.schemas)
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
  t.same(openapiObject.paths, openapiOption.openapi.paths)
  delete openapiOption.openapi.paths // remove what we just added
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
  t.notOk(openapiObject.paths['/'])
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
  t.notOk(openapiObject.paths['/'])
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
  t.notOk(openapiObject.paths['/'])
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
  t.notOk(openapiObject.paths['/'])
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
  t.notOk(openapiObject.paths['/prefix/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
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
  t.notOk(openapiObject.paths.endpoint)
  t.notOk(openapiObject.paths['/endpoint'])
  t.ok(openapiObject.paths['/foo/endpoint'])
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
  t.notOk(openapiObject.paths['/foo/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
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
  t.notOk(openapiObject.paths['/foo/endpoint'])
  t.ok(openapiObject.paths['/endpoint'])
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
  t.throws(fastify.swagger)
})

test('cache - json', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger()
  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

test('cache - yaml', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  await fastify.ready()

  fastify.swagger({ yaml: true })
  const swaggerYaml = fastify.swagger({ yaml: true })
  t.equal(typeof swaggerYaml, 'string')
  yaml.parse(swaggerYaml)
  t.pass('valid swagger yaml')
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

  t.ok(schema)
  t.notOk(schema['x-examples'])
  t.same(content.examples, {
    'lorem ipsum': {
      summary: 'Roman statesman',
      value: { lorem: 'ipsum' }
    }
  })
})

test('parameter & header examples', async t => {
  t.test('uses .example if has single example', async t => {
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

    t.ok(parameters.every(({ example }) => example === 'world'))
    t.ok(parameters.every(param => !Object.prototype.hasOwnProperty.call(param, 'examples')))
  })

  t.test('uses .examples if has multiple examples', async t => {
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
    t.strictSame(examples, Array(3).fill({
      world: { value: 'world' },
      universe: { value: 'universe' }
    }))
    t.ok(parameters.every(param => !Object.prototype.hasOwnProperty.call(param, 'example')))
  })
})

test('request body examples', async t => {
  t.test('uses .example field if has single top-level string example', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, 'hello')
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level string examples', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.strictSame(content.examples, {
      hello: { value: 'hello' },
      world: { value: 'world' }
    })
  })

  t.test('uses .example field if has single top-level numeric example', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, 0)
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level numeric examples', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.strictSame(content.examples, {
      0: { value: 0 },
      1: { value: 1 }
    })
  })

  t.test('uses .example field if has single top-level object example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, { hello: 'world' })
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level object examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.examples, {
      example1: { value: { hello: 'world' } },
      example2: { value: { hello: 'universe' } }
    })
    t.notOk(content.example)
  })

  t.test('uses .example field if has single top-level array example', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, [{ hello: 'world' }])
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level array examples', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.examples, {
      example1: { value: [{ hello: 'world' }] },
      example2: { value: [{ hello: 'universe' }] }
    })
    t.notOk(content.example)
  })

  t.test('uses .example field if has single nested string example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.flat.examples)
    t.notOk(schema.properties.deep.properties.field.examples)
    t.strictSame(schema.properties.flat.example, 'world')
    t.strictSame(schema.properties.deep.properties.field.example, 'universe')
  })

  t.test('uses .example field if has multiple nested numeric examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.flat.examples)
    t.notOk(schema.properties.deep.properties.field.examples)
    t.strictSame(schema.properties.flat.example, 0)
    t.strictSame(schema.properties.deep.properties.field.example, 1)
  })

  t.test('uses .example if has single nested array example', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.items.examples)
    t.strictSame(schema.items.example, ['world', 'universe'])
  })

  t.test('uses .example if has multiple nested array examples', async t => {
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

    t.ok(schema.contains)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.contains.examples)
    t.strictSame(schema.contains.example, ['world', 'universe'])
  })

  t.test('uses .example if has single nested object example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.deep.examples)
    t.strictSame(schema.properties.deep.example, { hello: 'world' })
  })

  t.test('uses .example if has multiple nested object examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.deep.examples)
    t.strictSame(schema.properties.deep.example, { hello: 'world' })
  })
})

test('response examples', async t => {
  t.test('uses .example field if has single top-level string example', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, 'hello')
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level string examples', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.strictSame(content.examples, {
      hello: { value: 'hello' },
      world: { value: 'world' }
    })
  })

  t.test('uses .example field if has single top-level numeric example', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, 0)
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level numeric examples', async t => {
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

    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.strictSame(content.examples, {
      0: { value: 0 },
      1: { value: 1 }
    })
  })

  t.test('uses .example field if has single top-level object example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, { hello: 'world' })
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level object examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.examples, {
      example1: { value: { hello: 'world' } },
      example2: { value: { hello: 'universe' } }
    })
    t.notOk(content.example)
  })

  t.test('uses .example field if has single top-level array example', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.example, [{ hello: 'world' }])
    t.notOk(content.examples)
  })

  t.test('uses .examples field if has multiple top-level array examples', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.strictSame(content.examples, {
      example1: { value: [{ hello: 'world' }] },
      example2: { value: [{ hello: 'universe' }] }
    })
    t.notOk(content.example)
  })

  t.test('uses .example field if has single nested string example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.flat.examples)
    t.notOk(schema.properties.deep.properties.field.examples)
    t.strictSame(schema.properties.flat.example, 'world')
    t.strictSame(schema.properties.deep.properties.field.example, 'universe')
  })

  t.test('uses .example field if has multiple nested numeric examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.flat.examples)
    t.notOk(schema.properties.deep.properties.field.examples)
    t.strictSame(schema.properties.flat.example, 0)
    t.strictSame(schema.properties.deep.properties.field.example, 1)
  })

  t.test('uses .example if has single nested array example', async t => {
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

    t.ok(schema.items)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.items.examples)
    t.strictSame(schema.items.example, ['world', 'universe'])
  })

  t.test('uses .example if has multiple nested array examples', async t => {
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

    t.ok(schema.contains)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.contains.examples)
    t.strictSame(schema.contains.example, ['world', 'universe'])
  })

  t.test('uses .example if has single nested object example', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.deep.examples)
    t.strictSame(schema.properties.deep.example, { hello: 'world' })
  })

  t.test('uses .example if has multiple nested object examples', async t => {
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

    t.ok(schema.properties)
    t.notOk(schema.example)
    t.notOk(schema.examples)
    t.notOk(content.example)
    t.notOk(content.examples)
    t.notOk(schema.properties.deep.examples)
    t.strictSame(schema.properties.deep.example, { hello: 'world' })
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

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.example)
  t.same(content.example, { hello: 'world' })
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

  t.ok(schema)
  t.ok(schema.properties)
  t.same(content.example, { hello: 'world' })
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
        'X-Port': portSchema
      },
      querystring: {
        port: portSchema
      },
      params: {
        port: portSchema
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const headerParam = paramsMap.get('header')
  t.ok(headerParam)
  t.same(headerParam.example, 8080)

  const queryParam = paramsMap.get('query')
  t.ok(queryParam)
  t.same(queryParam.example, 8080)

  const pathParam = paramsMap.get('path')
  t.ok(pathParam)
  t.same(pathParam.example, 8080)
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

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.examples)
  t.same(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
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

  t.ok(schema)
  t.ok(schema.properties)
  t.notOk(schema.examples)
  t.same(content.examples, { example1: { value: { hello: 'world' } }, example2: { value: { hello: 'lorem' } } })
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
        'X-Port': portSchema
      },
      querystring: {
        port: portSchema
      },
      params: {
        port: portSchema
      }
    }
  }

  fastify.post('/:port', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const parameters = openapiObject.paths['/{port}'].post.parameters

  t.ok(parameters)

  const paramsMap = new Map(parameters.map(param => [param.in, param]))

  const expectedExamples = {
    80: { value: 80 },
    8080: { value: 8080 }
  }

  const headerParam = paramsMap.get('header')
  t.ok(headerParam)
  t.same(headerParam.examples, expectedExamples)

  const queryParam = paramsMap.get('query')
  t.ok(queryParam)
  t.same(queryParam.examples, expectedExamples)

  const pathParam = paramsMap.get('path')
  t.ok(pathParam)
  t.same(pathParam.examples, expectedExamples)
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

  t.ok(schema)
  t.ok(schema.properties)
  t.same(body.required, ['hello'])
  t.same(requestBody.required, true)
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
  t.equal(openapiObject.webhooks, openapiWebHookOption.openapi.webhooks)
})

test('webhooks options for openapi 3.1.0 must valid format', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiWebHookOption)

  await fastify.ready()

  fastify.swagger()
  const openapiObject = fastify.swagger()
  t.equal(typeof openapiObject, 'object')

  await Swagger.validate(openapiObject)
  t.pass('valid swagger object')
})

module.exports = { openapiOption }
