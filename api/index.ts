import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: ReturnType<typeof express> | null = null;

export default async function handler(req: Request, res: Response) {
  if (!cachedApp) {
    const expressInstance = express();

    expressInstance.use(express.json());
    expressInstance.use(express.urlencoded({ extended: true }));

    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressInstance),
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    app.enableCors({
      origin: ['https://card-function-test.myshopify.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
    });

    await app.init();
    cachedApp = expressInstance;
  }

  return cachedApp(req, res);
}
