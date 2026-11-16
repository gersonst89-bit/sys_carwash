import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { IaService } from './ia.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller('ia')
@RequireModule('ia')
export class IaController {
  constructor(private readonly service: IaService) {}

  @Get('asistente/estado')
  estadoAsistente(@CurrentUser() user: any) {
    return this.service.estadoAsistente(user.id);
  }

  @Post('asistente/config')
  guardarConfig(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarConfig(body, user.id, user.usuario, req.ip || '');
  }

  @Post('asistente/probar')
  probarConexion() {
    return this.service.probarConexion();
  }

  @Post('asistente/preguntar')
  preguntar(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.preguntar(body, user.id, user.usuario, req.ip || '');
  }

  @Post('asistente/ejecutar')
  ejecutarGuardada(@Body('id') id: number, @CurrentUser() user: any) {
    return this.service.ejecutarGuardada(Number(id), user.id);
  }

  @Post('asistente/resumir')
  resumirGuardada(@Body('id') id: number, @CurrentUser() user: any) {
    return this.service.resumirGuardada(Number(id), user.id);
  }

  @Post('asistente/favorito')
  toggleFavorito(@Body() body: any, @CurrentUser() user: any) {
    return this.service.toggleFavorito(Number(body.id), Boolean(body.valor), user.id);
  }

  @Post('asistente/borrar')
  borrarConsulta(@Body('id') id: number, @CurrentUser() user: any) {
    return this.service.borrarConsulta(Number(id), user.id);
  }

  @Get('asistente/esquema')
  obtenerEsquema() {
    return this.service.obtenerEsquema();
  }

  @Get('chat/estado')
  estadoChat(@Query('dummy') _?: string) {
    return this.service.estadoChat();
  }

  @Post('chat/enviar')
  enviarChat(
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.enviarChat(body, user.id, user.usuario, req.ip || '');
  }
}
