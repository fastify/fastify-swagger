'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')
const S = require('fluent-json-schema')
const {
  openapiOption,
  schemaAllOf
} = require('../../../examples/options')

test('support - oneOf, anyOf, allOf', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaAllOf, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)
  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [
    {
      required: false,
      in: 'query',
      name: 'foo',
      schema: {
        type: 'string'
      }
    }
  ])
})

test('support - oneOf, anyOf, allOf in headers', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  const schema = {
    schema: {
      headers: {
        allOf: [
          {
            type: 'object',
            properties: {
              foo: { type: 'string' }
            }
          }
        ]
      }
    }
  }
  fastify.get('/', schema, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()

  const api = await Swagger.validate(openapiObject)
  const definedPath = api.paths['/'].get
  t.ok(definedPath)
  t.same(definedPath.parameters, [
    {
      required: false,
      in: 'header',
      name: 'foo',
      schema: {
        type: 'string'
      }
    }
  ])
})

test('support 2xx response', async t => {
  const opt = {
    schema: {
      response: {
        '2XX': {
          type: 'object'
        },
        '3xx': {
          type: 'object'
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['2XX'].description, 'Default Response')
  t.same(definedPath.responses['3XX'].description, 'Default Response')
})

test('support multiple content types as response', async t => {
  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true,
    routePrefix: '/docs',
    exposeRoute: true
  })

  const opt = {
    schema: {
      response: {
        200: {
          description: 'Description and all status-code based properties are working',
          content: {
            'application/json': {
              schema: {
                name: { type: 'string' },
                image: { type: 'string' },
                address: { type: 'string' }
              }
            },
            'application/vnd.v1+json': {
              schema: {
                fullName: { type: 'string' },
                phone: { type: 'string' }
              }
            }
          }
        },
        '4xx': {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        300: {
          age: { type: 'number' }
        }
      }
    }
  }
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Description and all status-code based properties are working')
  t.strictSame(definedPath.responses['200'].content, {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' }, image: { type: 'string' }, address: { type: 'string' }
        }
      }
    },
    'application/vnd.v1+json': {
      schema: {
        type: 'object',
        properties: {
          fullName: { type: 'string' }, phone: { type: 'string' }
        }
      }
    }
  })
  t.same(definedPath.responses['4XX'].description, 'Default Response')
  t.strictSame(definedPath.responses['4XX'].content, {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }
  })
  t.strictSame(definedPath.responses[300].content, {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          age: { type: 'number' }
        }
      }
    }
  })
})

