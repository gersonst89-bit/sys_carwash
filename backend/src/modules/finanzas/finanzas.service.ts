import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FinanzasService {
  constructor(private readonly prisma: PrismaService) {}

  private rango(desde?: string, hasta?: string): [string, string] {
    const now = new Date();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(desde || '')
      ? desde!
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const h = /^\d{4}-\d{2}-\d{2}$/.test(hasta || '') ? hasta! : now.toISOString().slice(0, 10);
    return [d, h];
  }

  async listarComprobantes(desde?: string, hasta?: string) {
    const [d, h] = this.rango(desde, hasta);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT k.*, o.codigo AS orden
      FROM comprobantes k
      JOIN ordenes o ON o.id = k.orden_id
      WHERE DATE(k.fecha) BETWEEN ${d}::date AND ${h}::date
      ORDER BY k.id DESC
      LIMIT 1000
    `;
    const tot = { n: 0, total: 0, anulados: 0 };
    for (const r of rows) {
      if (r.anulado) tot.anulados++;
      else {
        tot.n++;
        tot.total += Number(r.total);
      }
    }
    const seriesList = await this.prisma.comprobanteSerie.findMany();
    const series: Record<string, any> = {};
    for (const s of seriesList) series[s.tipo] = s;
    return { rows, desde: d, hasta: h, tot, series };
  }

  async emitirComprobante(body: any, uid: number, uname: string, ip: string) {
    const oid = Number(body.orden_id || 0);
    const o = await this.prisma.orden.findUnique({ where: { id: oid } });
    if (!o || o.estado === 'cancelado') {
      throw new BadRequestException('La orden no existe o está cancelada.');
    }

    const tipo = ['boleta', 'factura', 'nota_venta'].includes(body.tipo) ? body.tipo : 'boleta';
    const doc = String(body.doc_numero || '').replace(/\D+/g, '');
    const razon = String(body.razon_social || '').trim();
    const dir = String(body.direccion || '').trim();

    if (tipo === 'factura' && (doc.length !== 11 || !razon)) {
      throw new BadRequestException('La factura requiere RUC de 11 dígitos y razón social.');
    }
    if (tipo === 'boleta' && Number(o.total) >= 700 && doc.length < 8) {
      throw new BadRequestException('Boletas desde S/ 700 requieren documento del cliente.');
    }

    const seriesMap: Record<string, string> = {
      boleta: 'B001',
      factura: 'F001',
      nota_venta: 'NV01',
    };

    const comp = await this.prisma.$transaction(async (tx) => {
      const active = await tx.comprobante.findFirst({
        where: { orden_id: oid, anulado: 0 },
      });
      if (active) {
        throw new BadRequestException(
          'Esta orden ya tiene un comprobante emitido. Anúlalo para emitir otro.',
        );
      }
      const s = await tx.comprobanteSerie.upsert({
        where: { tipo },
        update: { correlativo: { increment: 1 } },
        create: { tipo, serie: seriesMap[tipo], correlativo: 1 },
      });
      const total = Number(o.total);
      const imp = Number(o.impuesto);
      return tx.comprobante.create({
        data: {
          orden_id: oid,
          tipo,
          serie: s.serie,
          numero: s.correlativo,
          doc_tipo: tipo === 'factura' ? 'RUC' : doc ? (doc.length === 8 ? 'DNI' : 'DOC') : null,
          doc_numero: doc || null,
          razon_social: razon || null,
          direccion: dir || null,
          subtotal: Math.round((total - imp) * 100) / 100,
          impuesto: imp,
          total,
          usuario_id: uid,
        },
      });
    });

    await this.prisma.logAction(
      uid,
      uname,
      'caja',
      `Emitió ${comp.serie}-${String(comp.numero).padStart(8, '0')}`,
      ip,
    );
    return comp;
  }

  async verComprobante(id: number) {
    const k = await this.prisma.comprobante.findUnique({ where: { id } });
    if (!k) throw new NotFoundException('Comprobante no encontrado.');
    const oRows = await this.prisma.$queryRaw<any[]>`
      SELECT o.*, c.nombre AS cliente
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      WHERE o.id = ${k.orden_id}
    `;
    const items = await this.prisma.ordenDetalle.findMany({
      where: { orden_id: k.orden_id },
      orderBy: { id: 'asc' },
    });
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    return { k, o: oRows[0], items, emp };
  }

  async anularComprobante(id: number, uid: number, uname: string, ip: string) {
    const k = await this.prisma.comprobante.findUnique({ where: { id } });
    if (!k) throw new NotFoundException('Comprobante no encontrado.');
    if (!k.anulado) {
      await this.prisma.comprobante.update({ where: { id }, data: { anulado: 1 } });
      await this.prisma.logAction(uid, uname, 'caja', `Anuló comprobante ${k.serie}-${k.numero}`, ip);
    }
    return { ok: true };
  }

  private async pendientesCobro(cid?: number) {
    const rows = cid
      ? await this.prisma.$queryRaw<any[]>`
          SELECT o.id, o.codigo, o.cliente_id, o.total::float AS total, o.estado, o.fecha_ingreso,
            v.placa, c.nombre AS cliente, c.telefono,
            COALESCE((SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0), 0)::float AS abonado,
            (CURRENT_DATE - DATE(o.fecha_ingreso))::int AS dias
          FROM ordenes o
          LEFT JOIN clientes c ON c.id = o.cliente_id
          LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
          WHERE o.pagado = 0 AND o.estado <> 'cancelado' AND o.cliente_id = ${cid}
          ORDER BY o.fecha_ingreso ASC
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT o.id, o.codigo, o.cliente_id, o.total::float AS total, o.estado, o.fecha_ingreso,
            v.placa, c.nombre AS cliente, c.telefono,
            COALESCE((SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0), 0)::float AS abonado,
            (CURRENT_DATE - DATE(o.fecha_ingreso))::int AS dias
          FROM ordenes o
          LEFT JOIN clientes c ON c.id = o.cliente_id
          LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
          WHERE o.pagado = 0 AND o.estado <> 'cancelado'
          ORDER BY o.fecha_ingreso ASC
        `;

    return rows
      .map((r) => ({
        ...r,
        saldo: Math.round((Number(r.total) - Number(r.abonado)) * 100) / 100,
      }))
      .filter((r) => r.saldo > 0.004);
  }

  async listarCobranzas() {
    const all = await this.pendientesCobro();
    const k = { total: 0, ordenes: all.length, v0: 0, v7: 0, v30: 0, clientes: 0 };
    const map = new Map<number, any>();

    for (const r of all) {
      k.total += r.saldo;
      if (r.dias <= 7) k.v0 += r.saldo;
      else if (r.dias <= 30) k.v7 += r.saldo;
      else k.v30 += r.saldo;

      const key = Number(r.cliente_id || 0);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          cliente: r.cliente || 'Sin cliente registrado',
          telefono: r.telefono,
          n: 0,
          deuda: 0,
          dias: 0,
          ordenes: [],
        });
      }
      const item = map.get(key);
      item.n++;
      item.deuda = Math.round((item.deuda + r.saldo) * 100) / 100;
      item.dias = Math.max(item.dias, Number(r.dias || 0));
      item.ordenes.push(r);
    }

    const por = Array.from(map.values()).sort((a, b) => b.deuda - a.deuda);
    k.clientes = por.filter((x) => x.id > 0).length;
    return { k, por };
  }

  async estadoCuentaCliente(id: number) {
    const c = await this.prisma.cliente.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cliente no encontrado.');
    const ord = await this.pendientesCobro(id);
    const hist = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, o.codigo
      FROM orden_pagos p
      JOIN ordenes o ON o.id = p.orden_id
      WHERE o.cliente_id = ${id} AND p.anulado = 0
      ORDER BY p.id DESC
      LIMIT 20
    `;
    const deuda = ord.reduce((acc, x) => acc + x.saldo, 0);
    return { c, ord, hist, deuda: Math.round(deuda * 100) / 100 };
  }

  async abonarCliente(body: any, uid: number, uname: string, ip: string) {
    const cid = Number(body.cliente_id || 0);
    const monto = Math.round(Number(body.monto || 0) * 100) / 100;
    const metodo = ['efectivo', 'tarjeta', 'yape_plin', 'transferencia'].includes(body.metodo_pago)
      ? body.metodo_pago
      : 'efectivo';
    const ref = body.referencia ? String(body.referencia).trim().slice(0, 80) : null;

    const ord = await this.pendientesCobro(cid);
    const deuda = ord.reduce((acc, x) => acc + x.saldo, 0);
    if (monto <= 0 || !ord.length) throw new BadRequestException('Ingresa un monto válido.');
    if (monto > deuda + 0.004) {
      throw new BadRequestException(`El abono (${monto}) supera la deuda (${deuda.toFixed(2)}).`);
    }

    let rest = monto;
    let cerradas = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const o of ord) {
        if (rest <= 0.004) break;
        const abono = Math.round(Math.min(rest, o.saldo) * 100) / 100;
        await tx.ordenPago.create({
          data: {
            orden_id: o.id,
            monto: abono,
            propina: 0,
            metodo,
            referencia: ref,
            usuario_id: uid,
          },
        });
        rest = Math.round((rest - abono) * 100) / 100;
        if (o.saldo - abono <= 0.004) {
          await tx.orden.update({
            where: { id: o.id },
            data: { pagado: 1, metodo_pago: metodo, fecha_pago: new Date() },
          });
          cerradas++;
        }
      }
    });

    await this.prisma.logAction(uid, uname, 'cobranzas', `Abono de ${monto} cliente #${cid}`, ip);
    return { ok: true, monto, cerradas };
  }

  private async pendientesPago(pid?: number) {
    return pid
      ? this.prisma.$queryRaw<any[]>`
          SELECT c.id, c.proveedor_id, c.fecha, c.vence, c.nro_doc, c.total::float AS total,
            c.pagado::float AS pagado, ROUND((c.total - c.pagado)::numeric, 2)::float AS saldo,
            p.nombre AS proveedor, p.telefono,
            CASE WHEN c.vence IS NOT NULL THEN (CURRENT_DATE - c.vence)::int ELSE 0 END AS atraso
          FROM compras c
          LEFT JOIN proveedores p ON p.id = c.proveedor_id
          WHERE c.condicion = 'credito' AND (c.total - c.pagado) > 0.004 AND c.proveedor_id = ${pid}
          ORDER BY c.vence ASC, c.id ASC
        `
      : this.prisma.$queryRaw<any[]>`
          SELECT c.id, c.proveedor_id, c.fecha, c.vence, c.nro_doc, c.total::float AS total,
            c.pagado::float AS pagado, ROUND((c.total - c.pagado)::numeric, 2)::float AS saldo,
            p.nombre AS proveedor, p.telefono,
            CASE WHEN c.vence IS NOT NULL THEN (CURRENT_DATE - c.vence)::int ELSE 0 END AS atraso
          FROM compras c
          LEFT JOIN proveedores p ON p.id = c.proveedor_id
          WHERE c.condicion = 'credito' AND (c.total - c.pagado) > 0.004
          ORDER BY c.vence ASC, c.id ASC
        `;
  }

  async listarPorPagar() {
    const all = await this.pendientesPago();
    const k = { total: 0, vencido: 0, prox7: 0, compras: all.length };
    const map = new Map<number, any>();

    for (const r of all) {
      k.total += r.saldo;
      if (r.vence && r.atraso > 0) k.vencido += r.saldo;
      else if (r.vence && r.atraso >= -7) k.prox7 += r.saldo;

      const key = Number(r.proveedor_id || 0);
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          proveedor: r.proveedor || 'Sin proveedor',
          telefono: r.telefono,
          n: 0,
          deuda: 0,
          vence: null,
          atraso: -9999,
        });
      }
      const item = map.get(key);
      item.n++;
      item.deuda = Math.round((item.deuda + r.saldo) * 100) / 100;
      item.atraso = Math.max(item.atraso, Number(r.atraso || 0));
      if (r.vence && (!item.vence || r.vence < item.vence)) item.vence = r.vence;
    }

    const por = Array.from(map.values()).sort((a, b) => b.atraso - a.atraso || b.deuda - a.deuda);
    return { k, por };
  }

  async estadoCuentaProveedor(id: number) {
    const p = await this.prisma.proveedor.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Proveedor no encontrado.');
    const ord = await this.pendientesPago(id);
    const hist = await this.prisma.$queryRaw<any[]>`
      SELECT x.*, c.nro_doc
      FROM compra_pagos x
      JOIN compras c ON c.id = x.compra_id
      WHERE c.proveedor_id = ${id}
      ORDER BY x.id DESC
      LIMIT 20
    `;
    const deuda = ord.reduce((acc, x) => acc + x.saldo, 0);
    return { p, ord, hist, deuda: Math.round(deuda * 100) / 100 };
  }

  private async registrarPagoCompraTx(
    tx: any,
    c: any,
    montoIn: number,
    metodoIn: string,
    ref: string | null,
    uid: number,
  ) {
    const metodo = ['efectivo', 'tarjeta', 'yape_plin', 'transferencia'].includes(metodoIn)
      ? metodoIn
      : 'efectivo';
    const saldo = Math.round((Number(c.total) - Number(c.pagado)) * 100) / 100;
    const monto = Math.round(Math.min(Math.max(0, montoIn), saldo) * 100) / 100;
    if (monto <= 0) return 0;

    await tx.compraPago.create({
      data: {
        compra_id: c.id,
        monto,
        metodo,
        referencia: ref ? ref.slice(0, 80) : null,
        usuario_id: uid,
      },
    });
    await tx.compra.update({
      where: { id: c.id },
      data: { pagado: Number(c.pagado) + monto },
    });
    await tx.gasto.create({
      data: {
        fecha: new Date(),
        categoria: 'Insumos',
        concepto: `Pago compra #${c.id}${c.nro_doc ? ' · ' + c.nro_doc : ''}`,
        monto,
        usuario_id: uid,
      },
    });
    return monto;
  }

  async pagarCompra(body: any, uid: number, uname: string, ip: string) {
    const compraId = Number(body.compra_id || 0);
    const c = await this.prisma.compra.findFirst({
      where: { id: compraId, condicion: 'credito' },
    });
    if (!c) throw new NotFoundException('Compra no encontrada.');

    const m = await this.prisma.$transaction(async (tx) => {
      const paid = await this.registrarPagoCompraTx(
        tx,
        c,
        Number(body.monto || 0),
        body.metodo || 'efectivo',
        body.referencia ? String(body.referencia).trim() : null,
        uid,
      );
      if (paid <= 0) throw new BadRequestException('Monto inválido o la compra ya está pagada.');
      return paid;
    });

    await this.prisma.logAction(uid, uname, 'compras', `Pago de compra #${c.id}: ${m}`, ip);
    return { ok: true, monto: m };
  }

  async abonarProveedor(body: any, uid: number, uname: string, ip: string) {
    const pid = Number(body.proveedor_id || 0);
    const monto = Math.round(Number(body.monto || 0) * 100) / 100;
    const ord = await this.pendientesPago(pid);
    const deuda = ord.reduce((acc, x) => acc + x.saldo, 0);
    if (monto <= 0 || !ord.length) throw new BadRequestException('Ingresa un monto válido.');
    if (monto > deuda + 0.004) {
      throw new BadRequestException(`El abono (${monto}) supera la deuda (${deuda.toFixed(2)}).`);
    }

    let rest = monto;
    let n = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const c of ord) {
        if (rest <= 0.004) break;
        const m = await this.registrarPagoCompraTx(
          tx,
          c,
          Math.min(rest, c.saldo),
          body.metodo || 'efectivo',
          body.referencia ? String(body.referencia).trim() : null,
          uid,
        );
        rest = Math.round((rest - m) * 100) / 100;
        if (m > 0) n++;
      }
    });

    await this.prisma.logAction(uid, uname, 'compras', `Abono a proveedor #${pid}: ${monto}`, ip);
    return { ok: true, monto, compras: n };
  }

  async listarGastos() {
    return this.prisma.gasto.findMany({ orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 500 });
  }

  async guardarGasto(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const concepto = String(body.concepto || '').trim();
    if (!concepto) throw new BadRequestException('El concepto del gasto es obligatorio.');
    const data = {
      fecha: body.fecha ? new Date(body.fecha) : new Date(),
      categoria: String(body.categoria || 'Otros').slice(0, 60),
      concepto: concepto.slice(0, 180),
      monto: Math.max(0, Number(body.monto || 0)),
      usuario_id: uid,
    };
    const res = id
      ? await this.prisma.gasto.update({ where: { id }, data })
      : await this.prisma.gasto.create({ data });
    await this.prisma.logAction(uid, uname, 'gastos:save', `Gasto ${concepto} (${data.monto})`, ip);
    return res;
  }

  async eliminarGasto(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.gasto.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'gastos:delete', `Gasto #${id}`, ip);
    return { ok: true };
  }

  async obtenerReportes(desde?: string, hasta?: string) {
    const [d, h] = this.rango(desde, hasta);

    const rRows = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM(total), 0)::float AS ingresos,
        COUNT(*)::int AS ordenes,
        COALESCE(AVG(total), 0)::float AS promedio,
        COALESCE(SUM(impuesto), 0)::float AS impuestos
      FROM ordenes o
      WHERE o.pagado = 1 AND o.estado <> 'cancelado'
        AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
    `;
    const r = rRows[0] || { ingresos: 0, ordenes: 0, promedio: 0, impuestos: 0 };

    const paqRows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(precio_pagado), 0)::float AS paq
      FROM cliente_paquetes
      WHERE DATE(fecha_compra) BETWEEN ${d}::date AND ${h}::date
    `;
    r.paquetes = Number(paqRows[0]?.paq || 0);
    r.ingresos = Number(r.ingresos) + r.paquetes;

    const gasRows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(monto), 0)::float AS gas
      FROM gastos
      WHERE fecha BETWEEN ${d}::date AND ${h}::date
    `;
    r.gastos = Number(gasRows[0]?.gas || 0);
    r.utilidad = r.ingresos - r.gastos;

    const porDia = await this.prisma.$queryRaw<any[]>`
      SELECT DATE(o.fecha_pago)::text AS d, SUM(o.total)::float AS t, COUNT(*)::int AS n
      FROM ordenes o
      WHERE o.pagado = 1 AND o.estado <> 'cancelado'
        AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
      GROUP BY DATE(o.fecha_pago)
      ORDER BY d ASC
    `;

    const servicios = await this.prisma.$queryRaw<any[]>`
      SELECT dt.descripcion AS n, SUM(dt.cantidad)::float AS c, SUM(dt.subtotal)::float AS t
      FROM orden_detalle dt
      JOIN ordenes o ON o.id = dt.orden_id
      WHERE o.pagado = 1 AND o.estado <> 'cancelado'
        AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
      GROUP BY dt.tipo, dt.item_id, dt.descripcion
      ORDER BY t DESC
      LIMIT 15
    `;

    const empleados = await this.prisma.$queryRaw<any[]>`
      SELECT e.nombre,
        COUNT(DISTINCT o.id)::int AS ordenes,
        COALESCE(SUM(dt.subtotal), 0)::float AS ventas,
        COALESCE(SUM(dt.subtotal * (CASE WHEN COALESCE(s.comision_pct, 0) > 0 THEN s.comision_pct ELSE e.comision_pct END) / 100), 0)::float AS comision
      FROM ordenes o
      JOIN empleados e ON e.id = o.empleado_id
      JOIN orden_detalle dt ON dt.orden_id = o.id AND dt.tipo = 'servicio'
      LEFT JOIN servicios s ON s.id = dt.item_id
      WHERE o.pagado = 1 AND o.estado <> 'cancelado'
        AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
      GROUP BY e.id
      ORDER BY ventas DESC
    `;

    const pagos = await this.prisma.$queryRaw<any[]>`
      SELECT p.metodo AS m, COUNT(*)::int AS n, SUM(p.monto)::float AS t
      FROM orden_pagos p
      JOIN ordenes o ON o.id = p.orden_id
      WHERE p.anulado = 0 AND o.estado <> 'cancelado'
        AND DATE(p.fecha) BETWEEN ${d}::date AND ${h}::date
      GROUP BY p.metodo
    `;

    const gastosCat = await this.prisma.$queryRaw<any[]>`
      SELECT categoria AS n, SUM(monto)::float AS t
      FROM gastos
      WHERE fecha BETWEEN ${d}::date AND ${h}::date
      GROUP BY categoria
      ORDER BY t DESC
    `;

    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });

    return { d, h, r, porDia, servicios, empleados, pagos, gastosCat, emp };
  }

  async exportarReporte(tipo: string, desde?: string, hasta?: string) {
    const [d, h] = this.rango(desde, hasta);
    switch (tipo) {
      case 'ventas_dia':
        return {
          titulo: 'Ventas por día',
          columnas: ['Fecha', 'Órdenes', 'Total vendido'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT DATE(o.fecha_pago)::text AS fecha, COUNT(*)::int AS ordenes, SUM(o.total)::float AS total
            FROM ordenes o
            WHERE o.pagado = 1 AND o.estado <> 'cancelado' AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
            GROUP BY DATE(o.fecha_pago) ORDER BY 1
          `,
        };
      case 'servicios':
        return {
          titulo: 'Servicios vendidos',
          columnas: ['Concepto', 'Tipo', 'Cantidad', 'Importe'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT dt.descripcion, dt.tipo, SUM(dt.cantidad)::float AS cantidad, SUM(dt.subtotal)::float AS importe
            FROM orden_detalle dt JOIN ordenes o ON o.id = dt.orden_id
            WHERE o.pagado = 1 AND o.estado <> 'cancelado' AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
            GROUP BY dt.tipo, dt.item_id, dt.descripcion ORDER BY 4 DESC
          `,
        };
      case 'cobrar':
        return {
          titulo: 'Cuentas por cobrar',
          columnas: ['Orden', 'Fecha', 'Cliente', 'Teléfono', 'Placa', 'Total', 'Abonado', 'Saldo', 'Días'],
          filas: await this.pendientesCobro(),
        };
      case 'pagar':
        return {
          titulo: 'Cuentas por pagar',
          columnas: ['Compra', 'Proveedor', 'Documento', 'Fecha', 'Vence', 'Total', 'Pagado', 'Saldo'],
          filas: await this.pendientesPago(),
        };
      case 'inventario':
        return {
          titulo: 'Inventario',
          columnas: ['Código', 'Producto', 'Unidad', 'Stock', 'Stock mínimo', 'Costo', 'Precio venta', 'Valor en stock', 'A la venta'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT codigo, nombre, unidad, stock::float, stock_minimo::float, precio_compra::float, precio_venta::float,
              ROUND((stock * precio_compra)::numeric, 2)::float AS valor_stock,
              CASE WHEN se_vende = 1 THEN 'Sí' ELSE 'Insumo' END AS a_la_venta
            FROM productos WHERE estado = 1 ORDER BY nombre
          `,
        };
      case 'clientes':
        return {
          titulo: 'Clientes',
          columnas: ['Nombre', 'Documento', 'Teléfono', 'Email', 'Dirección', 'Órdenes', 'Total comprado', 'Última visita'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT c.nombre, CONCAT(c.tipo_doc, ' ', COALESCE(c.nro_doc, '')) AS doc, c.telefono, c.email, c.direccion,
              COUNT(o.id)::int AS ordenes, COALESCE(SUM(o.total), 0)::float AS total, MAX(DATE(o.fecha_ingreso))::text AS ultima
            FROM clientes c LEFT JOIN ordenes o ON o.cliente_id = c.id AND o.estado <> 'cancelado'
            WHERE c.estado = 1 GROUP BY c.id ORDER BY c.nombre
          `,
        };
      case 'gastos':
        return {
          titulo: 'Gastos',
          columnas: ['Fecha', 'Categoría', 'Concepto', 'Monto'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT fecha::text, categoria, concepto, monto::float
            FROM gastos WHERE fecha BETWEEN ${d}::date AND ${h}::date ORDER BY fecha, id
          `,
        };
      default:
        return {
          titulo: 'Órdenes',
          columnas: ['Código', 'Fecha', 'Cliente', 'Placa', 'Lavador', 'Estado', 'Método', 'Pagado', 'Subtotal', 'Descuento', 'Impuesto', 'Total'],
          filas: await this.prisma.$queryRaw<any[]>`
            SELECT o.codigo, o.fecha_ingreso::text, c.nombre AS cliente, v.placa, e.nombre AS lavador,
              o.estado, o.metodo_pago, CASE WHEN o.pagado = 1 THEN 'Sí' ELSE 'No' END AS pagado,
              o.subtotal::float, o.descuento::float, o.impuesto::float, o.total::float
            FROM ordenes o
            LEFT JOIN clientes c ON c.id = o.cliente_id
            LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
            LEFT JOIN empleados e ON e.id = o.empleado_id
            WHERE DATE(o.fecha_ingreso) BETWEEN ${d}::date AND ${h}::date
            ORDER BY o.id
          `,
        };
    }
  }
}
