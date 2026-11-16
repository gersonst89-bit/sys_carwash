import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

const IA_MAX_FILAS = 500;

export const IA_PRESETS: Record<
  string,
  { nombre: string; url: string; modelo: string; clave: boolean; ayuda: string }
> = {
  gemini: {
    nombre: 'Google Gemini (gratis)',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelo: 'gemini-2.0-flash',
    clave: true,
    ayuda: 'Clave gratis en aistudio.google.com/apikey',
  },
  groq: {
    nombre: 'Groq (gratis)',
    url: 'https://api.groq.com/openai/v1',
    modelo: 'llama-3.3-70b-versatile',
    clave: true,
    ayuda: 'Clave gratis en console.groq.com/keys',
  },
  openrouter: {
    nombre: 'OpenRouter (modelos :free)',
    url: 'https://openrouter.ai/api/v1',
    modelo: 'meta-llama/llama-3.3-70b-instruct:free',
    clave: true,
    ayuda: 'Clave gratis en openrouter.ai/keys',
  },
  ollama: {
    nombre: 'Ollama (local, 100 % gratis y privado)',
    url: 'http://localhost:11434/v1',
    modelo: 'qwen2.5-coder:7b',
    clave: false,
    ayuda: 'Instala Ollama en tu PC y ejecuta: ollama pull qwen2.5-coder:7b',
  },
  otro: {
    nombre: 'Otro (compatible con OpenAI)',
    url: '',
    modelo: '',
    clave: true,
    ayuda: 'Cualquier servicio con API /chat/completions (OpenAI, LM Studio…)',
  },
};

