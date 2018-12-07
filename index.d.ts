import * as http from 'http';
import * as fastify from 'fastify';
import * as SwaggerSchema from 'swagger-schema-official';

declare namespace fastifySwagger {
  interface FastifySwaggerOptions {
    mode?: 'static' | 'dynamic';
  }

  interface FastifyDynamicSwaggerOptions extends FastifySwaggerOptions {
    mode?: 'dynamic';
    /**
     * Overwrite the swagger url end-point
     * @default /documentation
     */
    routePrefix?: string;
    /**
     *  To expose the documentation api
     * @default false
     */
    exposeRoute?: boolean;
    swagger?: Partial<SwaggerSchema.Spec>;
  }

  interface StaticPathSpec {
    path: string;
    postProcessor?: (spec: SwaggerSchema.Spec) => SwaggerSchema.Spec;
  }

  interface StaticDocumentSpec {
    document: string;
  }

  interface FastifyStaticSwaggerOptions extends FastifySwaggerOptions {
    mode: 'static';
    specification: StaticPathSpec | StaticDocumentSpec;
  }
}

declare module 'fastify' {
  interface FastifyInstance<
    HttpServer = http.Server,
    HttpRequest = http.IncomingMessage,
    HttpResponse = http.ServerResponse
  > {
    swagger: (
      opts?: {
        yaml?: boolean;
      }
    ) => SwaggerSchema.Spec;
  }
}

declare let fastifySwagger: fastify.Plugin<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  fastifySwagger.FastifyStaticSwaggerOptions | fastifySwagger.FastifyDynamicSwaggerOptions
>;

export = fastifySwagger;
