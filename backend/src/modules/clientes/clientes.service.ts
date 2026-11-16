import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async listarClientes() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM vehiculos v WHERE v.cliente_id = c.id) AS vehiculos
      FROM clientes c
      ORDER BY c.id DESC
    `;
    return rows;
  }

  async obtenerCliente(id: number) {
    const c = await this.prisma.cliente.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cliente no encontrado.');
    return c;
  }

  async guardarCliente(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del cliente es obligatorio.');
    const data = {
      tipo_doc: String(body.tipo_doc || 'DNI').slice(0, 10),
      nro_doc: body.nro_doc ? String(body.nro_doc).trim().slice(0, 20) : null,
      nombre: nombre.slice(0, 150),
      telefono: body.telefono ? String(body.telefono).trim().slice(0, 30) : null,
      email: body.email ? String(body.email).trim().slice(0, 120) : null,
      direccion: body.direccion ? String(body.direccion).trim().slice(0, 200) : null,
      notas: body.notas ? String(body.notas).trim() : null,
      fecha_nacimiento: body.fecha_nacimiento ? new Date(body.fecha_nacimiento) : null,
      acepta_marketing: body.acepta_marketing !== undefined ? (body.acepta_marketing ? 1 : 0) : 1,
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };

    if (id) {
      const updated = await this.prisma.cliente.update({ where: { id }, data });
      await this.prisma.logAction(uid, uname, 'clientes:update', `Cliente #${id} (${nombre})`, ip);
      return updated;
    } else {
      const created = await this.prisma.cliente.create({ data });
      await this.prisma.logAction(uid, uname, 'clientes:create', `Cliente #${created.id} (${nombre})`, ip);
      return created;
    }
  }

  async eliminarCliente(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.cliente.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'clientes:delete', `Eliminó cliente #${id}`, ip);
    return { ok: true };
  }

  async fichaCliente(id: number) {
    const c = await this.prisma.cliente.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cliente no encontrado.');

    const veh = await this.prisma.$queryRaw<any[]>`
      SELECT v.*, t.nombre AS tipo
      FROM vehiculos v
      LEFT JOIN tipos_vehiculo t ON t.id = v.tipo_vehiculo_id
      WHERE v.cliente_id = ${id}
      ORDER BY v.id DESC
    `;

    const ord = await this.prisma.$queryRaw<any[]>`
      SELECT o.*, v.placa
      FROM ordenes o
      LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
      WHERE o.cliente_id = ${id}
      ORDER BY o.id DESC
      LIMIT 50
    `;

    const totRows = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS n, COALESCE(SUM(total), 0)::float AS t, MAX(fecha_ingreso) AS ult
      FROM ordenes
      WHERE cliente_id = ${id} AND estado <> 'cancelado'
    `;
    const tot = totRows[0] || { n: 0, t: 0, ult: null };

    const cfg = (await this.prisma.crmConfig.findUnique({ where: { id: 1 } })) || {
      vip_visitas: 10,
      vip_monto: 1000,
      dias_riesgo: 45,
      dias_inactivo: 90,
      prefijo_pais: '51',
    };

    const dias = tot.ult
      ? Math.floor((Date.now() - new Date(tot.ult).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let seg = 'ocasional';
    if (!tot.n) seg = 'sin_visitas';
    else if (dias !== null && dias > Number(cfg.dias_inactivo)) seg = 'inactivo';
    else if (dias !== null && dias > Number(cfg.dias_riesgo)) seg = 'en_riesgo';
    else if (tot.n >= Number(cfg.vip_visitas) || Number(tot.t) >= Number(cfg.vip_monto)) seg = 'vip';
    else if (tot.n >= 3) seg = 'frecuente';
    else if (tot.n === 1 && dias !== null && dias <= 30) seg = 'nuevo';

    const ptsRow = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(p.puntos), 0)::int AS pts
      FROM crm_puntos p
      LEFT JOIN ordenes o ON o.id = p.orden_id
      WHERE p.cliente_id = ${id}
        AND (p.orden_id IS NULL OR (o.estado <> 'cancelado' AND o.pagado = 1))
    `;
    const puntos = Math.max(0, Number(ptsRow[0]?.pts || 0));

    const inter = await this.prisma.$queryRaw<any[]>`
      SELECT i.*, u.nombre AS usuario
      FROM crm_interacciones i
      LEFT JOIN usuarios u ON u.id = i.usuario_id
      WHERE i.cliente_id = ${id}
      ORDER BY i.id DESC
      LIMIT 30
    `;

    const cupones = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM crm_cupones
      WHERE cliente_id = ${id}
        AND estado = 1
        AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
        AND (usos_max = 0 OR usos < usos_max)
    `;

    const paquetes = await this.paquetesDeCliente(id);

    const csatRow = await this.prisma.$queryRaw<any[]>`
      SELECT ROUND(AVG(puntaje)::numeric, 1)::float AS csat
      FROM crm_encuestas
      WHERE cliente_id = ${id} AND puntaje IS NOT NULL
    `;

    return {
      c,
      veh,
      ord,
      tot,
      seg,
      puntos,
      inter,
      cupones,
      paquetes,
      csat: csatRow[0]?.csat ?? null,
      cfg,
    };
  }

  async listarVehiculos() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT v.*, c.nombre AS cliente, t.nombre AS tipo
      FROM vehiculos v
      JOIN clientes c ON c.id = v.cliente_id
      LEFT JOIN tipos_vehiculo t ON t.id = v.tipo_vehiculo_id
      ORDER BY v.id DESC
    `;
    const clientes = await this.prisma.cliente.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    const tipos = await this.prisma.tipoVehiculo.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true },
      orderBy: { id: 'asc' },
    });
    return { rows, clientes, tipos };
  }

  async guardarVehiculo(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const placa = String(body.placa || '')
      .toUpperCase()
      .replace(/\s+/g, '')
      .slice(0, 15);
    const cliente_id = Number(body.cliente_id || 0);
    if (!placa || !cliente_id) {
      throw new BadRequestException('Cliente y placa son obligatorios.');
    }

    const dup = await this.prisma.vehiculo.findFirst({
      where: { placa, ...(id ? { NOT: { id } } : {}) },
    });
    if (dup) throw new BadRequestException('Ya existe un vehículo con esa placa.');

    const data = {
      cliente_id,
      placa,
      marca: body.marca ? String(body.marca).trim().slice(0, 50) : null,
      modelo: body.modelo ? String(body.modelo).trim().slice(0, 50) : null,
      color: body.color ? String(body.color).trim().slice(0, 30) : null,
      anio: body.anio ? Number(body.anio) : null,
      tipo_vehiculo_id: body.tipo_vehiculo_id ? Number(body.tipo_vehiculo_id) : null,
      notas: body.notas ? String(body.notas).trim().slice(0, 255) : null,
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };

    if (id) {
      const updated = await this.prisma.vehiculo.update({ where: { id }, data });
      await this.prisma.logAction(uid, uname, 'vehiculos:update', `Vehículo ${placa}`, ip);
      return updated;
    } else {
      const created = await this.prisma.vehiculo.create({ data });
      await this.prisma.logAction(uid, uname, 'vehiculos:create', `Vehículo ${placa}`, ip);
      return created;
    }
  }

  async eliminarVehiculo(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.vehiculo.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'vehiculos:delete', `Vehículo #${id}`, ip);
    return { ok: true };
  }

  async listarPaquetes() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, s.nombre AS servicio
      FROM paquetes p
      JOIN servicios s ON s.id = p.servicio_id
      ORDER BY p.id DESC
    `;
    const servicios = await this.prisma.servicio.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true, precio: true },
      orderBy: { nombre: 'asc' },
    });
    const clientes = await this.prisma.cliente.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true, nro_doc: true },
      orderBy: { nombre: 'asc' },
    });
    return { rows, servicios, clientes };
  }

  async guardarPaquete(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    const servicio_id = Number(body.servicio_id || 0);
    if (!nombre || !servicio_id) {
      throw new BadRequestException('Nombre y servicio son obligatorios.');
    }
    const data = {
      nombre: nombre.slice(0, 120),
      descripcion: body.descripcion ? String(body.descripcion).trim().slice(0, 255) : null,
      servicio_id,
      usos: Math.max(1, Number(body.usos || 4)),
      precio: Math.max(0, Number(body.precio || 0)),
      vigencia_dias: Math.max(1, Number(body.vigencia_dias || 90)),
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    if (id) {
      const u = await this.prisma.paquete.update({ where: { id }, data });
      await this.prisma.logAction(uid, uname, 'paquetes:update', `Paquete ${nombre}`, ip);
      return u;
    } else {
      const c = await this.prisma.paquete.create({ data });
      await this.prisma.logAction(uid, uname, 'paquetes:create', `Paquete ${nombre}`, ip);
      return c;
    }
  }

  async eliminarPaquete(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.paquete.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'paquetes:delete', `Paquete #${id}`, ip);
    return { ok: true };
  }

  async venderPaquete(body: any, uid: number, uname: string, ip: string) {
    const paquete_id = Number(body.paquete_id || 0);
    const cliente_id = Number(body.cliente_id || 0);
    const p = await this.prisma.paquete.findFirst({ where: { id: paquete_id, estado: 1 } });
    const c = await this.prisma.cliente.findUnique({ where: { id: cliente_id } });
    if (!p || !c) throw new BadRequestException('Selecciona un cliente y paquete válidos.');

    const metodo = ['efectivo', 'tarjeta', 'yape_plin', 'transferencia'].includes(body.metodo_pago)
      ? body.metodo_pago
      : 'efectivo';
    const precio =
      body.precio !== undefined && body.precio !== ''
        ? Math.max(0, Number(body.precio))
        : Number(p.precio);

    const vence = new Date();
    vence.setDate(vence.getDate() + Number(p.vigencia_dias || 90));

    const venta = await this.prisma.clientePaquete.create({
      data: {
        cliente_id,
        paquete_id: p.id,
        servicio_id: p.servicio_id,
        nombre: p.nombre,
        usos_total: p.usos,
        usos_restantes: p.usos,
        precio_pagado: precio,
        metodo_pago: metodo,
        fecha_vence: vence,
        usuario_id: uid,
      },
    });
    await this.prisma.logAction(uid, uname, 'paquetes', `Venta paquete ${p.nombre} a cliente #${cliente_id}`, ip);
    return venta;
  }

  async listarPaquetesVendidos() {
    return this.prisma.$queryRaw<any[]>`
      SELECT cp.*, c.nombre AS cliente, s.nombre AS servicio
      FROM cliente_paquetes cp
      JOIN clientes c ON c.id = cp.cliente_id
      JOIN servicios s ON s.id = cp.servicio_id
      ORDER BY cp.id DESC
      LIMIT 500
    `;
  }

  async paquetesDeCliente(clienteId: number) {
    return this.prisma.$queryRaw<any[]>`
      SELECT id, nombre, servicio_id, usos_restantes, usos_total, fecha_vence
      FROM cliente_paquetes
      WHERE cliente_id = ${clienteId}
        AND usos_restantes > 0
        AND (fecha_vence IS NULL OR fecha_vence >= CURRENT_DATE)
      ORDER BY id ASC
    `;
  }
}
