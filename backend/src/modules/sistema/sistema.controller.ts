import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { SistemaService } from './sistema.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class SistemaController {
  constructor(private readonly service: SistemaService) {}

  @Get('usuarios')
  @RequireModule('usuarios')
  listarUsuarios() {
    return this.service.listarUsuarios();
  }

  @Post('usuarios')
  @RequireModule('usuarios')
  crearUsuario(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarUsuario(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('usuarios/:id')
  @RequireModule('usuarios')
  actualizarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarUsuario(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('usuarios/:id')
  @RequireModule('usuarios')
  eliminarUsuario(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarUsuario(id, user.id, user.usuario, req.ip || '');
  }

  @Get('roles')
  @RequireModule('usuarios')
  listarRoles() {
    return this.service.listarRoles();
  }

  @Get('configuracion')
  @RequireModule('configuracion')
  obtenerConfiguracion() {
    return this.service.obtenerConfiguracion();
  }

  @Put('configuracion')
  @RequireModule('configuracion')
  guardarConfiguracion(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarConfiguracion(body, user.id, user.usuario, req.ip || '');
  }

  @Get('bitacora')
  @RequireModule('bitacora')
  listarBitacora() {
    return this.service.listarBitacora();
  }

  @Get('respaldo')
  @RequireModule('respaldo')
  estadoRespaldo() {
    return this.service.estadoRespaldo();
  }

  @Post('respaldo/resetear')
  @RequireModule('respaldo')
  resetearSistema(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.resetearSistema(body, user.id, user.usuario, req.ip || '');
  }

  @Get('demo')
  @RequireModule('configuracion')
  estadoDemo() {
    return this.service.estadoDemo();
  }

  @Post('demo/cargar')
  @RequireModule('configuracion')
  cargarDemo(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.cargarDemo(body, user.id, user.usuario, req.ip || '');
  }

  @Post('demo/quitar')
  @RequireModule('configuracion')
  quitarDemo(@CurrentUser() user: any, @Req() req: Request) {
    return this.service.quitarDemo(user.id, user.usuario, req.ip || '');
  }
}
