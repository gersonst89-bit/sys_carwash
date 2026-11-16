import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

interface LoginAttempt {
  count: number;
  blockedUntil: number;
}

@Injectable()
export class AuthService {
  private attempts = new Map<string, LoginAttempt>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async getEmpresaConfig() {
    let emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    if (!emp) {
      emp = await this.prisma.empresaConfig.create({
        data: { id: 1, nombre: 'Mi Carwash' },
      });
    }
    return {
      ...emp,
      impuesto_porcentaje: Number(emp.impuesto_porcentaje),
    };
  }

  async login(usuarioInput: string, passwordInput: string, ip = '') {
    const key = `${ip}:${(usuarioInput || '').trim().toLowerCase()}`;
    const now = Date.now();
    const record = this.attempts.get(key) || { count: 0, blockedUntil: 0 };

    if (record.blockedUntil > now) {
      const secs = Math.ceil((record.blockedUntil - now) / 1000);
      throw new HttpException(
        `Demasiados intentos. Espera ${secs} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const username = (usuarioInput || '').trim();
    const u = await this.prisma.usuario.findUnique({
      where: { usuario: username },
      include: { rol: true },
    });

    const passwordValid = u ? await bcrypt.compare(passwordInput || '', u.password) : false;

    if (!u || !u.estado || !passwordValid) {
      record.count += 1;
      if (record.count >= 5) {
        record.blockedUntil = now + 60_000;
        record.count = 0;
      }
      this.attempts.set(key, record);
      if (u && !u.estado) {
        throw new UnauthorizedException('Usuario desactivado.');
      }
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    this.attempts.delete(key);

    await this.prisma.usuario.update({
      where: { id: u.id },
      data: { ultimo_acceso: new Date() },
    });

    await this.prisma.logAction(u.id, u.usuario, 'login', 'Inicio de sesión', ip);

    const userPayload = {
      id: u.id,
      nombre: u.nombre,
      usuario: u.usuario,
      email: u.email,
      rol_id: u.rol_id,
      rol: u.rol?.nombre || 'Usuario',
      permisos: u.rol?.permisos || '',
    };

    const token = await this.jwtService.signAsync(userPayload);
    const empresa = await this.getEmpresaConfig();

    return {
      token,
      user: userPayload,
      empresa,
    };
  }

  async me(userId: number) {
    const u = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });
    if (!u || !u.estado) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo.');
    }
    const empresa = await this.getEmpresaConfig();
    return {
      user: {
        id: u.id,
        nombre: u.nombre,
        usuario: u.usuario,
        email: u.email,
        rol_id: u.rol_id,
        rol: u.rol?.nombre || 'Usuario',
        permisos: u.rol?.permisos || '',
        ultimo_acceso: u.ultimo_acceso,
      },
      empresa,
    };
  }

  async updatePerfil(
    userId: number,
    body: {
      nombre?: string;
      email?: string;
      actual?: string;
      nueva?: string;
      confirmar?: string;
      password?: string;
    },
    ip = '',
  ) {
    const u = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { rol: true },
    });
    if (!u) {
      throw new UnauthorizedException('Usuario no encontrado.');
    }

    const nombre = (body.nombre ?? '').trim();
    const email = (body.email ?? '').trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nombre || (email !== '' && !emailRegex.test(email))) {
      throw new BadRequestException('Nombre o correo inválido.');
    }

    const dataToUpdate: any = {
      nombre,
      email: email || null,
    };

    const nuevaPass = body.nueva ?? body.password ?? '';
    if (nuevaPass !== '') {
      if (body.actual !== undefined) {
        const okActual = await bcrypt.compare(body.actual || '', u.password);
        if (!okActual) {
          throw new BadRequestException('La contraseña actual es incorrecta.');
        }
      }
      if (nuevaPass.length < 6 || (body.confirmar !== undefined && nuevaPass !== body.confirmar)) {
        throw new BadRequestException(
          'La nueva contraseña debe tener 6+ caracteres y coincidir con la confirmación.',
        );
      }
      dataToUpdate.password = await bcrypt.hash(nuevaPass, 10);
      await this.prisma.logAction(u.id, u.usuario, 'perfil', 'Cambió su contraseña', ip);
    }

    const updated = await this.prisma.usuario.update({
      where: { id: userId },
      data: dataToUpdate,
      include: { rol: true },
    });

    const userPayload = {
      id: updated.id,
      nombre: updated.nombre,
      usuario: updated.usuario,
      email: updated.email,
      rol_id: updated.rol_id,
      rol: updated.rol?.nombre || 'Usuario',
      permisos: updated.rol?.permisos || '',
      ultimo_acceso: updated.ultimo_acceso,
    };

    const token = await this.jwtService.signAsync(userPayload);

    return {
      ok: true,
      message: 'Perfil actualizado.',
      user: userPayload,
      token,
    };
  }
}