test('support status code 204', async t => {
  const opt = {
    schema: {
      response: {
        204: {
          type: 'null',
          description: 'No Content'
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['204'].description, 'No Content')
  t.notOk(definedPath.responses['204'].content)
})

test('support empty response body for different status than 204', async t => {
  const opt = {
    schema: {
      response: {
        204: {
          type: 'null',
          description: 'No Content'
        },
        503: {
          type: 'null',
          description: 'Service Unavailable'
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get

  t.same(definedPath.responses['204'].description, 'No Content')
  t.notOk(definedPath.responses['204'].content)

  t.same(definedPath.responses['503'].description, 'Service Unavailable')
  t.notOk(definedPath.responses['503'].content)
})

test('support response headers', async t => {
  const opt = {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {
              type: 'string'
            }
          },
          headers: {
            'X-WORLD': {
              type: 'string'
            },
            'X-DESCRIPTION': {
              description: 'Foo',
              type: 'string'
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].headers['X-WORLD'], {
    schema: {
      type: 'string'
    }
  })
  t.same(definedPath.responses['200'].headers['X-DESCRIPTION'], {
    description: 'Foo',
    schema: {
      type: 'string'
    }
  })
  t.notOk(definedPath.responses['200'].content['application/json'].schema.headers)
})

test('response: description and x-response-description', async () => {
  const description = 'description - always that of response body, sometimes also that of response as a whole'
  const responseDescription = 'description only for the response as a whole'

  test('description without x-response-description doubles as response description', async t => {
    // Given a /description endpoint with only a |description| field in its response schema
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    fastify.get('/description', {
      schema: {
        response: {
          200: {
            description,
            type: 'string'
          }
        }
      }
    }, () => {})
    await fastify.ready()

    // When the Swagger schema is generated
    const swaggerObject = fastify.swagger()
    const api = await Swagger.validate(swaggerObject)

    // Then the /description endpoint uses the |description| as both the description of the Response Object as well as of its Schema Object
    /** @type {import('openapi-types').OpenAPIV3.ResponseObject} */
    const responseObject = api.paths['/description'].get.responses['200']
    t.ok(responseObject)
    t.equal(responseObject.description, description)

    const schemaObject = responseObject.content['application/json'].schema
    t.ok(schemaObject)
    t.equal(schemaObject.description, description)
  })

  test('description alongside x-response-description only describes response body', async t => {
    // Given a /x-response-description endpoint that also has a |x-response-description| field in its response schema
    const fastify = Fastify()
    await fastify.register(fastifySwagger, openapiOption)
    fastify.get('/responseDescription', {
      schema: {
        response: {
          200: {
            'x-response-description': responseDescription,
            description,
            type: 'string'
          }
        }
      }
    }, () => {})
    await fastify.ready()

    // When the Swagger schema is generated
    const swaggerObject = fastify.swagger()
    const api = await Swagger.validate(swaggerObject)

    // Then the /responseDescription endpoint uses the |responseDescription| only for the Response Object and the |description| only for the Schema Object
    const responseObject = api.paths['/responseDescription'].get.responses['200']
    t.ok(responseObject)
    t.equal(responseObject.description, responseDescription)

    const schemaObject = responseObject.content['application/json'].schema
    t.ok(schemaObject)
    t.equal(schemaObject.description, description)
    t.equal(schemaObject.responseDescription, undefined)
  })
})

test('support default=null', async t => {
  const opt = {
    schema: {
      response: {
        '2XX': {
          type: 'string',
          nullable: true,
          default: null
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['2XX'].default, null)
})

test('support global schema reference', async t => {
  const schema = {
    type: 'object',
    properties: {
      hello: { type: 'string' }
    },
    required: ['hello']
  }
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: true })
  fastify.addSchema({ ...schema, $id: 'requiredUniqueSchema' })
  fastify.get('/', { schema: { query: { $ref: 'requiredUniqueSchema' } } }, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)
  t.match(api.components.schemas['def-0'], schema)
})

test('support global schema reference with title', async t => {
  const schema = {
    title: 'schema view title',
    type: 'object',
    properties: {
      hello: { type: 'string' }
    },
    required: ['hello']
  }
  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: true })
  fastify.addSchema({ ...schema, $id: 'requiredUniqueSchema' })
  fastify.get('/', { schema: { query: { $ref: 'requiredUniqueSchema' } } }, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)
  t.match(api.components.schemas['def-0'], schema)
})

test('support "default" parameter', async t => {
  const opt = {
    schema: {
      response: {
        200: {
          description: 'Expected Response',
          type: 'object',
          properties: {
            foo: {
              type: 'string'
            }
          }
        },
        default: {
          description: 'Default Response',
          type: 'object',
          properties: {
            bar: {
              type: 'string'
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get

  t.same(definedPath.responses.default, {
    description: 'Default Response',
    content: {
      'application/json': {
        schema: {
          description: 'Default Response',
          type: 'object',
          properties: {
            bar: {
              type: 'string'
            }
          }
        }
      }
    }
  })
})

test('fluent-json-schema', async t => {
  const opt = {
    schema: {
      response: {
        200: S.object()
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get
  t.same(definedPath.responses['200'].description, 'Default Response')
})

test('support "patternProperties" parameter', async t => {
  const opt = {
    schema: {
      response: {
        200: {
          description: 'Expected Response',
          type: 'object',
          properties: {
            foo: {
              type: 'object',
              patternProperties: {
                '^[a-z]{2,3}-[a-zA-Z]{2}$': {
                  type: 'string'
                }
              },
              additionalProperties: false
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get

  t.same(definedPath.responses[200], {
    description: 'Expected Response',
    content: {
      'application/json': {
        schema: {
          description: 'Expected Response',
          type: 'object',
          properties: {
            foo: {
              type: 'object',
              additionalProperties: { type: 'string' }
            }
          }
        }
      }
    }
  })
})

test('properly support "patternProperties" parameter', async t => {
  const opt = {
    schema: {
      response: {
        200: {
          description: 'Expected Response',
          type: 'object',
          properties: {
            foo: {
              type: 'object',
              patternProperties: {
                '^[a-z]{2,3}-[a-zA-Z]{2}$': {
                  type: 'object',
                  properties: {
                    foo: { type: 'number' }
                  }
                }
              },
              additionalProperties: false
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => { })

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].get

  t.same(definedPath.responses[200], {
    description: 'Expected Response',
    content: {
      'application/json': {
        schema: {
          description: 'Expected Response',
          type: 'object',
          properties: {
            foo: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  foo: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  })
})

test('support "const" keyword', async t => {
  const opt = {
    schema: {
      body: {
        type: 'object',
        properties: {
          obj: {
            type: 'object',
            properties: {
              constantProp: { const: 'my-const' },
              constantPropZero: { const: 0 },
              constantPropNull: { const: null },
              constantPropFalse: { const: false },
              constantPropEmptyString: { const: '' }
            }
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/', opt, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.same(definedPath.requestBody, {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            obj: {
              type: 'object',
              properties: {
                constantProp: {
                  enum: ['my-const']
                },
                constantPropZero: {
                  enum: [0]
                },
                constantPropNull: {
                  enum: [null]
                },
                constantPropFalse: {
                  enum: [false]
                },
                constantPropEmptyString: {
                  enum: ['']
                }
              }
            }
          }
        }
      }
    }
  })
})

test('support object properties named "const"', async t => {
  const opt = {
    schema: {
      body: {
        type: 'object',
        properties: {
          obj: {
            type: 'object',
            properties: {
              const: { type: 'string' }
            },
            required: ['const']
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.same(definedPath.requestBody, {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            obj: {
              type: 'object',
              properties: {
                const: {
                  type: 'string'
                }
              },
              required: ['const']
            }
          }
        }
      }
    }
  })
})

test('support object properties with special names', async t => {
  const opt = {
    schema: {
      body: {
        type: 'object',
        properties: {
          obj: {
            type: 'object',
            properties: {
              properties: {
                type: 'string'
              },
              patternProperties: {
                type: 'string'
              },
              additionalProperties: {
                type: 'number'
              }
            },
            required: ['const', 'patternProperties', 'additionalProperties']
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.same(definedPath.requestBody, {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            obj: {
              type: 'object',
              properties: {
                properties: {
                  type: 'string'
                },
                patternProperties: {
                  type: 'string'
                },
                additionalProperties: {
                  type: 'number'
                }
              },
              required: ['const', 'patternProperties', 'additionalProperties']
            }
          }
        }
      }
    }
  })
})

test('support "description" keyword', async t => {
  const opt = {
    schema: {
      body: {
        type: 'object',
        description: 'Body description',
        properties: {
          foo: {
            type: 'number'
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.same(definedPath.requestBody, {
    description: 'Body description',
    content: {
      'application/json': {
        schema: {
          description: 'Body description',
          type: 'object',
          properties: {
            foo: {
              type: 'number'
            }
          }
        }
      }
    }
  })
})

test('support query serialization params', async t => {
  const opt = {
    schema: {
      querystring: {
        style: 'deepObject',
        explode: false,
        type: 'object',
        allowReserved: true,
        properties: {
          obj: {
            type: 'string'
          }
        }
      }
    }
  }

  const fastify = Fastify({
    ajv: {
      plugins: [
        function (ajv) {
          ajv.addKeyword({ keyword: 'style' })
          ajv.addKeyword({ keyword: 'explode' })
          ajv.addKeyword({ keyword: 'allowReserved' })
        }
      ]
    }
  })
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/', opt, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)
  t.equal(api.paths['/'].get.parameters[0].style, 'deepObject')
  t.equal(api.paths['/'].get.parameters[0].explode, false)
  t.equal(api.paths['/'].get.parameters[0].allowReserved, true)
})

test('add default properties for url params when missing schema', async t => {
  const opt = {}

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.get('/:userId', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/{userId}'].get

  t.strictSame(definedPath.parameters[0], {
    in: 'path',
    name: 'userId',
    required: true,
    schema: {
      type: 'string'
    }
  })
})

test('add default properties for url params when missing schema.params', async t => {
  const opt = {
    schema: {
      body: {
        type: 'object',
        properties: {
          bio: {
            type: 'string'
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/:userId', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/{userId}'].post

  t.strictSame(definedPath.parameters[0], {
    in: 'path',
    name: 'userId',
    required: true,
    schema: {
      type: 'string'
    }
  })
  t.strictSame(definedPath.requestBody.content['application/json'].schema.properties, {
    bio: {
      type: 'string'
    }
  })
})

test('avoid overwriting params when schema.params is provided', async t => {
  const opt = {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          bio: {
            type: 'string'
          }
        }
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true
  })
  fastify.post('/:userId', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const definedPath = swaggerObject.paths['/{userId}'].post

  t.strictSame(definedPath.parameters[0], {
    in: 'path',
    name: 'id',
    required: true,
    schema: {
      type: 'string'
    }
  })
  t.strictSame(definedPath.requestBody.content['application/json'].schema.properties, {
    bio: {
      type: 'string'
    }
  })
})