const IA_VISTAS: Record<string, [string, string]> = {
  v_ia_ordenes: [
    "Una fila por orden de servicio (una venta). estado: pendiente, en_proceso, terminado, entregado o cancelado. Una venta COBRADA es pagado=1 y estado<>'cancelado'; su fecha de venta es dia_pago/fecha_pago.",
    `SELECT o.id AS orden_id, o.codigo, o.fecha_ingreso, DATE(o.fecha_ingreso) AS dia, o.fecha_pago, DATE(o.fecha_pago) AS dia_pago, COALESCE(c.nombre,'Cliente general') AS cliente, v.placa, TRIM(CONCAT(COALESCE(v.marca,''),' ',COALESCE(v.modelo,''))) AS vehiculo, tv.nombre AS tipo_vehiculo, e.nombre AS lavador, u.nombre AS cajero, o.estado, o.subtotal, o.descuento, o.impuesto, o.total, o.metodo_pago, o.pagado, EXTRACT(EPOCH FROM (o.fecha_fin - o.fecha_ingreso))::int / 60 AS minutos_servicio FROM ordenes o LEFT JOIN clientes c ON c.id=o.cliente_id LEFT JOIN vehiculos v ON v.id=o.vehiculo_id LEFT JOIN tipos_vehiculo tv ON tv.id=v.tipo_vehiculo_id LEFT JOIN empleados e ON e.id=o.empleado_id LEFT JOIN usuarios u ON u.id=o.usuario_id`,
  ],
  v_ia_detalle_ordenes: [
    "Una fila por servicio o producto dentro de cada orden. tipo='servicio' o 'producto'. importe = ingreso de la línea.",
    `SELECT d.orden_id, o.codigo, o.fecha_ingreso, DATE(o.fecha_ingreso) AS dia, o.fecha_pago, DATE(o.fecha_pago) AS dia_pago, d.tipo, d.descripcion AS item, CASE WHEN d.tipo='servicio' THEN COALESCE(cs.nombre,'Sin categoría') ELSE 'Producto' END AS categoria, d.cantidad, d.precio, d.subtotal AS importe, e.nombre AS lavador, COALESCE(cl.nombre,'Cliente general') AS cliente, o.estado AS estado_orden, o.pagado, o.metodo_pago FROM orden_detalle d JOIN ordenes o ON o.id=d.orden_id LEFT JOIN servicios s ON d.tipo='servicio' AND s.id=d.item_id LEFT JOIN categorias_servicio cs ON cs.id=s.categoria_id LEFT JOIN empleados e ON e.id=o.empleado_id LEFT JOIN clientes cl ON cl.id=o.cliente_id`,
  ],
  v_ia_clientes: [
    "Clientes con su historial (órdenes no canceladas). total_gastado = suma de órdenes cobradas.",
    `SELECT c.id AS cliente_id, c.nombre, c.tipo_doc, c.nro_doc AS documento, c.telefono, c.email, c.estado AS activo, c.created_at AS creado_en, (SELECT COUNT(*) FROM ordenes o WHERE o.cliente_id=c.id AND o.estado<>'cancelado') AS num_visitas, (SELECT COALESCE(SUM(o.total),0) FROM ordenes o WHERE o.cliente_id=c.id AND o.pagado=1 AND o.estado<>'cancelado') AS total_gastado, (SELECT MAX(o.fecha_ingreso) FROM ordenes o WHERE o.cliente_id=c.id AND o.estado<>'cancelado') AS ultima_visita, (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id=c.id) AS num_vehiculos FROM clientes c`,
  ],
  v_ia_vehiculos: [
    'Vehículos registrados con su dueño y cuántas veces vinieron.',
    `SELECT v.id AS vehiculo_id, v.placa, v.marca, v.modelo, v.color, v.anio, tv.nombre AS tipo_vehiculo, c.nombre AS cliente, v.estado AS activo, (SELECT COUNT(*) FROM ordenes o WHERE o.vehiculo_id=v.id AND o.estado<>'cancelado') AS num_visitas FROM vehiculos v JOIN clientes c ON c.id=v.cliente_id LEFT JOIN tipos_vehiculo tv ON tv.id=v.tipo_vehiculo_id`,
  ],
  v_ia_servicios: [
    'Catálogo de servicios con cuántas veces se vendieron y cuánto generaron.',
    `SELECT s.id AS servicio_id, s.nombre AS servicio, COALESCE(cs.nombre,'Sin categoría') AS categoria, s.precio AS precio_base, s.duracion_min, s.comision_pct, s.estado AS activo, (SELECT COALESCE(SUM(d.cantidad),0) FROM orden_detalle d JOIN ordenes o ON o.id=d.orden_id WHERE d.tipo='servicio' AND d.item_id=s.id AND o.estado<>'cancelado') AS veces_vendido, (SELECT COALESCE(SUM(d.subtotal),0) FROM orden_detalle d JOIN ordenes o ON o.id=d.orden_id WHERE d.tipo='servicio' AND d.item_id=s.id AND o.estado<>'cancelado') AS total_vendido FROM servicios s LEFT JOIN categorias_servicio cs ON cs.id=s.categoria_id`,
  ],
  v_ia_productos: [
    'Productos e insumos con stock actual. se_vende=0 son insumos internos.',
    `SELECT p.id AS producto_id, p.codigo, p.nombre AS producto, pr.nombre AS proveedor, p.unidad, p.precio_compra, p.precio_venta, p.stock, p.stock_minimo, CASE WHEN p.stock<=p.stock_minimo THEN 1 ELSE 0 END AS stock_bajo, (p.stock*p.precio_compra) AS valor_costo, p.se_vende, p.estado AS activo FROM productos p LEFT JOIN proveedores pr ON pr.id=p.proveedor_id`,
  ],
  v_ia_empleados: [
    'Empleados con su producción (órdenes no canceladas asignadas a ellos).',
    `SELECT e.id AS empleado_id, e.nombre, e.cargo, e.sueldo, e.comision_pct, e.fecha_ingreso, e.estado AS activo, (SELECT COUNT(*) FROM ordenes o WHERE o.empleado_id=e.id AND o.estado<>'cancelado') AS num_ordenes, (SELECT COALESCE(SUM(o.total),0) FROM ordenes o WHERE o.empleado_id=e.id AND o.pagado=1 AND o.estado<>'cancelado') AS ventas_cobradas FROM empleados e`,
  ],
  v_ia_citas: [
    'Citas/reservas de clientes. estado: programada, confirmada, atendida o cancelada.',
    `SELECT ci.id AS cita_id, ci.fecha_hora, DATE(ci.fecha_hora) AS dia, c.nombre AS cliente, v.placa, s.nombre AS servicio, ci.estado, ci.notas FROM citas ci JOIN clientes c ON c.id=ci.cliente_id LEFT JOIN vehiculos v ON v.id=ci.vehiculo_id LEFT JOIN servicios s ON s.id=ci.servicio_id`,
  ],
  v_ia_gastos: [
    'Gastos operativos del negocio.',
    `SELECT g.id AS gasto_id, g.fecha, g.categoria, g.concepto, g.monto FROM gastos g`,
  ],
  v_ia_compras: [
    'Compras a proveedores (cabecera).',
    `SELECT co.id AS compra_id, co.fecha, pr.nombre AS proveedor, co.nro_doc, co.total FROM compras co LEFT JOIN proveedores pr ON pr.id=co.proveedor_id`,
  ],
  v_ia_detalle_compras: [
    'Productos comprados a proveedores (detalle).',
    `SELECT dc.compra_id, co.fecha, pr.nombre AS proveedor, p.nombre AS producto, dc.cantidad, dc.costo, dc.subtotal AS importe FROM compra_detalle dc JOIN compras co ON co.id=dc.compra_id JOIN productos p ON p.id=dc.producto_id LEFT JOIN proveedores pr ON pr.id=co.proveedor_id`,
  ],
  v_ia_paquetes: [
    'Paquetes/membresías prepagados vendidos a clientes.',
    `SELECT cp.id AS venta_paquete_id, cp.fecha_compra, c.nombre AS cliente, cp.nombre AS paquete, s.nombre AS servicio, cp.usos_total, cp.usos_restantes, cp.precio_pagado, cp.metodo_pago, cp.fecha_vence, CASE WHEN cp.usos_restantes>0 AND (cp.fecha_vence IS NULL OR cp.fecha_vence>=CURRENT_DATE) THEN 1 ELSE 0 END AS vigente FROM cliente_paquetes cp JOIN clientes c ON c.id=cp.cliente_id JOIN servicios s ON s.id=cp.servicio_id`,
  ],
  v_ia_cajas: [
    'Aperturas y cierres de caja.',
    `SELECT ca.id AS caja_id, ca.fecha_apertura, ca.fecha_cierre, u.nombre AS cajero, ca.monto_inicial, ca.monto_esperado, ca.monto_final, (ca.monto_final-ca.monto_esperado) AS diferencia, ca.estado FROM cajas ca LEFT JOIN usuarios u ON u.id=ca.usuario_id`,
  ],
  v_ia_movimientos_inventario: [
    'Kardex: entradas, salidas y ajustes de inventario.',
    `SELECT mi.created_at AS fecha, p.nombre AS producto, mi.tipo, mi.cantidad, mi.motivo FROM movimientos_inventario mi JOIN productos p ON p.id=mi.producto_id`,
  ],
};

