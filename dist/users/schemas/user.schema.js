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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSchema = exports.User = void 0;
const mongoose_1 = require("@nestjs/mongoose");
let User = class User {
    name;
    email;
    phone;
    studentId;
    passwordHash;
    active;
    createdAt;
    updatedAt;
};
exports.User = User;
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true, minlength: 2, maxlength: 100 }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, lowercase: true, trim: true, unique: true, maxlength: 254 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, minlength: 10, maxlength: 20 }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, trim: true, unique: true, maxlength: 100 }),
    __metadata("design:type", String)
], User.prototype, "studentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, required: true, select: false }),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean, default: true, required: true }),
    __metadata("design:type", Boolean)
], User.prototype, "active", void 0);
exports.User = User = __decorate([
    (0, mongoose_1.Schema)({ collection: 'users', timestamps: true, versionKey: false })
], User);
exports.UserSchema = mongoose_1.SchemaFactory.createForClass(User);
//# sourceMappingURL=user.schema.js.map