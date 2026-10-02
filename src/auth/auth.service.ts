import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';

export interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: '1h';
  user: { userId: string; studentId: string; name: string; email: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.registerStudent(dto, passwordHash);
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.issueToken(user);
  }

  private async issueToken(user: any): Promise<AuthResponse> {
    const publicUser = this.users.toPublicUser(user);
    const accessToken = await this.jwt.signAsync({
      sub: publicUser.userId,
      studentId: publicUser.studentId,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: '1h',
      user: publicUser,
    };
  }
}
