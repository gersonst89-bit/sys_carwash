import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private toYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private toYm(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  async getDashboard(diasParam?: number) {
    const validDias = [7, 15, 30, 90];
    const dias_p = validDias.includes(Number(diasParam)) ? Number(diasParam) : 7;

    const now = new Date();
    const todayStr = this.toYmd(now);

    const kRows = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE((SELECT SUM(total) FROM ordenes WHERE pagado = 1 AND estado <> 'cancelado' AND DATE(fecha_pago) = CURRENT_DATE), 0)::float AS ventas_hoy,
        COALESCE((SELECT SUM(total) FROM ordenes WHERE pagado = 1 AND estado <> 'cancelado' AND DATE(fecha_pago) = CURRENT_DATE - INTERVAL '1 day'), 0)::float AS ventas_ayer,
        COALESCE((SELECT COUNT(*) FROM ordenes WHERE DATE(fecha_ingreso) = CURRENT_DATE AND estado <> 'cancelado'), 0)::int AS ordenes_hoy,
        COALESCE((SELECT COUNT(*) FROM ordenes WHERE estado IN ('pendiente', 'en_proceso')), 0)::int AS en_proceso,
        COALESCE((SELECT SUM(total) FROM ordenes WHERE pagado = 1 AND estado <> 'cancelado' AND TO_CHAR(fecha_pago, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')), 0)::float AS ventas_mes,
        COALESCE((SELECT SUM(monto) FROM gastos WHERE TO_CHAR(fecha, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')), 0)::float AS gastos_mes,
        COALESCE((SELECT COUNT(*) FROM clientes WHERE estado = 1), 0)::int AS clientes,
        COALESCE((SELECT SUM(total) FROM ordenes WHERE pagado = 1 AND estado <> 'cancelado' AND TO_CHAR(fecha_pago, 'YYYY-MM') = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')), 0)::float AS ventas_mes_ant,
        COALESCE((SELECT COUNT(*) FROM ordenes WHERE pagado = 1 AND estado <> 'cancelado' AND DATE(fecha_pago) = CURRENT_DATE), 0)::int AS cobradas_hoy,
        COALESCE((
          SELECT SUM(GREATEST(0, o.total - COALESCE((SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0), 0)))
          FROM ordenes o
          WHERE o.pagado = 0 AND o.estado <> 'cancelado'
        ), 0)::float AS por_cobrar
    `;

    const kRow = kRows[0] || {};
    const k = {
      ventas_hoy: Number(kRow.ventas_hoy || 0),
      ventas_ayer: Number(kRow.ventas_ayer || 0),
      ordenes_hoy: Number(kRow.ordenes_hoy || 0),
      en_proceso: Number(kRow.en_proceso || 0),
      ventas_mes: Number(kRow.ventas_mes || 0),
      gastos_mes: Number(kRow.gastos_mes || 0),
      clientes: Number(kRow.clientes || 0),
      ventas_mes_ant: Number(kRow.ventas_mes_ant || 0),
      cobradas_hoy: Number(kRow.cobradas_hoy || 0),
      por_cobrar: Number(kRow.por_cobrar || 0),
    };

    const startDays = new Date(now);
    startDays.setDate(startDays.getDate() - (dias_p - 1));
    const startDaysStr = this.toYmd(startDays);

    const rowsDias = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(DATE(fecha_pago), 'YYYY-MM-DD') AS d,
             COALESCE(SUM(total), 0)::float AS t,
             COUNT(*)::int AS n
      FROM ordenes
      WHERE pagado = 1 AND estado <> 'cancelado'
        AND DATE(fecha_pago) >= CAST(${startDaysStr} AS DATE)
      GROUP BY DATE(fecha_pago)
    `;

    const mapDias: Record<string, { t: number; n: number }> = {};
    for (const r of rowsDias) {
      mapDias[r.d] = { t: Number(r.t || 0), n: Number(r.n || 0) };
    }

    const nombresDia = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dias: string[] = [];
    const ventas7: number[] = [];
    const ordenes7: number[] = [];

    for (let i = dias_p - 1; i >= 0; i--) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() - i);
      const dKey = this.toYmd(dt);
      const dayLabel = `${nombresDia[dt.getDay()]} ${String(dt.getDate()).padStart(2, '0')}`;
      dias.push(dayLabel);
      ventas7.push(mapDias[dKey]?.t ?? 0);
      ordenes7.push(mapDias[dKey]?.n ?? 0);
    }

    const start12Months = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const start12Str = this.toYmd(start12Months);

    const vmRows = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(fecha_pago, 'YYYY-MM') AS m, COALESCE(SUM(total), 0)::float AS t
      FROM ordenes
      WHERE pagado = 1 AND estado <> 'cancelado'
        AND DATE(fecha_pago) >= CAST(${start12Str} AS DATE)
      GROUP BY TO_CHAR(fecha_pago, 'YYYY-MM')
    `;
    const gmRows = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(fecha, 'YYYY-MM') AS m, COALESCE(SUM(monto), 0)::float AS t
      FROM gastos
      WHERE fecha >= CAST(${start12Str} AS DATE)
      GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    `;

    const vmMap: Record<string, number> = {};
    for (const r of vmRows) vmMap[r.m] = Number(r.t || 0);
    const gmMap: Record<string, number> = {};
    for (const r of gmRows) gmMap[r.m] = Number(r.t || 0);

    const mn = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses: string[] = [];
    const ventasM: number[] = [];
    const gastosM: number[] = [];

    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = this.toYm(dt);
      meses.push(mn[dt.getMonth()]);
      ventasM.push(vmMap[key] ?? 0);
      gastosM.push(gmMap[key] ?? 0);
    }

    const topServStart = new Date(now);
    topServStart.setDate(topServStart.getDate() - dias_p);
    const topServStartStr = this.toYmd(topServStart);

    const topServ = await this.prisma.$queryRaw<any[]>`
      SELECT d.descripcion AS n,
             COALESCE(SUM(d.subtotal), 0)::float AS t,
             COALESCE(SUM(d.cantidad), 0)::float AS c
      FROM orden_detalle d
      JOIN ordenes o ON o.id = d.orden_id
      WHERE d.tipo = 'servicio'
        AND o.estado <> 'cancelado'
        AND DATE(o.fecha_ingreso) >= CAST(${topServStartStr} AS DATE)
      GROUP BY d.item_id, d.descripcion
      ORDER BY t DESC
      LIMIT 6
    `;

    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);
    const last30Str = this.toYmd(last30);

    const pagos = await this.prisma.$queryRaw<any[]>`
      SELECT p.metodo AS m, COALESCE(SUM(p.monto), 0)::float AS t
      FROM orden_pagos p
      JOIN ordenes o ON o.id = p.orden_id
      WHERE p.anulado = 0
        AND o.estado <> 'cancelado'
        AND DATE(p.fecha) >= CAST(${last30Str} AS DATE)
      GROUP BY p.metodo
    `;

    const emps = await this.prisma.$queryRaw<any[]>`
      SELECT e.nombre AS n,
             COUNT(o.id)::int AS c,
             COALESCE(SUM(o.total), 0)::float AS t
      FROM ordenes o
      JOIN empleados e ON e.id = o.empleado_id
      WHERE o.estado <> 'cancelado'
        AND DATE(o.fecha_ingreso) >= CAST(${last30Str} AS DATE)
      GROUP BY e.id, e.nombre
      ORDER BY t DESC
      LIMIT 5
    `;

    const ultimas = await this.prisma.$queryRaw<any[]>`
      SELECT o.*, c.nombre AS cliente, v.placa
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
      ORDER BY o.id DESC
      LIMIT 7
    `;

    const stockBajo = await this.prisma.$queryRaw<any[]>`
      SELECT id, nombre, stock::float AS stock, stock_minimo::float AS stock_minimo, unidad
      FROM productos
      WHERE estado = 1 AND stock <= stock_minimo
      ORDER BY stock ASC
      LIMIT 6
    `;

    const citasHoy = await this.prisma.$queryRaw<any[]>`
      SELECT ci.*, c.nombre AS cliente, s.nombre AS servicio
      FROM citas ci
      JOIN clientes c ON c.id = ci.cliente_id
      LEFT JOIN servicios s ON s.id = ci.servicio_id
      WHERE DATE(ci.fecha_hora) = CAST(${todayStr} AS DATE)
        AND ci.estado IN ('programada', 'confirmada')
      ORDER BY ci.fecha_hora ASC
      LIMIT 6
    `;

    return {
      dias_p,
      k,
      charts: {
        dias,
        ventas7,
        ordenes7,
        meses,
        ventasM,
        gastosM,
        topServ,
        pagos,
        emps,
      },
      ultimas,
      stockBajo,
      citasHoy,
    };
  }
}
