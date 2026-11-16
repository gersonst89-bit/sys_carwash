import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, MODULE_KEY } from '../decorators/auth.decorator';

@Injectable()
export class AuthModuleGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization || '';
    const token =
      authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : (req.query?.token as string) || '';

    if (!token) {
      throw new UnauthorizedException('Sesión no iniciada o token ausente.');
    }

    let user: any;
    try {
      user = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'carwash_pro_super_secret_jwt_key_2026',
      });
      req.user = user;
    } catch {
      throw new UnauthorizedException('Sesión expirada. Vuelve a iniciar sesión.');
    }

    const reqModule = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (reqModule) {
      const perms = (user.permisos || '').trim();
      if (perms !== '*') {
        const list = perms.split(',').map((s: string) => s.trim());
        if (!list.includes(reqModule)) {
          throw new ForbiddenException(`No tienes permiso para acceder al módulo: ${reqModule}`);
        }
      }
    }
    return true;
  }
}
