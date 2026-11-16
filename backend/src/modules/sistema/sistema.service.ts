import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SistemaService {
  constructor(private readonly prisma: PrismaService) {}

  async listarUsuarios() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT u.id, u.nombre, u.usuario, u.email, u.rol_id, u.estado, u.ultimo_acceso, u.created_at,
        r.nombre AS rol
      FROM usuarios u
      JOIN roles r ON r.id = u.rol_id
      ORDER BY u.id ASC
    `;
    const roles = await this.prisma.rol.findMany({ orderBy: { id: 'asc' } });
    return { rows, roles };
  }

  async listarRoles() {
    return this.prisma.rol.findMany({ orderBy: { id: 'asc' } });
  }

  async guardarUsuario(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    const usuario = String(body.usuario || '').trim();
    const rol_id = Number(body.rol_id || 1);
    if (!nombre || !usuario) {
      throw new BadRequestException('Nombre y usuario son obligatorios.');
    }

    const dup = await this.prisma.usuario.findFirst({
      where: { usuario, ...(id ? { NOT: { id } } : {}) },
    });
    if (dup) throw new BadRequestException('Ese nombre de usuario ya existe.');

    const data: any = {
      nombre: nombre.slice(0, 120),
      usuario: usuario.slice(0, 50),
      email: body.email ? String(body.email).trim().slice(0, 120) : null,
      rol_id,
      estado: id === uid ? 1 : body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };

    if (body.password && String(body.password).trim() !== '') {
      if (String(body.password).length < 6) {
        throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
      }
      data.password = await bcrypt.hash(String(body.password), 10);
    } else if (!id) {
      throw new BadRequestException('La contraseña es obligatoria para nuevos usuarios.');
    }

    const saved = id
      ? await this.prisma.usuario.update({ where: { id }, data })
      : await this.prisma.usuario.create({ data });

    await this.prisma.logAction(uid, uname, 'usuarios:save', `Usuario ${usuario}`, ip);
    const { password: _, ...clean } = saved;
    return clean;
  }

  async eliminarUsuario(id: number, uid: number, uname: string, ip: string) {
    if (id === uid) throw new BadRequestException('No puedes eliminar tu propio usuario.');
    await this.prisma.usuario.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'usuarios:delete', `Usuario #${id}`, ip);
    return { ok: true };
  }

  async obtenerConfiguracion() {
    let emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    if (!emp) emp = await this.prisma.empresaConfig.create({ data: { id: 1 } });
    return emp;
  }

  async guardarConfiguracion(body: any, uid: number, uname: string, ip: string) {
    const dec = Math.max(0, Math.min(4, Number(body.decimales ?? 2)));
    const sepD = ['.', ','].includes(body.sep_decimal) ? body.sep_decimal : '.';
    const sepM = [',', '.', ' ', "'", ''].includes(body.sep_miles) ? body.sep_miles : ',';
    if (sepD === sepM && dec > 0) {
      throw new BadRequestException('El separador decimal y el de miles no pueden ser iguales.');
    }

    const updated = await this.prisma.empresaConfig.upsert({
      where: { id: 1 },
      update: {
        nombre: String(body.nombre || 'Mi Carwash').trim().slice(0, 150),
        razon_social: body.razon_social ? String(body.razon_social).trim().slice(0, 180) : null,
        ruc: body.ruc ? String(body.ruc).trim().slice(0, 30) : null,
        direccion: body.direccion ? String(body.direccion).trim().slice(0, 255) : null,
        telefono: body.telefono ? String(body.telefono).trim().slice(0, 40) : null,
        email: body.email ? String(body.email).trim().slice(0, 120) : null,
        web: body.web ? String(body.web).trim().slice(0, 150) : null,
        moneda_codigo: String(body.moneda_codigo || 'PEN').trim().toUpperCase().slice(0, 5),
        moneda_simbolo: String(body.moneda_simbolo || 'S/').trim().slice(0, 8),
        simbolo_posicion: body.simbolo_posicion === 'despues' ? 'despues' : 'antes',
        decimales: dec,
        sep_decimal: sepD,
        sep_miles: sepM,
        impuesto_nombre: String(body.impuesto_nombre || 'IGV').trim().slice(0, 20),
        impuesto_porcentaje: Math.max(0, Math.min(100, Number(body.impuesto_porcentaje ?? 18))),
        precios_incluyen_impuesto: body.precios_incluyen_impuesto ? 1 : 0,
        zona_horaria: String(body.zona_horaria || 'America/Lima').slice(0, 50),
        formato_fecha: ['d/m/Y', 'm/d/Y', 'Y-m-d', 'd-m-Y'].includes(body.formato_fecha)
          ? body.formato_fecha
          : 'd/m/Y',
        prefijo_orden: String(body.prefijo_orden || 'OS-').trim().slice(0, 10),
        pie_ticket: body.pie_ticket ? String(body.pie_ticket).trim().slice(0, 255) : null,
      },
      create: { id: 1 },
    });

    await this.prisma.logAction(uid, uname, 'config', 'Configuración de empresa actualizada', ip);
    return updated;
  }

  async listarBitacora() {
    return this.prisma.bitacora.findMany({
      orderBy: { id: 'desc' },
      take: 300,
    });
  }

  async estadoRespaldo() {
    const tablas = 38;
    const counts = await Promise.all([
      this.prisma.cliente.count(),
      this.prisma.vehiculo.count(),
      this.prisma.orden.count(),
      this.prisma.servicio.count(),
      this.prisma.producto.count(),
      this.prisma.gasto.count(),
    ]);
    const registros = counts.reduce((a, b) => a + b, 0);
    return {
      stats: { tablas, registros, motor: 'PostgreSQL + Prisma' },
      demo: await this.estadoDemo(),
    };
  }

  async resetearSistema(body: any, uid: number, uname: string, ip: string) {
    if (String(body.confirmacion || '').trim() !== 'RESETEAR') {
      throw new BadRequestException('Debes escribir RESETEAR para confirmar.');
    }
    const user = await this.prisma.usuario.findUnique({ where: { id: uid } });
    if (!user || !(await bcrypt.compare(String(body.password || ''), user.password))) {
      throw new BadRequestException('Contraseña incorrecta. No se reseteó nada.');
    }

    await this.prisma.$transaction([
      this.prisma.planillaAdelanto.deleteMany(),
      this.prisma.planilla.deleteMany(),
      this.prisma.asistencia.deleteMany(),
      this.prisma.comprobante.deleteMany(),
      this.prisma.cotizacionDetalle.deleteMany(),
      this.prisma.cotizacion.deleteMany(),
      this.prisma.ordenPago.deleteMany(),
      this.prisma.recepcion.deleteMany(),
      this.prisma.crmCampanaEnvio.deleteMany(),
      this.prisma.crmCampana.deleteMany(),
      this.prisma.crmEncuesta.deleteMany(),
      this.prisma.crmCupon.deleteMany(),
      this.prisma.crmInteraccion.deleteMany(),
      this.prisma.crmOportunidad.deleteMany(),
      this.prisma.crmPunto.deleteMany(),
      this.prisma.iaConsulta.deleteMany(),
      this.prisma.ordenPaqueteUso.deleteMany(),
      this.prisma.clientePaquete.deleteMany(),
      this.prisma.compraDetalle.deleteMany(),
      this.prisma.compraPago.deleteMany(),
      this.prisma.compra.deleteMany(),
      this.prisma.comisionPago.deleteMany(),
      this.prisma.ordenDetalle.deleteMany(),
      this.prisma.orden.deleteMany(),
      this.prisma.cita.deleteMany(),
      this.prisma.caja.deleteMany(),
      this.prisma.gasto.deleteMany(),
      this.prisma.movimientoInventario.deleteMany(),
      this.prisma.vehiculo.deleteMany(),
      this.prisma.cliente.deleteMany(),
    ]);

    await this.prisma.logAction(uid, uname, 'reset', 'Sistema reseteado para nueva empresa', ip);
    return { ok: true };
  }

  async estadoDemo() {
    const [clientes, ordenes, gastos, compras, citas] = await Promise.all([
      this.prisma.cliente.count({ where: { notas: { contains: '[DEMO]' } } }),
      this.prisma.orden.count({ where: { observaciones: { contains: '[DEMO]' } } }),
      this.prisma.gasto.count({ where: { concepto: { contains: '[DEMO]' } } }),
      this.prisma.compra.count({ where: { notas: { contains: '[DEMO]' } } }),
      this.prisma.cita.count({ where: { notas: { contains: '[DEMO]' } } }),
    ]);
    return { clientes, ordenes, gastos, compras, citas };
  }

  async cargarDemo(body: any, uid: number, uname: string, ip: string) {
    const existing = await this.prisma.orden.count({
      where: { observaciones: { contains: '[DEMO]' } },
    });
    if (existing > 0) {
      throw new BadRequestException('Ya hay datos de ejemplo cargados. Quítalos primero si deseas regenerarlos.');
    }

    const servicios = await this.prisma.servicio.findMany({ where: { estado: 1 } });
    const emps = await this.prisma.empleado.findMany({ where: { estado: 1 } });
    const tipos = await this.prisma.tipoVehiculo.findMany({ where: { estado: 1 } });
    if (!servicios.length || !emps.length || !tipos.length) {
      throw new BadRequestException('Primero asegúrate de tener servicios, empleados y tipos de vehículo activos.');
    }

    const nombres = [
      ['Luis Fernández', '987111222', 'Toyota', 'Corolla', 'ABC-101'],
      ['María Quispe', '987222333', 'Hyundai', 'Tucson', 'BCD-202'],
      ['Jorge Ramos', '987333444', 'Kia', 'Rio', 'CDE-303'],
      ['Rosa Mendoza', '987444555', 'Nissan', 'Sentra', 'DEF-404'],
      ['Carlos Paredes', '987555666', 'Toyota', 'Hilux', 'EFG-505'],
      ['Lucía Torres', '987666777', 'Mazda', 'CX-5', 'FGH-606'],
      ['Andrés Salazar', '987777888', 'Honda', 'CR-V', 'GHI-707'],
      ['Valeria Núñez', '987888999', 'Suzuki', 'Swift', 'HIJ-808'],
    ];

    const metodos = ['efectivo', 'yape_plin', 'tarjeta', 'transferencia'];
    let ordCount = 0;

    for (let i = 0; i < nombres.length; i++) {
      const [nom, tel, marca, modelo, placa] = nombres[i];
      const cli = await this.prisma.cliente.create({
        data: {
          tipo_doc: 'DNI',
          nro_doc: String(40000000 + i * 12345),
          nombre: nom,
          telefono: tel,
          email: `cliente${i + 1}@demo.pe`,
          notas: 'Cliente de demostración [DEMO]',
          fecha_nacimiento: new Date(1990, new Date().getMonth(), (i * 3 + 5) % 28 + 1),
        },
      });
      const veh = await this.prisma.vehiculo.create({
        data: {
          cliente_id: cli.id,
          placa,
          marca,
          modelo,
          color: ['Blanco', 'Negro', 'Plata', 'Rojo'][i % 4],
          anio: 2020 + (i % 5),
          tipo_vehiculo_id: tipos[i % tipos.length].id,
        },
      });

      for (let j = 0; j < 3; j++) {
        const srv = servicios[(i + j) % servicios.length];
        const emp = emps[(i + j) % emps.length];
        const daysAgo = (i * 2 + j * 3) % 14;
        const fecha = new Date(Date.now() - daysAgo * 86400000);
        const total = Number(srv.precio);
        const imp = Math.round((total - total / 1.18) * 100) / 100;
        const metodo = metodos[(i + j) % metodos.length];
        const estado = daysAgo === 0 && j === 0 ? 'en_proceso' : 'entregado';
        const pagado = estado === 'entregado' ? 1 : 0;

        const orden = await this.prisma.orden.create({
          data: {
            codigo: `DEMO-${Date.now().toString().slice(-4)}-${i}${j}`,
            tipo: 'servicio',
            cliente_id: cli.id,
            vehiculo_id: veh.id,
            empleado_id: emp.id,
            usuario_id: uid,
            estado,
            subtotal: total,
            descuento: 0,
            impuesto: imp,
            total,
            metodo_pago: pagado ? metodo : null,
            pagado,
            fecha_pago: pagado ? fecha : null,
            fecha_ingreso: fecha,
            fecha_fin: estado === 'entregado' ? new Date(fecha.getTime() + 35 * 60000) : null,
            observaciones: 'Orden generada [DEMO]',
          },
        });
        await this.prisma.orden.update({
          where: { id: orden.id },
          data: { codigo: `OS-${String(orden.id).padStart(6, '0')}` },
        });
        await this.prisma.ordenDetalle.create({
          data: {
            orden_id: orden.id,
            tipo: 'servicio',
            item_id: srv.id,
            descripcion: srv.nombre,
            cantidad: 1,
            precio: total,
            subtotal: total,
          },
        });
        if (pagado) {
          await this.prisma.ordenPago.create({
            data: {
              orden_id: orden.id,
              monto: total,
              propina: 0,
              metodo,
              usuario_id: uid,
              fecha,
            },
          });
        }
        ordCount++;
      }
    }

    await this.prisma.gasto.createMany({
      data: [
        { fecha: new Date(), categoria: 'Servicios', concepto: 'Recibo de Agua y Luz [DEMO]', monto: 180, usuario_id: uid },
        { fecha: new Date(), categoria: 'Insumos', concepto: 'Compra de microfibras [DEMO]', monto: 95, usuario_id: uid },
      ],
    });

    await this.prisma.logAction(uid, uname, 'demo', 'Datos de ejemplo cargados', ip);
    return { ok: true, clientes: nombres.length, ordenes: ordCount };
  }

  async quitarDemo(uid: number, uname: string, ip: string) {
    await this.prisma.$transaction([
      this.prisma.gasto.deleteMany({ where: { concepto: { contains: '[DEMO]' } } }),
      this.prisma.orden.deleteMany({ where: { observaciones: { contains: '[DEMO]' } } }),
      this.prisma.cita.deleteMany({ where: { notas: { contains: '[DEMO]' } } }),
      this.prisma.cliente.deleteMany({ where: { notas: { contains: '[DEMO]' } } }),
    ]);
    await this.prisma.logAction(uid, uname, 'demo', 'Datos de ejemplo eliminados', ip);
    return { ok: true };
  }
}
