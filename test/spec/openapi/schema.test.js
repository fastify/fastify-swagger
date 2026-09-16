'use strict'

const { test } = require('node:test')
const Fastify = require('fastify')
const Swagger = require('@apidevtools/swagger-parser')
const fastifySwagger = require('../../../index')
const S = require('fluent-json-schema')
const {
  openapiOption,
  schemaAllOf
} = require('../../../examples/options')

test('support file in json schema', async t => {
  const opts = {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: {
            description: 'a file',
            type: 'string',
            contentEncoding: 'binary'
          }
        },
        required: ['file']
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, openapiOption)
  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)

  const definedPath = api.paths['/'].post
  t.assert.ok(definedPath)
  t.assert.deepStrictEqual(
    definedPath.requestBody.content['multipart/form-data'].schema.properties.file,
    {
      description: 'a file',
      type: 'string',
      format: 'binary'
    }
  )
})

test('support base64 contentEncoding in json schema', async t => {
  const opts = {
    schema: {
      consumes: ['multipart/form-data'],
      body: {
        type: 'object',
        properties: {
          file: {
            description: 'a base64 file',
            type: 'string',
            contentEncoding: 'base64'
          }
        },
        required: ['file']
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, openapiOption)
  fastify.post('/', opts, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)

  const definedPath = api.paths['/'].post
  t.assert.ok(definedPath)
  t.assert.deepStrictEqual(
    definedPath.requestBody.content['multipart/form-data'].schema.properties.file,
    {
      description: 'a base64 file',
      type: 'string',
      format: 'byte'
    }
  )
})

test('support - oneOf, anyOf, allOf', async (t) => {
  t.plan(2)
  const fastify = Fastify()

  await fastify.register(fastifySwagger, openapiOption)

  fastify.get('/', schemaAllOf, () => {})

  await fastify.ready()

  const openapiObject = fastify.swagger()
  const api = await Swagger.validate(openapiObject)
  const definedPath = api.paths['/'].get
  t.assert.ok(definedPath)
  t.assert.deepStrictEqual(definedPath.parameters, [
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
  t.assert.ok(definedPath)
  t.assert.deepStrictEqual(definedPath.parameters, [
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
  t.assert.deepStrictEqual(definedPath.responses['2XX'].description, 'Default Response')
  t.assert.deepStrictEqual(definedPath.responses['3XX'].description, 'Default Response')
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
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  image: { type: 'string' },
                  address: { type: 'string' }
                }
              }
            },
            'application/vnd.v1+json': {
              schema: {
                type: 'object',
                properties: {
                  fullName: { type: 'string' },
                  phone: { type: 'string' }
                }
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
          type: 'object',
          properties: {
            age: { type: 'number' }
          }
        }
      }
    }
  }
  fastify.get('/', opt, () => {})

  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].get
  t.assert.deepStrictEqual(definedPath.responses['200'].description, 'Description and all status-code based properties are working')
  t.assert.deepStrictEqual(definedPath.responses['200'].content, {
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
  t.assert.deepStrictEqual(definedPath.responses['4XX'].description, 'Default Response')
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.responses['4XX'].content)), {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      }
    }
  })
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.responses[300].content)), {
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
  t.assert.deepStrictEqual(definedPath.responses['204'].description, 'No Content')
  t.assert.strictEqual(definedPath.responses['204'].content, undefined)
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

  t.assert.deepStrictEqual(definedPath.responses['204'].description, 'No Content')
  t.assert.strictEqual(definedPath.responses['204'].content, undefined)

  t.assert.deepStrictEqual(definedPath.responses['503'].description, 'Service Unavailable')
  t.assert.strictEqual(definedPath.responses['503'].content, undefined)
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
  t.assert.deepStrictEqual(definedPath.responses['200'].headers['X-WORLD'], {
    schema: {
      type: 'string'
    }
  })
  t.assert.deepStrictEqual(definedPath.responses['200'].headers['X-DESCRIPTION'], {
    description: 'Foo',
    schema: {
      type: 'string'
    }
  })
  t.assert.strictEqual(definedPath.responses['200'].content['application/json'].schema.headers, undefined)
})

