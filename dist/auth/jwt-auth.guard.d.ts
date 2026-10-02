import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
export interface AuthenticatedPrincipal {
    userId: string;
    studentId: string;
}
export interface AuthenticatedRequest extends Request {
    user: AuthenticatedPrincipal;
}
export declare class JwtAuthGuard implements CanActivate {
    private readonly jwt;
    constructor(jwt: JwtService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
