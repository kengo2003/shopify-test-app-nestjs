import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import expressPkg from 'express/package.json';

console.log('Running with express version:', expressPkg.version);

let cachedServer: express.Express;

async function createServer(): Promise<express.Express> {
  const app = express();
  const nestApp = await NestFactory.create(AppModule, new ExpressAdapter(app));

  nestApp.enableCors({
    origin: ['https://card-function-test.myshopify.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  });

  await nestApp.init();
  return app;
}

export default async function handler(req: Request, res: Response) {
  if (!cachedServer) {
    cachedServer = await createServer();
  }
  return cachedServer(req, res);
}
