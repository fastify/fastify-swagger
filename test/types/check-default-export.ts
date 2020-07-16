import { expectAssignable } from 'tsd';

import fastifySwagger from '../..';
import * as fastifySwaggerNamespace from '../..';

expectAssignable<typeof fastifySwagger>(fastifySwaggerNamespace);
