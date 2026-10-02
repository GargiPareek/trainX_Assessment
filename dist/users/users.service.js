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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const payment_schemas_1 = require("../payments/schemas/payment.schemas");
const user_schema_1 = require("./schemas/user.schema");
let UsersService = class UsersService {
    users;
    invoices;
    constructor(users, invoices) {
        this.users = users;
        this.invoices = invoices;
    }
    async registerStudent(dto, passwordHash) {
        const email = dto.email.trim().toLowerCase();
        const studentId = dto.studentId.trim();
        const phone = normalizePhone(dto.phone);
        const invoice = await this.invoices.findOne({ studentId }).select('customerEmail customerPhone').lean().exec();
        if (!invoice || normalizePhone(invoice.customerPhone) !== phone) {
            throw new common_1.ForbiddenException('Student details could not be matched with the UMS records');
        }
        if (invoice.customerEmail && invoice.customerEmail.trim().toLowerCase() !== email) {
            throw new common_1.ForbiddenException('Student details could not be matched with the UMS records');
        }
        try {
            const [user] = await this.users.create([{
                    name: dto.name.trim(),
                    email,
                    phone,
                    studentId,
                    passwordHash,
                    active: true,
                }]);
            return user;
        }
        catch (error) {
            if (error instanceof mongoose_2.mongo.MongoServerError && error.code === 11000) {
                throw new common_1.ConflictException('An account already exists for this email or student ID');
            }
            throw error;
        }
    }
    findByEmail(email) {
        return this.users.findOne({ email: email.trim().toLowerCase(), active: true })
            .select('+passwordHash').exec();
    }
    toPublicUser(user) {
        return {
            userId: user._id.toString(),
            studentId: user.studentId,
            name: user.name,
            email: user.email,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(payment_schemas_1.FeeInvoice.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], UsersService);
function normalizePhone(value) {
    const digits = value.replace(/\D/g, '');
    return digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits;
}
//# sourceMappingURL=users.service.js.map