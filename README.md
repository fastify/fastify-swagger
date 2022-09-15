# @fastify/swagger

[![NPM version](https://img.shields.io/npm/v/@fastify/swagger.svg?style=flat)](https://www.npmjs.com/package/@fastify/swagger)
![CI workflow](https://github.com/fastify/fastify-swagger/workflows/CI%20workflow/badge.svg)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

A Fastify plugin for serving a [Swagger UI](https://swagger.io/tools/swagger-ui/), using [Swagger (OpenAPI v2)](https://swagger.io/specification/v2/) or [OpenAPI v3](https://swagger.io/specification) schemas automatically generated from your route schemas, or from an existing Swagger/OpenAPI schema.

Supports Fastify versions `4.x`.

- Please refer to [6.x](https://github.com/fastify/fastify-swagger/tree/6.x) for Fastify `^3.x` compatibility.
- Please refer to [3.x](https://github.com/fastify/fastify-swagger/tree/2.x) for Fastify `^2.x` compatibility.
- Please refer to [1.x](https://github.com/fastify/fastify-swagger/tree/1.x) for Fastify `^1.x` compatibility.

If you are looking for a plugin to generate routes from an existing OpenAPI schema, check out [fastify-openapi-glue](https://github.com/seriousme/fastify-openapi-glue).

<a name="install"></a>
## Install
```
npm i @fastify/swagger
```

<a name="usage"></a>
## Usage
Add it to your project with `register`, pass it some options, call the `swagger` API, and you are done!

```js
const fastify = require('fastify')()

await fastify.register(require('@fastify/swagger'), {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'Testing the Fastify swagger API',
      version: '0.1.0'
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here'
    },
    host: 'localhost',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'user', description: 'User related end-points' },
      { name: 'code', description: 'Code related end-points' }
    ],
    definitions: {
      User: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: {type: 'string', format: 'email' }
        }
      }
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    }
  },
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  },
  uiHooks: {
    onRequest: function (request, reply, next) { next() },
    preHandler: function (request, reply, next) { next() }
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  exposeRoute: true
})

fastify.put('/some-route/:id', {
  schema: {
    description: 'post some data',
    tags: ['user', 'code'],
    summary: 'qwerty',
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'user id'
        }
      }
    },
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
    },
    response: {
      201: {
        description: 'Successful response',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      },
      default: {
        description: 'Default response',
        type: 'object',
        properties: {
          foo: { type: 'string' }
        }
      }
    },
    security: [
      {
        "apiKey": []
      }
    ]
  }
}, (req, reply) => {})

await fastify.ready()
fastify.swagger()
```
<a name="api"></a>
## API

<a name="register.options"></a>
### Register options

<a name="register.options.modes"></a>
#### Modes
`@fastify/swagger` supports two registration modes `dynamic` and `static`:

<a name="register.options.mode.dynamic"></a>
##### Dynamic
`dynamic` is the default mode, if you use `@fastify/swagger` this way API schemas will be auto-generated from route schemas:
```js
// All of the below parameters are optional but are included for demonstration purposes
{
  // swagger 2.0 options
  swagger: {
    info: {
      title: String,
      description: String,
      version: String
    },
    externalDocs: Object,
    host: String,
    schemes: [ String ],
    consumes: [ String ],
    produces: [ String ],
    tags: [ Object ],
    securityDefinitions: Object
  },
  // openapi 3.0.3 options
  // openapi: {
  //   info: {
  //     title: String,
  //     description: String,
  //     version: String,
  //   },
  //   externalDocs: Object,
  //   servers: [ Object ],
  //   components: Object,
  //   security: [ Object ],
  //   tags: [ Object ]
  // }
}
```

All properties detailed in the [Swagger (OpenAPI v2)](https://swagger.io/specification/v2/) and [OpenAPI v3](https://swagger.io/specification/) specifications can be used.
`@fastify/swagger` will generate API schemas that adhere to the Swagger specification by default.
If provided an `openapi` option it will generate OpenAPI compliant API schemas instead.

Examples of using `@fastify/swagger` in `dynamic` mode:
- [Using the `swagger` option](examples/dynamic-swagger.js)
- [Using the `openapi` option](examples/dynamic-openapi.js)

<a name="register.options.mode.static"></a>
##### Static
 `static` mode must be configured explicitly. In this mode `@fastify/swagger` serves an already existing Swagger or OpenAPI schema that is passed to it in `specification.path`:

```js
{
  mode: 'static',
  specification: {
    path: './examples/example-static-specification.yaml',
    postProcessor: function(swaggerObject) {
      return swaggerObject
    },
    baseDir: '/path/to/external/spec/files/location',
  },
}
```

The `specification.postProcessor` parameter is optional. It allows you to change your Swagger object on the fly (for example - based on the environment).
It accepts `swaggerObject` - a JavaScript object that was parsed from your `yaml` or `json` file and should return a Swagger schema object.

`specification.baseDir` allows specifying the directory where all spec files that are included in the main one using `$ref` will be located.
By default, this is the directory where the main spec file is located. Provided value should be an absolute path **without** trailing slash.

An example of using `@fastify/swagger` with `static` mode enabled can be found [here](examples/static-json-file.js).

#### Options

 | Option             | Default          | Description                                                                                                               |
 | ------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
 | exposeRoute        | false            | Exposes documentation route.                                                                                              |
 | hiddenTag          | X-HIDDEN         | Tag to control hiding of routes.                                                                                          |
 | hideUntagged       | false            | If `true` remove routes without tags from resulting Swagger/OpenAPI schema file.                                          |
 | initOAuth          | {}               | Configuration options for [Swagger UI initOAuth](https://swagger.io/docs/open-source-tools/swagger-ui/usage/oauth2/).     |
 | openapi            | {}               | [OpenAPI configuration](https://swagger.io/specification/#oasObject).                                                     |
 | routePrefix         | '/documentation' | Overwrite the default Swagger UI route prefix.                                                                            |
 | staticCSP          | false            | Enable CSP header for static resources.                                                                                   |
 | stripBasePath      | true             | Strips base path from routes in docs.                                                                                     |
 | swagger            | {}               | [Swagger configuration](https://swagger.io/specification/v2/#swaggerObject).                                              |
 | transform          | null             | Transform method for the route's schema and url. [documentation](#register.options.transform).                                                                                              |
 | transformStaticCSP | undefined         | Synchronous function to transform CSP header for static resources if the header has been previously set.                  |
 | uiConfig            | {}               | Configuration options for [Swagger UI](https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md). Must be literal values, see [#5710](https://github.com/swagger-api/swagger-ui/issues/5710).|
 | uiHooks            | {}               | Additional hooks for the documentation's routes. You can provide the `onRequest` and `preHandler` hooks with the same [route's options](https://www.fastify.io/docs/latest/Routes/#options) interface.|
 | refResolver        | {}               | Option to manage the `$ref`s of your application's schemas. Read the [`$ref` documentation](#register.options.refResolver) |
 | logLevel           | info             | Allow to define route log level.                                                                                           |

If you set `exposeRoute` to `true` the plugin will expose the documentation with the following APIs:

| URL                     | Description                                |
| ----------------------- | ------------------------------------------ |
| `'/documentation/json'` | The JSON object representing the API       |
| `'/documentation/yaml'` | The YAML object representing the API       |
| `'/documentation/'`     | The swagger UI                             |
| `'/documentation/*'`    | External files that you may use in `$ref`  |

<a name="register.options.transform"></a>
#### Transform

By passing a synchronous `transform` function you can modify the route's url and schema.

Some possible uses of this are:

- add the `hide` flag on schema according to your own logic based on url & schema
- altering the route url into something that's more suitable for the api spec
- using different schemas such as [Joi](https://github.com/hapijs/joi) and transforming them to standard JSON schemas expected by this plugin

This option is available in `dynamic` mode only.

Examples of all the possible uses mentioned:

```js
const convert = require('joi-to-json')

await fastify.register(require('@fastify/swagger'), {
  swagger: { ... },
  transform: ({ schema, url }) => {
    const {
      params,
      body,
      querystring,
      headers,
      response,
      ...transformedSchema
    } = schema
    let transformedUrl = url

    // Transform the schema as you wish with your own custom logic.
    // In this example convert is from 'joi-to-json' lib and converts a Joi based schema to json schema
    if (params) transformedSchema.params = convert(params)
    if (body) transformedSchema.body = convert(body)
    if (querystring) transformedSchema.querystring = convert(querystring)
    if (headers) transformedSchema.headers = convert(headers)
    if (response) transformedSchema.response = convert(response)

    // can add the hide tag if needed
    if (url.startsWith('/internal')) transformedSchema.hide = true

    // can transform the url
    if (url.startsWith('/latest_version/endpoint')) transformedUrl = url.replace('latest_version', 'v3')

    return { schema: transformedSchema, url: transformedUrl }
  }
})
```

<a name="register.options.refResolver"></a>
#### Managing your `$ref`s

When this plugin is configured as `dynamic` mode, it will resolve all `$ref`s in your application's schemas.
This process will create an new in-line schema that is going to reference itself.

This logic step is done to make sure that the generated documentation is valid, otherwise the Swagger UI will try to fetch the schemas from the server or the network and fail.

By default, this option will resolve all `$ref`s renaming them to `def-${counter}`, but your view models keep the original `$id` naming thanks to the [`title` parameter](https://swagger.io/docs/specification/2-0/basic-structure/#metadata).

To customize this logic you can pass a `refResolver` option to the plugin:

```js
await fastify.register(require('@fastify/swagger'), {
  swagger: { ... },
  ...
  refResolver: {
    buildLocalReference (json, baseUri, fragment, i) {
      return json.$id || `my-fragment-${i}`
    }
  }
}
```

To deep down the `buildLocalReference` arguments, you may read the [documentation](https://github.com/Eomm/json-schema-resolver#usage-resolve-one-schema-against-external-schemas).

<a name="route.options"></a>
### Route options

<a name="route.response.options"></a>
#### Response Options

<a name="route.response.description"></a>
##### Response description and response body description
`description` is a required field as per the Swagger specification. If it is not provided then the plugin will automatically generate one with the value `'Default Response'`.
If you supply a `description` it will be used for both the response and response body schema, for example:

```js
fastify.get('/description', {
  schema: {
    response: {
      200: {
        description: 'response and schema description',
        type: 'string'
      }
    }
  }
}, () => {})
```

Generates this in a Swagger (OpenAPI v2) schema's `paths`:

```json
{
  "/description": {
    "get": {
      "responses": {
        "200": {
          "description": "response and schema description",
          "schema": {
            "description": "response and schema description",
            "type": "string"
          }
        }
      }
    }
  }
}
```

And this in a OpenAPI v3 schema's `paths`:

```json
{
  "/description": {
    "get": {
      "responses": {
        "200": {
          "description": "response and schema description",
          "content": {
            "application/json": {
              "schema": {
                "description": "response and schema description",
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}
```

If you want to provide different descriptions for the response and response body, use the `x-response-description` field alongside `description`:

```js
fastify.get('/responseDescription', {
  schema: {
    response: {
      200: {
        'x-response-description': 'response description',
        description: 'schema description',
        type: 'string'
      }
    }
  }
}, () => {})
```
<a name="route.response.2xx"></a>
##### Status code 2xx
Fastify supports both the `2xx` and `3xx` status codes, however Swagger (OpenAPI v2) itself does not.
`@fastify/swagger` transforms `2xx` status codes into `200`, but will omit it if a `200` status code has already been declared.
OpenAPI v3 [supports the `2xx` syntax](https://swagger.io/specification/#http-codes) so is unaffected.

Example:

```js
{
  response: {
    '2xx': {
      description: '2xx',
      type: 'object'
    }
  }
}

// will become
{
  response: {
    200: {
      schema: {
        description: '2xx',
        type: 'object'
      }
    }
  }
}
```
<a name="route.response.headers"></a>
##### Response headers
You can decorate your own response headers by following the below example:

```js
{
  response: {
    200: {
      type: 'object',
      headers: {
        'X-Foo': {
          type: 'string'
        }
      }
    }
  }
}
```
Note: You need to specify `type` property when you decorate the response headers, otherwise the schema will be modified by Fastify.

<a name="route.response.empty_body"></a>
##### Empty Body Responses
Empty body responses are supported by `@fastify/swagger`.
Please specify `type: 'null'` for the response otherwise Fastify itself will fail to compile the schema:

```js
{
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
```

<a name="route.openapi"></a>
#### OpenAPI Parameter Options

**Note:** OpenAPI's terminology differs from Fastify's. OpenAPI uses "parameter" to refer to parts of a request that in [Fastify's validation documentation](https://www.fastify.io/docs/latest/Validation-and-Serialization/#validation) are called "querystring", "params", and "headers".

OpenAPI provides some options beyond those provided by the [JSON schema specification](https://json-schema.org/specification.html) for specifying the shape of parameters. A prime example of this is the `collectionFormat` option for specifying how to encode parameters that should be handled as arrays of values.

These encoding options only change how Swagger UI presents its documentation and how it generates `curl` commands when the `Try it out` button is clicked.
Depending on which options you set in your schema, you *may also need* to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema.
As far as arrays are concerned, the default query string parser conforms to the `collectionFormat: "multi"` specification.
If you were to select `collectionFormat: "csv"`, you would have to replace the default query string parser with one that parses CSV parameter values into arrays.
The same applies to the other parts of a request that OpenAPI calls "parameters" and which are not encoded as JSON in a request.

You can also apply different serialization `style` and `explode` as specified [here](https://swagger.io/docs/specification/serialization/#query).

`@fastify/swagger` supports these options as shown in this example:

```js
// Need to add a collectionFormat keyword to ajv in fastify instance
const fastify = Fastify({
  ajv: {
    customOptions: {
      keywords: ['collectionFormat']
    }
  }
})

fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['fields'],
      additionalProperties: false,
      properties: {
        fields: {
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1,
          //
          // Note that this is an OpenAPI version 2 configuration option. The
          // options changed in version 3.
          //
          // Put `collectionFormat` on the same property which you are defining
          // as an array of values. (i.e. `collectionFormat` should be a sibling
          // of the `type: "array"` specification.)
          collectionFormat: 'multi'
        }
      },
     // OpenAPI 3 serialization options
     explode: false,
     style: "deepObject"
    }
  },
  handler (request, reply) {
    reply.send(request.query.fields)
  }
})
```

There is a complete runnable example [here](examples/collection-format.js).

<a name="route.complex-serialization"></a>
#### Complex serialization in query and cookie, eg. JSON

**Note:** not supported by Swagger (OpenAPI v2), [only OpenAPI v3](https://swagger.io/docs/specification/describing-parameters/#schema-vs-content)

```
http://localhost/?filter={"foo":"baz","bar":"qux"}
```

**IMPORTANT CAVEAT** You will need to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema. See [example](examples/json-in-querystring.js).

```js
fastify.route({
  method: 'GET',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['filter'],
      additionalProperties: false,
      properties: {
        filter: {
          type: 'object',
          required: ['foo'],
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' }
          },
          'x-consume': 'application/json'
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.query.filter)
  }
})
```

Will generate this in the OpenAPI v3 schema's `paths`:

```json
{
  "/": {
    "get": {
      "parameters": [
        {
          "in": "query",
          "name": "filter",
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "foo"
                ],
                "properties": {
                  "foo": {
                    "type": "string"
                  },
                  "bar": {
                    "type": "string"
                  }
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

<a name="route.links"></a>
#### Links

**Note:** not supported by Swagger (OpenAPI v2), [only OpenAPI v3](https://swagger.io/docs/specification/links/)

OpenAPI v3 Links are added by adding a `links` property to the top-level options of a route. See:

```js
fastify.get('/user/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'the user identifier, as userId'
        }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          uuid: {
            type: 'string',
            format: 'uuid'
          }
        }
      }
    }
  },
  links: {
    // The status code must match the one in the response
    200: {
      address: {
        // See the OpenAPI documentation
        operationId: 'getUserAddress',
        parameters: {
          id: '$request.path.id'
        }
      }
    }
  }
}, () => {})

fastify.get('/user/:id/address', {
  schema: {
    operationId: 'getUserAddress',
    params: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'the user identifier, as userId'
        }
      },
      required: ['id']
    },
    response: {
      200: {
        type: 'string'
      }
    }
  }
}, () => {})
```

<a name="route.hide"></a>
#### Hide a route
There are two ways to hide a route from the Swagger UI:
- Pass `{ hide: true }` to the schema object inside the route declaration.
- Use the tag declared in `hiddenTag` options property inside the route declaration. Default is `X-HIDDEN`.

<a name="route.uiHooks"></a>
#### Protect your documentation routes

You can protect your documentation by configuring an authentication hook.
Here is an example using the [`@fastify/basic-auth`](https://github.com/fastify/fastify-basic-auth) plugin:

```js
await fastify.register(require('@fastify/basic-auth'), {
  validate (username, password, req, reply, done) {
    if (username === 'admin' && password === 'admin') {
      done()
    } else {
      done(new Error('You can not access'))
    }
  },
  authenticate: true
})

await fastify.register(fastifySwagger, {
  exposeRoute: true,
  uiHooks: {
    onRequest: fastify.basicAuth
  }
})
```

<a name="function.options"></a>
### Swagger function options

Registering `@fastify/swagger` decorates the fastify instance with `fastify.swagger()`, which returns a JSON object representing the API.
If `{ yaml: true }` is passed to `fastify.swagger()` it will return a YAML string.

<a name="integration"></a>
### Integration
You can integration this plugin with ```@fastify/helmet``` with some little work.

```@fastify/helmet``` options example:
```javascript
.register(helmet, instance => {
  return {
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "form-action": ["'self'"],
        "img-src": ["'self'", "data:", "validator.swagger.io"],
        "script-src": ["'self'"].concat(instance.swaggerCSP.script),
        "style-src": ["'self'", "https:"].concat(
          instance.swaggerCSP.style
        ),
      }
    }
  }
})
```

<a name="schema.examplesField"></a>
### Add examples to the schema

Note: [OpenAPI](https://swagger.io/specification/#example-object) and [JSON Schema](https://json-schema.org/draft/2020-12/json-schema-validation.html#rfc.section.9.5) have different examples field formats. 

Array with examples from JSON Schema converted to OpenAPI `example` or `examples` field automatically with generated names (example1, example2...):

```js
fastify.route({
  method: 'POST',
  url: '/',
  schema: {
    querystring: {
      type: 'object',
      required: ['filter'],
      properties: {
        filter: {
          type: 'object',
          required: ['foo'],
          properties: {
            foo: { type: 'string' },
            bar: { type: 'string' }
          },
          examples: [
            { foo: 'bar', bar: 'baz' },
            { foo: 'foo', bar: 'bar' }
          ]
        }
      },
      examples: [
        { filter: { foo: 'bar', bar: 'baz' } }
      ]
    }
  },
  handler (request, reply) {
    reply.send(request.query.filter)
  }
})
```

Will generate this in the OpenAPI v3 schema's `path`:

```json
"/": {
  "post": {
    "requestBody": {
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": ["filter"],
            "properties": {
              "filter": {
                "type": "object",
                "required": ["foo"],
                "properties": {
                  "foo": { "type": "string" },
                  "bar": { "type": "string" }
                },
                "example": { "foo": "bar", "bar": "baz" }
              }
            }
          },
          "examples": {
            "example1": {
              "value": { "filter": { "foo": "bar", "bar": "baz" } }
            },
            "example2": {
              "value": { "filter": { "foo": "foo", "bar": "bar" } }
            }
          }
        }
      },
      "required": true
    },
    "responses": { "200": { "description": "Default Response" } }
  }
}
```

If you want to set your own names or add descriptions to the examples of schemas, you can use `x-examples` field to set examples in [OpenAPI format](https://swagger.io/specification/#example-object):

```js
// Need to add a new allowed keyword to ajv in fastify instance
const fastify = Fastify({
  ajv: {
    plugins: [
      function (ajv) {
        ajv.addKeyword({ keyword: 'x-examples' })
      }
    ]
  }
})

fastify.route({
  method: 'POST',
  url: '/feed-animals',
  schema: {
    body: {
      type: 'object',
      required: ['animals'],
      properties: {
        animals: {
          type: 'array',
          items: {
            type: 'string'
          },
          minItems: 1,
        }
      },
      "x-examples": {
        Cats: {
          summary: "Feed cats",
          description: 
            "A longer **description** of the options with cats",
          value: { 
            animals: ["Tom", "Garfield", "Felix"] 
          }
        },
        Dogs: {
          summary: "Feed dogs",
          value: { 
            animals: ["Spike", "Odie", "Snoopy"] 
          }
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.body.animals)
  }
})
```

<a name="usage"></a>
## `$id` and `$ref` usage


## Development
In order to start development run:
```
npm i
npm run prepare
```

So that [swagger-ui](https://github.com/swagger-api/swagger-ui) static folder will be generated for you.

### How it works under the hood

`@fastify/static` serves `swagger-ui` static files, then calls `/docs/json` to get the Swagger file and render it.

#### How to work with $refs

The `/docs/json` endpoint in dynamic mode produces a single `swagger.json` file resolving all your

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](https://nearform.com)
- [LetzDoIt](https://www.letzdoitapp.com/)

<a name="license"></a>
## License

Licensed under [MIT](./LICENSE).
