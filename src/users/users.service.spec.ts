import { ForbiddenException } from '@nestjs/common';
import { Model } from 'mongoose';
import { FeeInvoice } from '../payments/schemas/payment.schemas';
import { SignupDto } from '../auth/dto/signup.dto';
import { User } from './schemas/user.schema';
import { UsersService } from './users.service';

describe('UsersService UMS student linking', () => {
  const signup: SignupDto = {
    name: 'Test Student',
    email: 'student@example.edu',
    phone: '+91 9876543210',
    studentId: 'STU-1001',
    password: 'long-enough-test-password',
  };

  it('creates a student account only after matching trusted invoice contact data', async () => {
    const invoiceQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        customerEmail: 'student@example.edu',
        customerPhone: '9876543210',
      }),
    };
    const createdUser = { studentId: 'STU-1001', email: 'student@example.edu' };
    const invoices = { findOne: jest.fn().mockReturnValue(invoiceQuery) };
    const users = { create: jest.fn().mockResolvedValue([createdUser]) };
    const service = new UsersService(users as unknown as Model<User>, invoices as unknown as Model<FeeInvoice>);

    await expect(service.registerStudent(signup, 'bcrypt-hash')).resolves.toBe(createdUser);
    expect(invoices.findOne).toHaveBeenCalledWith({ studentId: 'STU-1001' });
    expect(users.create).toHaveBeenCalledWith([expect.objectContaining({
      email: 'student@example.edu',
      phone: '9876543210',
      studentId: 'STU-1001',
      passwordHash: 'bcrypt-hash',
    })]);
  });

  it('refuses account creation when the supplied contacts do not match UMS data', async () => {
    const invoiceQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue({
        customerEmail: 'student@example.edu',
        customerPhone: '9000000000',
      }),
    };
    const invoices = { findOne: jest.fn().mockReturnValue(invoiceQuery) };
    const users = { create: jest.fn() };
    const service = new UsersService(users as unknown as Model<User>, invoices as unknown as Model<FeeInvoice>);

    await expect(service.registerStudent(signup, 'bcrypt-hash')).rejects.toBeInstanceOf(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });
});