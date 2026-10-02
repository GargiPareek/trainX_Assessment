import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { mongo, Model } from 'mongoose';
import { FeeInvoice } from '../payments/schemas/payment.schemas';
import { SignupDto } from '../auth/dto/signup.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<User>,
    @InjectModel(FeeInvoice.name) private readonly invoices: Model<FeeInvoice>,
  ) {}

  async registerStudent(dto: SignupDto, passwordHash: string): Promise<User> {
    const email = dto.email.trim().toLowerCase();
    const studentId = dto.studentId.trim();
    const phone = normalizePhone(dto.phone);
    const invoice = await this.invoices.findOne({ studentId }).select('customerEmail customerPhone').lean().exec();
    if (!invoice || normalizePhone(invoice.customerPhone) !== phone) {
      throw new ForbiddenException('Student details could not be matched with the UMS records');
    }
    if (invoice.customerEmail && invoice.customerEmail.trim().toLowerCase() !== email) {
      throw new ForbiddenException('Student details could not be matched with the UMS records');
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
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === 11000) {
        throw new ConflictException('An account already exists for this email or student ID');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<any> {
    return this.users.findOne({ email: email.trim().toLowerCase(), active: true })
      .select('+passwordHash').exec();
  }

  toPublicUser(user: any): { userId: string; studentId: string; name: string; email: string } {
    return {
      userId: user._id.toString(),
      studentId: user.studentId,
      name: user.name,
      email: user.email,
    };
  }
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits;
}
