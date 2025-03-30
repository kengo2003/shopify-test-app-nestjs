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
    origin: [
      'http://127.0.0.1:9292',
      'https://card-function-test.myshopify.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  await app.init();
  console.log('[bootstrap] Done');
}

export default async function handler(req: any, res: any) {
  console.log('[handler] Incoming request:', req.method, req.url);

  if (!app) {
    console.log('[handler] Bootstrapping Nest app...');
    await bootstrap();
  }

  const instance = app.getHttpAdapter().getInstance();

  const response = await instance.inject({
    method: req.method,
    url: req.url,
    payload: req.body,
    headers: req.headers,
  });

  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://127.0.0.1:9292',
    'https://card-function-test.myshopify.com',
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value as string);
  }
  res.end(response.body);
}
