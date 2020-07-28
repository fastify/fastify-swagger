import { FastifyPlugin } from 'fastify';
import * as SwaggerSchema from 'swagger-schema-official';

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

export interface FastifyDynamicSwaggerOptions extends FastifySwaggerOptions {
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

export interface FastifyStaticSwaggerOptions extends FastifySwaggerOptions {
  mode: 'static';
  specification: StaticPathSpec | StaticDocumentSpec;
}

declare module 'fastify' {
  interface FastifyInstance {
    swagger: (
      opts?: {
        yaml?: boolean;
      }
    ) => SwaggerSchema.Spec;
  }

  interface FastifySchema {
    hide?: boolean;
    tags?: string[];
    description?: string;
    summary?: string;
    consumes?: string[];
    security?: Array<{ [securityLabel: string]: string[] }>;
  }
}

export type SwaggerOptions = (FastifyStaticSwaggerOptions | FastifyDynamicSwaggerOptions)

declare const fastifySwagger: FastifyPlugin<SwaggerOptions>

export = fastifySwagger;
