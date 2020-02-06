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
    RawServer,
    RawRequest,
    RawReply
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
    consumes?: string[];
    security?: Array<{ [securityLabel: string]: string[] }>;
  }
}

declare function fastifySwagger<
  RawServer extends fastify.RawServerBase = fastify.RawServerDefault,
  RawRequest extends fastify.RawRequestDefaultExpression<RawServer> = fastify.RawRequestDefaultExpression<RawServer>,
  RawReply extends fastify.RawReplyDefaultExpression<RawServer> = fastify.RawReplyDefaultExpression<RawServer>,
  SwaggerOptions = (fastifySwagger.FastifyStaticSwaggerOptions | fastifySwagger.FastifyDynamicSwaggerOptions)
>(
  fastify : fastify.FastifyInstance<RawServer, RawRequest, RawReply>,
  opts : SwaggerOptions
) : void;

export = fastifySwagger;
