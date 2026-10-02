import * as bcrypt from 'bcryptjs';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService student account signup', () => {
  it('hashes the password and returns a signed token with a safe account profile', async () => {
    const user = {
      _id: { toString: () => '66ef3099401a926649193211' },
      name: 'A Student',
      email: 'student@example.edu',
      studentId: 'STU-1001',
    };
    const users = {
      registerStudent: jest.fn().mockResolvedValue(user),
      toPublicUser: jest.fn().mockReturnValue({
        userId: '66ef3099401a926649193211',
        studentId: 'STU-1001',
        name: 'A Student',
        email: 'student@example.edu',
      }),
    };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt-token') };
    const service = new AuthService(users as never, jwt as never);
    const dto = {
      name: 'A Student',
      email: 'student@example.edu',
      phone: '9876543210',
      studentId: 'STU-1001',
      password: 'safe-test-password-123',
    };

    const result = await service.signup(dto);
    const savedHash = users.registerStudent.mock.calls[0][1] as string;

    expect(await bcrypt.compare(dto.password, savedHash)).toBe(true);
    expect(users.registerStudent).toHaveBeenCalledWith(dto, savedHash);
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user._id.toString(), studentId: user.studentId });
    expect(result).toEqual({
      accessToken: 'signed-jwt-token',
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: users.toPublicUser.mock.results[0].value,
    });
  });

  it('rejects invalid login credentials with a generic authentication error', async () => {
    const users = { findByEmail: jest.fn().mockResolvedValue(null) };
    const jwt = { signAsync: jest.fn() };
    const service = new AuthService(users as never, jwt as never);

    await expect(service.login({ email: 'missing@example.edu', password: 'wrong-password' }))
      .rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
