import { FastifyPluginCallback, FastifySchema, RouteOptions, onRequestHookHandler, preHandlerHookHandler } from 'fastify';
import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Swagger-UI Vendor Extensions
 * @see https://support.smartbear.com/swaggerhub/docs/apis/vendor-extensions.html#api-docs-x-tokenname
 */
declare module 'openapi-types' {
  namespace OpenAPIV3 {
    interface OAuth2SecurityScheme {
      'x-tokenName'?: string;
    }
  }
  namespace OpenAPIV2 {
    interface SecuritySchemeOauth2Base {
      'x-tokenName'?: string;
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    swagger:
    ((opts?: { yaml?: false }) => OpenAPI.Document) &
    ((opts: { yaml: true }) => string) &
    ((opts: { yaml: boolean }) => OpenAPI.Document | string);

    swaggerCSP: {
      script: string[];
      style: string[];
    }
  }

  interface FastifySchema {
    hide?: boolean;
    deprecated?: boolean;
    tags?: readonly string[];
    description?: string;
    summary?: string;
    consumes?: readonly string[];
    produces?: readonly string[];
    externalDocs?: OpenAPIV2.ExternalDocumentationObject | OpenAPIV3.ExternalDocumentationObject;
    security?: ReadonlyArray<{ [securityLabel: string]: readonly string[] }>;
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
  
  interface FastifyContextConfig {
    swaggerTransform?: SwaggerTransform | false;
  }
}

type SwaggerTransform = <S extends FastifySchema = FastifySchema>({
  schema,
  url,
  route,
  swaggerObject,
  openapiObject,
}: {
  schema: S;
  url: string;
  route: RouteOptions;
  swaggerObject: Partial<OpenAPIV2.Document>;
  openapiObject: Partial<OpenAPIV3.Document | OpenAPIV3_1.Document>;
}) => { schema: FastifySchema; url: string }

type FastifySwagger = FastifyPluginCallback<fastifySwagger.SwaggerOptions>

declare namespace fastifySwagger {
  export type SwaggerOptions = (FastifyStaticSwaggerOptions | FastifyDynamicSwaggerOptions);
  export interface FastifySwaggerOptions {
    mode?: 'static' | 'dynamic';
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
    supportedSubmitMethods: Array<'get' | 'post' | 'put' | 'delete' | 'patch' | 'options'>
    persistAuthorization: boolean
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
    openapi?: Partial<OpenAPIV3.Document | OpenAPIV3_1.Document>
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
    transform?: SwaggerTransform;

    /**
     * custom function to transform the openapi or swagger object before it is rendered
     */
    transformObject?: ({ swaggerObject, openapiObject }: {
      swaggerObject: Partial<OpenAPIV2.Document>;
      openapiObject: Partial<OpenAPIV3.Document | OpenAPIV3_1.Document>;
    }) => Partial<OpenAPIV2.Document> | Partial<OpenAPIV3.Document | OpenAPIV3_1.Document>;

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

  export function formatParamUrl (paramUrl: string): string

  export const fastifySwagger: FastifySwagger
  export { fastifySwagger as default }
}

declare function fastifySwagger(...params: Parameters<FastifySwagger>): ReturnType<FastifySwagger>

export = fastifySwagger;
