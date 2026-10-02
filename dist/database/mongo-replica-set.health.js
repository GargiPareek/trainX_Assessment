"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MongoReplicaSetHealth_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoReplicaSetHealth = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let MongoReplicaSetHealth = MongoReplicaSetHealth_1 = class MongoReplicaSetHealth {
    connection;
    logger = new common_1.Logger(MongoReplicaSetHealth_1.name);
    constructor(connection) {
        this.connection = connection;
    }
    async onApplicationBootstrap() {
        const hello = await this.connection.db.admin().command({ hello: 1 });
        if (!hello.setName) {
            throw new Error('MongoDB replica set is required: payment and webhook flows use multi-document transactions');
        }
        this.logger.log(`Connected to MongoDB replica set ${hello.setName}`);
    }
};
exports.MongoReplicaSetHealth = MongoReplicaSetHealth;
exports.MongoReplicaSetHealth = MongoReplicaSetHealth = MongoReplicaSetHealth_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], MongoReplicaSetHealth);
//# sourceMappingURL=mongo-replica-set.health.js.map