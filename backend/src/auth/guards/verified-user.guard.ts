import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VERIFIED_USER_KEY } from '../decorators/verified-user.decorator';

@Injectable()
export class VerifiedUserGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresVerification = this.reflector.getAllAndOverride<boolean>(VERIFIED_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresVerification) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user?.isVerified) {
      throw new ForbiddenException('Email verification required. Please verify your email address.');
    }
    
    return true;
  }
}