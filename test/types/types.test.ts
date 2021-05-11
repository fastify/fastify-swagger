import fastify from 'fastify';
import fastifySwagger, { SwaggerOptions } from '../..';
import { minimalOpenApiV3Document } from './minimal-openapiV3-document';

const app = fastify();

app.register(fastifySwagger);
app.register(fastifySwagger, {});
app.register(fastifySwagger, { transform: (schema : any) => schema });
app.register(fastifySwagger, {
  mode: 'static',
  specification: {
    document: minimalOpenApiV3Document
  },
  routePrefix: '/documentation',
  exposeRoute: true,
});

const fastifySwaggerOptions: SwaggerOptions = {
  mode: 'static',
  specification: {
    document: minimalOpenApiV3Document
  },
  routePrefix: '/documentation',
  exposeRoute: true,
}
app.register(fastifySwagger, fastifySwaggerOptions);

const fastifyDynamicSwaggerOptions: SwaggerOptions = {
  mode: 'dynamic',
  routePrefix: '/documentation',
  exposeRoute: true,
  hiddenTag: 'X-HIDDEN',
  hideUntagged: true,
  stripBasePath: true
}
app.register(fastifySwagger, fastifyDynamicSwaggerOptions);

app.put('/some-route/:id', {
    schema: {
      description: 'put me some data',
      tags: ['user', 'code'],
      summary: 'qwerty',
      consumes: ['application/json', 'multipart/form-data'],
      security: [{ apiKey: []}],
      operationId: 'opeId',
    }
  }, (req, reply) => {});

app.get('/public/route', {
    schema: {
      description: 'returns 200 OK',
      summary: 'qwerty',
      security: []
    }
  }, (req, reply) => {});

app
  .register(fastifySwagger, {
    routePrefix: '/documentation',
    exposeRoute: true,
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
  .ready(err => {
    app.swagger();
  });

app
  .register(fastifySwagger, {
    openapi: {
      info: {
        title: "Test openapi",
        description: "testing the fastify swagger api",
        version: "0.1.0",
      },
      servers: [{ url: "http://localhost" }],
      externalDocs: {
        url: "https://swagger.io",
        description: "Find more info here",
      },
      components: {
        schemas: {},
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "apiKey",
            in: "header",
          },
        },
      },
    },
    initOAuth: {
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    },
  })
  .ready((err) => {
    app.swagger();
  });

app.register(fastifySwagger, {
  uiConfig: {
    deepLinking: true,
    defaultModelsExpandDepth: -1,
    defaultModelExpandDepth: 1
  }
})
.ready((err) => {
  app.swagger();
})

app.register(fastifySwagger, {
  staticCSP: true,
})
.ready((err) => {
  app.swagger();
})

app.register(fastifySwagger, {
  staticCSP: "default-src: 'self'",
})
.ready((err) => {
  app.swagger();
})

app.register(fastifySwagger, {
  staticCSP: {
    'default-src': "'self'",
    'script-src': ["'self'"]
  },
})
.ready((err) => {
  app.swagger();
})

app.register(fastifySwagger, {
  staticCSP: true,
  transformStaticCSP(header) {
    return header
  }
})
.ready((err) => {
  app.swagger();
})