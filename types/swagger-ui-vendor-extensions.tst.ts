import { type OpenAPIV2, type OpenAPIV3 } from 'openapi-types'
import { expect } from 'tstyche'
import '..'

expect<OpenAPIV3.Document>()
  .type.toBeAssignableFrom({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Test OpenApiv3 specification'
    },
    components: {
      securitySchemes: {
        myAuth: {
          type: 'oauth2' as const,
          'x-tokenName': 'id_token',
          flows: {
            implicit: {
              authorizationUrl: 'http.../login/oauth/authorize',
              scopes: {}
            }
          }
        }
      }
    },
    paths: {}
  })

expect<OpenAPIV2.Document>().type.toBeAssignableFrom({
  swagger: '2.0.0',
  info: {
    title: 'Test OpenApiv2 specification',
    version: '2.0.0'
  },
  securityDefinitions: {
    OAuth2AccessCodeFlow: {
      type: 'oauth2' as const,
      flow: 'accessCode' as const,
      authorizationUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
      'x-tokenName': 'id_token',
      scopes: {}
    },
    OAuth2ApplicationFlow: {
      type: 'oauth2' as const,
      flow: 'application' as const,
      tokenUrl: 'https://example.com/oauth/token',
      'x-tokenName': 'id_token',
      scopes: {}
    },
    OAuth2ImplicitFlow: {
      type: 'oauth2' as const,
      flow: 'implicit' as const,
      authorizationUrl: 'https://example.com/oauth/authorize',
      'x-tokenName': 'id_token',
      scopes: {}
    },
    OAuth2PasswordFlow: {
      type: 'oauth2' as const,
      flow: 'password' as const,
      tokenUrl: 'https://example.com/oauth/token',
      'x-tokenName': 'id_token',
      scopes: {}
    }
  },
  paths: {}
})

expect<OpenAPIV2.Document>()
  .type.toBeAssignableFrom({
    swagger: '2.0.0',
    info: {
      title: 'Test OpenApiv2 specification',
      version: '2.0.0'
    },
    paths: {
      '/users/{userId}': {
        get: {
          summary: 'Gets a user by ID.',
          responses: {},
          parameters: [
            {
              in: 'path',
              name: 'userId',
              type: 'integer',
              required: true,
              description: 'Numeric ID of the user to get.',
              'x-example': 'BADC0FFEE'
            },
            {
              in: 'query',
              name: 'offset',
              type: 'integer',
              description:
                'The number of items to skip before starting to collect the result set.',
              'x-example': 1337
            },
            {
              in: 'header',
              name: 'X-Request-ID',
              type: 'string',
              required: true,
              'x-example': 'wget'
            },
            {
              in: 'formData',
              name: 'name',
              type: 'string',
              description: "A person's name.",
              'x-example': 'John Doe'
            }
          ]
        }
      }
    }
  })