const IA_GUIA =
  'Nueva orden (POS): elige cliente y vehículo (o regístralos al momento), toca los servicios, descuento y cobra; imprime el ticket. Órdenes de servicio: cambiar estado y cobrar. Citas/Reservas y Calendario. Caja: abrir con monto inicial, ver ventas por método de pago y cerrar el turno. Clientes (ficha 360 con historial y WhatsApp), Vehículos, Paquetes y membresías. CRM: Panel, Segmentos RFM, Seguimientos, Oportunidades Kanban, Fidelización, Cupones, Campañas y Encuestas. Catálogo: Servicios (precio por tipo de vehículo), Categorías, Tipos de vehículo, Productos/Insumos, Movimientos de inventario, Proveedores y Compras. Personal: Empleados, Liquidar comisiones, Asistencia y Planilla mensual. Finanzas: Comprobantes, Cuentas por cobrar, Cuentas por pagar, Gastos y Reportes. Sistema: Usuarios y roles, Configuración, Respaldo/Demo y Bitácora.';

@Injectable()
export class IaService {
  private viewsInstalled = false;

  constructor(private readonly prisma: PrismaService) {}

  private secretKey(): Buffer {
    const raw = process.env.JWT_SECRET || 'carwash_pro_super_secret_jwt_key_2026';
    return crypto.createHash('sha256').update(raw).digest();
  }

