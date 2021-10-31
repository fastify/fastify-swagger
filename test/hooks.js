'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const yaml = require('js-yaml')

const fastifySwagger = require('../index')
const { swaggerOption, schemaBody } = require('../examples/options')

const authOptions = {
  validate (username, password, req, reply, done) {
    if (username === 'admin' && password === 'admin') {
      done()
    } else {
      done(new Error('Winter is coming'))
    }
  },
  authenticate: true
}

function basicAuthEncode (username, password) {
  return 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
}

test('hooks on static swagger', async t => {
  const fastify = Fastify()
  await fastify.register(require('fastify-basic-auth'), authOptions)
  fastify.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: './examples/example-static-specification.yaml'
    },
    exposeRoute: true,
    uiHooks: {
      onRequest: fastify.basicAuth
    }
  })

  let res = await fastify.inject('/documentation')
  t.equal(res.statusCode, 401, 'root auth required')

  res = await fastify.inject('/documentation/yaml')
  t.equal(res.statusCode, 401, 'auth required yaml')
  res = await fastify.inject({
    method: 'GET',
    url: '/documentation/yaml',
    headers: { authorization: basicAuthEncode('admin', 'admin') }
  })
  t.equal(res.statusCode, 200)
  t.equal(res.headers['content-type'], 'application/x-yaml')
  try {
    yaml.load(res.payload)
    t.pass('valid swagger yaml')
  } catch (err) {
    t.fail(err)
  }

  res = await fastify.inject('/documentation/json')
  t.equal(res.statusCode, 401, 'auth required json')
  res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json',
    headers: { authorization: basicAuthEncode('admin', 'admin') }
  })
  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  try {
    yaml.load(res.payload)
    t.pass('valid swagger json')
  } catch (err) {
    t.fail(err)
  }
})

test('hooks on dynamic swagger', async t => {
  const fastify = Fastify()
  await fastify.register(require('fastify-basic-auth'), authOptions)

  fastify.register(fastifySwagger, {
    ...swaggerOption,
    exposeRoute: true,
    uiHooks: {
      onRequest: fastify.basicAuth
    }
  })

  fastify.get('/fooBar123', schemaBody, () => {})

  let res = await fastify.inject('/documentation')
  t.equal(res.statusCode, 401, 'root auth required')

  res = await fastify.inject('/documentation/yaml')
  t.equal(res.statusCode, 401, 'auth required yaml')

  res = await fastify.inject('/documentation/json')
  t.equal(res.statusCode, 401, 'auth required json')
  res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json',
    headers: { authorization: basicAuthEncode('admin', 'admin') }
  })
  t.equal(typeof res.payload, 'string')
  t.equal(res.headers['content-type'], 'application/json; charset=utf-8')

  const swaggerObject = res.json()
  t.ok(swaggerObject.paths)
  t.ok(swaggerObject.paths['/fooBar123'])
})
