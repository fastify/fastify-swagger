import {FastifyPluginCallback, FastifySchema, onRequestHookHandler, preHandlerHookHandler} from 'fastify';
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
    deprecated?: boolean;
    tags?: string[];
    description?: string;
    summary?: string;
    consumes?: string[];
    produces?: string[];
    externalDocs?: OpenAPIV2.ExternalDocumentationObject | OpenAPIV3.ExternalDocumentationObject;
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
  /**
   * route hooks
   */
  uiHooks?: FastifySwaggerUiHooksOptions
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
  layout: string
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

type JSONValue =
    | string
    | null
    | number
    | boolean
    | JSONObject
    | Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}

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
   * custom function to transform the route's schema and url
   */
  transform?: <S extends FastifySchema = FastifySchema>({schema, url}: {schema: S, url: string}) => { schema: JSONObject, url: string };

  refResolver?: {
    /** Clone the input schema without changing it. Default to `false`. */
    clone?: boolean;
    buildLocalReference: (
      /** The `json` that is being resolved. */
      json: JSONObject,
      /** The `baseUri` object of the schema. */
      baseUri: {
        scheme?: string;
        userinfo?: string;
        host?: string;
        port?: number | string;
        path?: string;
        query?: string;
        fragment?: string;
        reference?: string;
        error?: string;
      },
      /** `fragment` is the `$ref` string when the `$ref` is a relative reference. */
      fragment: string,
      /** `i` is a local counter to generate a unique key. */
      i: number
    ) => string;
  }
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

export type FastifySwaggerUiHooksOptions = Partial<{
  onRequest?: onRequestHookHandler,
  preHandler?: preHandlerHookHandler,
}>

export default fastifySwagger;
