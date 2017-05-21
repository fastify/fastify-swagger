# fastify-swagger
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/fastify/fastify-swagger.svg?branch=master)](https://travis-ci.org/fastify/fastify-swagger)

Swagger documentation generator for Fastify.  
It uses the schemas you declare in your routes to generate a swagger compliant doc.

## Install
```
npm i fastify-swagger --save
```

## Usage
Add it to your project with `register` and pass it some basic options, then call the `swagger` api and you are done!

*Note that currently only the generation of yaml/json files is supported, the swagger UI will not be generated.*
```js
const fastify = require('fastify')()

fastify.register(require('fastify-swagger'), {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    host: 'localhost',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json']
  }
})

fastify.post('/some-route', {
  description: 'post some data',
  tags: ['user', 'code'],
  summary: 'qwerty',
  payload: {
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
  out: {
    description: 'Succesful response',
    code: 201,
    type: 'object',
    properties: {
      hello: { type: 'string' }
    }
  }
}, (req, reply) => {})

fastify.ready(err => {
  if (err) throw err
  fastify.swagger()
})
```

## API
#### register options
```js
{
  swagger: {
    info: {
      title: String,
      description: String,
      version: String
    },
    host: String,
    schemes: [String],
    consumes: [String],
    produces: [String]
  },
  filename: String
}
```
*All the above parameters are optional.*

#### swagger options
Call `swagger` will generate a *yaml* file in your current directory, if `{ return: true }` is passed as parameter, the file will not be generated, instead will be returned the swagger *yaml* string.

If you want to generate a *json* just pass `{ json: true }` as parameter, you can also pass `{ return: true }`.

## Acknowledgements

This project is kindly sponsored by:
- [nearForm](http://nearform.com)
- [LetzDoIt](http://www.letzdoitapp.com/)

## License

Licensed under [MIT](./LICENSE).