test('response: description and x-response-description', async () => {
  const description = 'description - always that of response body, sometimes also that of response as a whole'
  const responseDescription = 'description only for the response as a whole'

  await test('description without x-response-description doubles as response description', async t => {
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
    t.assert.ok(responseObject)
    t.assert.strictEqual(responseObject.description, description)

    const schemaObject = responseObject.content['application/json'].schema
    t.assert.ok(schemaObject)
    t.assert.strictEqual(schemaObject.description, description)
  })

  await test('description alongside x-response-description only describes response body', async t => {
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
    t.assert.ok(responseObject)
    t.assert.strictEqual(responseObject.description, responseDescription)

    const schemaObject = responseObject.content['application/json'].schema
    t.assert.ok(schemaObject)
    t.assert.strictEqual(schemaObject.description, description)
    t.assert.strictEqual(schemaObject.responseDescription, undefined)
  })

  await test('retrieve the response description from its given $ref schema', async t => {
    // Given a /description endpoint that also has a |description| field in its response referenced schema
    const fastify = Fastify()
    fastify.addSchema({
      $id: 'my-ref',
      description,
      type: 'string'
    })

    await fastify.register(fastifySwagger, openapiOption)
    fastify.get('/description', {
      schema: {
        response: {
          200: {
            $ref: 'my-ref#'
          }
        }
      }
    }, () => {})
    await fastify.ready()

    // When the Swagger schema is generated
    const swaggerObject = fastify.swagger()
    const api = await Swagger.validate(swaggerObject)

    const responseObject = api.paths['/description'].get.responses['200']
    t.assert.ok(responseObject)
    t.assert.strictEqual(responseObject.description, description)

    const schemaObject = responseObject.content['application/json'].schema
    t.assert.ok(schemaObject)
    t.assert.strictEqual(schemaObject.description, description)
    t.assert.strictEqual(schemaObject.responseDescription, undefined)
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
  t.assert.deepStrictEqual(definedPath.responses['2XX'].default, undefined)
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
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(api.components.schemas['def-0'])), { ...schema, title: 'requiredUniqueSchema' })
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
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(api.components.schemas['def-0'])), schema)
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

  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.responses.default)), {
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
  t.assert.deepStrictEqual(definedPath.responses['200'].description, 'Default Response')
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

  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.responses[200])), {
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

  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.responses[200])), {
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
    openapi: {
      openapi: '3.1.0',
    },
    convertConstToEnum: false
  })
  fastify.post('/', opt, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.requestBody)), {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            obj: {
              type: 'object',
              properties: {
                constantProp: {
                  const: 'my-const'
                },
                constantPropZero: {
                  const: 0
                },
                constantPropNull: {
                  const: null
                },
                constantPropFalse: {
                  const: false
                },
                constantPropEmptyString: {
                  const: ''
                }
              }
            }
          }
        }
      }
    }
  })
})

