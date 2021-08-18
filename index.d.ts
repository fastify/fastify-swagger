import { FastifyPluginCallback } from 'fastify';
import { OpenAPI, OpenAPIV2, OpenAPIV3 } from 'openapi-types';

declare module 'fastify' {
  interface FastifyInstance {
    swagger: (
      opts?: {
        yaml?: boolean;
      }
    ) => OpenAPI.Document;

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

  interface RouteShorthandOptions {
    links?: {
      [statusCode: string]: OpenAPIV3.ResponseObject['links'];
    }
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
  /**
   * Swagger UI Config
   */
  uiConfig?: FastifySwaggerUiConfigOptions
  initOAuth?: FastifySwaggerInitOAuthOptions
  /**
   * CSP Config
   */
  staticCSP?: boolean | string | Record<string, string | string[]>
  transformStaticCSP?: (header: string) => string
}

export type FastifySwaggerUiConfigOptions = Partial<{
  deepLinking: boolean
  displayOperationId: boolean
  defaultModelsExpandDepth: number
  defaultModelExpandDepth: number
  defaultModelRendering: string
  displayRequestDuration: boolean
  docExpansion: string
  filter: boolean | string
  maxDisplayedTags: number
  showExtensions: boolean
  showCommonExtensions: boolean
  useUnsafeMarkdown: boolean
  syntaxHighlight: {
    activate?: boolean
    theme?: string
  } | false
  tryItOutEnabled: boolean
  validatorUrl: string | null
}>

export type FastifySwaggerInitOAuthOptions = Partial<{
  clientId: string,
  clientSecret: string,
  realm: string,
  appName: string,
  scopeSeparator: string,
  scopes: string | string[],
  additionalQueryStringParams: { [key: string]: any },
  useBasicAuthenticationWithAccessCodeGrant: boolean,
  usePkceWithAuthorizationCodeGrant: boolean
}>

export interface FastifyDynamicSwaggerOptions extends FastifySwaggerOptions {
  mode?: 'dynamic';
  swagger?: Partial<OpenAPIV2.Document>;
  openapi?: Partial<OpenAPIV3.Document>
  hiddenTag?: string;
  hideUntagged?: boolean;
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
