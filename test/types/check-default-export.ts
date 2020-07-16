import { expectAssignable } from 'tsd';

import fastifySwagger from '../..';
import * as fastifySwaggerNamespace from '../..';
import fastifySwaggerRequired = require('../..')

expectAssignable<typeof fastifySwagger>(fastifySwaggerNamespace);
expectAssignable<typeof fastifySwaggerRequired>(fastifySwaggerNamespace);
