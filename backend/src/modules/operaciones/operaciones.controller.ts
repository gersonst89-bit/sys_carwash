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
import { OperacionesService } from './operaciones.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class OperacionesController {
  constructor(private readonly service: OperacionesService) {}

  @Get('ordenes')
  @RequireModule('ordenes')
  listarOrdenes(
    @Query('estado') estado?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.listarOrdenes({ estado, desde, hasta });
  }

  @Get('ordenes/catalogos')
  @RequireModule('ordenes')
  catalogosOrden(
    @Query('cita') cita?: string,
    @Query('cotizacion') cotizacion?: string,
    @Query('recepcion') recepcion?: string,
  ) {
    return this.service.catalogosOrden({ cita, cotizacion, recepcion });
  }

  @Get('ordenes/:id')
  @RequireModule('ordenes')
  verOrden(@Param('id', ParseIntPipe) id: number) {
    return this.service.verOrden(id);
  }

  @Post('ordenes')
  @RequireModule('ordenes')
  crearOrden(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearOrden(body, user.id, user.usuario, req.ip || '');
  }

  @Patch('ordenes/:id/estado')
  @RequireModule('ordenes')
  cambiarEstadoOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.cambiarEstadoOrden(id, estado, user.id, user.usuario, req.ip || '');
  }

  @Post('ordenes/:id/pagos')
  @RequireModule('ordenes')
  registrarPagoOrden(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.cobrarOrden(id, body, user.id, user.usuario, req.ip || '');
  }

  @Post('ordenes/:id/cobrar')
  @RequireModule('ordenes')
  cobrarOrdenAlias(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.cobrarOrden(id, body, user.id, user.usuario, req.ip || '');
  }

  @Get('ventas')
  @RequireModule('ordenes')
  getVentasPos() {
    return this.service.getVentasPos();
  }

  @Post('ventas')
  @RequireModule('ordenes')
  crearVentaPos(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearVentaPos(body, user.id, user.usuario, req.ip || '');
  }

  @Get('cotizaciones')
  @RequireModule('ordenes')
  listarCotizaciones(@Query('estado') estado?: string) {
    return this.service.listarCotizaciones(estado);
  }

  @Get('cotizaciones/catalogos')
  @RequireModule('ordenes')
  catalogosCotizacion() {
    return this.service.catalogosOrden();
  }

  @Get('cotizaciones/:id')
  @RequireModule('ordenes')
  verCotizacion(@Param('id', ParseIntPipe) id: number) {
    return this.service.verCotizacion(id);
  }

  @Post('cotizaciones')
  @RequireModule('ordenes')
  crearCotizacion(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearCotizacion(body, user.id, user.usuario, req.ip || '');
  }

  @Patch('cotizaciones/:id/estado')
  @RequireModule('ordenes')
  cambiarEstadoCotizacion(
    @Param('id', ParseIntPipe) id: number,
    @Body('estado') estado: string,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.cambiarEstadoCotizacion(id, estado, user.id, user.usuario, req.ip || '');
  }

  @Delete('cotizaciones/:id')
  @RequireModule('ordenes')
  eliminarCotizacion(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarCotizacion(id);
  }

  @Get('recepciones')
  @RequireModule('ordenes')
  listarRecepciones(@Query('q') q?: string) {
    return this.service.listarRecepciones(q);
  }

  @Get('recepciones/catalogos')
  @RequireModule('ordenes')
  catalogosRecepcion() {
    return this.service.catalogosOrden();
  }

  @Get('recepciones/:id')
  @RequireModule('ordenes')
  verRecepcion(@Param('id', ParseIntPipe) id: number) {
    return this.service.verRecepcion(id);
  }

  @Post('recepciones')
  @RequireModule('ordenes')
  crearRecepcion(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearRecepcion(body, user.id, user.usuario, req.ip || '');
  }

  @Delete('recepciones/:id')
  @RequireModule('ordenes')
  eliminarRecepcion(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarRecepcion(id, user.id, user.usuario, req.ip || '');
  }

  @Get('tablero')
  @RequireModule('ordenes')
  getTablero() {
    return this.service.getTablero();
  }

  @Post('tablero/mover')
  @RequireModule('ordenes')
  moverTablero(
    @Body() body: { id: number; estado: string },
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.moverTablero(Number(body.id), body.estado, user.id, user.usuario, req.ip || '');
  }

  @Post('tablero/asignar')
  @RequireModule('ordenes')
  asignarTablero(@Body() body: { id: number; empleado_id?: number | null }) {
    return this.service.asignarTablero(
      Number(body.id),
      body.empleado_id ? Number(body.empleado_id) : null,
    );
  }

  @Get('citas')
  @RequireModule('citas')
  listarCitas() {
    return this.service.listarCitas();
  }

  @Get('citas/eventos')
  @RequireModule('citas')
  eventosCitas(@Query('mes') mes?: string) {
    return this.service.eventosCitas(mes);
  }

  @Post('citas')
  @RequireModule('citas')
  crearCita(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarCita(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('citas/:id')
  @RequireModule('citas')
  editarCita(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarCita(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('citas/:id')
  @RequireModule('citas')
  eliminarCita(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarCita(id, user.id, user.usuario, req.ip || '');
  }

  @Get('caja')
  @RequireModule('caja')
  getCaja() {
    return this.service.getCaja();
  }

  @Post('caja/abrir')
  @RequireModule('caja')
  abrirCaja(
    @Body('monto_inicial') montoInicial: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.abrirCaja(montoInicial, user.id, user.usuario, req.ip || '');
  }

  @Post('caja/cerrar')
  @RequireModule('caja')
  cerrarCaja(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.cerrarCaja(body, user.id, user.usuario, req.ip || '');
  }
}
