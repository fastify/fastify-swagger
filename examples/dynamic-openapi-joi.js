'use strict'

const fastify = require('fastify')()
// joi-to-json is one of the packages that can convert joi to json schema
// you are feel free to use other package that have the similar function
const convert = require('joi-to-json')
const Joi = require('joi')

fastify.register(require('../index'), {
  openapi: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    servers: [{
      url: 'http://localhost'
    }],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'header'
        }
      }
    }
  },
  exposeRoute: true,
  transform: schema => {
    const {
      params = undefined,
      body = undefined,
      querystring = undefined,
      ...others
    } = schema
    const transformed = { ...others }
    if (params) transformed.params = convert(params)
    if (body) transformed.body = convert(body)
    if (querystring) transformed.querystring = convert(querystring)
    return transformed
  }
})

fastify.put('/some-route/:id', {
  schema: {
    description: 'post some data',
    tags: ['user', 'code'],
    summary: 'qwerty',
    security: [{ apiKey: [] }],
    body: Joi.object().keys({
      hello: Joi.string().required()
    }).required(),
    response: {
      201: {
        description: 'Succesful response',
        type: 'object',
        properties: {
          hello: { type: 'string' }
        }
      }
    }
  }
}, (req, reply) => { reply.send({ hello: `Hello ${req.body.hello}` }) })

fastify.listen(3000, err => {
  if (err) throw err
  console.log('listening')
})
