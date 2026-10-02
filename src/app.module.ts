import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        MONGODB_URI: Joi.string().uri({ scheme: ['mongodb', 'mongodb+srv'] }).required(),
        CASHFREE_BASE_URL: Joi.string().uri().default('https://sandbox.cashfree.com/pg'),
        CASHFREE_API_VERSION: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).default('2026-01-01'),
        CASHFREE_CLIENT_ID: Joi.string().required(),
        CASHFREE_CLIENT_SECRET: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        PAYMENT_SESSION_ENCRYPTION_KEY: Joi.string().custom((value, helpers) => {
          const encoded = value.startsWith('base64:') ? value.slice(7) : value;
          return Buffer.from(encoded, 'base64').length === 32 ? value : helpers.error('any.invalid');
        }).required(),
        PUBLIC_API_URL: Joi.string().uri().custom((value, helpers) =>
          value.startsWith('https://') ? value : helpers.error('any.invalid'),
        ).required(),
        FRONTEND_RETURN_URL: Joi.string().uri().required(),
        ERP_PAYMENT_WEBHOOK_URL: Joi.string().uri().custom((value, helpers) =>
          value.startsWith('https://') ? value : helpers.error('any.invalid'),
        ).optional(),
        ERP_PAYMENT_WEBHOOK_SECRET: Joi.string().min(32).optional(),
      }).and('ERP_PAYMENT_WEBHOOK_URL', 'ERP_PAYMENT_WEBHOOK_SECRET'),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        retryAttempts: 5,
        retryDelay: 3000,
        autoIndex: config.get<string>('NODE_ENV') !== 'production',
        serverSelectionTimeoutMS: 10_000,
      }),
    }),
    AuthModule,
    PaymentsModule,
  ],
})
export class AppModule {}