'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fs = require('fs')
const fastifySwagger = require('../index')

const swaggerInfo = {
  swagger: {
    info: {
      title: 'Test swagger',
      description: 'testing the fastify swagger api',
      version: '0.1.0'
    },
    host: 'localhost',
    schemes: ['http']
  }
}
test('fastify.swagger should generate a yaml file', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
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
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    fastify.swagger(err => {
      t.error(err)
      t.ok(fs.existsSync('./swagger.yaml'))
      fs.unlinkSync('./swagger.yaml')
    })
  })
})

test('fastify.swagger should generate a json file', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, swaggerInfo)

  const opts = {
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
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    fastify.swagger({ json: true }, err => {
      t.error(err)
      t.ok(fs.existsSync('./swagger.json'))
      fs.unlinkSync('./swagger.json')
    })
  })
})

test('fastify.swagger should generate a file with a custom name', t => {
  t.plan(3)
  const fastify = Fastify()

  fastify.register(fastifySwagger, Object.assign(swaggerInfo, { filename: 'customName' }))

  const opts = {
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
    }
  }

  fastify.get('/', opts, () => {})

  fastify.ready(err => {
    t.error(err)

    fastify.swagger(err => {
      t.error(err)
      t.ok(fs.existsSync('./customName.yaml'))
      fs.unlinkSync('./customName.yaml')
    })
  })
})
