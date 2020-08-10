import fastify from "fastify";

import swaggerDefault, { fastifySwagger, SwaggerOptions } from "../..";
import * as fastifySwaggerStar from "../..";

const app = fastify();
const fastifySwaggerOptions: SwaggerOptions = {
  mode: "static",
  specification: {
    document: "path",
  },
  routePrefix: "/documentation",
  exposeRoute: true,
};

app.register(swaggerDefault, fastifySwaggerOptions);
app.register(fastifySwagger, fastifySwaggerOptions);
app.register(fastifySwaggerStar.default, fastifySwaggerOptions);
app.register(fastifySwaggerStar.fastifySwagger, fastifySwaggerOptions);

app.ready((err) => {
  app.swagger();
});
