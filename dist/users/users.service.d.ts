import { Model } from 'mongoose';
import { FeeInvoice } from '../payments/schemas/payment.schemas';
import { SignupDto } from '../auth/dto/signup.dto';
import { User } from './schemas/user.schema';
export declare class UsersService {
    private readonly users;
    private readonly invoices;
    constructor(users: Model<User>, invoices: Model<FeeInvoice>);
    registerStudent(dto: SignupDto, passwordHash: string): Promise<User>;
    findByEmail(email: string): Promise<any>;
    toPublicUser(user: any): {
        userId: string;
        studentId: string;
        name: string;
        email: string;
    };
}
