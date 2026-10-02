import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedPrincipal {
  userId: string;
  studentId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedPrincipal;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.header('authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('A bearer access token is required');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown; studentId?: unknown }>(token);
      if (typeof payload.sub !== 'string' || typeof payload.studentId !== 'string') {
        throw new UnauthorizedException('Invalid access token');
      }
      request.user = { userId: payload.sub, studentId: payload.studentId };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
