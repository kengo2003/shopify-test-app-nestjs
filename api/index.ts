import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';
import { proxy } from 'aws-serverless-fastify';

let cachedServer: any;

async function bootstrap() {
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

  await app.init();

  const fastifyInstance = adapter.getInstance();
  cachedServer = fastifyInstance;
}
console.log('[handler] received request');
// export default async function handler(event: any, context: any) {
//   console.log('[handler] start');
//   if (!cachedServer) {
//     console.log('[handler] bootstrap');

//     await bootstrap();
//   }
//   console.log('[handler] proxy start');

//   return proxy(cachedServer, event, context, ['PROMISE']);
// }

export default async function handler() {
  return {
    statusCode: 200,
    body: 'Hello from temporary test handler!',
  };
}