test('convert "const" to "enum"', async t => {
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
    openapi: true,
    // Default is true
    // convertConstToEnum: true
  })
  fastify.post('/', opt, () => {})
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.requestBody)), {
    required: true,
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
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.requestBody)), {
    required: true,
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
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.requestBody)), {
    required: true,
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
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(definedPath.requestBody)), {
    required: true,
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
  t.assert.strictEqual(api.paths['/'].get.parameters[0].style, 'deepObject')
  t.assert.strictEqual(api.paths['/'].get.parameters[0].explode, false)
  t.assert.strictEqual(api.paths['/'].get.parameters[0].allowReserved, true)
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

  t.assert.deepStrictEqual(definedPath.parameters[0], {
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

  t.assert.deepStrictEqual(definedPath.parameters[0], {
    in: 'path',
    name: 'userId',
    required: true,
    schema: {
      type: 'string'
    }
  })
  t.assert.deepStrictEqual(definedPath.requestBody.content['application/json'].schema.properties, {
    bio: {
      type: 'string'
    }
  })
})

test('support custom transforms which returns $ref in the response', async t => {
  const customObject = {}
  const opt = {
    schema: {
      response: {
        200: customObject
      }
    }
  }

  const fastify = Fastify()
  await fastify.register(fastifySwagger, {
    openapi: true,
    transform: ({ schema, ...rest }) => {
      schema.response['200'] = {
        $ref: '#/components/schemas/CustomObject'
      }
      return {
        schema,
        ...rest
      }
    },
    transformObject: ({ openapiObject }) => {
      openapiObject.components.schemas.CustomObject = {
        type: 'object',
        properties: {
          hello: {
            type: 'string'
          }
        }
      }
      return openapiObject
    }
  })
  fastify.post('/', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()

  const swaggerPath = swaggerObject.paths['/'].post
  t.assert.deepStrictEqual(JSON.parse(JSON.stringify(swaggerPath.responses['200'].content['application/json'].schema)), {
    $ref: '#/components/schemas/CustomObject'
  })

  // validate seems to mutate the swaggerPath object
  const api = await Swagger.validate(swaggerObject)
  const definedPath = api.paths['/'].post
  t.assert.deepStrictEqual(definedPath.responses['200'].content['application/json'].schema, {
    type: 'object',
    properties: {
      hello: {
        type: 'string'
      }
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

  t.assert.deepStrictEqual(definedPath.parameters[0], {
    in: 'path',
    name: 'id',
    required: true,
    schema: {
      type: 'string'
    }
  })
  t.assert.deepStrictEqual(definedPath.requestBody.content['application/json'].schema.properties, {
    bio: {
      type: 'string'
    }
  })
})

test('support multiple content types as request', async t => {
  const opt = {
    schema: {
      body: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                jsonProperty: {
                  type: 'string'
                }
              }
            }
          },
          'application/xml': {
            schema: {
              type: 'object',
              properties: {
                xmlProperty: {
                  type: 'string'
                }
              }
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
  fastify.post('/', opt, () => { })
  await fastify.ready()

  const swaggerObject = fastify.swagger()
  const api = await Swagger.validate(swaggerObject)

  const definedPath = api.paths['/'].post
  t.assert.deepStrictEqual(definedPath.requestBody, {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            jsonProperty: {
              type: 'string'
            }
          }
        }
      },
      'application/xml': {
        schema: {
          type: 'object',
          properties: {
            xmlProperty: {
              type: 'string'
            }
          }
        }
      }
    }
  })
})

test('support callbacks', async () => {
  await test('includes callbacks in openapiObject', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Some event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  }
                }
              },
              myOtherEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    responses: {
                      200: {
                        description: 'Success'
                      },
                      500: {
                        description: 'Error'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.strictEqual(typeof openapiObject.paths['/subscribe'].post.callbacks, 'object')

    const definedPath = openapiObject.paths['/subscribe'].post.callbacks

    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/callbackUrl}'].post.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'Some event happened'
        }
      }
    )

    t.assert.deepStrictEqual(
      definedPath.myOtherEvent['{$request.body#/callbackUrl}'].post.requestBody,
      undefined
    )

    await Swagger.validate(openapiObject)
  })

  await test('sets callback response default if not included', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Some event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.strictEqual(typeof openapiObject.paths['/subscribe'].post.callbacks, 'object')

    const definedPath = openapiObject.paths['/subscribe'].post

    t.assert.strictEqual(
      definedPath.callbacks.myEvent['{$request.body#/callbackUrl}'].post
        .responses['2XX'].description,
      'Default Response'
    )

    await Swagger.validate(openapiObject)
  })

  await test('skips callbacks if event is badly formatted', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: null
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.deepStrictEqual(openapiObject.paths['/subscribe'].post.callbacks, {})

    await Swagger.validate(openapiObject)
  })

  await test('skips callback if callbackUrl is badly formatted', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Some event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  }
                }
              },
              myOtherEvent: {
                '{$request.body#/callbackUrl}': null
              }
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.strictEqual(typeof openapiObject.paths['/subscribe'].post.callbacks, 'object')
    t.assert.ok(Object.keys(openapiObject.paths['/subscribe'].post.callbacks).includes('myEvent'))

    const definedPath = openapiObject.paths['/subscribe'].post.callbacks

    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/callbackUrl}'].post.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'Some event happened'
        }
      }
    )

    await Swagger.validate(openapiObject)
  })

  await test('skips callback if method is badly formatted', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Some event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  }
                }
              },
              myOtherEvent: {
                '{$request.body#/callbackUrl}': {
                  post: null
                }
              }
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.strictEqual(typeof openapiObject.paths['/subscribe'].post.callbacks, 'object')
    t.assert.ok(Object.keys(openapiObject.paths['/subscribe'].post.callbacks).includes('myEvent'))

    const definedPath = openapiObject.paths['/subscribe'].post.callbacks

    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/callbackUrl}'].post.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'Some event happened'
        }
      }
    )

    await Swagger.validate(openapiObject)
  })

  await test('supports multiple callbackUrls and httpMethods in openapiObject', async t => {
    const fastify = Fastify()

    await fastify.register(fastifySwagger, openapiOption)
    fastify.register(async (instance) => {
      instance.post(
        '/subscribe',
        {
          schema: {
            body: {
              $id: 'Subscription',
              type: 'object',
              properties: {
                callbackUrl: {
                  type: 'string',
                  examples: ['https://example.com']
                }
              }
            },
            response: {
              200: {
                $id: 'Subscription',
                type: 'object',
                properties: {
                  callbackUrl: {
                    type: 'string',
                    examples: ['https://example.com']
                  }
                }
              }
            },
            callbacks: {
              myEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Some event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  }
                },
                '{$request.body#/anotherUrl}': {
                  post: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'Another event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  },
                  put: {
                    requestBody: {
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {
                              message: {
                                type: 'string',
                                example: 'PUT event happened'
                              }
                            },
                            required: ['message']
                          }
                        }
                      }
                    },
                    responses: {
                      200: {
                        description: 'Success'
                      }
                    }
                  }
                }
              },
              myOtherEvent: {
                '{$request.body#/callbackUrl}': {
                  post: {
                    responses: {
                      200: {
                        description: 'Success'
                      },
                      500: {
                        description: 'Error'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        () => {}
      )
    })

    await fastify.ready()

    const openapiObject = fastify.swagger()

    t.assert.strictEqual(typeof openapiObject, 'object')
    t.assert.strictEqual(typeof openapiObject.paths['/subscribe'].post.callbacks, 'object')

    const definedPath = openapiObject.paths['/subscribe'].post.callbacks

    // First Event->First URL->First Method
    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/callbackUrl}'].post.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'Some event happened'
        }
      }
    )

    // First Event->Second URL->First Method
    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/anotherUrl}'].post.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'Another event happened'
        }
      }
    )

    // First Event->Second URL->Second Method
    t.assert.deepStrictEqual(
      definedPath.myEvent['{$request.body#/anotherUrl}'].put.requestBody
        .content['application/json'].schema.properties,
      {
        message: {
          type: 'string',
          example: 'PUT event happened'
        }
      }
    )

    // Second Event
    t.assert.deepStrictEqual(
      definedPath.myOtherEvent['{$request.body#/callbackUrl}'].post.requestBody,
      undefined
    )

    await Swagger.validate(openapiObject)
  })

  await test('should preserve original headers schema across multiple responses', async t => {
    const headersSchema = {
      'X-DESCRIPTION': {
        type: 'string',
        description: 'Foo',
      },
    }

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
            headers: headersSchema
          },
          201: {
            type: 'object',
            properties: {
              hello: {
                type: 'string'
              }
            },
            headers: headersSchema
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

    t.assert.deepStrictEqual(definedPath.responses['200'].headers['X-DESCRIPTION'], {
      description: 'Foo',
      schema: {
        type: 'string'
      }
    })
    t.assert.strictEqual(definedPath.responses['200'].content['application/json'].schema.headers, undefined)
    t.assert.deepStrictEqual(definedPath.responses['201'].headers['X-DESCRIPTION'], {
      description: 'Foo',
      schema: {
        type: 'string'
      }
    })
    t.assert.strictEqual(definedPath.responses['201'].content['application/json'].schema.headers, undefined)
  })
})

