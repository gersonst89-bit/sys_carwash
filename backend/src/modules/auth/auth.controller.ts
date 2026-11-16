import { Body, Controller, Get, Post, Put, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser, Public } from '../../common/decorators/auth.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: { usuario: string; password: string },
    @Req() req: Request,
  ) {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
    return this.authService.login(body.usuario, body.password, ip);
  }

  @Post('logout')
  async logout(@CurrentUser() user: any, @Req() req: Request) {
    const ip = req.ip || '';
    if (user) {
      await this.prisma.logAction(user.id, user.usuario, 'logout', 'Cierre de sesión', ip);
    }
    return { ok: true };
  }

  @Public()
  @Get('empresa')
  async empresa() {
    return this.authService.getEmpresaConfig();
  }

  @Get('me')
  async me(@CurrentUser() user: any) {
    return this.authService.me(user.id);
  }

  @Get('perfil')
  async getPerfil(@CurrentUser() user: any) {
    return this.authService.me(user.id);
  }

  @Put('perfil')
  async updatePerfil(
    @CurrentUser() user: any,
    @Body() body: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || '';
    return this.authService.updatePerfil(user.id, body, ip);
  }
}
