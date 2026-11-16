import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModuleGuard } from './common/guards/auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OperacionesModule } from './modules/operaciones/operaciones.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { CrmModule } from './modules/crm/crm.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { PersonalModule } from './modules/personal/personal.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { IaModule } from './modules/ia/ia.module';
import { SistemaModule } from './modules/sistema/sistema.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'carwash_pro_super_secret_jwt_key_2026',
      signOptions: { expiresIn: '24h' },
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,
    OperacionesModule,
    ClientesModule,
    CrmModule,
    CatalogoModule,
    PersonalModule,
    FinanzasModule,
    IaModule,
    SistemaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthModuleGuard,
    },
  ],
})
export class AppModule {}