// OpenAPI 3.0.3: `nullable` only applies to the `type` defined in the same
// Schema Object, so the schema accepting nothing but `null` is a nullable type
// restricted to `enum: [null]`.
const nullSchema = { type: 'object', nullable: true, enum: [null] }

test('openapi 3.0: `type: null` is converted to `nullable: true`', async (t) => {
  const cases = [
    {
      name: 'anyOf with null member',
      input: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      expected: { type: 'string', nullable: true }
    },
    {
      name: 'oneOf with null member keeps sibling keywords',
      input: { description: 'maybe', oneOf: [{ type: 'string' }, { type: 'null' }] },
      expected: { description: 'maybe', type: 'string', nullable: true }
    },
    {
      name: 'anyOf with several non-null members',
      input: { anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'null' }] },
      expected: { anyOf: [{ type: 'string' }, { type: 'number' }, nullSchema] }
    },
    {
      name: 'anyOf with null member and a member already marked nullable (#594)',
      input: { anyOf: [{ type: 'null' }, { type: 'string', format: 'date-time', nullable: true }] },
      expected: { type: 'string', format: 'date-time', nullable: true }
    },
    {
      name: 'multiple types without null (#861)',
      input: { description: 'id', type: ['string', 'number'] },
      expected: { description: 'id', anyOf: [{ type: 'string' }, { type: 'number' }] }
    },
    {
      name: 'single type in the array form',
      input: { type: ['string'] },
      expected: { type: 'string' }
    },
    {
      name: 'anyOf with a $ref member is not collapsed',
      input: { anyOf: [{ $ref: 'Item#' }, { type: 'null' }] },
      expected: { anyOf: [{ $ref: '#/components/schemas/def-0' }, nullSchema] }
    },
    {
      name: 'type array with null',
      input: { type: ['string', 'null'] },
      expected: { type: 'string', nullable: true }
    },
    {
      name: 'type array with several types and null',
      input: { type: ['string', 'number', 'null'] },
      expected: { anyOf: [{ type: 'string' }, { type: 'number' }, nullSchema] }
    },
    {
      name: 'type array with only null',
      input: { type: ['null'] },
      expected: nullSchema
    },
    {
      name: 'type null',
      input: { type: 'null' },
      expected: nullSchema
    },
    {
      name: 'nested in array items',
      input: { type: 'array', items: { type: ['integer', 'null'] } },
      expected: { type: 'array', items: { type: 'integer', nullable: true } }
    }
  ]

  t.plan(cases.length * 3)

  for (const { name, input, expected } of cases) {
    const fastify = Fastify()
    fastify.addSchema({ $id: 'Item', type: 'object', properties: { id: { type: 'integer' } } })
    await fastify.register(fastifySwagger, { openapi: { openapi: '3.0.3' } })

    fastify.post('/', {
      schema: {
        body: { type: 'object', properties: { value: input } },
        response: { 200: { type: 'object', properties: { value: input } } }
      }
    }, () => ({}))

    await fastify.ready()

    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))

    const body = openapiObject.paths['/'].post.requestBody.content['application/json'].schema.properties.value
    const response = openapiObject.paths['/'].post.responses['200'].content['application/json'].schema.properties.value

    t.assert.ok(true, `${name}: valid document`)
    t.assert.deepStrictEqual(body, expected, `${name}: body`)
    t.assert.deepStrictEqual(response, expected, `${name}: response`)
  }
})

