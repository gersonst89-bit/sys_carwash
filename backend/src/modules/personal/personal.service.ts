import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonalService {
  constructor(private readonly prisma: PrismaService) {}

  async listarEmpleados() {
    return this.prisma.empleado.findMany({ orderBy: { id: 'desc' } });
  }

  async guardarEmpleado(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del empleado es obligatorio.');
    const data = {
      nombre: nombre.slice(0, 150),
      documento: body.documento ? String(body.documento).trim().slice(0, 20) : null,
      telefono: body.telefono ? String(body.telefono).trim().slice(0, 30) : null,
      cargo: String(body.cargo || 'Lavador').trim().slice(0, 60),
      sueldo: Math.max(0, Number(body.sueldo || 0)),
      comision_pct: Math.max(0, Number(body.comision_pct || 0)),
      fecha_ingreso: body.fecha_ingreso ? new Date(body.fecha_ingreso) : null,
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    const res = id
      ? await this.prisma.empleado.update({ where: { id }, data })
      : await this.prisma.empleado.create({ data });
    await this.prisma.logAction(uid, uname, 'empleados:save', `Empleado ${nombre}`, ip);
    return res;
  }

  async eliminarEmpleado(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.empleado.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'empleados:delete', `Empleado #${id}`, ip);
    return { ok: true };
  }

  private async calcularComision(empId: number, d: string, h: string) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        COUNT(DISTINCT o.id)::int AS ordenes,
        COALESCE(SUM(dt.subtotal), 0)::float AS ventas,
        COALESCE(SUM(dt.subtotal * (CASE WHEN COALESCE(s.comision_pct, 0) > 0 THEN s.comision_pct ELSE e.comision_pct END) / 100), 0)::float AS comision
      FROM ordenes o
      JOIN empleados e ON e.id = o.empleado_id
      JOIN orden_detalle dt ON dt.orden_id = o.id AND dt.tipo = 'servicio'
      LEFT JOIN servicios s ON s.id = dt.item_id
      WHERE o.empleado_id = ${empId}
        AND o.pagado = 1
        AND o.estado <> 'cancelado'
        AND DATE(o.fecha_pago) BETWEEN ${d}::date AND ${h}::date
    `;
    return rows[0] || { ordenes: 0, ventas: 0, comision: 0 };
  }

  async listarComisiones(desde?: string, hasta?: string) {
    const now = new Date();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(desde || '')
      ? desde!
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const h = /^\d{4}-\d{2}-\d{2}$/.test(hasta || '') ? hasta! : now.toISOString().slice(0, 10);

    const empsRaw = await this.prisma.empleado.findMany({
      where: { estado: 1 },
      orderBy: { nombre: 'asc' },
    });
    const emps: any[] = [];
    for (const e of empsRaw) {
      const calc = await this.calcularComision(e.id, d, h);
      const pagRow = await this.prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(monto), 0)::float AS pagado
        FROM comisiones_pagos
        WHERE empleado_id = ${e.id} AND desde <= ${h}::date AND hasta >= ${d}::date
      `;
      emps.push({
        ...e,
        sueldo: Number(e.sueldo),
        comision_pct: Number(e.comision_pct),
        ...calc,
        pagado: Number(pagRow[0]?.pagado || 0),
      });
    }

    const hist = await this.prisma.$queryRaw<any[]>`
      SELECT cp.*, e.nombre AS empleado
      FROM comisiones_pagos cp
      JOIN empleados e ON e.id = cp.empleado_id
      ORDER BY cp.id DESC
      LIMIT 30
    `;

    return { emps, hist, d, h };
  }

  async pagarComision(body: any, uid: number, uname: string, ip: string) {
    const empId = Number(body.empleado_id || 0);
    const d = String(body.desde || '');
    const h = String(body.hasta || '');
    const e = await this.prisma.empleado.findUnique({ where: { id: empId } });
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(h)) {
      throw new BadRequestException('Datos inválidos.');
    }

    const overlap = await this.prisma.$queryRaw<any[]>`
      SELECT COUNT(*)::int AS n
      FROM comisiones_pagos
      WHERE empleado_id = ${empId} AND desde <= ${h}::date AND hasta >= ${d}::date
    `;
    if (Number(overlap[0]?.n || 0) > 0) {
      throw new BadRequestException(
        `Ya existe un pago de comisiones que se cruza con ese periodo para ${e.nombre}.`,
      );
    }

    const calc = await this.calcularComision(empId, d, h);
    const monto = Math.round(Number(calc.comision) * 100) / 100;
    if (monto <= 0) throw new BadRequestException('No hay comisión por pagar en ese periodo.');

    await this.prisma.$transaction(async (tx) => {
      await tx.comisionPago.create({
        data: {
          empleado_id: empId,
          desde: new Date(d),
          hasta: new Date(h),
          ventas: Number(calc.ventas),
          monto,
          usuario_id: uid,
        },
      });
      await tx.gasto.create({
        data: {
          fecha: new Date(),
          categoria: 'Sueldos',
          concepto: `Comisiones ${e.nombre} (${d} a ${h})`,
          monto,
          usuario_id: uid,
        },
      });
    });

    await this.prisma.logAction(uid, uname, 'comisiones', `Pago comisiones ${e.nombre}: ${monto}`, ip);
    return { ok: true, monto };
  }

  async getConfig() {
    let cfg = await this.prisma.asistenciaConfig.findUnique({ where: { id: 1 } });
    if (!cfg) {
      cfg = await this.prisma.asistenciaConfig.create({ data: { id: 1 } });
    }
    return cfg;
  }

  private minutos(hhmmss: string): number {
    const parts = (hhmmss || '00:00:00').split(':');
    return Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
  }

  async listarAsistencia(fecha?: string) {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(fecha || '')
      ? fecha!
      : new Date().toISOString().slice(0, 10);
    const cfg = await this.getConfig();
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT e.id, e.nombre, e.cargo, a.entrada, a.salida, a.estado, COALESCE(a.min_tarde, 0)::int AS min_tarde
      FROM empleados e
      LEFT JOIN asistencias a ON a.empleado_id = e.id AND a.fecha = ${f}::date
      WHERE e.estado = 1
      ORDER BY e.nombre ASC
    `;
    const res: Record<string, number> = {
      presente: 0,
      tardanza: 0,
      falta: 0,
      permiso: 0,
      descanso: 0,
      sin: 0,
    };
    for (const r of rows) {
      if (r.estado && res[r.estado] !== undefined) res[r.estado]++;
      else res.sin++;
    }
    const dayOfWeek = new Date(f + 'T12:00:00').getDay() || 7;
    const laboral = (cfg.dias_laborales || '1,2,3,4,5,6').split(',').includes(String(dayOfWeek));
    return { rows, f, cfg, res, laboral };
  }

  async marcarAsistencia(body: any, uid: number, uname: string, ip: string) {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(body.fecha || '')
      ? body.fecha
      : new Date().toISOString().slice(0, 10);
    const empId = Number(body.empleado_id || 0);
    const acc = String(body.accion || '');
    const e = await this.prisma.empleado.findUnique({ where: { id: empId } });
    if (!e) throw new NotFoundException('Empleado no encontrado.');

    const cfg = await this.getConfig();
    const nowTime = new Date().toTimeString().slice(0, 8);
    const horaRaw = String(body.hora || '').trim();
    const formatHora = (h: string, def: string) =>
      /^\d{2}:\d{2}(:\d{2})?$/.test(h) ? (h.length === 5 ? `${h}:00` : h) : def;

    const fechaDate = new Date(f);
    const existing = await this.prisma.asistencia.findUnique({
      where: { empleado_id_fecha: { empleado_id: empId, fecha: fechaDate } },
    });

    if (acc === 'entrada') {
      const h = formatHora(horaRaw, f === new Date().toISOString().slice(0, 10) ? nowTime : cfg.hora_entrada);
      const late = Math.max(0, this.minutos(h) - this.minutos(cfg.hora_entrada));
      const est = late > cfg.tolerancia ? 'tardanza' : 'presente';
      const minTarde = est === 'tardanza' ? late : 0;

      await this.prisma.asistencia.upsert({
        where: { empleado_id_fecha: { empleado_id: empId, fecha: fechaDate } },
        update: { entrada: h, estado: est, min_tarde: minTarde, usuario_id: uid },
        create: {
          empleado_id: empId,
          fecha: fechaDate,
          entrada: h,
          estado: est,
          min_tarde: minTarde,
          usuario_id: uid,
        },
      });
    } else if (acc === 'salida') {
      if (!existing || !existing.entrada) {
        throw new BadRequestException(`Primero registra la entrada de ${e.nombre}.`);
      }
      const h = formatHora(horaRaw, f === new Date().toISOString().slice(0, 10) ? nowTime : cfg.hora_salida);
      if (h <= existing.entrada) {
        throw new BadRequestException(`La salida debe ser posterior a la entrada (${existing.entrada.slice(0, 5)}).`);
      }
      await this.prisma.asistencia.update({
        where: { id: existing.id },
        data: { salida: h, usuario_id: uid },
      });
    } else if (['falta', 'permiso', 'descanso'].includes(acc)) {
      await this.prisma.asistencia.upsert({
        where: { empleado_id_fecha: { empleado_id: empId, fecha: fechaDate } },
        update: { entrada: null, salida: null, estado: acc, min_tarde: 0, usuario_id: uid },
        create: {
          empleado_id: empId,
          fecha: fechaDate,
          entrada: null,
          salida: null,
          estado: acc,
          min_tarde: 0,
          usuario_id: uid,
        },
      });
    } else if (acc === 'borrar') {
      if (existing) {
        await this.prisma.asistencia.delete({ where: { id: existing.id } });
      }
    }

    await this.prisma.logAction(uid, uname, 'empleados', `Asistencia ${acc}: ${e.nombre} (${f})`, ip);
    return { ok: true };
  }

  async cerrarDia(fecha: string, uid: number, uname: string, ip: string) {
    const f = /^\d{4}-\d{2}-\d{2}$/.test(fecha || '')
      ? fecha
      : new Date().toISOString().slice(0, 10);
    const n = await this.prisma.$executeRaw`
      INSERT INTO asistencias (empleado_id, fecha, estado, min_tarde, usuario_id)
      SELECT e.id, ${f}::date, 'falta', 0, ${uid}
      FROM empleados e
      WHERE e.estado = 1
        AND (e.fecha_ingreso IS NULL OR e.fecha_ingreso <= ${f}::date)
        AND NOT EXISTS (
          SELECT 1 FROM asistencias a WHERE a.empleado_id = e.id AND a.fecha = ${f}::date
        )
    `;
    await this.prisma.logAction(uid, uname, 'empleados', `Cerró asistencia ${f}: ${n} faltas`, ip);
    return { ok: true, faltas: n };
  }

  async resumenMes(mes?: string) {
    const m = /^\d{4}-\d{2}$/.test(mes || '') ? mes! : new Date().toISOString().slice(0, 7);
    const d = `${m}-01`;
    const [yr, mo] = m.split('-').map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const h = `${m}-${String(lastDay).padStart(2, '0')}`;

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT e.id, e.nombre, e.cargo,
        COALESCE(SUM(CASE WHEN a.estado IN ('presente', 'tardanza') THEN 1 ELSE 0 END), 0)::int AS asistio,
        COALESCE(SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END), 0)::int AS tardanzas,
        COALESCE(SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END), 0)::int AS faltas,
        COALESCE(SUM(CASE WHEN a.estado = 'permiso' THEN 1 ELSE 0 END), 0)::int AS permisos,
        COALESCE(SUM(CASE WHEN a.estado = 'descanso' THEN 1 ELSE 0 END), 0)::int AS descansos,
        COALESCE(SUM(a.min_tarde), 0)::int AS min_tarde,
        COALESCE(SUM(
          CASE WHEN a.entrada IS NOT NULL AND a.salida IS NOT NULL
          THEN EXTRACT(EPOCH FROM (a.salida::time - a.entrada::time)) / 3600.0
          ELSE 0 END
        ), 0)::float AS horas
      FROM empleados e
      LEFT JOIN asistencias a ON a.empleado_id = e.id AND a.fecha BETWEEN ${d}::date AND ${h}::date
      WHERE e.estado = 1
      GROUP BY e.id
      ORDER BY e.nombre ASC
    `;
    return { mes: m, rows };
  }

  async guardarConfig(body: any) {
    const dias = Array.isArray(body.dias)
      ? body.dias.filter((d: any) => ['1', '2', '3', '4', '5', '6', '7'].includes(String(d))).join(',')
      : String(body.dias_laborales || '1,2,3,4,5,6');

    return this.prisma.asistenciaConfig.upsert({
      where: { id: 1 },
      update: {
        hora_entrada: String(body.hora_entrada || '08:00:00').slice(0, 8),
        hora_salida: String(body.hora_salida || '17:00:00').slice(0, 8),
        tolerancia: Math.max(0, Math.min(120, Number(body.tolerancia ?? 10))),
        dias_laborales: dias || '1,2,3,4,5,6',
        dias_mes: Math.max(26, Math.min(31, Number(body.dias_mes ?? 30))),
        desc_tardanza: body.desc_tardanza ? 1 : 0,
      },
      create: { id: 1 },
    });
  }

  private async calcularEmpleadoMes(e: any, mes: string, cfg: any) {
    const d = `${mes}-01`;
    const [yr, mo] = mes.split('-').map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const h = `${mes}-${String(lastDay).padStart(2, '0')}`;
    const sueldo = Number(e.sueldo || 0);

    const aRows = await this.prisma.$queryRaw<any[]>`
      SELECT
        COALESCE(SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END), 0)::int AS faltas,
        COALESCE(SUM(min_tarde), 0)::int AS mt
      FROM asistencias
      WHERE empleado_id = ${e.id} AND fecha BETWEEN ${d}::date AND ${h}::date
    `;
    const faltas = Number(aRows[0]?.faltas || 0);
    const mt = Number(aRows[0]?.mt || 0);

    const dia = sueldo / Math.max(1, Number(cfg.dias_mes || 30));
    const df = Math.min(sueldo, Math.round(dia * faltas * 100) / 100);
    const dt = cfg.desc_tardanza
      ? Math.min(sueldo - df, Math.round((dia / 480) * mt * 100) / 100)
      : 0;

    const adelRows = await this.prisma.$queryRaw<any[]>`
      SELECT id, monto::float AS monto
      FROM planilla_adelantos
      WHERE empleado_id = ${e.id} AND planilla_id IS NULL AND fecha <= ${h}::date
      ORDER BY fecha ASC, id ASC
    `;

    const disp = Math.round((sueldo - df - dt) * 100) / 100;
    let apl = 0;
    const ids: number[] = [];
    let pend = 0;
    for (const x of adelRows) {
      if (apl + Number(x.monto) <= disp + 0.004) {
        apl += Number(x.monto);
        ids.push(Number(x.id));
      } else {
        pend += Number(x.monto);
      }
    }

    const comRows = await this.prisma.$queryRaw<any[]>`
      SELECT COALESCE(SUM(monto), 0)::float AS com
      FROM comisiones_pagos
      WHERE empleado_id = ${e.id} AND hasta BETWEEN ${d}::date AND ${h}::date
    `;

    return {
      sueldo,
      faltas,
      min_tarde: mt,
      desc_faltas: df,
      desc_tardanza: dt,
      adelantos: Math.round(apl * 100) / 100,
      adel_ids: ids,
      adel_pend: Math.round(pend * 100) / 100,
      comisiones: Number(comRows[0]?.com || 0),
      neto: Math.max(0, Math.round((disp - apl) * 100) / 100),
    };
  }

  async listarPlanilla(mes?: string) {
    const m = /^\d{4}-\d{2}$/.test(mes || '') ? mes! : new Date().toISOString().slice(0, 7);
    const cfg = await this.getConfig();
    const emps = await this.prisma.empleado.findMany({
      where: { estado: 1 },
      orderBy: { nombre: 'asc' },
    });
    const pagadosList = await this.prisma.planilla.findMany({ where: { periodo: m } });
    const pagMap = new Map(pagadosList.map((p) => [p.empleado_id, p]));

    const rows: any[] = [];
    const tot = { neto: 0, pendiente: 0, comisiones: 0, pagado: 0 };

    for (const e of emps) {
      const p = pagMap.get(e.id);
      if (p) {
        const neto = Number(p.neto);
        tot.pagado += neto;
        tot.neto += neto;
        tot.comisiones += Number(p.comisiones);
        rows.push({
          ...e,
          ...p,
          sueldo: Number(p.sueldo),
          desc_faltas: Number(p.desc_faltas),
          desc_tardanza: Number(p.desc_tardanza),
          adelantos: Number(p.adelantos),
          comisiones: Number(p.comisiones),
          neto,
          pagado: true,
          adel_pend: 0,
          planilla_id: p.id,
        });
      } else {
        const calc = await this.calcularEmpleadoMes(e, m, cfg);
        tot.pendiente += calc.neto;
        tot.neto += calc.neto;
        tot.comisiones += calc.comisiones;
        rows.push({ ...e, ...calc, pagado: false });
      }
    }

    const adel = await this.prisma.$queryRaw<any[]>`
      SELECT a.*, e.nombre
      FROM planilla_adelantos a
      JOIN empleados e ON e.id = a.empleado_id
      ORDER BY a.id DESC
      LIMIT 15
    `;

    return { mes: m, rows, tot, adel, emps };
  }

  private async cerrarPlanillaEmpleado(e: any, mes: string, cfg: any, uid: number) {
    const exists = await this.prisma.planilla.findUnique({
      where: { periodo_empleado_id: { periodo: mes, empleado_id: e.id } },
    });
    if (exists) return null;

    const c = await this.calcularEmpleadoMes(e, mes, cfg);
    const planilla = await this.prisma.planilla.create({
      data: {
        periodo: mes,
        empleado_id: e.id,
        sueldo: c.sueldo,
        faltas: c.faltas,
        min_tarde: c.min_tarde,
        desc_faltas: c.desc_faltas,
        desc_tardanza: c.desc_tardanza,
        adelantos: c.adelantos,
        comisiones: c.comisiones,
        neto: c.neto,
        usuario_id: uid,
      },
    });

    if (c.adel_ids.length) {
      await this.prisma.planillaAdelanto.updateMany({
        where: { id: { in: c.adel_ids } },
        data: { planilla_id: planilla.id },
      });
    }

    if (c.neto > 0) {
      await this.prisma.gasto.create({
        data: {
          fecha: new Date(),
          categoria: 'Sueldos',
          concepto: `Planilla ${mes} ${e.nombre}`,
          monto: c.neto,
          usuario_id: uid,
        },
      });
    }

    return c.neto;
  }

  async pagarPlanilla(body: any, uid: number, uname: string, ip: string) {
    const mes = /^\d{4}-\d{2}$/.test(body.mes || '')
      ? body.mes
      : new Date().toISOString().slice(0, 7);
    const cfg = await this.getConfig();

    if (String(body.todos) === '1' || body.todos === true) {
      const emps = await this.prisma.empleado.findMany({
        where: { estado: 1, sueldo: { gt: 0 } },
      });
      let n = 0;
      let t = 0;
      for (const e of emps) {
        const r = await this.cerrarPlanillaEmpleado(e, mes, cfg, uid);
        if (r !== null) {
          n++;
          t += r;
        }
      }
      await this.prisma.logAction(uid, uname, 'empleados', `Planilla ${mes}: ${n} empleados (${t})`, ip);
      return { ok: true, empleados: n, total: t };
    } else {
      const empId = Number(body.empleado_id || 0);
      const e = await this.prisma.empleado.findUnique({ where: { id: empId } });
      if (!e) throw new NotFoundException('Empleado no encontrado.');
      const r = await this.cerrarPlanillaEmpleado(e, mes, cfg, uid);
      if (r === null) throw new BadRequestException('Ya está pagado en ese periodo.');
      await this.prisma.logAction(uid, uname, 'empleados', `Planilla ${mes} ${e.nombre}: ${r}`, ip);
      return { ok: true, neto: r };
    }
  }

  async registrarAdelanto(body: any, uid: number, uname: string, ip: string) {
    const empId = Number(body.empleado_id || 0);
    const monto = Math.round(Number(body.monto || 0) * 100) / 100;
    const e = await this.prisma.empleado.findUnique({ where: { id: empId } });
    if (!e || monto <= 0) {
      throw new BadRequestException('Elige un empleado e ingresa un monto válido.');
    }
    const motivo = body.motivo ? String(body.motivo).trim().slice(0, 150) : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.planillaAdelanto.create({
        data: {
          empleado_id: e.id,
          fecha: new Date(),
          monto,
          motivo,
          usuario_id: uid,
        },
      });
      await tx.gasto.create({
        data: {
          fecha: new Date(),
          categoria: 'Sueldos',
          concepto: `Adelanto ${e.nombre}`,
          monto,
          usuario_id: uid,
        },
      });
    });

    await this.prisma.logAction(uid, uname, 'empleados', `Adelanto a ${e.nombre}: ${monto}`, ip);
    return { ok: true };
  }

  async verBoleta(id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, e.nombre, e.cargo, e.documento
      FROM planillas p
      JOIN empleados e ON e.id = p.empleado_id
      WHERE p.id = ${id}
    `;
    if (!rows[0]) throw new NotFoundException('Boleta no encontrada.');
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    return { p: rows[0], emp };
  }
}
