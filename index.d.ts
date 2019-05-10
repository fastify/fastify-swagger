import * as http from 'http';
import * as fastify from 'fastify';
import * as SwaggerSchema from 'swagger-schema-official';
import * as http2 from 'http2';

declare namespace fastifySwagger {
  interface FastifySwaggerOptions {
    mode?: 'static' | 'dynamic';
    /**
     * Overwrite the swagger url end-point
     * @default /documentation
     */
    routePrefix?: string;
    /**
     * To expose the documentation api
     * @default false
     */
    exposeRoute?: boolean;
  }

  interface FastifyDynamicSwaggerOptions extends FastifySwaggerOptions {
    mode?: 'dynamic';
    swagger?: Partial<SwaggerSchema.Spec>;
    /**
     * Overwrite the route schema
     */
    transform?: Function;
  }

  interface StaticPathSpec {
    path: string;
    postProcessor?: (spec: SwaggerSchema.Spec) => SwaggerSchema.Spec;
    baseDir: string;
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
    HttpServer,
    HttpRequest,
    HttpResponse
  > {
    swagger: (
      opts?: {
        yaml?: boolean;
      }
    ) => SwaggerSchema.Spec;
  }

  interface RouteSchema {
    hide?: boolean;
    tags?: string[];
    description?: string;
    summary?: string;
    security?: [{ [securityLabel: string]: string[] }];
  }
}

declare function fastifySwagger<
  HttpServer extends (http.Server | http2.Http2Server),
  HttpRequest extends (http.IncomingMessage | http2.Http2ServerRequest),
  HttpResponse extends (http.ServerResponse | http2.Http2ServerResponse),
  SwaggerOptions = (fastifySwagger.FastifyStaticSwaggerOptions | fastifySwagger.FastifyDynamicSwaggerOptions)
>(
  fastify : fastify.FastifyInstance<HttpServer, HttpRequest, HttpResponse>, 
  opts : SwaggerOptions
) : void;

export = fastifySwagger;
