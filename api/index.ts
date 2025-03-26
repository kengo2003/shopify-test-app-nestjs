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

  await app.init();

  await app.listen(3000);

  cachedServer = adapter.getInstance();

  console.log('[bootstrap] Done');
}

export default async function handler(event: any, context: any) {
  console.log('[handler] INSIDE FUNCTION');

  if (!cachedServer) {
    console.log('[handler] Bootstrapping...');
    await bootstrap();
  }

  console.log('[handler] Proxying...');
  return proxy(cachedServer, event, context, ['PROMISE']);
}
