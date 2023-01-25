import fastify from "fastify";

import swaggerDefault, { fastifySwagger, SwaggerOptions } from "../..";
import * as fastifySwaggerStar from "../..";
import { minimalOpenApiV3_1Document } from './minimal-openapiV3_1-document';

const app = fastify();
const fastifySwaggerOptions: SwaggerOptions = {
  mode: "static",
  specification: {
    document: minimalOpenApiV3_1Document,
  }
};

app.register(swaggerDefault, fastifySwaggerOptions);
app.register(fastifySwagger, fastifySwaggerOptions);
app.register(fastifySwaggerStar.default, fastifySwaggerOptions);
app.register(fastifySwaggerStar.fastifySwagger, fastifySwaggerOptions);

app.ready((err) => {
  app.swagger();
});
