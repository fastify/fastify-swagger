# fastify-swagger

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  ![CI workflow](https://github.com/fastify/fastify-swagger/workflows/CI%20workflow/badge.svg)

[Swagger](https://swagger.io/) documentation generator for Fastify.
It uses the schemas you declare in your routes to generate a swagger compliant doc.

Supports Fastify versions `>=2.0.0`. Please refer to [this branch](https://github.com/fastify/fastify-swagger/tree/1.x) and related versions for Fastify `^1.9.0` compatibility.

<a name="install"></a>
## Install
```
npm i fastify-swagger --save
```

<a name="usage"></a>
## Usage
Add it to your project with `register` and pass it some basic options, then call the `swagger` api and you are done!

```js
const fastify = require('fastify')()

fastify.register(require('fastify-swagger'), {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
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
        $id: 'User',
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string', nullable: true },
          lastName: { type: 'string', nullable: true },
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
      }
    },
    security: [
      {
        "apiKey": []
      }
    ]
  }
}, (req, reply) => {})

fastify.ready(err => {
  if (err) throw err
  fastify.swagger()
})
```
<a name="api"></a>
## API
<a name="register.options"></a>
### register options
<a name="modes"></a>
#### modes
`fastify-swagger` supports two registration modes `dynamic` and `static`:
<a name="mode.dynamic"></a>
##### dynamic
`dynamic` mode is the default one, if you use the plugin this way - swagger specification would be gathered from your routes definitions.
  ```js
  {
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
    }
  }
  ```

  *All the above parameters are optional.*
  You can use all the properties of the [swagger specification](https://swagger.io/specification/), if you find anything missing, please open an issue or a pr!

  Example of the `fastify-swagger` usage in the `dynamic` mode is available [here](examples/dynamic.js).
<a name="mode.static"></a>

##### static
 `static` mode should be configured explicitly. In this mode `fastify-swagger` serves given specification, you should craft it yourselfe.
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
  Example of the `fastify-swagger` usage in the `static` mode is available [here](examples/static-file.js).

  `specification.postProcessor` parameter is optional. It allows you to change your swagger object on the fly (for example - based on the environment). It accepts `swaggerObject` - basically a javascript object which was parsed from your `yaml` or `json` file and should return a swagger object.

  `specification.baseDir` allows specifying the directory where all spec files that are included in the main one using `$ref` will be located.
  By default, this is the directory where the main spec file is located. Provided value should be an absolute path **without** trailing slash.
<a name="additional"></a>
#### additional
If you pass `{ exposeRoute: true }` during the registration the plugin will expose the documentation with the following apis:

|  url  |  description   |
|-------|----------------|
|`'/documentation/json'` | the json object representing the api  |
|`'/documentation/yaml'` | the yaml object representing the api  |
|`'/documentation/'` | the swagger ui  |
|`'/documentation/*'`| external files which you may use in `$ref`|


##### Overwrite swagger url end-point
If you would like to overwrite the `/documentation` url you can use the `routePrefix` option.
```js
fastify.register(require('fastify-swagger'), {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    ...
  },
  hiddenTag: 'X-HIDDEN',
  exposeRoute: true,
  routePrefix: '/documentations'
}
```

##### Convert routes schema
If you would like to use different schemas like, let's say [Joi](https://github.com/hapijs/joi), you can pass a synchronous `transform` method in the options to convert them back to standard JSON schemas expected by this plugin to generate the documentation (`dynamic` mode only).
```js
const convert = require('joi-to-json-schema')

fastify.register(require('fastify-swagger'), {
  swagger: { ... },
  ...
  transform: schema => {
    const {
      params = undefined,
      body = undefined,
      querystring = undefined,
      response = undefined,
      ...others
    } = schema
    const transformed = { ...others }
    if (params) transformed.params = convert(params)
    if (body) transformed.body = convert(body)
    if (querystring) transformed.querystring = convert(querystring)
    if (response) transformed.response = convert(response)
    return transformed
  }
}
```

<a name="swagger.options"></a>
### swagger options
Calling `fastify.swagger` will return to you a JSON object representing your api, if you pass `{ yaml: true }` to `fastify.swagger`, it will return you a yaml string.

### Open API (OA) Parameter Options

Note: OA's terminology differs from Fastify's. OA uses the term "parameter" to refer to those parts of a request that in [Fastify's validation documentation](https://www.fastify.io/docs/latest/Validation-and-Serialization/#validation) are called "querystring", "params", "headers".

OA provides some options beyond those provided by the JSON schema specification for specifying the shape of parameters. A prime example of this the option for specifying how to encode those parameters that should be handled as arrays of values. There is no single universally accepted method for encoding such parameters appearing as part of query strings. OA2 provides a `collectionFormat` option which allows specifying how an array parameter should be encoded. (We're giving an example in the OA2 specification, as this is the default specification version used by this plugin. The same principles apply to OA3.) Specifying this option is easy. You just need to add it to the other options for the field you are defining. Like in this example:

```
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
          // Note that this is an Open API version 2 configuration option.  The
          // options changed in version 3. The plugin currently only supports
          // version 2 of Open API.
          //
          // Put `collectionFormat` on the same property which you are defining
          // as an array of values. (i.e. `collectionFormat` should be a sibling
          // of the `type: "array"` specification.)
          collectionFormat: 'multi'
        }
      }
    }
  },
  handler (request, reply) {
    reply.send(request.query.fields)
  }
})
```

There is a complete runnable example [here](examples/collection-format.js).

**IMPORTANT CAVEAT** These encoding options you can set in your schema have no bearing on how, for instance, a query string parser parses the query string. They change how Swagger UI presents its documentation, and how it generates `curl` commands when you click the `Try it out` button. Depending on which options you set in your schema, you *may also need* to change the default query string parser used by Fastify so that it produces a JavaScript object that will conform to the schema. As far as arrays are concerned, the default query string parser conforms to the `collectionFormat: "multi"` specification. If you were to select `collectionFormat: "csv"`, you would have to replace the default query string parser with one that parses CSV parameter values into arrays. The same caveat applies to the other parts of a request that OA calls "parameters" (e.g. headers, path parameters) and which are not encoded as JSON in a request.

<a name="hide"></a>
### Hide a route
Sometimes you may need to hide a certain route from the documentation, there is 2 alternatives:
- Pass `{ hide: true }` to the schema object inside the route declaration.
- Use the tag declared in `hiddenTag` options property inside the route declaration. Default is `X-HIDDEN`.

<a name="security"></a>
### Security
Global security definitions and route level security provide documentation only. It does not implement authentication nor route security for you. Once your authentication is implemented, along with your defined security, users will be able to successfully authenticate and interact with your API using the user interfaces of the documentation.

<a name="development"></a>
### Development
In order to start development run:
```
npm i
npm run prepare
```

So that [swagger-ui](https://github.com/swagger-api/swagger-ui) static folder will be generated for you.

#### How work under the hood

`fastify-static` serve the `swagger-ui` static files, then it calls `/docs/json` to get the swagger file and render it.

<a name="seealso"></a>
## See also
Sometimes you already have a Swagger definition and you need to build Fastify routes from that.
In that case checkout [fastify-swaggergen](https://github.com/seriousme/fastify-swaggergen) which helps you in doing just that.

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

<a name="license"></a>
## License

Licensed under [MIT](./LICENSE).
