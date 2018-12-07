# fastify-swagger

[![Greenkeeper badge](https://badges.greenkeeper.io/fastify/fastify-swagger.svg)](https://greenkeeper.io/)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-swagger.svg?branch=master)](https://travis-ci.org/fastify/fastify-swagger)

[Swagger](https://swagger.io/) documentation generator for Fastify.
It uses the schemas you declare in your routes to generate a swagger compliant doc.

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
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'apiKey',
        in: 'header'
      }
    }
  }
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
      }
    }
  }
  ```
  Example of the `fastify-swagger` usage in the `static` mode is available [here](examples/static-file.js).

  `specification.postProcessor` parameter is optional. It allows you to change your swagger object on the fly (for example - based on the environment). It accepts `swaggerObject` - basically a javascript object which was parsed from your `yaml` or `json` file and should return a swagger object.

<a name="additional"></a>
#### additional
If you pass `{ exposeRoute: true }` during the registration the plugin will expose the documentation with the following apis:

|  url  |  description   |
|-------|----------------|
|`'/documentation/json'` | the json object representing the api  |
|`'/documentation/yaml'` | the yaml object representing the api  |
|`'/documentation/'` | the swagger ui  |


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
  exposeRoute: true,
  routePrefix: '/documentations'
}
```

<a name="swagger.options"></a>
### swagger options
Calling `fastify.swagger` will return to you a JSON object representing your api, if you pass `{ yaml: true }` to `fastify.swagger`, it will return you a yaml string.

<a name="hide"></a>
### Hide a route
Sometimes you may need to hide a certain route from the documentation, just pass `{ hide: true }` to the schema object inside the route declaration.

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
