import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
export interface AuthResponse {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: '1h';
    user: {
        userId: string;
        studentId: string;
        name: string;
        email: string;
    };
}
export declare class AuthService {
    private readonly users;
    private readonly jwt;
    constructor(users: UsersService, jwt: JwtService);
    signup(dto: SignupDto): Promise<AuthResponse>;
    login(dto: LoginDto): Promise<AuthResponse>;
    private issueToken;
}