test('openapi 3.0 is the default: `type: null` is converted when no version is set', async (t) => {
  const options = [
    { openapi: true },
    { openapi: {} }
  ]

  t.plan(options.length * 3)

  for (const option of options) {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, option)

    fastify.post('/', {
      schema: { response: { 200: { type: 'object', properties: { value: { type: ['string', 'null'] } } } } }
    }, () => ({}))

    await fastify.ready()

    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))

    const value = openapiObject.paths['/'].post.responses['200'].content['application/json'].schema.properties.value

    t.assert.strictEqual(openapiObject.openapi, '3.0.3')
    t.assert.ok(true, 'valid document')
    t.assert.deepStrictEqual(value, { type: 'string', nullable: true })
  }
})

test('openapi 3.1: `type: null` is kept as is', async (t) => {
  const cases = [
    { anyOf: [{ type: 'string' }, { type: 'null' }] },
    { type: ['string', 'null'] },
    { type: 'null' }
  ]

  t.plan(cases.length * 2)

  for (const input of cases) {
    const fastify = Fastify()
    await fastify.register(fastifySwagger, { openapi: { openapi: '3.1.0' } })

    fastify.post('/', {
      schema: { response: { 200: { type: 'object', properties: { value: input } } } }
    }, () => ({}))

    await fastify.ready()

    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))

    const value = openapiObject.paths['/'].post.responses['200'].content['application/json'].schema.properties.value

    t.assert.ok(true, 'valid document')
    t.assert.strictEqual('nullable' in value, false)
  }
})

