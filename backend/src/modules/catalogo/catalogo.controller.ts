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
import { CatalogoService } from './catalogo.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class CatalogoController {
  constructor(private readonly service: CatalogoService) {}

  @Get('servicios')
  @RequireModule('servicios')
  listarServicios() {
    return this.service.listarServicios();
  }

  @Post('servicios')
  @RequireModule('servicios')
  crearServicio(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarServicio(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('servicios/:id')
  @RequireModule('servicios')
  actualizarServicio(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarServicio(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('servicios/:id')
  @RequireModule('servicios')
  eliminarServicio(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarServicio(id, user.id, user.usuario, req.ip || '');
  }

  @Get('categorias')
  @RequireModule('servicios')
  listarCategorias() {
    return this.service.listarCategorias();
  }

  @Post('categorias')
  @RequireModule('servicios')
  crearCategoria(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarCategoria(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('categorias/:id')
  @RequireModule('servicios')
  actualizarCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarCategoria(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('categorias/:id')
  @RequireModule('servicios')
  eliminarCategoria(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarCategoria(id, user.id, user.usuario, req.ip || '');
  }

  @Get('tipos-vehiculo')
  @RequireModule('servicios')
  listarTiposVehiculo() {
    return this.service.listarTiposVehiculo();
  }

  @Get('tiposvehiculo')
  @RequireModule('servicios')
  listarTiposVehiculoAlias() {
    return this.service.listarTiposVehiculo();
  }

  @Post('tipos-vehiculo')
  @RequireModule('servicios')
  crearTipoVehiculo(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarTipoVehiculo(null, body, user.id, user.usuario, req.ip || '');
  }

  @Post('tiposvehiculo')
  @RequireModule('servicios')
  crearTipoVehiculoAlias(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarTipoVehiculo(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('tipos-vehiculo/:id')
  @RequireModule('servicios')
  actualizarTipoVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarTipoVehiculo(id, body, user.id, user.usuario, req.ip || '');
  }

  @Put('tiposvehiculo/:id')
  @RequireModule('servicios')
  actualizarTipoVehiculoAlias(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarTipoVehiculo(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('tipos-vehiculo/:id')
  @RequireModule('servicios')
  eliminarTipoVehiculo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarTipoVehiculo(id, user.id, user.usuario, req.ip || '');
  }

  @Delete('tiposvehiculo/:id')
  @RequireModule('servicios')
  eliminarTipoVehiculoAlias(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarTipoVehiculo(id, user.id, user.usuario, req.ip || '');
  }

  @Get('productos')
  @RequireModule('productos')
  listarProductos() {
    return this.service.listarProductos();
  }

  @Post('productos')
  @RequireModule('productos')
  crearProducto(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarProducto(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('productos/:id')
  @RequireModule('productos')
  actualizarProducto(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarProducto(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('productos/:id')
  @RequireModule('productos')
  eliminarProducto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarProducto(id, user.id, user.usuario, req.ip || '');
  }

  @Get('inventario')
  @RequireModule('productos')
  listarInventario(@Query('producto') producto?: string) {
    return this.service.listarInventario(producto ? Number(producto) : 0);
  }

  @Post('inventario/registrar')
  @RequireModule('productos')
  registrarInventario(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.registrarInventario(body, user.id, user.usuario, req.ip || '');
  }

  @Post('inventario')
  @RequireModule('productos')
  registrarInventarioAlias(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.registrarInventario(body, user.id, user.usuario, req.ip || '');
  }

  @Get('proveedores')
  @RequireModule('proveedores')
  listarProveedores() {
    return this.service.listarProveedores();
  }

  @Post('proveedores')
  @RequireModule('proveedores')
  crearProveedor(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarProveedor(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('proveedores/:id')
  @RequireModule('proveedores')
  actualizarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarProveedor(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('proveedores/:id')
  @RequireModule('proveedores')
  eliminarProveedor(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarProveedor(id, user.id, user.usuario, req.ip || '');
  }

  @Get('compras')
  @RequireModule('productos')
  listarCompras() {
    return this.service.listarCompras();
  }

  @Get('compras/:id')
  @RequireModule('productos')
  verCompra(@Param('id', ParseIntPipe) id: number) {
    return this.service.verCompra(id);
  }

  @Post('compras')
  @RequireModule('productos')
  crearCompra(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.crearCompra(body, user.id, user.usuario, req.ip || '');
  }
}
