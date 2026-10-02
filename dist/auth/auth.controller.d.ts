import { AuthResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
export declare class AuthController {
    private readonly auth;
    constructor(auth: AuthService);
    signup(dto: SignupDto): Promise<AuthResponse>;
    login(dto: LoginDto): Promise<AuthResponse>;
}