test('openapi 3.0: `type: null` conversion does not lose sibling keywords', async (t) => {
  const cases = [
    {
      name: 'member is not collapsed when it would overwrite keywords of the parent',
      input: {
        type: 'object',
        properties: { a: { type: 'string' } },
        anyOf: [{ properties: { b: { type: 'string' } }, required: ['b'] }, { type: 'null' }]
      },
      expected: {
        type: 'object',
        properties: { a: { type: 'string' } },
        anyOf: [{ properties: { b: { type: 'string' } }, required: ['b'] }, nullSchema]
      }
    },
    {
      name: 'description of the parent is not replaced by the one of the member',
      input: { description: 'outer', anyOf: [{ type: 'string', description: 'inner' }, { type: 'null' }] },
      expected: { description: 'outer', anyOf: [{ type: 'string', description: 'inner' }, nullSchema] }
    },
    {
      name: 'member with `nullable: false` cannot undo the conversion',
      input: { anyOf: [{ type: 'string', nullable: false }, { type: 'null' }] },
      expected: { type: 'string', nullable: true }
    },
    {
      name: 'type array does not overwrite an existing anyOf',
      input: { type: ['string', 'number', 'null'], anyOf: [{ minLength: 1 }, { minimum: 1 }] },
      expected: {
        anyOf: [{ minLength: 1 }, { minimum: 1 }],
        allOf: [{ anyOf: [{ type: 'string' }, { type: 'number' }, nullSchema] }]
      }
    },
    {
      name: 'type array is appended to an existing allOf',
      input: { type: ['string', 'number', 'null'], allOf: [{ description: 'first' }], anyOf: [{ minLength: 1 }, { minimum: 1 }] },
      expected: {
        anyOf: [{ minLength: 1 }, { minimum: 1 }],
        allOf: [{ description: 'first' }, { anyOf: [{ type: 'string' }, { type: 'number' }, nullSchema] }]
      }
    },
    {
      name: 'anyOf and oneOf both with a null member',
      input: { anyOf: [{ type: 'string' }, { type: 'null' }], oneOf: [{ type: 'number' }, { type: 'null' }] },
      expected: { type: 'string', nullable: true, oneOf: [{ type: 'number' }, nullSchema] }
    },
    {
      name: 'null member with annotations is removed',
      input: { anyOf: [{ type: 'string' }, { type: 'null', title: 'Nothing', description: 'no value', 'x-internal': true }] },
      expected: { type: 'string', nullable: true }
    },
    {
      name: 'anyOf with only null members',
      input: { anyOf: [{ type: 'null' }] },
      expected: { anyOf: [nullSchema] }
    },
    {
      name: 'member without a type is not collapsed, `nullable` would have no effect',
      input: { anyOf: [{ enum: ['a', 'b'] }, { type: 'null' }] },
      expected: { anyOf: [{ enum: ['a', 'b'] }, nullSchema] }
    },
    {
      name: 'null member keeps its annotations when it is not collapsed',
      input: { oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'null', title: 'Nothing' }] },
      expected: { oneOf: [{ type: 'string' }, { type: 'number' }, { ...nullSchema, title: 'Nothing' }] }
    }
  ]

  t.plan(cases.length * 2)

  for (const { name, input, expected } of cases) {
    // `x-` extensions are unknown keywords for Ajv in strict mode
    const fastify = Fastify({ ajv: { customOptions: { strictSchema: false } } })
    await fastify.register(fastifySwagger, { openapi: { openapi: '3.0.3' } })

    fastify.post('/', {
      schema: { body: { type: 'object', properties: { value: input } } }
    }, () => ({}))

    await fastify.ready()

    const openapiObject = fastify.swagger()
    await Swagger.validate(structuredClone(openapiObject))

    const body = openapiObject.paths['/'].post.requestBody.content['application/json'].schema.properties.value

    t.assert.ok(true, `${name}: valid document`)
    t.assert.deepStrictEqual(body, expected, name)
  }
})

