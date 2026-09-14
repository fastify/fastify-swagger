import fastify from 'fastify'
import fastifySwagger from '..'

// Specification extensions (`x-*`) are not part of the `openapi-types`
// interfaces and need a module augmentation to be typed.
interface Logo {
  url: string
  altText?: string
}

declare module 'openapi-types' {
  // `openapi` option (OpenAPI 3.0 and 3.1)
  namespace OpenAPIV3 {
    interface InfoObject {
      'x-logo'?: Logo
    }
  }

  // `swagger` option (Swagger 2.0)
  namespace OpenAPIV2 {
    interface InfoObject {
      'x-logo'?: Logo
    }
  }
}

const app = fastify()

// OpenAPI 3.0
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-logo': {
        url: 'https://example.com/logo.png',
        altText: 'Logo'
      }
    }
  }
})

// OpenAPIV3_1.InfoObject is derived from OpenAPIV3.InfoObject, so the same
// augmentation covers OpenAPI 3.1 documents too.
app.register(fastifySwagger, {
  openapi: {
    openapi: '3.1.0',
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-logo': {
        url: 'https://example.com/logo.png'
      }
    }
  }
})

// Swagger 2.0
app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-logo': {
        url: 'https://example.com/logo.png',
        altText: 'Logo'
      }
    }
  }
})

// The augmented types are still checked: `url` is required.
// @ts-expect-error Property 'url' is missing
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-logo': {
        altText: 'Logo'
      }
    }
  }
})

// @ts-expect-error Property 'url' is missing
app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-logo': {
        altText: 'Logo'
      }
    }
  }
})

// Extensions that were not declared are still rejected.
// @ts-expect-error does not exist in type 'InfoObject'
app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Test swagger',
      version: '0.1.0',
      'x-unknown': true
    }
  }
})
