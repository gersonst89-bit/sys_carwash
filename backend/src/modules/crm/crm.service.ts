import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

export const CRM_SEGS: Record<string, [string, string, string, string]> = {
  vip: ['VIP', 'bi-gem', '#8b5cf6', 'Clientes de alto valor (muchas visitas o gasto elevado)'],
  frecuente: ['Frecuente', 'bi-heart-fill', '#14b8a6', 'Vienen con regularidad'],
  nuevo: ['Nuevo', 'bi-stars', '#0ea5e9', 'Primera visita reciente'],
  ocasional: ['Ocasional', 'bi-person', '#64748b', 'Visitan de vez en cuando'],
  en_riesgo: ['En riesgo', 'bi-exclamation-triangle-fill', '#f59e0b', 'Llevan tiempo sin venir: conviene contactarlos'],
  inactivo: ['Inactivo', 'bi-moon-stars-fill', '#f43f5e', 'Mucho tiempo sin visitas'],
  sin_visitas: ['Sin visitas', 'bi-person-dash', '#94a3b8', 'Registrados que aún no han comprado'],
};

const CRM_MSG_DEF = {
  msg_cumple:
    'Hola {nombre} 🎂 ¡Feliz cumpleaños de parte de {empresa}! Te regalamos un descuento especial: usa el cupón {cupon} en tu próximo lavado.',
  msg_riesgo:
    'Hola {nombre}, te extrañamos en {empresa} 🚗✨ Hace tiempo que no vienes. Tienes {puntos} puntos acumulados. ¡Te esperamos!',
  msg_encuesta:
    'Hola {nombre}, gracias por visitar {empresa}. ¿Nos regalas 1 minuto para calificar tu servicio? {enlace}',
};

export const CRM_ETAPAS: Record<string, [string, string]> = {
  nuevo: ['Nuevos', '#0ea5e9'],
  contactado: ['Contactados', '#8b5cf6'],
  propuesta: ['Propuesta', '#f59e0b'],
  ganado: ['Ganados', '#22c55e'],
  perdido: ['Perdidos', '#f43f5e'],
};

export const CRM_TIPOS_INTERACCION: Record<string, string> = {
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Correo',
  visita: 'Visita',
  nota: 'Nota',
};

