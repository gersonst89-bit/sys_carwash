import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FinanzasService } from './finanzas.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class FinanzasController {
  constructor(private readonly service: FinanzasService) {}

  @Get('comprobantes')
  @RequireModule('caja')
  listarComprobantes(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.listarComprobantes(desde, hasta);
  }

  @Get('comprobantes/:id')
  @RequireModule('caja')
  verComprobante(@Param('id', ParseIntPipe) id: number) {
    return this.service.verComprobante(id);
  }

  @Post('comprobantes/emitir')
  @RequireModule('caja')
  emitirComprobante(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.emitirComprobante(body, user.id, user.usuario, req.ip || '');
  }

  @Post('comprobantes/:id/anular')
  @RequireModule('caja')
  anularComprobante(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.anularComprobante(id, user.id, user.usuario, req.ip || '');
  }

  @Get('cobranzas')
  @RequireModule('caja')
  listarCobranzas() {
    return this.service.listarCobranzas();
  }

  @Get('cobranzas/cliente/:id')
  @RequireModule('caja')
  estadoCuentaCliente(@Param('id', ParseIntPipe) id: number) {
    return this.service.estadoCuentaCliente(id);
  }

  @Post('cobranzas/abonar')
  @RequireModule('caja')
  abonarCliente(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.abonarCliente(body, user.id, user.usuario, req.ip || '');
  }

  @Get('porpagar')
  @RequireModule('productos')
  listarPorPagar() {
    return this.service.listarPorPagar();
  }

  @Get('porpagar/proveedor/:id')
  @RequireModule('productos')
  estadoCuentaProveedor(@Param('id', ParseIntPipe) id: number) {
    return this.service.estadoCuentaProveedor(id);
  }

  @Post('porpagar/pagar')
  @RequireModule('productos')
  pagarCompra(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.pagarCompra(body, user.id, user.usuario, req.ip || '');
  }

  @Post('porpagar/abonar')
  @RequireModule('productos')
  abonarProveedor(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.abonarProveedor(body, user.id, user.usuario, req.ip || '');
  }

  @Get('gastos')
  @RequireModule('gastos')
  listarGastos() {
    return this.service.listarGastos();
  }

  @Post('gastos')
  @RequireModule('gastos')
  crearGasto(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarGasto(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('gastos/:id')
  @RequireModule('gastos')
  actualizarGasto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarGasto(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('gastos/:id')
  @RequireModule('gastos')
  eliminarGasto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarGasto(id, user.id, user.usuario, req.ip || '');
  }

  @Get('reportes')
  @RequireModule('reportes')
  obtenerReportes(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.obtenerReportes(desde, hasta);
  }

  @Get('reportes/exportar')
  @RequireModule('reportes')
  exportarReporte(
    @Query('tipo') tipo?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.exportarReporte(tipo || 'ordenes', desde, hasta);
  }
}
