import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { CrmService } from './crm.service';
import { CurrentUser, Public, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class CrmController {
  constructor(private readonly service: CrmService) {}

  @Get('crm')
  @RequireModule('clientes')
  getPanelRoot() {
    return this.service.getPanel();
  }

  @Get('crm/panel')
  @RequireModule('clientes')
  getPanel() {
    return this.service.getPanel();
  }

  @Get('crm/segmentos')
  @RequireModule('clientes')
  getSegmentos(@Query('seg') seg?: string, @Query('q') q?: string) {
    return this.service.getSegmentos(seg || 'todos', q || '');
  }

  @Get('crm/seguimientos')
  @RequireModule('clientes')
  getSeguimientos() {
    return this.service.getSeguimientos();
  }

  @Post('crm/interacciones')
  @RequireModule('clientes')
  crearInteraccion(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearInteraccion(body, user.id, user.usuario, req.ip || '');
  }

  @Patch('crm/seguimientos/:id/hecho')
  @RequireModule('clientes')
  marcarSeguimientoHecho(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarSeguimientoHecho(id);
  }

  @Get('crm/pipeline')
  @RequireModule('clientes')
  getPipeline() {
    return this.service.getPipeline();
  }

  @Post('crm/oportunidades')
  @RequireModule('clientes')
  crearOportunidad(@Body() body: any, @CurrentUser() user: any) {
    return this.service.guardarOportunidad(body, user.id);
  }

  @Put('crm/oportunidades/:id')
  @RequireModule('clientes')
  editarOportunidad(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.guardarOportunidad({ ...body, id }, user.id);
  }

  @Patch('crm/oportunidades/:id/mover')
  @RequireModule('clientes')
  moverOportunidad(@Param('id', ParseIntPipe) id: number, @Body('etapa') etapa: string) {
    return this.service.moverOportunidad(id, etapa);
  }

  @Delete('crm/oportunidades/:id')
  @RequireModule('clientes')
  eliminarOportunidad(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarOportunidad(id);
  }

  @Post('crm/oportunidades/:id/convertir')
  @RequireModule('clientes')
  convertirOportunidad(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.convertirOportunidad(id, user.id, user.usuario, req.ip || '');
  }

  @Get('crm/fidelidad')
  @RequireModule('clientes')
  getFidelidad() {
    return this.service.getFidelidad();
  }

  @Post('crm/fidelidad/canjear')
  @RequireModule('clientes')
  canjearPuntos(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.canjearPuntos(body, user.id, user.usuario, req.ip || '');
  }

  @Post('crm/fidelidad/ajustar')
  @RequireModule('clientes')
  ajustarPuntos(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.ajustarPuntos(body, user.id, user.usuario, req.ip || '');
  }

  @Get('crm/cupones')
  @RequireModule('clientes')
  getCupones() {
    return this.service.getCupones();
  }

  @Post('crm/cupones')
  @RequireModule('clientes')
  crearCupon(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearCupon(body, user.id, user.usuario, req.ip || '');
  }

  @Patch('crm/cupones/:id/toggle')
  @RequireModule('clientes')
  toggleCupon(@Param('id', ParseIntPipe) id: number) {
    return this.service.toggleCupon(id);
  }

  @Get('crm/cupones/validar')
  @RequireModule('ordenes')
  validarCupon(
    @Query('codigo') codigo?: string,
    @Query('cliente_id') clienteId?: string,
    @Query('subtotal') subtotal?: string,
  ) {
    return this.service.validarCuponEndpoint(
      codigo || '',
      clienteId ? Number(clienteId) : null,
      Number(subtotal || 0),
    );
  }

  @Get('crm/campanas')
  @RequireModule('clientes')
  getCampanas() {
    return this.service.getCampanas();
  }

  @Post('crm/campanas')
  @RequireModule('clientes')
  crearCampana(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearCampana(body, user.id, user.usuario, req.ip || '');
  }

  @Get('crm/campanas/:id')
  @RequireModule('clientes')
  verCampana(@Param('id', ParseIntPipe) id: number) {
    return this.service.verCampana(id);
  }

  @Patch('crm/campanas/envio/:id')
  @RequireModule('clientes')
  marcarEnvioCampana(@Param('id', ParseIntPipe) id: number) {
    return this.service.marcarEnvioCampana(id);
  }

  @Get('crm/encuestas')
  @RequireModule('clientes')
  getEncuestas(@Req() req: Request) {
    const origin =
      (req.headers.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173';
    return this.service.getEncuestas(origin);
  }

  @Public()
  @Get('encuesta/:token')
  getEncuestaPublica(@Param('token') token: string) {
    return this.service.getEncuestaPublica(token);
  }

  @Public()
  @Post('encuesta/:token')
  responderEncuestaPublica(@Param('token') token: string, @Body() body: any) {
    return this.service.responderEncuestaPublica(token, body);
  }

  @Get('crm/config')
  @RequireModule('configuracion')
  getCrmConfig() {
    return this.service.getCrmConfig();
  }

  @Put('crm/config')
  @RequireModule('configuracion')
  updateCrmConfig(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.updateCrmConfig(body, user.id, user.usuario, req.ip || '');
  }
}
