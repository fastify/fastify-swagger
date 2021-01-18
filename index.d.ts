import { FastifyPluginCallback } from 'fastify';
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';
import * as SwaggerSchema from 'swagger-schema-official';

declare module 'fastify' {
  interface FastifyInstance {
    swagger: (
      opts?: {
        yaml?: boolean;
      }
    ) => SwaggerSchema.Spec;

    swaggerCSP: {
      script: string[];
      style: string[];
    }
  }

  interface FastifySchema {
    hide?: boolean;
    tags?: string[];
    description?: string;
    summary?: string;
    consumes?: string[];
    security?: Array<{ [securityLabel: string]: string[] }>;
    /**
     * OpenAPI operation unique identifier
     */
    operationId?: string;    
  }
}

export const fastifySwagger: FastifyPluginCallback<SwaggerOptions>;
 
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
  swagger?: Partial<OpenAPIV2.Document>;
  openapi?: Partial<OpenAPIV3.Document>
  hiddenTag?: string;
  /**
   * Strips matching base path from routes in documentation
   * @default true
   */
  stripBasePath?: boolean;
  /**
   * Overwrite the route schema
   */
  transform?: Function;
}

export interface StaticPathSpec {
  path: string;
  postProcessor?: (spec: OpenAPI.Document) => OpenAPI.Document;
  baseDir: string;
}

export interface StaticDocumentSpec {
  document: OpenAPIV2.Document | OpenAPIV3.Document;
}

export interface FastifyStaticSwaggerOptions extends FastifySwaggerOptions {
  mode: 'static';
  specification: StaticPathSpec | StaticDocumentSpec;
}

export default fastifySwagger;
