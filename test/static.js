'use strict'

const t = require('tap')
const test = t.test
const Fastify = require('fastify')
const fastifySwagger = require('../index')
const yaml = require('js-yaml')

test('specification validation check works', t => {
  const specifications = [
    '',
    '123',
    {},
    {
      path: 123
    },
    {
      path: '/hello/lionel.richie'
    }
  ]

  t.plan(specifications.length * 2)

  specifications.forEach(specification => {
    const fastify = Fastify()
    fastify.register(fastifySwagger, {
      mode: 'static',
      specification,
      exposeRoute: true
    })

    fastify.ready(err => {
      t.notEqual(err, undefined)
      t.matchSnapshot(err.toString())
    })
  })
})

test('swagger route returns yaml', t => {
  t.plan(4)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that yaml is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/yaml'
    },
    (err, res) => {
      t.error(err)
      t.is(typeof res.payload, 'string')
      t.is(res.headers['content-type'], 'application/x-yaml')
      try {
        yaml.safeLoad(res.payload)
        t.pass('valid swagger yaml')
      } catch (err) {
        t.fail(err)
      }
    }
  )
})

test('swagger route returns json', t => {
  t.plan(2)
  const fastify = Fastify()

  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      type: 'file',
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true
  })

  // check that json is there
  fastify.inject(
    {
      method: 'GET',
      url: '/documentation/json'
    },
    (err, res) => {
      t.error(err)

      // console.log(res.payload)
      try {
        var payload = JSON.parse(res.payload)
        t.matchSnapshot(payload)
      } catch (error) {
        t.fail(error)
      }
    }
  )
})
