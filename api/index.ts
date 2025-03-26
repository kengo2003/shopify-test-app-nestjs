import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { proxy } from 'aws-serverless-fastify';

let cachedServer: any;

async function bootstrap() {
  console.log('[bootstrap] Start');

  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableCors({
    origin: ['https://card-function-test.myshopify.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  const fastifyInstance = adapter.getInstance();
  fastifyInstance.addHook('onRequest', (req, reply, done) => {
    console.log(`[fastify] incoming request: ${req.method} ${req.url}`);
    done();
  });

  await app.init();
  cachedServer = fastifyInstance;

  console.log('[bootstrap] Done');
}

export default async function handler(event: any, context: any) {
  console.log('[handler] start');

  if (!cachedServer) {
    console.log('[handler] bootstrapping...');
    await bootstrap();
  }

  console.log('[handler] proxy start');
  console.log('[handler] event keys:', Object.keys(event));

  return proxy(cachedServer, event, context, ['PROMISE']);
}
