import { FastifyPlugin } from 'fastify';
import * as SwaggerSchema from 'swagger-schema-official';

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

export const fastifySwagger: FastifyPlugin<SwaggerOptions>;
 
export type SwaggerOptions = (FastifyStaticSwaggerOptions | FastifyDynamicSwaggerOptions);
export interface FastifySwaggerOptions {
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
  hiddenTag?: string;
  /**
   * Overwrite the route schema
   */
  transform?: Function;
}

export interface StaticPathSpec {
  path: string;
  postProcessor?: (spec: SwaggerSchema.Spec) => SwaggerSchema.Spec;
  baseDir: string;
}

export interface StaticDocumentSpec {
  document: string;
}

export interface FastifyStaticSwaggerOptions extends FastifySwaggerOptions {
  mode: 'static';
  specification: StaticPathSpec | StaticDocumentSpec;
}

export default fastifySwagger;