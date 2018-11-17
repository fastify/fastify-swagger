import * as http from 'http';
import * as fastify from 'fastify';

// Type definitions for swagger-schema-official 2.0
// Project: http://swagger.io/specification/
// Definitions by: Mohsen Azimi <https://github.com/mohsen1>, Ben Southgate <https://github.com/bsouthga>, Nicholas Merritt <https://github.com/nimerritt>, Mauri Edo <https://github.com/mauriedo>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

interface Info {
  title: string;
  version: string;
  description?: string;
  termsOfService?: string;
  contact?: Contact;
  license?: License;
}

interface Contact {
  name?: string;
  email?: string;
  url?: string;
}

interface License {
  name: string;
  url?: string;
}

interface ExternalDocs {
  url: string;
  description?: string;
}

interface Tag {
  name: string;
  description?: string;
  externalDocs?: ExternalDocs;
}

interface Header extends BaseSchema {
  type: string;
}

// ----------------------------- Parameter -----------------------------------
interface BaseParameter {
  name: string;
  in: string;
  required?: boolean;
  description?: string;
}

interface BodyParameter extends BaseParameter {
  schema?: Schema;
}

interface QueryParameter extends BaseParameter, BaseSchema {
  type: string;
  allowEmptyValue?: boolean;
}

interface PathParameter extends BaseParameter, BaseSchema {
  type: string;
  required: boolean;
}

interface HeaderParameter extends BaseParameter, BaseSchema {
  type: string;
}

interface FormDataParameter extends BaseParameter, BaseSchema {
  type: string;
  collectionFormat?: string;
  allowEmptyValue?: boolean;
}

type Parameter =
  | BodyParameter
  | FormDataParameter
  | QueryParameter
  | PathParameter
  | HeaderParameter;

// ------------------------------- Path --------------------------------------
interface Path {
  $ref?: string;
  get?: Operation;
  put?: Operation;
  post?: Operation;
  delete?: Operation;
  options?: Operation;
  head?: Operation;
  patch?: Operation;
  parameters?: Array<Parameter | Reference>;
}

// ----------------------------- Operation -----------------------------------
interface Operation {
  responses: { [responseName: string]: Response | Reference };
  summary?: string;
  description?: string;
  externalDocs?: ExternalDocs;
  operationId?: string;
  produces?: string[];
  consumes?: string[];
  parameters?: Array<Parameter | Reference>;
  schemes?: string[];
  deprecated?: boolean;
  security?: Security[];
  tags?: string[];
}

// ----------------------------- Reference -----------------------------------
interface Reference {
  $ref: string;
}

// ----------------------------- Response ------------------------------------
interface Response {
  description: string;
  schema?: Schema;
  headers?: { [headerName: string]: Header };
  examples?: { [exampleName: string]: {} };
}

// ------------------------------ Schema -------------------------------------
interface BaseSchema {
  format?: string;
  title?: string;
  description?: string;
  default?: string | boolean | number | {};
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  enum?: Array<string | boolean | number | {}>;
  type?: string;
  items?: Schema | Schema[];
}

interface Schema extends BaseSchema {
  $ref?: string;
  allOf?: Schema[];
  additionalProperties?: Schema;
  properties?: { [propertyName: string]: Schema };
  discriminator?: string;
  readOnly?: boolean;
  xml?: XML;
  externalDocs?: ExternalDocs;
  example?: any;
  required?: string[];
}

interface XML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

// ----------------------------- Security ------------------------------------
interface BaseSecurity {
  type: string;
  description?: string;
}

// tslint:disable-next-line no-empty-interface
interface BasicAuthenticationSecurity extends BaseSecurity {
  // It's the exact same interface as BaseSecurity
}

interface ApiKeySecurity extends BaseSecurity {
  name: string;
  in: string;
}

interface BaseOAuthSecuirty extends BaseSecurity {
  flow: string;
}

interface OAuth2ImplicitSecurity extends BaseOAuthSecuirty {
  authorizationUrl: string;
}

interface OAuth2PasswordSecurity extends BaseOAuthSecuirty {
  tokenUrl: string;
  scopes?: OAuthScope[];
}

interface OAuth2ApplicationSecurity extends BaseOAuthSecuirty {
  tokenUrl: string;
  scopes?: OAuthScope[];
}

interface OAuth2AccessCodeSecurity extends BaseOAuthSecuirty {
  tokenUrl: string;
  authorizationUrl: string;
  scopes?: OAuthScope[];
}

interface OAuthScope {
  [scopeName: string]: string;
}

type Security =
  | BasicAuthenticationSecurity
  | OAuth2AccessCodeSecurity
  | OAuth2ApplicationSecurity
  | OAuth2ImplicitSecurity
  | OAuth2PasswordSecurity
  | ApiKeySecurity;

interface SwaggerSpec {
  swagger: string;
  info: Info;
  externalDocs?: ExternalDocs;
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  paths: { [pathName: string]: Path };
  definitions?: { [definitionsName: string]: Schema };
  parameters?: { [parameterName: string]: BodyParameter | QueryParameter };
  responses?: { [responseName: string]: Response };
  security?: Array<{ [securityDefinitionName: string]: string[] }>;
  securityDefinitions?: { [securityDefinitionName: string]: Security };
  tags?: Tag[];
}

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
    swagger?: Partial<SwaggerSpec>;
  }

  interface StaticPathSpec {
    path: string;
    postProcessor?: (spec: SwaggerSpec) => SwaggerSpec;
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
    ) => SwaggerSpec;
  }
}

declare let fastifySwagger: fastify.Plugin<
  http.Server,
  http.IncomingMessage,
  http.ServerResponse,
  fastifySwagger.FastifyStaticSwaggerOptions | fastifySwagger.FastifyDynamicSwaggerOptions
>;

export = fastifySwagger;