  private cifrar(s: string): string {
    if (!s) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.secretKey(), iv);
    const enc = Buffer.concat([cipher.update(s, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return 'g:' + Buffer.concat([iv, tag, enc]).toString('base64');
  }

  private descifrar(s: string): string {
    if (!s || !s.startsWith('g:')) return '';
    try {
      const buf = Buffer.from(s.slice(2), 'base64');
      if (buf.length < 29) return '';
      const iv = buf.subarray(0, 12);
      const tag = buf.subarray(12, 28);
      const enc = buf.subarray(28);
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.secretKey(), iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    } catch {
      return '';
    }
  }

  private async ensureViews() {
    if (this.viewsInstalled) return;
    for (const [viewName, [, sql]] of Object.entries(IA_VISTAS)) {
      await this.prisma.$executeRawUnsafe(`CREATE OR REPLACE VIEW "${viewName}" AS ${sql}`);
    }
    this.viewsInstalled = true;
  }

  private async getVal(clave: string, def = ''): Promise<string> {
    const row = await this.prisma.iaConfig.findUnique({ where: { clave } });
    return row?.valor ?? def;
  }

  private async setVal(clave: string, valor: string): Promise<void> {
    await this.prisma.iaConfig.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor },
    });
  }

  async getCfg() {
    let p = await this.getVal('ia_proveedor', 'gemini');
    if (!IA_PRESETS[p]) p = 'gemini';
    const url = await this.getVal('ia_url', IA_PRESETS[p].url);
    const modelo = await this.getVal('ia_modelo', IA_PRESETS[p].modelo);
    const clave = this.descifrar(await this.getVal('ia_clave', ''));
    const resumen = (await this.getVal('ia_resumen', '1')) === '1';
    const listo = Boolean(url && modelo && (!IA_PRESETS[p].clave || clave));
    return { proveedor: p, url, modelo, clave, resumen, listo };
  }

  async obtenerEsquema(): Promise<string> {
    await this.ensureViews();
    let txt = '';
    for (const [v, [desc]] of Object.entries(IA_VISTAS)) {
      const cols = await this.prisma.$queryRaw<any[]>`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = ${v}
        ORDER BY ordinal_position
      `;
      const colList = cols.map((c) => `${c.column_name} ${c.data_type}`).join(', ');
      txt += `${v}: ${desc}\n  columnas: ${colList}\n`;
    }
    return txt;
  }

  validarSql(sqlRaw: string): string {
    const sql = sqlRaw.trim().replace(/[;\s]+$/, '');
    if (!sql || sql.length > 4000) {
      throw new BadRequestException('La consulta está vacía o es demasiado larga.');
    }
    const clean = sql
      .replace(/'(?:[^'\\]|\\.|'')*'/gs, ' 0 ')
      .replace(/"(?:[^"\\]|\\.|"")*"/gs, ' 0 ');
    if (clean.includes(';')) throw new BadRequestException('Solo se permite una consulta.');
    if (/--|\/\*|\*\/|#|@/.test(clean)) {
      throw new BadRequestException('No se permiten comentarios ni variables.');
    }
    const lower = clean.toLowerCase();
    if (!/^\s*(select|with)\b/.test(lower)) {
      throw new BadRequestException('Solo se permiten consultas SELECT.');
    }
    const prohib =
      /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|call|execute|prepare|copy|lock|unlock|set|rename|show|describe|explain|analyze|pg_sleep|pg_read_file|information_schema|pg_catalog|usuarios|roles|ia_config|bitacora)\b/;
    const match = lower.match(prohib);
    if (match) {
      throw new BadRequestException(`Palabra o tabla no permitida en la consulta: ${match[1].toUpperCase()}`);
    }
    return sql;
  }

  async ejecutarSql(sqlRaw: string) {
    await this.ensureViews();
    const sql = this.validarSql(sqlRaw);
    const t0 = Date.now();
    try {
      const rows = await this.prisma.$queryRawUnsafe<any[]>(sql);
      const sliced = rows.slice(0, IA_MAX_FILAS);
      const columnas = sliced.length > 0 ? Object.keys(sliced[0]) : [];
      const filas = sliced.map((r) =>
        columnas.map((k) => {
          const val = r[k];
          if (typeof val === 'bigint') return Number(val);
          if (val !== null && typeof val === 'object' && 'toNumber' in val) return Number(val);
          return val;
        }),
      );
      return {
        columnas,
        filas,
        truncado: rows.length > IA_MAX_FILAS,
        ms: Date.now() - t0,
        sql,
      };
    } catch (e: any) {
      throw new BadRequestException('Error SQL: ' + (e.message || 'Consulta inválida'));
    }
  }

  private async llamarModelo(mensajes: Array<{ role: string; content: string }>, maxTokens = 900): Promise<string> {
    const c = await this.getCfg();
    if (!c.url || !c.modelo) {
      throw new BadRequestException('Configura el proveedor de IA (URL y modelo).');
    }
    if (IA_PRESETS[c.proveedor]?.clave && !c.clave) {
      throw new BadRequestException(
        'Falta la clave (API key) del proveedor de IA. Configúrala con el botón «Configurar IA».',
      );
    }
    const endpoint = c.url.replace(/\/+$/, '') + '/chat/completions';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (c.clave) headers['Authorization'] = `Bearer ${c.clave}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: c.modelo,
        messages: mensajes,
        temperature: 0,
        max_tokens: maxTokens,
      }),
    });

    const data: any = await res.json().catch(() => null);
    if (res.status === 401 || res.status === 403) {
      throw new BadRequestException('El proveedor rechazó la clave (API key). Revisa que sea correcta.');
    }
    if (res.status === 429) {
      throw new BadRequestException('Se alcanzó el límite del plan gratuito. Espera un minuto e inténtalo de nuevo.');
    }
    if (!res.ok || !data) {
      const errMsg = data?.error?.message || data?.[0]?.error?.message || '';
      throw new BadRequestException(`Error del proveedor de IA (${res.status})${errMsg ? ': ' + errMsg : ''}`);
    }
    const content = data?.choices?.[0]?.message?.content || '';
    if (!String(content).trim()) {
      throw new BadRequestException('La IA no devolvió respuesta. Intenta reformular la pregunta.');
    }
    return String(content);
  }

  private extraerJson(t: string): any | null {
    let s = t.trim();
    const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    try {
      return JSON.parse(s);
    } catch {
      const a = s.indexOf('{');
      const b = s.lastIndexOf('}');
      if (a !== -1 && b > a) {
        try {
          return JSON.parse(s.slice(a, b + 1));
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private async reglasNegocio(): Promise<string> {
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    const hoy = new Date().toISOString().slice(0, 10);
    return (
      `REGLAS:\n` +
      `- Genera un único SELECT (o WITH ... SELECT) en sintaxis PostgreSQL usando SOLO las vistas v_ia_*. Sin punto y coma, sin comentarios.\n` +
      `- Hoy es ${hoy} (usa CURRENT_DATE / NOW() para fechas relativas).\n` +
      `- Estados en minúsculas: pendiente, en_proceso, terminado, entregado, cancelado. Una VENTA cobrada es pagado=1 y estado<>'cancelado'; usa dia_pago para fecha de cobro.\n` +
      `- Para buscar texto sin importar mayúsculas usa ILIKE '%texto%'.\n` +
      `- Moneda: ${emp?.moneda_simbolo || 'S/'}. Redondea importes con ROUND(x::numeric, 2). Usa alias legibles en español.\n` +
      `- Si piden un ranking sin cantidad, usa LIMIT 10; máximo ${IA_MAX_FILAS} filas.`
    );
  }

  async estadoAsistente(uid: number) {
    await this.ensureViews();
    const c = await this.getCfg();
    const favoritos = await this.prisma.iaConsulta.findMany({
      where: { usuario_id: uid, favorito: 1 },
      select: { id: true, pregunta: true, titulo: true },
      orderBy: { ultimo_uso: 'desc' },
    });
    const historial = await this.prisma.iaConsulta.findMany({
      where: { usuario_id: uid, favorito: 0 },
      select: { id: true, pregunta: true, titulo: true, favorito: true },
      orderBy: { ultimo_uso: 'desc' },
      take: 15,
    });
    return {
      cfg: {
        proveedor: c.proveedor,
        url: c.url,
        modelo: c.modelo,
        clave_puesta: c.clave !== '',
        resumen: c.resumen,
      },
      listo: c.listo,
      presets: IA_PRESETS,
      favoritos,
      historial,
    };
  }

  async guardarConfig(body: any, uid: number, uname: string, ip: string) {
    const p = String(body.proveedor || '');
    if (!IA_PRESETS[p]) throw new BadRequestException('Proveedor no válido.');
    const url = String(body.url || '').trim();
    const modelo = String(body.modelo || '').trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      throw new BadRequestException('La URL debe empezar por http:// o https://');
    }
    if (!modelo) throw new BadRequestException('Indica el nombre del modelo.');

    await this.setVal('ia_proveedor', p);
    await this.setVal('ia_url', url);
    await this.setVal('ia_modelo', modelo);
    await this.setVal('ia_resumen', body.resumen ? '1' : '0');

    const k = String(body.clave || '').trim();
    if (k === '__borrar__') await this.setVal('ia_clave', '');
    else if (k !== '') {
      await this.setVal('ia_clave', this.cifrar(k));
    }

    await this.prisma.logAction(uid, uname, 'ia', `Configuró IA: ${p} / ${modelo}`, ip);
    return { ok: true };
  }

  async probarConexion() {
    const resp = await this.llamarModelo([{ role: 'user', content: 'Responde solo con la palabra OK.' }], 20);
    return { ok: true, respuesta: resp.trim().slice(0, 60) };
  }

  async preguntar(body: any, uid: number, uname: string, ip: string) {
    const pregunta = String(body.pregunta || '').trim();
    if (pregunta.length < 4) throw new BadRequestException('Escribe tu pregunta (mínimo 4 caracteres).');

    const esquema = await this.obtenerEsquema();
    const reglas = await this.reglasNegocio();
    const sysPrompt =
      `Eres el analista de datos de un carwash. Conviertes preguntas en español en UNA consulta SQL (PostgreSQL) de solo lectura.\n\n` +
      `VISTAS DISPONIBLES:\n${esquema}\n${reglas}\n\n` +
      `Responde SOLO con un objeto JSON válido:\n` +
      `{"titulo":"título corto","sql":"SELECT ...","grafico":{"tipo":"bar|line|pie|none","x":"col_x","y":"col_y"},"mensaje":null}`;

    const mensajes: Array<{ role: string; content: string }> = [{ role: 'system', content: sysPrompt }];
    if (body.previo?.pregunta && body.previo?.sql) {
      mensajes.push({ role: 'user', content: String(body.previo.pregunta).slice(0, 300) });
      mensajes.push({
        role: 'assistant',
        content: JSON.stringify({ titulo: '', sql: String(body.previo.sql).slice(0, 1500), grafico: { tipo: 'none' }, mensaje: null }),
      });
    }
    mensajes.push({ role: 'user', content: pregunta });

    let ultimoError = '';
    for (let intento = 0; intento < 2; intento++) {
      const raw = await this.llamarModelo(mensajes);
      const j = this.extraerJson(raw);
      if (!j) {
        mensajes.push({ role: 'assistant', content: raw.slice(0, 800) });
        mensajes.push({ role: 'user', content: 'Responde SOLO el objeto JSON indicado.' });
        ultimoError = 'Formato inválido';
        continue;
      }
      if (!j.sql) {
        return {
          ok: true,
          mensaje: j.mensaje || 'No puedo responder esa pregunta con los datos disponibles.',
        };
      }
      try {
        const r = await this.ejecutarSql(String(j.sql));
        const g = j.grafico || {};
        const grafico = {
          tipo: ['bar', 'line', 'pie', 'none'].includes(g.tipo) ? g.tipo : 'none',
          x: String(g.x || ''),
          y: String(g.y || ''),
        };
        const titulo = String(j.titulo || pregunta).trim().slice(0, 160);
        const saved = await this.prisma.iaConsulta.create({
          data: {
            usuario_id: uid,
            pregunta,
            titulo,
            sql_texto: r.sql,
            grafico: JSON.stringify(grafico),
          },
        });
        await this.prisma.logAction(uid, uname, 'ia', `Consulta: ${pregunta.slice(0, 180)}`, ip);
        return { ok: true, id: saved.id, titulo, grafico, ...r };
      } catch (e: any) {
        ultimoError = e.message || 'Error SQL';
        mensajes.push({ role: 'assistant', content: raw });
        mensajes.push({
          role: 'user',
          content: `Esa consulta falló en PostgreSQL: ${ultimoError}. Corrígela usando solo las vistas v_ia_* y responde SOLO el JSON.`,
        });
      }
    }
    throw new BadRequestException(`No pude generar una consulta válida. (${ultimoError})`);
  }

  async ejecutarGuardada(id: number, uid: number) {
    const c = await this.prisma.iaConsulta.findFirst({ where: { id, usuario_id: uid } });
    if (!c) throw new NotFoundException('Consulta no encontrada.');
    const r = await this.ejecutarSql(c.sql_texto);
    await this.prisma.iaConsulta.update({
      where: { id: c.id },
      data: { veces: { increment: 1 }, ultimo_uso: new Date() },
    });
    return {
      ok: true,
      id: c.id,
      pregunta: c.pregunta,
      titulo: c.titulo || c.pregunta,
      grafico: c.grafico ? JSON.parse(c.grafico) : { tipo: 'none' },
      favorito: c.favorito,
      ...r,
    };
  }

  async resumirGuardada(id: number, uid: number) {
    const c = await this.prisma.iaConsulta.findFirst({ where: { id, usuario_id: uid } });
    if (!c) throw new NotFoundException('Consulta no encontrada.');
    const r = await this.ejecutarSql(c.sql_texto);
    if (!r.filas.length) return { ok: true, resumen: 'La consulta no devolvió resultados para ese período.' };
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    const muestra = r.filas.slice(0, 25);
    const txt = await this.llamarModelo(
      [
        {
          role: 'system',
          content: `Eres un analista de un carwash. Responde en español en 1 o 2 frases claras mencionando las cifras más relevantes. Moneda: ${emp?.moneda_simbolo || 'S/'}.`,
        },
        {
          role: 'user',
          content: `Pregunta: ${c.pregunta}\nColumnas: ${r.columnas.join(', ')}\nFilas: ${JSON.stringify(muestra)}`,
        },
      ],
      250,
    );
    return { ok: true, resumen: txt.replace(/<[^>]+>/g, '').trim() };
  }

  async toggleFavorito(id: number, valor: boolean, uid: number) {
    const c = await this.prisma.iaConsulta.findFirst({ where: { id, usuario_id: uid } });
    if (!c) throw new NotFoundException('Consulta no encontrada.');
    const fav = valor ? 1 : 0;
    await this.prisma.iaConsulta.update({ where: { id: c.id }, data: { favorito: fav } });
    return { ok: true, favorito: fav };
  }

  async borrarConsulta(id: number, uid: number) {
    await this.prisma.iaConsulta.deleteMany({ where: { id, usuario_id: uid } });
    return { ok: true };
  }

  async estadoChat() {
    const c = await this.getCfg();
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    return {
      ok: true,
      listo: c.listo,
      proveedor: IA_PRESETS[c.proveedor]?.nombre || c.proveedor,
      empresa: emp?.nombre || 'CarWash Pro',
    };
  }

  async enviarChat(body: any, uid: number, uname: string, ip: string) {
    const msg = String(body.mensaje || '').trim();
    if (msg.length < 2) throw new BadRequestException('Escribe tu mensaje.');
    const hist = Array.isArray(body.historial) ? body.historial.slice(-6) : [];
    const emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    const esquema = await this.obtenerEsquema();
    const reglas = await this.reglasNegocio();

    const sysPrompt =
      `Eres el chatbot de «${emp?.nombre || 'CarWash Pro'}», un sistema de gestión de carwash. Conversas en español con tono cercano y breve.\n` +
      `Puedes: (1) consultar datos del negocio; (2) explicar cómo usar el sistema; (3) saludar o aclarar.\n\n` +
      `VISTAS DISPONIBLES:\n${esquema}\n${reglas}\n\n` +
      `GUÍA DEL SISTEMA: ${IA_GUIA}\n\n` +
      `Responde SOLO con un objeto JSON en una de dos formas:\n` +
      `{"accion":"consulta","sql":"SELECT ..."}\n` +
      `{"accion":"respuesta","texto":"..."}`;

    const mensajes: Array<{ role: string; content: string }> = [{ role: 'system', content: sysPrompt }];
    for (const h of hist) {
      if (h.q) mensajes.push({ role: 'user', content: String(h.q) });
      if (h.a) {
        mensajes.push({
          role: 'assistant',
          content: JSON.stringify(h.sql ? { accion: 'consulta', sql: h.sql } : { accion: 'respuesta', texto: String(h.a).slice(0, 300) }),
        });
      }
    }
    mensajes.push({ role: 'user', content: msg });

    for (let i = 0; i < 2; i++) {
      const raw = await this.llamarModelo(mensajes, 700);
      const j = this.extraerJson(raw);
      if (!j) {
        return { ok: true, texto: raw.replace(/<[^>]+>/g, '').trim() };
      }
      if (j.accion !== 'consulta' || !j.sql) {
        return { ok: true, texto: String(j.texto || j.respuesta || '¿En qué más puedo ayudarte?').trim() };
      }
      try {
        const r = await this.ejecutarSql(String(j.sql));
        const muestra = r.filas.slice(0, 25);
        const texto = await this.llamarModelo(
          [
            {
              role: 'system',
              content: `Eres el chatbot de un carwash. Responde en español con tono cercano y breve (máximo 4 frases). Usa las cifras EXACTAS de los datos. Moneda: ${emp?.moneda_simbolo || 'S/'}.`,
            },
            {
              role: 'user',
              content: `Pregunta: ${msg}\nColumnas: ${r.columnas.join(', ')}\nFilas (${r.filas.length}): ${JSON.stringify(muestra)}`,
            },
          ],
          450,
        );
        await this.prisma.logAction(uid, uname, 'ia', `Chat: ${msg.slice(0, 180)}`, ip);
        return {
          ok: true,
          texto: texto.replace(/<[^>]+>/g, '').trim(),
          sql: r.sql,
          tabla: { columnas: r.columnas, filas: r.filas.slice(0, 10), total: r.filas.length },
        };
      } catch (e: any) {
        mensajes.push({ role: 'assistant', content: raw });
        mensajes.push({
          role: 'user',
          content: `Esa consulta falló en PostgreSQL: ${e.message}. Corrígela y responde SOLO el JSON.`,
        });
      }
    }
    throw new BadRequestException('No pude consultar eso con los datos disponibles.');
  }
}
