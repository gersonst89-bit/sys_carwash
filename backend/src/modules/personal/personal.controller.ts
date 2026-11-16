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
import { PersonalService } from './personal.service';
import { CurrentUser, RequireModule } from '../../common/decorators/auth.decorator';

@Controller()
export class PersonalController {
  constructor(private readonly service: PersonalService) {}

  @Get('empleados')
  @RequireModule('empleados')
  listarEmpleados() {
    return this.service.listarEmpleados();
  }

  @Post('empleados')
  @RequireModule('empleados')
  crearEmpleado(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.guardarEmpleado(null, body, user.id, user.usuario, req.ip || '');
  }

  @Put('empleados/:id')
  @RequireModule('empleados')
  actualizarEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.guardarEmpleado(id, body, user.id, user.usuario, req.ip || '');
  }

  @Delete('empleados/:id')
  @RequireModule('empleados')
  eliminarEmpleado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.eliminarEmpleado(id, user.id, user.usuario, req.ip || '');
  }

  @Get('comisiones')
  @RequireModule('empleados')
  listarComisiones(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.listarComisiones(desde, hasta);
  }

  @Post('comisiones/pagar')
  @RequireModule('empleados')
  pagarComision(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.pagarComision(body, user.id, user.usuario, req.ip || '');
  }

  @Get('asistencia')
  @RequireModule('empleados')
  listarAsistencia(@Query('fecha') fecha?: string) {
    return this.service.listarAsistencia(fecha);
  }

  @Post('asistencia/marcar')
  @RequireModule('empleados')
  marcarAsistencia(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.marcarAsistencia(body, user.id, user.usuario, req.ip || '');
  }

  @Post('asistencia/cerrar-dia')
  @RequireModule('empleados')
  cerrarDia(@Body('fecha') fecha: string, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.cerrarDia(fecha, user.id, user.usuario, req.ip || '');
  }

  @Get('asistencia/mes')
  @RequireModule('empleados')
  resumenMes(@Query('mes') mes?: string) {
    return this.service.resumenMes(mes);
  }

  @Get('asistencia/config')
  @RequireModule('empleados')
  getAsistenciaConfig() {
    return this.service.getConfig();
  }

  @Put('asistencia/config')
  @RequireModule('configuracion')
  guardarAsistenciaConfig(@Body() body: any) {
    return this.service.guardarConfig(body);
  }

  @Get('planilla')
  @RequireModule('empleados')
  listarPlanilla(@Query('mes') mes?: string) {
    return this.service.listarPlanilla(mes);
  }

  @Post('planilla/pagar')
  @RequireModule('empleados')
  pagarPlanilla(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.pagarPlanilla(body, user.id, user.usuario, req.ip || '');
  }

  @Post('planilla/adelanto')
  @RequireModule('empleados')
  registrarAdelanto(@Body() body: any, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.registrarAdelanto(body, user.id, user.usuario, req.ip || '');
  }

  @Get('planilla/boleta/:id')
  @RequireModule('empleados')
  verBoleta(@Param('id', ParseIntPipe) id: number) {
    return this.service.verBoleta(id);
  }
}
