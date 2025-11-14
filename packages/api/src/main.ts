import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino logger
  app.useLogger(app.get(Logger));

  // Enable CORS
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:3002',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Laboratory LIMS API')
    .setDescription('Laboratory Information Management System REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('roles', 'Role management')
    .addTag('clients', 'Client master data')
    .addTag('methods', 'Method master data')
    .addTag('specifications', 'Specification master data')
    .addTag('sections', 'Section master data')
    .addTag('test-definitions', 'Test definition master data')
    .addTag('test-packs', 'Test pack master data')
    .addTag('jobs', 'Job management')
    .addTag('samples', 'Sample management')
    .addTag('tests', 'Test management')
    .addTag('reports', 'Report management')
    .addTag('audit', 'Audit log')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(
    `📚 API documentation available at http://localhost:${port}/api/docs`,
  );
}
bootstrap();
