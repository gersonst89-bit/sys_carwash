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
import { ClientesService } from './clientes.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class ClientesController {
  constructor(private readonly service: ClientesService) {}

  @Get('clientes')
  @RequireModule('clientes')
  listarClientes() {
    return this.service.listarClientes();
  }

  @Get('clientes/:id/ficha')
  @RequireModule('clientes')
  fichaCliente(@Param('id', ParseIntPipe) id: number) {
    return this.service.fichaCliente(id);
  }

  @Get('clientes/:id')
  @RequireModule('clientes')
  obtenerCliente(@Param('id', ParseIntPipe) id: number) {
    return this.service.obtenerCliente(id);
  }

  @Post('clientes')
  @RequireModule('clientes')
  crearCliente(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarCliente(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('clientes/:id')
  @RequireModule('clientes')
  actualizarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarCliente(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('clientes/:id')
  @RequireModule('clientes')
  eliminarCliente(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarCliente(id, user.id, user.usuario, req.ip || '');
  }

  @Get('vehiculos')
  @RequireModule('vehiculos')
  listarVehiculos() {
    return this.service.listarVehiculos();
  }

  @Post('vehiculos')
  @RequireModule('vehiculos')
  crearVehiculo(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarVehiculo(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('vehiculos/:id')
  @RequireModule('vehiculos')
  actualizarVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarVehiculo(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('vehiculos/:id')
  @RequireModule('vehiculos')
  eliminarVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarVehiculo(id, user.id, user.usuario, req.ip || '');
  }

  @Get('paquetes')
  @RequireModule('clientes')
  listarPaquetes() {
    return this.service.listarPaquetes();
  }

  @Get('paquetes/vendidos')
  @RequireModule('clientes')
  listarPaquetesVendidos() {
    return this.service.listarPaquetesVendidos();
  }

  @Get('paquetes/cliente/:clienteId')
  @RequireModule('ordenes')
  paquetesActivosCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return this.service.paquetesDeCliente(clienteId);
  }

  @Post('paquetes')
  @RequireModule('clientes')
  crearPaquete(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarPaquete(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('paquetes/:id')
  @RequireModule('clientes')
  actualizarPaquete(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarPaquete(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('paquetes/:id')
  @RequireModule('clientes')
  eliminarPaquete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarPaquete(id, user.id, user.usuario, req.ip || '');
  }

  @Post('paquetes/vender')
  @RequireModule('clientes')
  venderPaquete(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.venderPaquete(body, user.id, user.usuario, req.ip || '');
  }
}