@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private toYmd(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async getCrmConfig() {
    let c = await this.prisma.crmConfig.findUnique({ where: { id: 1 } });
    if (!c) {
      c = await this.prisma.crmConfig.create({
        data: {
          id: 1,
          programa_activo: 1,
          monto_por_punto: 10,
          valor_punto: 0.5,
          puntos_minimo: 50,
          puntos_desde: new Date(),
          vip_visitas: 10,
          vip_monto: 1000,
          dias_riesgo: 45,
          dias_inactivo: 90,
          prefijo_pais: '51',
          ...CRM_MSG_DEF,
        },
      });
    }
    return {
      ...c,
      monto_por_punto: Number(c.monto_por_punto),
      valor_punto: Number(c.valor_punto),
      vip_monto: Number(c.vip_monto),
      msg_cumple: c.msg_cumple || CRM_MSG_DEF.msg_cumple,
      msg_riesgo: c.msg_riesgo || CRM_MSG_DEF.msg_riesgo,
      msg_encuesta: c.msg_encuesta || CRM_MSG_DEF.msg_encuesta,
    };
  }

  calcularSegmento(r: { visitas: number; gastado: number; dias: number | null }, cfg: any): string {
    const n = Number(r.visitas || 0);
    if (n === 0) return 'sin_visitas';
    const dias = Number(r.dias ?? 0);
    if (dias > Number(cfg.dias_inactivo)) return 'inactivo';
    if (dias > Number(cfg.dias_riesgo)) return 'en_riesgo';
    if (n >= Number(cfg.vip_visitas) || Number(r.gastado || 0) >= Number(cfg.vip_monto)) return 'vip';
    if (n >= 3) return 'frecuente';
    if (n === 1 && dias <= 30) return 'nuevo';
    return 'ocasional';
  }

  diasCumple(fechaNac: Date | string | null): number | null {
    if (!fechaNac) return null;
    const dObj = new Date(fechaNac);
    if (isNaN(dObj.getTime())) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let y = hoy.getFullYear();
    const m = dObj.getUTCMonth();
    const d = dObj.getUTCDate();
    let next = new Date(y, m, d);
    if (next < hoy) {
      y += 1;
      next = new Date(y, m, d);
    }
    return Math.round((next.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }

  async syncPuntos() {
    const cfg = await this.getCrmConfig();
    if (!cfg.programa_activo || cfg.monto_por_punto <= 0) return;
    const desdeStr = cfg.puntos_desde ? this.toYmd(new Date(cfg.puntos_desde)) : '2000-01-01';
    try {
      await this.prisma.$executeRaw`
        INSERT INTO crm_puntos (cliente_id, orden_id, tipo, puntos, detalle)
        SELECT o.cliente_id,
               o.id,
               'ganado',
               FLOOR(o.total / ${cfg.monto_por_punto})::int,
               CONCAT('Orden ', o.codigo)
        FROM ordenes o
        WHERE o.cliente_id IS NOT NULL
          AND o.pagado = 1
          AND o.estado <> 'cancelado'
          AND DATE(o.fecha_pago) >= CAST(${desdeStr} AS DATE)
          AND FLOOR(o.total / ${cfg.monto_por_punto}) > 0
        ON CONFLICT (orden_id, tipo) DO NOTHING
      `;
    } catch {

    }
  }

  async getSaldos(clienteId?: number): Promise<Record<number, number>> {
    const rows = clienteId
      ? await this.prisma.$queryRaw<any[]>`
          SELECT p.cliente_id, COALESCE(SUM(p.puntos), 0)::int AS s
          FROM crm_puntos p
          LEFT JOIN ordenes o ON o.id = p.orden_id
          WHERE (p.orden_id IS NULL OR (o.estado <> 'cancelado' AND o.pagado = 1))
            AND p.cliente_id = ${clienteId}
          GROUP BY p.cliente_id
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT p.cliente_id, COALESCE(SUM(p.puntos), 0)::int AS s
          FROM crm_puntos p
          LEFT JOIN ordenes o ON o.id = p.orden_id
          WHERE (p.orden_id IS NULL OR (o.estado <> 'cancelado' AND o.pagado = 1))
          GROUP BY p.cliente_id
        `;

    const out: Record<number, number> = {};
    for (const r of rows) {
      out[Number(r.cliente_id)] = Math.max(0, Number(r.s || 0));
    }
    return out;
  }

  async getCrmClientes(seg?: string) {
    const cfg = await this.getCrmConfig();
    await this.syncPuntos();

    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.id, c.nombre, c.telefono, c.email, c.fecha_nacimiento, c.acepta_marketing, c.created_at,
             COALESCE(x.visitas, 0)::int AS visitas,
             COALESCE(x.gastado, 0)::float AS gastado,
             x.ultima,
             CASE WHEN x.ultima IS NULL THEN NULL ELSE (CURRENT_DATE - DATE(x.ultima))::int END AS dias
      FROM clientes c
      LEFT JOIN (
        SELECT cliente_id,
               COUNT(*)::int AS visitas,
               SUM(total)::float AS gastado,
               MAX(fecha_ingreso) AS ultima
        FROM ordenes
        WHERE estado <> 'cancelado'
        GROUP BY cliente_id
      ) x ON x.cliente_id = c.id
      WHERE c.estado = 1
      ORDER BY c.nombre ASC
    `;

    const sal = await this.getSaldos();
    const out: any[] = [];
    for (const r of rows) {
      const segmento = this.calcularSegmento(r, cfg);
      if (seg && seg !== 'todos' && segmento !== seg) continue;
      out.push({
        ...r,
        visitas: Number(r.visitas || 0),
        gastado: Number(r.gastado || 0),
        dias: r.dias !== null && r.dias !== undefined ? Number(r.dias) : null,
        segmento,
        puntos: sal[Number(r.id)] || 0,
        cumple_en: this.diasCumple(r.fecha_nacimiento),
      });
    }
    return out;
  }

  formatTel(tel: string | null | undefined, prefijo = '51'): string {
    let d = String(tel || '').replace(/\D+/g, '');
    if (!d) return '';
    const p = String(prefijo || '').replace(/\D+/g, '');
    if (p && d.length <= 9) {
      d = p + d.replace(/^0+/, '');
    }
    return d;
  }

  formatWaLink(tel: string | null | undefined, msg: string, prefijo = '51'): string {
    const d = this.formatTel(tel, prefijo);
    return d ? `https://wa.me/${d}?text=${encodeURIComponent(msg)}` : '';
  }

  formatMsg(tpl: string, c: any, empresaNombre: string, extra: Record<string, string> = {}): string {
    const firstName = String(c.nombre || '').trim().split(/\s+/)[0] || 'cliente';
    const map: Record<string, string> = {
      '{nombre}': firstName,
      '{empresa}': empresaNombre,
      '{puntos}': String(c.puntos ?? 0),
      '{ultima_visita}': c.ultima ? this.toYmd(new Date(c.ultima)) : '-',
      '{cupon}': '',
      '{enlace}': '',
    };
    for (const [k, v] of Object.entries(extra)) {
      map[`{${k}}`] = v;
    }
    let res = tpl || '';
    for (const [k, v] of Object.entries(map)) {
      res = res.split(k).join(v);
    }
    return res;
  }

  async generarCodigoCupon(pref = 'CW'): Promise<string> {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    while (true) {
      let code = `${pref}-`;
      for (let i = 0; i < 6; i++) {
        code += abc[Math.floor(Math.random() * abc.length)];
      }
      const ex = await this.prisma.crmCupon.count({ where: { codigo: code } });
      if (!ex) return code;
    }
  }

  async getPanel() {
    const cfg = await this.getCrmConfig();
    const cl = await this.getCrmClientes();

    const segCount: Record<string, number> = {};
    for (const k of Object.keys(CRM_SEGS)) segCount[k] = 0;

    let con1 = 0;
    let con2 = 0;
    let puntos = 0;
    for (const c of cl) {
      segCount[c.segmento] = (segCount[c.segmento] || 0) + 1;
      if (c.visitas >= 1) con1++;
      if (c.visitas >= 2) con2++;
      puntos += c.puntos;
    }

    const activos =
      (segCount.vip || 0) +
      (segCount.frecuente || 0) +
      (segCount.nuevo || 0) +
      (segCount.ocasional || 0);

    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const [nuevosMes, segPend, opStats, csatStats, pend] = await Promise.all([
      this.prisma.cliente.count({
        where: { estado: 1, created_at: { gte: firstOfMonth } },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS n FROM crm_interacciones
        WHERE seguimiento_fecha IS NOT NULL AND seguimiento_hecho = 0 AND seguimiento_fecha <= CURRENT_DATE
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS n, COALESCE(SUM(valor_est), 0)::float AS v
        FROM crm_oportunidades
        WHERE etapa IN ('nuevo', 'contactado', 'propuesta')
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT ROUND(AVG(puntaje)::numeric, 1)::float AS csat, COUNT(*)::int AS resp
        FROM crm_encuestas
        WHERE puntaje IS NOT NULL
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT i.*, c.nombre AS cliente, c.telefono
        FROM crm_interacciones i
        JOIN clientes c ON c.id = i.cliente_id
        WHERE i.seguimiento_fecha IS NOT NULL AND i.seguimiento_hecho = 0
        ORDER BY i.seguimiento_fecha ASC
        LIMIT 6
      `,
    ]);

    const k = {
      total: cl.length,
      activos,
      riesgo: (segCount.en_riesgo || 0) + (segCount.inactivo || 0),
      vip: segCount.vip || 0,
      nuevos_mes: nuevosMes,
      recompra: con1 ? Math.round((con2 * 100) / con1) : 0,
      puntos,
      seg_pend: Number(segPend[0]?.n || 0),
      op_abiertas: Number(opStats[0]?.n || 0),
      op_valor: Number(opStats[0]?.v || 0),
      csat: csatStats[0]?.csat ?? null,
      resp: Number(csatStats[0]?.resp || 0),
    };

    const cumples = cl
      .filter((c) => c.cumple_en !== null && c.cumple_en <= 30)
      .sort((a, b) => a.cumple_en - b.cumple_en);

    const riesgo = cl
      .filter((c) => c.segmento === 'en_riesgo')
      .sort((a, b) => b.gastado - a.gastado);

    const top = [...cl]
      .filter((c) => c.gastado > 0)
      .sort((a, b) => b.gastado - a.gastado)
      .slice(0, 5);

    const now = new Date();
    const mesesMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      mesesMap[ym] = 0;
    }
    const firstYm = Object.keys(mesesMap)[0] + '-01';
    const nuevosRows = await this.prisma.$queryRaw<any[]>`
      SELECT TO_CHAR(created_at, 'YYYY-MM') AS m, COUNT(*)::int AS n
      FROM clientes
      WHERE created_at >= CAST(${firstYm} AS DATE)
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    `;
    for (const r of nuevosRows) {
      if (mesesMap[r.m] !== undefined) mesesMap[r.m] = Number(r.n || 0);
    }

    const segKeys = Object.keys(CRM_SEGS);
    const charts = {
      seg: {
        labels: segKeys.map((s) => CRM_SEGS[s][0]),
        data: segKeys.map((s) => segCount[s] || 0),
        colors: segKeys.map((s) => CRM_SEGS[s][2]),
      },
      nuevos: {
        labels: Object.keys(mesesMap),
        data: Object.values(mesesMap),
      },
    };

    return {
      k,
      cfg,
      cumples,
      riesgo,
      top,
      pend,
      charts,
      segCount,
      segs: CRM_SEGS,
    };
  }

  async getSegmentos(seg = 'todos', q = '') {
    const cfg = await this.getCrmConfig();
    const all = await this.getCrmClientes();
    const count: Record<string, number> = {};
    for (const k of Object.keys(CRM_SEGS)) count[k] = 0;
    for (const c of all) count[c.segmento] = (count[c.segmento] || 0) + 1;

    const search = (q || '').trim().toLowerCase();
    const rows = all.filter(
      (c) =>
        (seg === 'todos' || c.segmento === seg) &&
        (!search || `${c.nombre || ''} ${c.telefono || ''}`.toLowerCase().includes(search)),
    );

    return {
      rows,
      count,
      seg,
      q: search,
      cfg,
      total: all.length,
      segs: CRM_SEGS,
    };
  }

  async getSeguimientos() {
    const [pend, hist, clientes] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT i.*, c.nombre AS cliente, c.telefono
        FROM crm_interacciones i
        JOIN clientes c ON c.id = i.cliente_id
        WHERE i.seguimiento_fecha IS NOT NULL AND i.seguimiento_hecho = 0
        ORDER BY i.seguimiento_fecha ASC
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT i.*, c.nombre AS cliente, u.nombre AS usuario
        FROM crm_interacciones i
        JOIN clientes c ON c.id = i.cliente_id
        LEFT JOIN usuarios u ON u.id = i.usuario_id
        ORDER BY i.id DESC
        LIMIT 40
      `,
      this.prisma.cliente.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true, telefono: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    return { pend, hist, clientes, tipos: CRM_TIPOS_INTERACCION };
  }

  async crearInteraccion(body: any, userId: number, userName: string, ip = '') {
    const cid = Number(body.cliente_id || 0);
    const tipo = CRM_TIPOS_INTERACCION[body.tipo] ? body.tipo : 'nota';
    const asunto = (body.asunto || '').trim();

    if (!cid || !asunto) {
      throw new BadRequestException('Completa cliente y asunto.');
    }
    const cli = await this.prisma.cliente.findUnique({ where: { id: cid } });
    if (!cli) throw new BadRequestException('Cliente no encontrado.');

    const segFecha =
      body.seguimiento_fecha && /^\d{4}-\d{2}-\d{2}$/.test(body.seguimiento_fecha)
        ? new Date(body.seguimiento_fecha)
        : null;

    const created = await this.prisma.crmInteraccion.create({
      data: {
        cliente_id: cid,
        tipo,
        asunto: asunto.slice(0, 150),
        detalle: (body.detalle || '').trim() || null,
        seguimiento_fecha: segFecha,
        usuario_id: userId,
      },
    });

    await this.prisma.logAction(userId, userName, 'crm', `Interacción con cliente #${cid}: ${asunto}`, ip);
    return { ok: true, interaccion: created };
  }

  async marcarSeguimientoHecho(id: number) {
    await this.prisma.crmInteraccion.update({
      where: { id },
      data: { seguimiento_hecho: 1 },
    });
    return { ok: true };
  }

  async getPipeline() {
    const ops: Record<string, any[]> = {};
    for (const k of Object.keys(CRM_ETAPAS)) ops[k] = [];

    const all = await this.prisma.crmOportunidad.findMany({
      orderBy: { updated_at: 'desc' },
    });
    for (const o of all) {
      if (!ops[o.etapa]) ops[o.etapa] = [];
      ops[o.etapa].push(o);
    }

    return { ops, etapas: CRM_ETAPAS };
  }

  async guardarOportunidad(body: any, userId: number) {
    const id = Number(body.id || 0);
    const nombre = (body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre es obligatorio.');

    const data = {
      nombre: nombre.slice(0, 150),
      telefono: (body.telefono || '').trim() || null,
      email: (body.email || '').trim() || null,
      interes: (body.interes || '').trim() || null,
      origen: (body.origen || '').trim() || null,
      valor_est: Math.max(0, Number(body.valor_est || 0)),
      notas: (body.notas || '').trim() || null,
    };

    if (id) {
      const updated = await this.prisma.crmOportunidad.update({
        where: { id },
        data,
      });
      return { ok: true, oportunidad: updated };
    } else {
      const created = await this.prisma.crmOportunidad.create({
        data: { ...data, usuario_id: userId },
      });
      return { ok: true, oportunidad: created };
    }
  }

  async moverOportunidad(id: number, etapa: string) {
    if (!CRM_ETAPAS[etapa]) {
      throw new BadRequestException('Etapa inválida.');
    }
    await this.prisma.crmOportunidad.update({
      where: { id },
      data: { etapa },
    });
    return { ok: true };
  }

  async eliminarOportunidad(id: number) {
    await this.prisma.crmOportunidad.delete({ where: { id } });
    return { ok: true };
  }

  async convertirOportunidad(id: number, userId: number, userName: string, ip = '') {
    const o = await this.prisma.crmOportunidad.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Oportunidad no encontrada.');

    let cid = o.cliente_id;
    if (!cid) {
      const cli = await this.prisma.cliente.create({
        data: {
          tipo_doc: 'DNI',
          nombre: o.nombre,
          telefono: o.telefono,
          email: o.email,
          notas: `Origen CRM: ${o.origen || 'oportunidad'}`,
        },
      });
      cid = cli.id;
      await this.prisma.crmOportunidad.update({
        where: { id: o.id },
        data: { cliente_id: cid, etapa: 'ganado' },
      });
    }

    await this.prisma.logAction(userId, userName, 'crm', `Oportunidad convertida a cliente #${cid}`, ip);
    return { ok: true, cliente_id: cid };
  }

  async getFidelidad() {
    const cfg = await this.getCrmConfig();
    await this.syncPuntos();
    const cl = await this.getCrmClientes();
    const rank = [...cl]
      .filter((c) => c.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 20);

    const mov = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, c.nombre AS cliente
      FROM crm_puntos p
      JOIN clientes c ON c.id = p.cliente_id
      ORDER BY p.id DESC
      LIMIT 25
    `;

    return { cfg, rank, mov, cl };
  }

  async canjearPuntos(
    body: { cliente_id: number; puntos: number },
    userId: number,
    userName: string,
    ip = '',
  ) {
    const cfg = await this.getCrmConfig();
    const cid = Number(body.cliente_id || 0);
    const pts = Math.floor(Number(body.puntos || 0));
    await this.syncPuntos();
    const saldos = await this.getSaldos(cid);
    const saldo = saldos[cid] || 0;

    if (pts < cfg.puntos_minimo || pts > saldo || pts <= 0) {
      throw new BadRequestException(
        `Puntos inválidos. Mínimo ${cfg.puntos_minimo} y máximo el saldo (${saldo}).`,
      );
    }

    const monto = Math.round(pts * cfg.valor_punto * 100) / 100;
    const cod = await this.generarCodigoCupon('PTS');
    const vence = new Date();
    vence.setDate(vence.getDate() + 90);

    await this.prisma.$transaction(async (tx) => {
      await tx.crmCupon.create({
        data: {
          codigo: cod,
          descripcion: `Canje de ${pts} puntos`,
          tipo: 'monto',
          valor: monto,
          cliente_id: cid,
          vigente_hasta: vence,
          usos_max: 1,
          origen: 'canje',
        },
      });
      await tx.crmPunto.create({
        data: {
          cliente_id: cid,
          tipo: 'canjeado',
          puntos: -pts,
          detalle: `Canje → cupón ${cod}`,
          usuario_id: userId,
        },
      });
    });

    await this.prisma.logAction(userId, userName, 'crm', `Canje de ${pts} puntos (cliente #${cid}) → ${cod}`, ip);
    return {
      ok: true,
      codigo: cod,
      monto,
      message: `Canje realizado: cupón ${cod} por S/ ${monto.toFixed(2)} (vigente 90 días).`,
    };
  }

  async ajustarPuntos(
    body: { cliente_id: number; puntos: number; detalle?: string },
    userId: number,
    userName: string,
    ip = '',
  ) {
    const cid = Number(body.cliente_id || 0);
    const pts = Math.trunc(Number(body.puntos || 0));
    if (!pts || !cid) throw new BadRequestException('Datos inválidos.');

    const cli = await this.prisma.cliente.findUnique({ where: { id: cid } });
    if (!cli) throw new BadRequestException('Cliente no encontrado.');

    await this.prisma.crmPunto.create({
      data: {
        cliente_id: cid,
        tipo: 'ajuste',
        puntos: pts,
        detalle: ((body.detalle || '').trim() || 'Ajuste manual').slice(0, 200),
        usuario_id: userId,
      },
    });

    await this.prisma.logAction(userId, userName, 'crm', `Ajuste de puntos ${pts} (cliente #${cid})`, ip);
    return { ok: true };
  }

  async getCupones() {
    const [rows, clientes] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT k.*, c.nombre AS cliente
        FROM crm_cupones k
        LEFT JOIN clientes c ON c.id = k.cliente_id
        ORDER BY k.id DESC
        LIMIT 200
      `,
      this.prisma.cliente.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);
    return { rows, clientes };
  }

  async crearCupon(body: any, userId: number, userName: string, ip = '') {
    const tipo = body.tipo === 'monto' ? 'monto' : 'porcentaje';
    const valor = Number(body.valor || 0);
    if (valor <= 0 || (tipo === 'porcentaje' && valor > 100)) {
      throw new BadRequestException('Valor inválido.');
    }

    const cleanCode = String(body.codigo || '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '');
    const cod = cleanCode || (await this.generarCodigoCupon('CW'));

    const dup = await this.prisma.crmCupon.count({ where: { codigo: cod } });
    if (dup) throw new BadRequestException('Ese código ya existe.');

    const vigenteHasta =
      body.vigente_hasta && /^\d{4}-\d{2}-\d{2}$/.test(body.vigente_hasta)
        ? new Date(body.vigente_hasta)
        : null;

    const cupon = await this.prisma.crmCupon.create({
      data: {
        codigo: cod.slice(0, 30),
        descripcion: (body.descripcion || '').trim() || null,
        tipo,
        valor,
        cliente_id: Number(body.cliente_id || 0) || null,
        vigente_hasta: vigenteHasta,
        usos_max: Math.max(0, Number(body.usos_max ?? 1)),
      },
    });

    await this.prisma.logAction(userId, userName, 'crm', `Cupón creado ${cod}`, ip);
    return { ok: true, cupon };
  }

  async toggleCupon(id: number) {
    const c = await this.prisma.crmCupon.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Cupón no encontrado.');
    const updated = await this.prisma.crmCupon.update({
      where: { id },
      data: { estado: c.estado ? 0 : 1 },
    });
    return { ok: true, estado: updated.estado };
  }

  async validarCuponEndpoint(codigo: string, clienteId: number | null, subtotal: number) {
    const c = (codigo || '').trim().toUpperCase();
    if (!c) return { ok: false, msg: 'Ingresa un código.', descuento: 0, tipo: null, valor: 0 };
    const cp = await this.prisma.crmCupon.findUnique({ where: { codigo: c } });
    if (!cp || !cp.estado) return { ok: false, msg: 'Cupón no válido.', descuento: 0, tipo: null, valor: 0 };
    const today = this.toYmd();
    if (cp.vigente_hasta && this.toYmd(new Date(cp.vigente_hasta)) < today) {
      return { ok: false, msg: 'El cupón está vencido.', descuento: 0, tipo: null, valor: 0 };
    }
    if (cp.usos_max > 0 && cp.usos >= cp.usos_max) {
      return { ok: false, msg: 'El cupón ya fue utilizado.', descuento: 0, tipo: null, valor: 0 };
    }
    if (cp.cliente_id && Number(cp.cliente_id) !== Number(clienteId || 0)) {
      return {
        ok: false,
        msg: 'Este cupón pertenece a otro cliente (elige al cliente en la orden).',
        descuento: 0,
        tipo: null,
        valor: 0,
      };
    }
    const valor = Number(cp.valor);
    const desc =
      cp.tipo === 'porcentaje'
        ? Math.round(subtotal * Math.min(100, valor)) / 100
        : Math.min(subtotal, valor);
    return {
      ok: true,
      msg: `Cupón aplicado: -${cp.tipo === 'porcentaje' ? `${valor}%` : `S/ ${valor.toFixed(2)}`}`,
      descuento: desc,
      tipo: cp.tipo,
      valor,
    };
  }

  async getCampanas() {
    const [rows, cl, cfg] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT c.*,
               (SELECT COUNT(*)::int FROM crm_campana_envios e WHERE e.campana_id = c.id AND e.enviado = 1) AS enviados
        FROM crm_campanas c
        ORDER BY c.id DESC
        LIMIT 50
      `,
      this.getCrmClientes(),
      this.getCrmConfig(),
    ]);

    const count: Record<string, number> = { todos: 0, cumple_mes: 0 };
    for (const k of Object.keys(CRM_SEGS)) count[k] = 0;
    const currentMonth = new Date().getUTCMonth();

    for (const c of cl) {
      if (!c.acepta_marketing) continue;
      count.todos++;
      count[c.segmento] = (count[c.segmento] || 0) + 1;
      if (c.fecha_nacimiento && new Date(c.fecha_nacimiento).getUTCMonth() === currentMonth) {
        count.cumple_mes++;
      }
    }

    return { rows, count, cfg, segs: CRM_SEGS };
  }

  async crearCampana(body: any, userId: number, userName: string, ip = '') {
    const seg = body.segmento || 'todos';
    const canal = body.canal === 'email' ? 'email' : 'whatsapp';
    const nombre = (body.nombre || '').trim();
    let msg = (body.mensaje || '').trim();

    if (!nombre || !msg || (seg !== 'todos' && seg !== 'cumple_mes' && !CRM_SEGS[seg])) {
      throw new BadRequestException('Completa nombre, audiencia y mensaje.');
    }

    const cfg = await this.getCrmConfig();
    const cl = await this.getCrmClientes();
    const currentMonth = new Date().getUTCMonth();

    const dest = cl.filter((c) => {
      if (!c.acepta_marketing) return false;
      if (canal === 'whatsapp' ? !this.formatTel(c.telefono, cfg.prefijo_pais) : !(c.email || '').trim()) {
        return false;
      }
      if (seg === 'todos') return true;
      if (seg === 'cumple_mes') {
        return c.fecha_nacimiento && new Date(c.fecha_nacimiento).getUTCMonth() === currentMonth;
      }
      return c.segmento === seg;
    });

    if (!dest.length) {
      throw new BadRequestException('No hay clientes con contacto disponible para esa audiencia.');
    }

    const pct = Number(body.cupon_pct || 0);
    let cuponCod: string | null = null;
    if (pct > 0 && pct <= 100) {
      cuponCod = await this.generarCodigoCupon('PROMO');
    }

    const campana = await this.prisma.$transaction(async (tx) => {
      if (cuponCod) {
        const dias = Math.max(1, Number(body.cupon_dias || 30));
        const vence = new Date();
        vence.setDate(vence.getDate() + dias);
        await tx.crmCupon.create({
          data: {
            codigo: cuponCod,
            descripcion: `Campaña: ${nombre}`,
            tipo: 'porcentaje',
            valor: pct,
            vigente_hasta: vence,
            usos_max: 0,
            origen: 'cumple',
          },
        });
        msg = msg.split('{cupon}').join(cuponCod);
      }

      const created = await tx.crmCampana.create({
        data: {
          nombre: nombre.slice(0, 120),
          segmento: seg,
          canal,
          mensaje: msg,
          total: dest.length,
          usuario_id: userId,
        },
      });

      await tx.crmCampanaEnvio.createMany({
        data: dest.map((c) => ({
          campana_id: created.id,
          cliente_id: Number(c.id),
        })),
        skipDuplicates: true,
      });

      return created;
    });

    await this.prisma.logAction(userId, userName, 'crm', `Campaña creada: ${nombre} (${dest.length})`, ip);
    return { ok: true, id: campana.id, campana };
  }

  async verCampana(id: number) {
    const c = await this.prisma.crmCampana.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Campaña no encontrada.');

    const [sal, cfg, emp, envRows] = await Promise.all([
      this.getSaldos(),
      this.getCrmConfig(),
      this.prisma.empresaConfig.findUnique({ where: { id: 1 } }),
      this.prisma.$queryRaw<any[]>`
        SELECT e.*, cl.nombre, cl.telefono, cl.email
        FROM crm_campana_envios e
        JOIN clientes cl ON cl.id = e.cliente_id
        WHERE e.campana_id = ${id}
        ORDER BY e.enviado ASC, cl.nombre ASC
      `,
    ]);

    const empNombre = emp?.nombre || 'CarWash Pro';
    const env = envRows.map((e) => {
      const puntos = sal[Number(e.cliente_id)] || 0;
      const txt = this.formatMsg(c.mensaje, { ...e, puntos }, empNombre);
      const link =
        c.canal === 'whatsapp'
          ? this.formatWaLink(e.telefono, txt, cfg.prefijo_pais)
          : `mailto:${encodeURIComponent(e.email || '')}?subject=${encodeURIComponent(c.nombre)}&body=${encodeURIComponent(txt)}`;
      return { ...e, puntos, link };
    });

    return { c, env };
  }

  async marcarEnvioCampana(envioId: number) {
    await this.prisma.crmCampanaEnvio.update({
      where: { id: envioId },
      data: { enviado: 1, enviado_at: new Date() },
    });
    return { ok: true };
  }

  async getEncuestas(frontendBaseUrl = 'http://localhost:5173') {
    const [res, stRows, distRows, cfg, emp] = await Promise.all([
      this.prisma.$queryRaw<any[]>`
        SELECT e.*, o.codigo, c.nombre AS cliente
        FROM crm_encuestas e
        JOIN ordenes o ON o.id = e.orden_id
        LEFT JOIN clientes c ON c.id = e.cliente_id
        WHERE e.puntaje IS NOT NULL
        ORDER BY e.respondido_at DESC
        LIMIT 50
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS n,
               ROUND(AVG(puntaje)::numeric, 2)::float AS prom,
               COALESCE(SUM(CASE WHEN puntaje >= 4 THEN 1 ELSE 0 END), 0)::int AS sat
        FROM crm_encuestas
        WHERE puntaje IS NOT NULL
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT puntaje::int AS puntaje, COUNT(*)::int AS n
        FROM crm_encuestas
        WHERE puntaje IS NOT NULL
        GROUP BY puntaje
      `,
      this.getCrmConfig(),
      this.prisma.empresaConfig.findUnique({ where: { id: 1 } }),
    ]);

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of distRows) {
      dist[Number(r.puntaje)] = Number(r.n || 0);
    }

    const candRows = await this.prisma.$queryRaw<any[]>`
      SELECT o.id, o.codigo, o.total::float AS total, o.fecha_ingreso, c.id AS cid, c.nombre, c.telefono
      FROM ordenes o
      JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN crm_encuestas e ON e.orden_id = o.id AND e.respondido_at IS NOT NULL
      WHERE o.pagado = 1
        AND o.estado IN ('terminado', 'entregado')
        AND o.fecha_ingreso >= CURRENT_DATE - INTERVAL '14 days'
        AND e.id IS NULL
        AND c.acepta_marketing = 1
      ORDER BY o.id DESC
      LIMIT 30
    `;

    const empNombre = emp?.nombre || 'CarWash Pro';
    const cand: any[] = [];
    for (const o of candRows) {
      let existing = await this.prisma.crmEncuesta.findUnique({
        where: { orden_id: Number(o.id) },
      });
      if (!existing) {
        const tok = crypto.randomBytes(12).toString('hex');
        existing = await this.prisma.crmEncuesta.create({
          data: {
            orden_id: Number(o.id),
            cliente_id: Number(o.cid),
            token: tok,
          },
        });
      }
      const enlace = `${frontendBaseUrl.replace(/\/$/, '')}/encuesta/${existing.token}`;
      const msg = this.formatMsg(cfg.msg_encuesta, o, empNombre, { enlace });
      const wa = this.formatWaLink(o.telefono, msg, cfg.prefijo_pais);
      cand.push({ ...o, token: existing.token, enlace, wa });
    }

    return {
      res,
      st: stRows[0] || { n: 0, prom: null, sat: 0 },
      dist,
      cand,
    };
  }

  async getEncuestaPublica(token: string) {
    if (!/^[a-f0-9]{16,40}$/i.test(token || '')) {
      throw new NotFoundException('Encuesta no encontrada.');
    }
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT e.*, o.codigo, c.nombre
      FROM crm_encuestas e
      JOIN ordenes o ON o.id = e.orden_id
      LEFT JOIN clientes c ON c.id = e.cliente_id
      WHERE e.token = ${token}
    `;
    const e = rows[0];
    if (!e) throw new NotFoundException('Encuesta no encontrada.');
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    return { e, empresa: emp };
  }

  async responderEncuestaPublica(token: string, body: { puntaje: number; recomendaria?: number; comentario?: string }) {
    const data = await this.getEncuestaPublica(token);
    const e = data.e;
    const p = Number(body.puntaje || 0);
    if (!e.respondido_at && p >= 1 && p <= 5) {
      await this.prisma.crmEncuesta.update({
        where: { id: Number(e.id) },
        data: {
          puntaje: p,
          recomendaria: body.recomendaria !== undefined ? Number(body.recomendaria) : null,
          comentario: (body.comentario || '').trim().slice(0, 500) || null,
          respondido_at: new Date(),
        },
      });
    }
    return { ok: true };
  }

  async updateCrmConfig(body: any, userId: number, userName: string, ip = '') {
    const num = (k: string, def = 0) =>
      Math.max(0, Number(String(body[k] ?? def).replace(',', '.')) || 0);

    const diasRiesgo = Math.max(1, Math.trunc(num('dias_riesgo', 45)));
    let diasInactivo = Math.max(2, Math.trunc(num('dias_inactivo', 90)));
    if (diasInactivo <= diasRiesgo) {
      diasInactivo = diasRiesgo + 30;
    }

    const puntosDesde =
      body.puntos_desde && /^\d{4}-\d{2}-\d{2}$/.test(body.puntos_desde)
        ? new Date(body.puntos_desde)
        : new Date();

    const updated = await this.prisma.crmConfig.upsert({
      where: { id: 1 },
      update: {
        programa_activo: body.programa_activo ? 1 : 0,
        monto_por_punto: Math.max(0.01, num('monto_por_punto', 10)),
        valor_punto: num('valor_punto', 0.5),
        puntos_minimo: Math.trunc(num('puntos_minimo', 50)),
        puntos_desde: puntosDesde,
        vip_visitas: Math.max(1, Math.trunc(num('vip_visitas', 10))),
        vip_monto: num('vip_monto', 1000),
        dias_riesgo: diasRiesgo,
        dias_inactivo: diasInactivo,
        prefijo_pais: String(body.prefijo_pais || '51').replace(/\D/g, '') || '51',
        msg_cumple: (body.msg_cumple || '').trim() || null,
        msg_riesgo: (body.msg_riesgo || '').trim() || null,
        msg_encuesta: (body.msg_encuesta || '').trim() || null,
      },
      create: {
        id: 1,
        programa_activo: body.programa_activo ? 1 : 0,
        monto_por_punto: Math.max(0.01, num('monto_por_punto', 10)),
        valor_punto: num('valor_punto', 0.5),
        puntos_minimo: Math.trunc(num('puntos_minimo', 50)),
        puntos_desde: puntosDesde,
        vip_visitas: Math.max(1, Math.trunc(num('vip_visitas', 10))),
        vip_monto: num('vip_monto', 1000),
        dias_riesgo: diasRiesgo,
        dias_inactivo: diasInactivo,
        prefijo_pais: String(body.prefijo_pais || '51').replace(/\D/g, '') || '51',
      },
    });

    await this.prisma.logAction(userId, userName, 'crm', 'Configuración CRM actualizada', ip);
    return { ok: true, cfg: updated };
  }
}
