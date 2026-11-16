import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async logAction(usuarioId: number | null, usuario: string | null, accion: string, detalle = '', ip = '') {
    try {
      await this.bitacora.create({
        data: {
          usuario_id: usuarioId,
          usuario,
          accion: accion.slice(0, 60),
          detalle: detalle.slice(0, 250),
          ip: ip.slice(0, 45),
        },
      });
    } catch {

    }
  }
}