test('openapi 3.0: `type: null` is converted in shared schemas', async (t) => {
  t.plan(3)

  const fastify = Fastify()
  fastify.addSchema({
    $id: 'Item',
    type: 'object',
    properties: {
      name: { type: ['string', 'null'] },
      deletedAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] }
    }
  })
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      components: {
        schemas: {
          Custom: { type: 'object', properties: { note: { type: ['string', 'null'] } } }
        }
      }
    }
  })

  fastify.get('/', { schema: { response: { 200: { $ref: 'Item#' } } } }, () => ({}))

  await fastify.ready()

  const openapiObject = fastify.swagger()
  await Swagger.validate(structuredClone(openapiObject))
  t.assert.ok(true, 'valid document')

  t.assert.deepStrictEqual(openapiObject.components.schemas['def-0'].properties, {
    name: { type: 'string', nullable: true },
    deletedAt: { type: 'string', format: 'date-time', nullable: true }
  })
  t.assert.deepStrictEqual(openapiObject.components.schemas.Custom.properties, {
    note: { type: 'string', nullable: true }
  })
})

test('openapi 3.0: `type: null` is converted in parameters', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: { openapi: '3.0.3' } })

  const nullableString = { type: ['string', 'null'] }
  fastify.get('/:id', {
    schema: {
      params: { type: 'object', properties: { id: nullableString } },
      querystring: { type: 'object', properties: { filter: { anyOf: [{ type: 'string' }, { type: 'null' }] } } },
      headers: { type: 'object', properties: { 'x-trace': nullableString } }
    }
  }, () => ({}))

  await fastify.ready()

  const openapiObject = fastify.swagger()
  await Swagger.validate(structuredClone(openapiObject))
  t.assert.ok(true, 'valid document')

  const parameters = openapiObject.paths['/{id}'].get.parameters
  for (const [location, name] of [['path', 'id'], ['query', 'filter'], ['header', 'x-trace']]) {
    const parameter = parameters.find(p => p.in === location && p.name === name)
    t.assert.deepStrictEqual(parameter.schema, { type: 'string', nullable: true }, `${location} parameter`)
  }
})

test('openapi 3.0: `type: null` conversion does not mutate the route schema', async (t) => {
  t.plan(2)

  const createValue = () => ({
    type: 'object',
    properties: {
      union: { description: 'maybe', anyOf: [{ type: 'string' }, { type: 'null' }] },
      list: { type: 'array', items: { type: ['integer', 'null'] } },
      several: { type: ['string', 'number', 'null'] }
    }
  })
  const body = createValue()
  const response = createValue()

  const fastify = Fastify()
  await fastify.register(fastifySwagger, { openapi: { openapi: '3.0.3' } })

  fastify.post('/', { schema: { body, response: { 200: response } } }, () => ({}))

  await fastify.ready()

  // Snapshot taken once Fastify has compiled the schemas: fast-json-stringify
  // reorders `type` arrays in place, which is unrelated to the conversion.
  const bodyBefore = structuredClone(body)
  const responseBefore = structuredClone(response)

  fastify.swagger()

  t.assert.deepStrictEqual(body, bodyBefore)
  t.assert.deepStrictEqual(response, responseBefore)
})
