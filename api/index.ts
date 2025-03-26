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

  const fastifyInstance = adapter.getInstance(); // ✅ ここから本物の Fastify を取得
  cachedServer = fastifyInstance;
}

export default async function handler(event: any, context: any) {
  if (!cachedServer) {
    await bootstrap();
  }

  return proxy(cachedServer, event, context, ['PROMISE']);
}
