"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const Joi = __importStar(require("joi"));
const auth_module_1 = require("./auth/auth.module");
const payments_module_1 = require("./payments/payments.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
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
                    PUBLIC_API_URL: Joi.string().uri().custom((value, helpers) => value.startsWith('https://') ? value : helpers.error('any.invalid')).required(),
                    FRONTEND_RETURN_URL: Joi.string().uri().required(),
                    ERP_PAYMENT_WEBHOOK_URL: Joi.string().uri().custom((value, helpers) => value.startsWith('https://') ? value : helpers.error('any.invalid')).optional(),
                    ERP_PAYMENT_WEBHOOK_SECRET: Joi.string().min(32).optional(),
                }).and('ERP_PAYMENT_WEBHOOK_URL', 'ERP_PAYMENT_WEBHOOK_SECRET'),
            }),
            mongoose_1.MongooseModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    uri: config.getOrThrow('MONGODB_URI'),
                    retryAttempts: 5,
                    retryDelay: 3000,
                    autoIndex: config.get('NODE_ENV') !== 'production',
                    serverSelectionTimeoutMS: 10_000,
                }),
            }),
            auth_module_1.AuthModule,
            payments_module_1.PaymentsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map