import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from '../src/app.module';

let app: NestFastifyApplication;

async function bootstrap() {
  console.log('[bootstrap] Start');
  const adapter = new FastifyAdapter();
  app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  app.enableCors({
    origin: ['https://card-function-test.myshopify.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  await app.init();
  console.log('[bootstrap] Done');
}

export default async function handler(req: any, res: any) {
  console.log('[handler] INSIDE FUNCTION');

  if (!app) {
    console.log('[handler] Bootstrapping...');
    await bootstrap();
  }

  const instance = app.getHttpAdapter().getInstance();

  console.log(`[handler] Injecting request: ${req.method} ${req.url}`);

  const response = await instance.inject({
    method: req.method,
    url: req.url,
    payload: req.body,
    headers: req.headers,
  });

  console.log('[handler] Response status:', response.statusCode);
  console.log('[handler] Response body:', response.body);

  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value as string);
  }
  res.end(response.body);
}
