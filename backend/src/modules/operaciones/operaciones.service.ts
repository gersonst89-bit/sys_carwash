import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const ESTADOS_ORDEN = ['pendiente', 'en_proceso', 'terminado', 'entregado', 'cancelado'];
const METODOS_PAGO = ['efectivo', 'tarjeta', 'yape_plin', 'transferencia'];

@Injectable()
export class OperacionesService {
  constructor(private prisma: PrismaService) {}

  private toYmd(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private firstOfMonth(d = new Date()): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  async getEmpresa() {
    let emp = await this.prisma.empresaConfig.findUnique({ where: { id: 1 } });
    if (!emp) {
      emp = await this.prisma.empresaConfig.create({ data: { id: 1, nombre: 'Mi Carwash' } });
    }
    return emp;
  }

  async registrarPagoOrden(
    tx: any,
    orden: { id: number; total: number | any },
    montoIn: number,
    metodoIn: string,
    propinaIn = 0,
    referencia: string | null = null,
    usuarioId: number | null = null,
  ) {
    const oid = Number(orden.id);
    const metodo = METODOS_PAGO.includes(metodoIn) ? metodoIn : 'efectivo';
    const agg = await tx.ordenPago.aggregate({
      where: { orden_id: oid, anulado: 0 },
      _sum: { monto: true },
    });
    const abonado = Number(agg._sum.monto || 0);
    const saldoActual = Math.max(0, Math.round((Number(orden.total) - abonado) * 100) / 100);
    const monto = Math.round(Math.min(Math.max(0, Number(montoIn || 0)), saldoActual) * 100) / 100;
    const propina = Math.round(Math.max(0, Number(propinaIn || 0)) * 100) / 100;

    if (monto <= 0 && propina <= 0) {
      return { monto: 0, saldo: saldoActual, pagado: saldoActual <= 0.004 };
    }

    await tx.ordenPago.create({
      data: {
        orden_id: oid,
        monto,
        propina,
        metodo,
        referencia: referencia ? referencia.slice(0, 80) : null,
        usuario_id: usuarioId,
      },
    });

    const nuevoSaldo = Math.max(0, Math.round((saldoActual - monto) * 100) / 100);
    if (nuevoSaldo <= 0.004) {
      const pagos = await tx.ordenPago.findMany({
        where: { orden_id: oid, anulado: 0 },
      });
      const sumByMethod: Record<string, number> = {};
      for (const p of pagos) {
        sumByMethod[p.metodo] = (sumByMethod[p.metodo] || 0) + Number(p.monto);
      }
      let princ = metodo;
      let maxVal = -1;
      for (const [m, val] of Object.entries(sumByMethod)) {
        if (val > maxVal) {
          maxVal = val;
          princ = m;
        }
      }
      await tx.orden.update({
        where: { id: oid },
        data: {
          pagado: 1,
          metodo_pago: princ,
          fecha_pago: new Date(),
        },
      });
    }

    return { monto, saldo: nuevoSaldo, pagado: nuevoSaldo <= 0.004 };
  }

  async validarCuponInternal(codigoInput: string, clienteId: number | null, subtotal: number) {
    const codigo = (codigoInput || '').trim().toUpperCase();
    if (!codigo) return { ok: false, msg: 'Ingresa un código.', descuento: 0, cupon: null };

    const c = await this.prisma.crmCupon.findUnique({ where: { codigo } });
    if (!c || !c.estado) return { ok: false, msg: 'Cupón no válido.', descuento: 0, cupon: null };

    const today = this.toYmd();
    if (c.vigente_hasta && this.toYmd(new Date(c.vigente_hasta)) < today) {
      return { ok: false, msg: 'El cupón está vencido.', descuento: 0, cupon: null };
    }
    if (c.usos_max > 0 && c.usos >= c.usos_max) {
      return { ok: false, msg: 'El cupón ya fue utilizado.', descuento: 0, cupon: null };
    }
    if (c.cliente_id && Number(c.cliente_id) !== Number(clienteId || 0)) {
      return {
        ok: false,
        msg: 'Este cupón pertenece a otro cliente (elige al cliente en la orden).',
        descuento: 0,
        cupon: null,
      };
    }

    const valor = Number(c.valor);
    const descuento =
      c.tipo === 'porcentaje'
        ? Math.round(subtotal * Math.min(100, valor)) / 100
        : Math.min(subtotal, valor);

    return {
      ok: true,
      msg: `Cupón aplicado: -${c.tipo === 'porcentaje' ? `${valor}%` : `S/ ${valor.toFixed(2)}`}`,
      descuento,
      cupon: c,
    };
  }

  async listarOrdenes(query: { estado?: string; desde?: string; hasta?: string }) {
    const estado = query.estado && ESTADOS_ORDEN.includes(query.estado) ? query.estado : '';
    const desde = /^\d{4}-\d{2}-\d{2}$/.test(query.desde || '') ? query.desde : this.firstOfMonth();
    const hasta = /^\d{4}-\d{2}-\d{2}$/.test(query.hasta || '') ? query.hasta : this.toYmd();

    let rows: any[];
    if (estado) {
      rows = await this.prisma.$queryRaw<any[]>`
        SELECT o.*,
               COALESCE((SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0), 0)::float AS abonado,
               c.nombre AS cliente,
               v.placa,
               e.nombre AS empleado
        FROM ordenes o
        LEFT JOIN clientes c ON c.id = o.cliente_id
        LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
        LEFT JOIN empleados e ON e.id = o.empleado_id
        WHERE DATE(o.fecha_ingreso) BETWEEN CAST(${desde} AS DATE) AND CAST(${hasta} AS DATE)
          AND o.estado = ${estado}
        ORDER BY o.id DESC
        LIMIT 1000
      `;
    } else {
      rows = await this.prisma.$queryRaw<any[]>`
        SELECT o.*,
               COALESCE((SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0), 0)::float AS abonado,
               c.nombre AS cliente,
               v.placa,
               e.nombre AS empleado
        FROM ordenes o
        LEFT JOIN clientes c ON c.id = o.cliente_id
        LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
        LEFT JOIN empleados e ON e.id = o.empleado_id
        WHERE DATE(o.fecha_ingreso) BETWEEN CAST(${desde} AS DATE) AND CAST(${hasta} AS DATE)
        ORDER BY o.id DESC
        LIMIT 1000
      `;
    }

    const totRows = await this.prisma.$queryRaw<any[]>`
      SELECT estado, COUNT(*)::int AS n
      FROM ordenes
      WHERE DATE(fecha_ingreso) = CURRENT_DATE
      GROUP BY estado
    `;
    const resumen: Record<string, number> = {};
    for (const r of totRows) {
      resumen[r.estado] = Number(r.n || 0);
    }

    return { rows, estado, desde, hasta, resumen };
  }

  async catalogosOrden(query?: { cita?: string; cotizacion?: string; recepcion?: string }) {
    const [servicios, prRows, productos, clientes, vehiculos, empleados, tipos] = await Promise.all([
      this.prisma.servicio.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true, precio: true, duracion_min: true, categoria_id: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.servicioPrecio.findMany(),
      this.prisma.producto.findMany({
        where: { estado: 1, se_vende: 1 },
        select: { id: true, codigo: true, nombre: true, precio_venta: true, stock: true, unidad: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cliente.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true, nro_doc: true, telefono: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.vehiculo.findMany({
        where: { estado: 1 },
        select: { id: true, cliente_id: true, placa: true, marca: true, modelo: true, tipo_vehiculo_id: true },
        orderBy: { placa: 'asc' },
      }),
      this.prisma.empleado.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true, cargo: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.tipoVehiculo.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const precios: Record<number, Record<number, number>> = {};
    for (const r of prRows) {
      if (!precios[r.servicio_id]) precios[r.servicio_id] = {};
      precios[r.servicio_id][r.tipo_vehiculo_id] = Number(r.precio);
    }

    let cita = null;
    if (query?.cita) {
      cita = await this.prisma.cita.findUnique({
        where: { id: Number(query.cita) },
        select: { id: true, cliente_id: true, vehiculo_id: true, servicio_id: true },
      });
    }

    let cotizacion = null;
    if (query?.cotizacion) {
      const q = await this.prisma.cotizacion.findFirst({
        where: { id: Number(query.cotizacion), estado: { not: 'convertida' } },
        include: { detalles: true },
      });
      if (q) {
        cotizacion = {
          id: q.id,
          cliente_id: q.cliente_id,
          placa: q.placa,
          tipo_vehiculo_id: q.tipo_vehiculo_id,
          items: q.detalles.map((d) => ({
            tipo: d.tipo,
            id: d.item_id,
            cant: Number(d.cantidad),
          })),
        };
      }
    }

    let recepcion = null;
    if (query?.recepcion) {
      recepcion = await this.prisma.recepcion.findFirst({
        where: { id: Number(query.recepcion), orden_id: null },
        select: { id: true, cliente_id: true, vehiculo_id: true, placa: true },
      });
    }

    return {
      servicios,
      precios,
      productos,
      clientes,
      vehiculos,
      empleados,
      tipos,
      cita,
      cotizacion,
      recepcion,
    };
  }

  async verOrden(id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT o.*,
             c.nombre AS cliente, c.telefono, c.nro_doc, c.tipo_doc, c.direccion,
             v.placa, v.marca, v.modelo, v.color,
             e.nombre AS empleado,
             u.nombre AS cajero
      FROM ordenes o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
      LEFT JOIN empleados e ON e.id = o.empleado_id
      LEFT JOIN usuarios u ON u.id = o.usuario_id
      WHERE o.id = ${id}
    `;
    const o = rows[0];
    if (!o) throw new NotFoundException('Orden no encontrada.');

    const items = await this.prisma.ordenDetalle.findMany({
      where: { orden_id: id },
      orderBy: { id: 'asc' },
    });

    const pagos = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, u.nombre AS usuario
      FROM orden_pagos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.orden_id = ${id}
      ORDER BY p.id ASC
    `;

    const abonado = pagos.reduce((acc, p) => acc + (p.anulado ? 0 : Number(p.monto || 0)), 0);
    const saldo = Math.max(0, Math.round((Number(o.total) - abonado) * 100) / 100);

    const comp = await this.prisma.comprobante.findFirst({
      where: { orden_id: id, anulado: 0 },
      orderBy: { id: 'desc' },
    });

    const cli = o.cliente_id
      ? await this.prisma.cliente.findUnique({
          where: { id: Number(o.cliente_id) },
          select: { id: true, tipo_doc: true, nro_doc: true, nombre: true, direccion: true, telefono: true },
        })
      : null;

    const emp = await this.getEmpresa();

    return {
      ...o,
      items,
      detalles: items,
      pagos,
      abonado: Math.round(abonado * 100) / 100,
      saldo,
      comprobante: comp,
      comp,
      cli,
      empresa: emp,
    };
  }

  async crearOrden(body: any, userId: number, userName: string, ip = '') {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      throw new BadRequestException('Agrega al menos un servicio o producto.');
    }

    const cfg = await this.getEmpresa();

    const result = await this.prisma.$transaction(async (tx) => {
      let clienteId = Number(body.cliente_id || 0) || null;
      const nuevoCliente = (body.nuevo_cliente || '').trim();
      if (!clienteId && nuevoCliente !== '') {
        const createdCli = await tx.cliente.create({
          data: {
            nombre: nuevoCliente,
            telefono: (body.nuevo_telefono || '').trim() || null,
          },
        });
        clienteId = createdCli.id;
      }

      let vehId = Number(body.vehiculo_id || 0) || null;
      const placa = (body.nueva_placa || '').replace(/\s+/g, '').toUpperCase();
      let tipoV = Number(body.tipo_vehiculo_id || 0) || null;

      if (!vehId && placa !== '') {
        if (!clienteId) {
          let genCli = await tx.cliente.findFirst({ where: { nombre: 'Cliente general' } });
          if (!genCli) {
            genCli = await tx.cliente.create({ data: { nombre: 'Cliente general' } });
          }
          clienteId = genCli.id;
        }
        const exVeh = await tx.vehiculo.findFirst({
          where: { placa, cliente_id: clienteId },
        });
        if (exVeh) {
          vehId = exVeh.id;
        } else {
          const createdVeh = await tx.vehiculo.create({
            data: {
              cliente_id: clienteId,
              placa,
              marca: (body.nueva_marca || '').trim() || null,
              tipo_vehiculo_id: tipoV,
            },
          });
          vehId = createdVeh.id;
        }
      }

      if (vehId && !tipoV) {
        const vRow = await tx.vehiculo.findUnique({ where: { id: vehId } });
        tipoV = vRow?.tipo_vehiculo_id || null;
      }

      const lineas: Array<{ tipo: string; itemId: number; nombre: string; cant: number; precio: number }> = [];
      let subtotal = 0;

      for (const it of items) {
        const cant = Math.max(0.01, Number(it.cant ?? it.cantidad ?? 1));
        const itemId = Number(it.id ?? it.item_id ?? 0);
        if (!itemId) continue;

        if (it.tipo === 'servicio') {
          const s = await tx.servicio.findUnique({ where: { id: itemId } });
          if (!s) continue;
          let precio = Number(s.precio);
          if (tipoV) {
            const sp = await tx.servicioPrecio.findUnique({
              where: {
                servicio_id_tipo_vehiculo_id: {
                  servicio_id: itemId,
                  tipo_vehiculo_id: tipoV,
                },
              },
            });
            if (sp) precio = Number(sp.precio);
          }
          lineas.push({ tipo: 'servicio', itemId, nombre: s.nombre, cant, precio });
        } else {
          const pr = await tx.producto.findUnique({ where: { id: itemId } });
          if (!pr) continue;
          if (Number(pr.stock) < cant) {
            throw new BadRequestException(
              `Stock insuficiente de ${pr.nombre} (disponible: ${Number(pr.stock).toFixed(2)}).`,
            );
          }
          lineas.push({
            tipo: 'producto',
            itemId,
            nombre: pr.nombre,
            cant,
            precio: Number(pr.precio_venta),
          });
        }
      }

      if (!lineas.length) {
        throw new BadRequestException('No hay líneas válidas.');
      }

      let usoPaquete: number | null = null;
      const cpid = Number(body.cliente_paquete_id || 0);
      if (cpid > 0) {
        const cp = await tx.clientePaquete.findFirst({
          where: {
            id: cpid,
            cliente_id: Number(clienteId || 0),
            usos_restantes: { gt: 0 },
          },
        });
        const todayStr = this.toYmd();
        if (!cp || (cp.fecha_vence && this.toYmd(new Date(cp.fecha_vence)) < todayStr)) {
          throw new BadRequestException('El paquete seleccionado no está disponible para este cliente.');
        }

        let aplicado = false;
        for (let i = 0; i < lineas.length; i++) {
          const l = lineas[i];
          if (l.tipo === 'servicio' && l.itemId === cp.servicio_id) {
            if (l.cant > 1) {
              lineas[i].cant = l.cant - 1;
              lineas.splice(i + 1, 0, {
                tipo: 'servicio',
                itemId: l.itemId,
                nombre: `${l.nombre} (paquete)`,
                cant: 1,
                precio: 0,
              });
            } else {
              lineas[i].nombre = `${l.nombre} (paquete)`;
              lineas[i].precio = 0;
            }
            aplicado = true;
            break;
          }
        }
        if (!aplicado) {
          throw new BadRequestException('Agrega a la orden el servicio incluido en el paquete.');
        }
        usoPaquete = cpid;
      }

      for (const l of lineas) {
        subtotal += Math.round(l.cant * l.precio * 100) / 100;
      }
      subtotal = Math.round(subtotal * 100) / 100;

      let desc = Math.min(subtotal, Math.max(0, Number(body.descuento || 0)));
      let cuponUsado: any = null;
      if ((body.cupon || '').trim() !== '') {
        const valCupon = await this.validarCuponInternal(String(body.cupon), clienteId, subtotal);
        if (!valCupon.ok) {
          throw new BadRequestException(valCupon.msg);
        }
        desc = Math.min(subtotal, valCupon.descuento);
        cuponUsado = valCupon.cupon;
      }

      const rate = Number(cfg.impuesto_porcentaje) / 100;
      const base = Math.round((subtotal - desc) * 100) / 100;
      let total = 0;
      let imp = 0;
      if (cfg.precios_incluyen_impuesto) {
        total = base;
        imp = Math.round((base - base / (1 + rate)) * 100) / 100;
      } else {
        imp = Math.round(base * rate * 100) / 100;
        total = Math.round((base + imp) * 100) / 100;
      }

      const cobrarAhora = Boolean(body.pagado);
      const metodo = METODOS_PAGO.includes(body.metodo_pago) ? body.metodo_pago : 'efectivo';
      const gratis = total <= 0.004;

      const tempCode = `T${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
      const createdOrden = await tx.orden.create({
        data: {
          codigo: tempCode.slice(0, 20),
          cliente_id: clienteId,
          vehiculo_id: vehId,
          empleado_id: Number(body.empleado_id || 0) || null,
          usuario_id: userId,
          estado: 'pendiente',
          subtotal,
          descuento: desc,
          impuesto: imp,
          total,
          metodo_pago: null,
          pagado: gratis ? 1 : 0,
          fecha_pago: gratis ? new Date() : null,
          observaciones: (body.observaciones || '').trim() || null,
        },
      });

      const oid = createdOrden.id;
      const codigo = `${cfg.prefijo_orden}${String(oid).padStart(6, '0')}`;
      await tx.orden.update({
        where: { id: oid },
        data: { codigo },
      });

      let pagoRes = { monto: 0, saldo: total, pagado: gratis };
      if (cobrarAhora && !gratis) {
        const montoPagoInput =
          body.monto_pago !== undefined && body.monto_pago !== '' && body.monto_pago !== null
            ? Number(String(body.monto_pago).replace(',', '.'))
            : total;
        pagoRes = await this.registrarPagoOrden(
          tx,
          { id: oid, total },
          montoPagoInput,
          metodo,
          Number(body.propina || 0),
          (body.referencia || '').trim() || null,
          userId,
        );
      }

      if (cuponUsado) {
        await tx.crmCupon.update({
          where: { id: cuponUsado.id },
          data: { usos: { increment: 1 } },
        });
      }

      for (const l of lineas) {
        await tx.ordenDetalle.create({
          data: {
            orden_id: oid,
            tipo: l.tipo,
            item_id: l.itemId,
            descripcion: l.nombre,
            cantidad: l.cant,
            precio: l.precio,
            subtotal: Math.round(l.cant * l.precio * 100) / 100,
          },
        });
        if (l.tipo === 'producto') {
          await tx.producto.update({
            where: { id: l.itemId },
            data: { stock: { decrement: l.cant } },
          });
          await tx.movimientoInventario.create({
            data: {
              producto_id: l.itemId,
              tipo: 'salida',
              cantidad: l.cant,
              motivo: `Venta ${codigo}`,
              usuario_id: userId,
            },
          });
        }
      }

      if (usoPaquete) {
        await tx.clientePaquete.update({
          where: { id: usoPaquete },
          data: { usos_restantes: { decrement: 1 } },
        });
        await tx.ordenPaqueteUso.create({
          data: {
            orden_id: oid,
            cliente_paquete_id: usoPaquete,
          },
        });
      }

      if (Number(body.cotizacion_id || 0) > 0) {
        await tx.cotizacion.updateMany({
          where: { id: Number(body.cotizacion_id), estado: { not: 'convertida' } },
          data: { estado: 'convertida', orden_id: oid },
        });
      }
      if (Number(body.recepcion_id || 0) > 0) {
        await tx.recepcion.updateMany({
          where: { id: Number(body.recepcion_id), orden_id: null },
          data: { orden_id: oid },
        });
      }
      if (Number(body.cita_id || 0) > 0) {
        await tx.cita.updateMany({
          where: { id: Number(body.cita_id) },
          data: { estado: 'atendida' },
        });
      }

      return { id: oid, codigo, total, pagoRes };
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Creó orden ${result.codigo}`, ip);
    return {
      ok: true,
      ...result,
      message: `Orden ${result.codigo} registrada correctamente.`,
    };
  }

  async cambiarEstadoOrden(id: number, nuevoEstado: string, userId: number, userName: string, ip = '') {
    if (!ESTADOS_ORDEN.includes(nuevoEstado)) {
      throw new BadRequestException('Estado inválido.');
    }
    const o = await this.prisma.orden.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Orden no encontrada.');
    if (o.estado === 'cancelado') {
      throw new BadRequestException('Una orden cancelada no puede cambiar de estado.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (nuevoEstado === 'cancelado') {
        const prodDetalles = await tx.ordenDetalle.findMany({
          where: { orden_id: id, tipo: 'producto' },
        });
        for (const d of prodDetalles) {
          await tx.producto.update({
            where: { id: d.item_id },
            data: { stock: { increment: Number(d.cantidad) } },
          });
          await tx.movimientoInventario.create({
            data: {
              producto_id: d.item_id,
              tipo: 'entrada',
              cantidad: Number(d.cantidad),
              motivo: `Anulación ${o.codigo}`,
              usuario_id: userId,
            },
          });
        }
        await tx.orden.update({
          where: { id },
          data: { pagado: 0, fecha_pago: null, metodo_pago: null },
        });
        await tx.ordenPago.updateMany({
          where: { orden_id: id },
          data: { anulado: 1 },
        });
        const uso = await tx.ordenPaqueteUso.findUnique({ where: { orden_id: id } });
        if (uso) {
          await tx.clientePaquete.update({
            where: { id: uso.cliente_paquete_id },
            data: { usos_restantes: { increment: 1 } },
          });
          await tx.ordenPaqueteUso.delete({ where: { orden_id: id } });
        }
      }

      const fechaFin =
        ['terminado', 'entregado'].includes(nuevoEstado) ? o.fecha_fin || new Date() : o.fecha_fin;

      await tx.orden.update({
        where: { id },
        data: { estado: nuevoEstado, fecha_fin: fechaFin },
      });
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Orden ${o.codigo} -> ${nuevoEstado}`, ip);
    return { ok: true, estado: nuevoEstado };
  }

  async cobrarOrden(
    id: number,
    body: { monto?: number | string; metodo_pago?: string; propina?: number; referencia?: string },
    userId: number,
    userName: string,
    ip = '',
  ) {
    const o = await this.prisma.orden.findUnique({ where: { id } });
    if (!o) throw new NotFoundException('Orden no encontrada.');
    if (o.pagado || o.estado === 'cancelado') {
      throw new BadRequestException('La orden ya está pagada o cancelada.');
    }

    const metodo = METODOS_PAGO.includes(body.metodo_pago || '') ? body.metodo_pago! : 'efectivo';
    const agg = await this.prisma.ordenPago.aggregate({
      where: { orden_id: id, anulado: 0 },
      _sum: { monto: true },
    });
    const saldo = Math.max(0, Math.round((Number(o.total) - Number(agg._sum.monto || 0)) * 100) / 100);
    const montoInput =
      body.monto === undefined || body.monto === '' || body.monto === null
        ? saldo
        : Number(String(body.monto).replace(',', '.'));
    const propina = Number(body.propina || 0);

    if (montoInput <= 0 && propina <= 0) {
      throw new BadRequestException('Ingresa un monto mayor a cero.');
    }

    const r = await this.prisma.$transaction((tx) =>
      this.registrarPagoOrden(
        tx,
        o,
        montoInput,
        metodo,
        propina,
        (body.referencia || '').trim() || null,
        userId,
      ),
    );

    await this.prisma.logAction(
      userId,
      userName,
      'ordenes',
      `Pago de ${o.codigo}: ${r.monto.toFixed(2)} (${metodo})`,
      ip,
    );

    return {
      ok: true,
      ...r,
      message: r.pagado
        ? 'Pago registrado. La orden quedó pagada.'
        : `Abono registrado. Saldo pendiente: ${r.saldo.toFixed(2)}`,
    };
  }

  async getVentasPos() {
    const [productos, clientes, hoy, totRows] = await Promise.all([
      this.prisma.producto.findMany({
        where: { estado: 1, se_vende: 1 },
        select: { id: true, codigo: true, nombre: true, precio_venta: true, stock: true, unidad: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.cliente.findMany({
        where: { estado: 1 },
        select: { id: true, nombre: true, nro_doc: true },
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT o.id, o.codigo, o.total::float AS total, o.estado, o.fecha_ingreso, o.metodo_pago, c.nombre AS cliente
        FROM ordenes o
        LEFT JOIN clientes c ON c.id = o.cliente_id
        WHERE o.tipo = 'venta' AND DATE(o.fecha_ingreso) = CURRENT_DATE
        ORDER BY o.id DESC
        LIMIT 15
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(*)::int AS n, COALESCE(SUM(total), 0)::float AS t
        FROM ordenes
        WHERE tipo = 'venta' AND estado <> 'cancelado' AND DATE(fecha_ingreso) = CURRENT_DATE
      `,
    ]);

    return {
      productos,
      clientes,
      hoy,
      tot: totRows[0] || { n: 0, t: 0 },
    };
  }

  async crearVentaPos(body: any, userId: number, userName: string, ip = '') {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      throw new BadRequestException('Agrega al menos un producto.');
    }

    const cfg = await this.getEmpresa();

    const res = await this.prisma.$transaction(async (tx) => {
      const lineas: Array<{ id: number; nombre: string; cant: number; precio: number }> = [];
      let subtotal = 0;

      for (const it of items) {
        const cant = Math.max(0.01, Number(it.cant ?? it.cantidad ?? 1));
        const prodId = Number(it.id ?? it.producto_id ?? 0);
        const pr = await tx.producto.findFirst({
          where: { id: prodId, estado: 1, se_vende: 1 },
        });
        if (!pr) continue;
        if (Number(pr.stock) < cant) {
          throw new BadRequestException(
            `Stock insuficiente de ${pr.nombre} (disponible: ${Number(pr.stock).toFixed(2)}).`,
          );
        }
        const precio = Number(pr.precio_venta);
        lineas.push({ id: pr.id, nombre: pr.nombre, cant, precio });
        subtotal += Math.round(cant * precio * 100) / 100;
      }

      if (!lineas.length) {
        throw new BadRequestException('No hay productos válidos.');
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const desc = Math.min(subtotal, Math.max(0, Number(body.descuento || 0)));
      const rate = Number(cfg.impuesto_porcentaje) / 100;
      const base = Math.round((subtotal - desc) * 100) / 100;
      let total = 0;
      let imp = 0;
      if (cfg.precios_incluyen_impuesto) {
        total = base;
        imp = Math.round((base - base / (1 + rate)) * 100) / 100;
      } else {
        imp = Math.round(base * rate * 100) / 100;
        total = Math.round((base + imp) * 100) / 100;
      }

      const metodo = METODOS_PAGO.includes(body.metodo_pago || '') ? body.metodo_pago : 'efectivo';
      const cid = Number(body.cliente_id || 0) || null;
      const tempCode = `V${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

      const orden = await tx.orden.create({
        data: {
          codigo: tempCode.slice(0, 20),
          tipo: 'venta',
          cliente_id: cid,
          usuario_id: userId,
          estado: 'entregado',
          subtotal,
          descuento: desc,
          impuesto: imp,
          total,
          pagado: 0,
          fecha_fin: new Date(),
          observaciones: (body.observaciones || '').trim() || null,
        },
      });

      const oid = orden.id;
      const codigo = `V${String(oid).padStart(6, '0')}`;
      await tx.orden.update({ where: { id: oid }, data: { codigo } });

      for (const l of lineas) {
        await tx.ordenDetalle.create({
          data: {
            orden_id: oid,
            tipo: 'producto',
            item_id: l.id,
            descripcion: l.nombre,
            cantidad: l.cant,
            precio: l.precio,
            subtotal: Math.round(l.cant * l.precio * 100) / 100,
          },
        });
        await tx.producto.update({
          where: { id: l.id },
          data: { stock: { decrement: l.cant } },
        });
        await tx.movimientoInventario.create({
          data: {
            producto_id: l.id,
            tipo: 'salida',
            cantidad: l.cant,
            motivo: `Venta ${codigo}`,
            usuario_id: userId,
          },
        });
      }

      if (total <= 0.004) {
        await tx.orden.update({
          where: { id: oid },
          data: { pagado: 1, fecha_pago: new Date(), metodo_pago: metodo },
        });
      } else {
        await this.registrarPagoOrden(
          tx,
          { id: oid, total },
          total,
          metodo,
          0,
          (body.referencia || '').trim() || null,
          userId,
        );
      }

      const recibido = Number(body.recibido || 0);
      const vuelto = metodo === 'efectivo' && recibido > total ? Math.round((recibido - total) * 100) / 100 : 0;

      return { orden_id: oid, id: oid, codigo, total, vuelto };
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Venta rápida ${res.codigo} (${res.total.toFixed(2)})`, ip);
    return { ok: true, ...res };
  }

  async listarCotizaciones(estado?: string) {
    const validEstados = ['borrador', 'enviada', 'aceptada', 'rechazada', 'convertida'];
    const est = estado && validEstados.includes(estado) ? estado : '';

    const rows = est
      ? await this.prisma.$queryRaw<any[]>`
          SELECT q.*, c.nombre AS cliente
          FROM cotizaciones q
          LEFT JOIN clientes c ON c.id = q.cliente_id
          WHERE q.estado = ${est}
          ORDER BY q.id DESC
          LIMIT 500
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT q.*, c.nombre AS cliente
          FROM cotizaciones q
          LEFT JOIN clientes c ON c.id = q.cliente_id
          ORDER BY q.id DESC
          LIMIT 500
        `;

    const resRows = await this.prisma.$queryRaw<any[]>`
      SELECT estado, COUNT(*)::int AS n, COALESCE(SUM(total), 0)::float AS t
      FROM cotizaciones
      GROUP BY estado
    `;
    const res: Record<string, any> = {};
    for (const r of resRows) {
      res[r.estado] = r;
    }

    return { rows, estado: est, res };
  }

  async verCotizacion(id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT q.*, t.nombre AS tipo_veh, o.codigo AS orden
      FROM cotizaciones q
      LEFT JOIN tipos_vehiculo t ON t.id = q.tipo_vehiculo_id
      LEFT JOIN ordenes o ON o.id = q.orden_id
      WHERE q.id = ${id}
    `;
    const q = rows[0];
    if (!q) throw new NotFoundException('Cotización no encontrada.');

    const items = await this.prisma.cotizacionDetalle.findMany({
      where: { cotizacion_id: id },
      orderBy: { id: 'asc' },
    });

    const todayStr = this.toYmd();
    const venceStr = q.vence ? this.toYmd(new Date(q.vence)) : null;
    const vencida = Boolean(venceStr && venceStr < todayStr && ['borrador', 'enviada'].includes(q.estado));

    return {
      ...q,
      items,
      detalles: items,
      vencida,
    };
  }

  async crearCotizacion(body: any, userId: number, userName: string, ip = '') {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) {
      throw new BadRequestException('Agrega al menos un servicio o producto.');
    }

    let cid = Number(body.cliente_id || 0) || null;
    const tipoV = Number(body.tipo_vehiculo_id || 0) || null;
    let nombre = (body.nombre || '').trim();
    let tel = (body.telefono || '').trim();

    if (cid) {
      const cli = await this.prisma.cliente.findUnique({ where: { id: cid } });
      if (cli) {
        nombre = nombre || cli.nombre;
        tel = tel || cli.telefono || '';
      } else {
        cid = null;
      }
    }

    const cfg = await this.getEmpresa();

    const res = await this.prisma.$transaction(async (tx) => {
      const lineas: Array<{ tipo: string; itemId: number; nombre: string; cant: number; precio: number }> = [];
      let sub = 0;

      for (const it of items) {
        const cant = Math.max(0.01, Number(it.cant ?? it.cantidad ?? 1));
        const itemId = Number(it.id ?? it.item_id ?? 0);
        if (it.tipo === 'servicio') {
          const s = await tx.servicio.findUnique({ where: { id: itemId } });
          if (!s) continue;
          let precio = Number(s.precio);
          if (tipoV) {
            const sp = await tx.servicioPrecio.findUnique({
              where: {
                servicio_id_tipo_vehiculo_id: {
                  servicio_id: itemId,
                  tipo_vehiculo_id: tipoV,
                },
              },
            });
            if (sp) precio = Number(sp.precio);
          }
          lineas.push({ tipo: 'servicio', itemId, nombre: s.nombre, cant, precio });
        } else {
          const pr = await tx.producto.findUnique({ where: { id: itemId } });
          if (!pr) continue;
          lineas.push({
            tipo: 'producto',
            itemId,
            nombre: pr.nombre,
            cant,
            precio: Number(pr.precio_venta),
          });
        }
      }

      if (!lineas.length) throw new BadRequestException('No hay líneas válidas.');
      for (const l of lineas) sub += Math.round(l.cant * l.precio * 100) / 100;
      sub = Math.round(sub * 100) / 100;

      const desc = Math.min(sub, Math.max(0, Number(body.descuento || 0)));
      const rate = Number(cfg.impuesto_porcentaje) / 100;
      const base = Math.round((sub - desc) * 100) / 100;
      let total = 0;
      let imp = 0;
      if (cfg.precios_incluyen_impuesto) {
        total = base;
        imp = Math.round((base - base / (1 + rate)) * 100) / 100;
      } else {
        imp = Math.round(base * rate * 100) / 100;
        total = Math.round((base + imp) * 100) / 100;
      }

      const dias = Math.max(1, Math.min(365, Number(body.validez || 7)));
      const venceDate = new Date();
      venceDate.setDate(venceDate.getDate() + dias);

      const tempCode = `C${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
      const cot = await tx.cotizacion.create({
        data: {
          codigo: tempCode.slice(0, 20),
          cliente_id: cid,
          nombre: nombre.slice(0, 150) || null,
          telefono: tel.slice(0, 30) || null,
          placa: (body.placa || '').trim().toUpperCase().slice(0, 20) || null,
          tipo_vehiculo_id: tipoV,
          vence: venceDate,
          subtotal: sub,
          descuento: desc,
          impuesto: imp,
          total,
          observaciones: (body.observaciones || '').trim().slice(0, 500) || null,
          usuario_id: userId,
        },
      });

      const qid = cot.id;
      const cod = `COT-${String(qid).padStart(5, '0')}`;
      await tx.cotizacion.update({ where: { id: qid }, data: { codigo: cod } });

      for (const l of lineas) {
        await tx.cotizacionDetalle.create({
          data: {
            cotizacion_id: qid,
            tipo: l.tipo,
            item_id: l.itemId,
            descripcion: l.nombre,
            cantidad: l.cant,
            precio: l.precio,
            subtotal: Math.round(l.cant * l.precio * 100) / 100,
          },
        });
      }

      return { id: qid, codigo: cod, total };
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Creó cotización ${res.codigo}`, ip);
    return { ok: true, ...res };
  }

  async cambiarEstadoCotizacion(id: number, nuevoEstado: string, userId: number, userName: string, ip = '') {
    if (!['enviada', 'aceptada', 'rechazada'].includes(nuevoEstado)) {
      throw new BadRequestException('Estado inválido.');
    }
    const q = await this.prisma.cotizacion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Cotización no encontrada.');
    if (q.estado === 'convertida') {
      throw new BadRequestException('La cotización ya fue convertida.');
    }

    await this.prisma.cotizacion.update({
      where: { id },
      data: { estado: nuevoEstado },
    });
    await this.prisma.logAction(userId, userName, 'ordenes', `Cotización ${q.codigo} -> ${nuevoEstado}`, ip);
    return { ok: true, estado: nuevoEstado };
  }

  async eliminarCotizacion(id: number) {
    await this.prisma.cotizacion.deleteMany({
      where: { id, estado: { not: 'convertida' } },
    });
    return { ok: true };
  }

  private saveBase64Image(dataUrl: string, prefix: string): string | null {
    const match = /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
    if (!match) return null;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const b64 = match[2];
    if (b64.length > 10 * 1024 * 1024) return null;
    const dir = path.join(process.cwd(), 'uploads', 'recepciones');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const name = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
    return name;
  }

  async listarRecepciones(q?: string) {
    const search = (q || '').trim();
    let rows: any[];
    if (search) {
      const pattern = `%${search}%`;
      rows = await this.prisma.$queryRaw<any[]>`
        SELECT r.*, c.nombre AS cliente, o.codigo AS orden
        FROM recepciones r
        LEFT JOIN clientes c ON c.id = r.cliente_id
        LEFT JOIN ordenes o ON o.id = r.orden_id
        WHERE r.placa ILIKE ${pattern} OR c.nombre ILIKE ${pattern}
        ORDER BY r.id DESC
        LIMIT 300
      `;
    } else {
      rows = await this.prisma.$queryRaw<any[]>`
        SELECT r.*, c.nombre AS cliente, o.codigo AS orden
        FROM recepciones r
        LEFT JOIN clientes c ON c.id = r.cliente_id
        LEFT JOIN ordenes o ON o.id = r.orden_id
        ORDER BY r.id DESC
        LIMIT 300
      `;
    }

    return { rows, q: search };
  }

  async verRecepcion(id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT r.*, c.nombre AS cliente, c.telefono, v.marca, v.modelo, v.color, u.nombre AS usuario, o.codigo AS orden
      FROM recepciones r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      LEFT JOIN vehiculos v ON v.id = r.vehiculo_id
      LEFT JOIN usuarios u ON u.id = r.usuario_id
      LEFT JOIN ordenes o ON o.id = r.orden_id
      WHERE r.id = ${id}
    `;
    const r = rows[0];
    if (!r) throw new NotFoundException('Recepción no encontrada.');

    let check_l = [];
    let danos_l = {};
    let fotos_l = [];
    try { check_l = JSON.parse(r.checklist || '[]') || []; } catch {}
    try { danos_l = JSON.parse(r.danos || '{}') || {}; } catch {}
    try { fotos_l = JSON.parse(r.fotos || '[]') || []; } catch {}

    return {
      ...r,
      check_l,
      danos_l,
      fotos_l,
    };
  }

  async crearRecepcion(body: any, userId: number, userName: string, ip = '') {
    let vid = Number(body.vehiculo_id || 0) || null;
    let cid = Number(body.cliente_id || 0) || null;
    let placa = (body.placa || '').trim().toUpperCase();

    if (vid) {
      const v = await this.prisma.vehiculo.findUnique({ where: { id: vid } });
      if (v) {
        placa = v.placa;
        cid = cid || v.cliente_id || null;
      } else {
        vid = null;
      }
    }

    if (!placa) {
      throw new BadRequestException('Indica la placa o elige un vehículo.');
    }

    const checkList = Array.isArray(body.check)
      ? body.check
      : Array.isArray(body.checklist)
      ? body.checklist
      : [];
    const danosObj = typeof body.dano === 'object' && body.dano !== null
      ? body.dano
      : typeof body.danos === 'object' && body.danos !== null
      ? body.danos
      : {};

    const fotosSaved: string[] = [];
    if (Array.isArray(body.fotos)) {
      for (const f of body.fotos.slice(0, 8)) {
        if (typeof f === 'string' && f.startsWith('data:image/')) {
          const saved = this.saveBase64Image(f, 'r');
          if (saved) fotosSaved.push(saved);
        } else if (typeof f === 'string') {
          fotosSaved.push(f);
        }
      }
    }

    let firmaSaved: string | null = null;
    if (typeof body.firma === 'string' && body.firma.startsWith('data:image/')) {
      firmaSaved = this.saveBase64Image(body.firma, 'f');
    }

    const combustible = Math.max(0, Math.min(100, Number(body.combustible ?? 50)));
    const km = Number(body.kilometraje || 0);

    const rec = await this.prisma.recepcion.create({
      data: {
        cliente_id: cid,
        vehiculo_id: vid,
        placa,
        combustible,
        kilometraje: km > 0 ? km : null,
        checklist: JSON.stringify(checkList),
        danos: JSON.stringify(danosObj),
        fotos: JSON.stringify(fotosSaved),
        firma: firmaSaved,
        observaciones: (body.observaciones || '').trim().slice(0, 500) || null,
        usuario_id: userId,
      },
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Recepción #${rec.id} del vehículo ${placa}`, ip);
    return { ok: true, id: rec.id };
  }

  async eliminarRecepcion(id: number, userId: number, userName: string, ip = '') {
    const r = await this.verRecepcion(id);
    const dir = path.join(process.cwd(), 'uploads', 'recepciones');
    for (const f of [...(r.fotos_l || []), r.firma]) {
      if (f && /^[\w.]+$/.test(f)) {
        try { fs.unlinkSync(path.join(dir, f)); } catch {}
      }
    }
    await this.prisma.recepcion.delete({ where: { id } });
    await this.prisma.logAction(userId, userName, 'ordenes', `Eliminó recepción #${id}`, ip);
    return { ok: true };
  }

  async getTablero() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT o.id, o.codigo, o.estado, o.fecha_ingreso, o.fecha_fin, o.total::float AS total, o.empleado_id,
             v.placa, v.marca, v.modelo, v.color,
             c.nombre AS cliente, c.telefono,
             e.nombre AS empleado,
             ROUND(EXTRACT(EPOCH FROM (
               CASE WHEN o.estado IN ('terminado', 'entregado') THEN COALESCE(o.fecha_fin, NOW()) ELSE NOW() END
               - o.fecha_ingreso
             )) / 60)::int AS mins,
             COALESCE((
               SELECT SUM(s.duracion_min * d.cantidad)
               FROM orden_detalle d
               JOIN servicios s ON s.id = d.item_id
               WHERE d.orden_id = o.id AND d.tipo = 'servicio'
             ), 0)::int AS dur,
             (
               SELECT STRING_AGG(d.descripcion, ', ')
               FROM orden_detalle d
               WHERE d.orden_id = o.id AND d.tipo = 'servicio'
             ) AS servicios,
             GREATEST(0, o.total - COALESCE((
               SELECT SUM(p.monto) FROM orden_pagos p WHERE p.orden_id = o.id AND p.anulado = 0
             ), 0))::float AS saldo,
             o.pagado
      FROM ordenes o
      LEFT JOIN vehiculos v ON v.id = o.vehiculo_id
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN empleados e ON e.id = o.empleado_id
      WHERE o.tipo = 'servicio'
        AND (
          (o.estado IN ('pendiente', 'en_proceso') AND o.fecha_ingreso >= CURRENT_DATE - INTERVAL '7 days')
          OR (o.estado = 'terminado' AND o.fecha_ingreso >= CURRENT_DATE - INTERVAL '3 days')
          OR (o.estado = 'entregado' AND DATE(o.fecha_ingreso) = CURRENT_DATE)
        )
      ORDER BY o.fecha_ingreso ASC
      LIMIT 300
    `;

    const cols: Record<string, any[]> = {
      pendiente: [],
      en_proceso: [],
      terminado: [],
      entregado: [],
    };
    let atrasadas = 0;

    for (const r of rows) {
      const mins = Math.max(0, Number(r.mins || 0));
      const dur = Number(r.dur || 0) || 30;
      const saldo = Math.max(0, Math.round(Number(r.saldo || 0) * 100) / 100);
      const nivel = ['pendiente', 'en_proceso'].includes(r.estado)
        ? mins > dur * 1.25
          ? 'late'
          : mins > dur * 0.8
          ? 'warn'
          : 'ok'
        : 'done';

      if (nivel === 'late') atrasadas++;

      const item = {
        ...r,
        mins,
        dur,
        saldo,
        nivel,
      };
      if (cols[r.estado]) {
        cols[r.estado].push(item);
      }
    }

    const promRows = await this.prisma.$queryRaw<any[]>`
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (fecha_fin - fecha_ingreso)) / 60))::int AS prom
      FROM ordenes
      WHERE tipo = 'servicio'
        AND estado IN ('terminado', 'entregado')
        AND fecha_fin IS NOT NULL
        AND DATE(fecha_ingreso) = CURRENT_DATE
    `;
    const prom = promRows[0]?.prom !== null && promRows[0]?.prom !== undefined ? Number(promRows[0].prom) : null;

    const emps = await this.prisma.empleado.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });

    const now = new Date();
    const ahora = now.toTimeString().slice(0, 8);

    return {
      cols,
      atrasadas,
      prom,
      ahora,
      emps,
    };
  }

  async moverTablero(id: number, nuevoEstado: string, userId: number, userName: string, ip = '') {
    if (!['pendiente', 'en_proceso', 'terminado', 'entregado'].includes(nuevoEstado)) {
      throw new BadRequestException('Movimiento no permitido.');
    }
    const o = await this.prisma.orden.findUnique({ where: { id } });
    if (!o || o.estado === 'cancelado') {
      throw new BadRequestException('Movimiento no permitido.');
    }

    const fechaFin = ['terminado', 'entregado'].includes(nuevoEstado)
      ? o.fecha_fin || new Date()
      : ['pendiente', 'en_proceso'].includes(nuevoEstado)
      ? null
      : o.fecha_fin;

    await this.prisma.orden.update({
      where: { id },
      data: { estado: nuevoEstado, fecha_fin: fechaFin },
    });

    await this.prisma.logAction(userId, userName, 'ordenes', `Orden ${o.codigo} -> ${nuevoEstado} (tablero)`, ip);
    return { ok: true };
  }

  async asignarTablero(id: number, empleadoId: number | null) {
    if (empleadoId) {
      const emp = await this.prisma.empleado.findFirst({ where: { id: empleadoId, estado: 1 } });
      if (!emp) throw new BadRequestException('Empleado no válido.');
    }
    await this.prisma.orden.updateMany({
      where: { id, estado: { not: 'cancelado' } },
      data: { empleado_id: empleadoId || null },
    });
    return { ok: true };
  }

  async listarCitas() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT t.*, c.nombre AS cliente, v.placa, s.nombre AS servicio
      FROM citas t
      JOIN clientes c ON c.id = t.cliente_id
      LEFT JOIN vehiculos v ON v.id = t.vehiculo_id
      LEFT JOIN servicios s ON s.id = t.servicio_id
      ORDER BY t.fecha_hora DESC
      LIMIT 1000
    `;
    return rows;
  }

  async eventosCitas(mes?: string) {
    const m = /^\d{4}-\d{2}$/.test(mes || '') ? mes! : this.toYmd().slice(0, 7);
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT ci.id,
             ci.estado,
             TO_CHAR(DATE(ci.fecha_hora), 'YYYY-MM-DD') AS d,
             TO_CHAR(ci.fecha_hora, 'HH24:MI') AS h,
             c.nombre AS cliente,
             s.nombre AS servicio
      FROM citas ci
      JOIN clientes c ON c.id = ci.cliente_id
      LEFT JOIN servicios s ON s.id = ci.servicio_id
      WHERE TO_CHAR(ci.fecha_hora, 'YYYY-MM') = ${m}
      ORDER BY ci.fecha_hora ASC
    `;
    return rows;
  }

  async guardarCita(id: number | null, body: any, userId: number, userName: string, ip = '') {
    const cliente_id = Number(body.cliente_id || 0);
    if (!cliente_id) throw new BadRequestException('Cliente es obligatorio.');
    if (!body.fecha_hora) throw new BadRequestException('Fecha y hora es obligatorio.');

    const data = {
      cliente_id,
      vehiculo_id: Number(body.vehiculo_id || 0) || null,
      servicio_id: Number(body.servicio_id || 0) || null,
      fecha_hora: new Date(body.fecha_hora),
      estado: ['programada', 'confirmada', 'atendida', 'cancelada'].includes(body.estado)
        ? body.estado
        : 'programada',
      notas: (body.notas || '').trim() || null,
    };

    if (id) {
      const updated = await this.prisma.cita.update({ where: { id }, data });
      await this.prisma.logAction(userId, userName, 'citas', `Editó Cita #${id}`, ip);
      return updated;
    } else {
      const created = await this.prisma.cita.create({ data });
      await this.prisma.logAction(userId, userName, 'citas', `Creó Cita #${created.id}`, ip);
      return created;
    }
  }

  async eliminarCita(id: number, userId: number, userName: string, ip = '') {
    await this.prisma.cita.delete({ where: { id } });
    await this.prisma.logAction(userId, userName, 'citas', `Eliminó Cita #${id}`, ip);
    return { ok: true };
  }

  private async resumenCaja(caja: any) {
    const ini = new Date(caja.fecha_apertura);
    const fin = caja.fecha_cierre ? new Date(caja.fecha_cierre) : new Date();

    const pagos = await this.prisma.$queryRaw<any[]>`
      SELECT p.metodo AS m,
             COUNT(*)::int AS n,
             COALESCE(SUM(p.monto + p.propina), 0)::float AS t,
             COALESCE(SUM(p.propina), 0)::float AS prop
      FROM orden_pagos p
      JOIN ordenes o ON o.id = p.orden_id
      WHERE p.anulado = 0
        AND o.estado <> 'cancelado'
        AND p.fecha BETWEEN ${ini} AND ${fin}
      GROUP BY p.metodo
    `;

    const porMetodo: Record<string, any> = {};
    let total = 0;
    for (const p of pagos) {
      porMetodo[p.m] = {
        m: p.m,
        n: Number(p.n || 0),
        t: Number(p.t || 0),
        prop: Number(p.prop || 0),
      };
      total += Number(p.t || 0);
    }

    const efectivo = Number(porMetodo['efectivo']?.t || 0);

    const gastosAgg = await this.prisma.gasto.aggregate({
      where: {
        created_at: { gte: ini, lte: fin },
      },
      _sum: { monto: true },
    });
    const gastos = Number(gastosAgg._sum.monto || 0);
    const esperado = Math.round((Number(caja.monto_inicial) + efectivo - gastos) * 100) / 100;

    return {
      porMetodo,
      efectivo,
      gastos,
      total: Math.round(total * 100) / 100,
      esperado,
    };
  }

  async getCaja() {
    const abiertaRows = await this.prisma.$queryRaw<any[]>`
      SELECT c.*, u.nombre AS usuario
      FROM cajas c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.estado = 'abierta'
      ORDER BY c.id DESC
      LIMIT 1
    `;
    const abierta = abiertaRows[0] || null;
    const res = abierta ? await this.resumenCaja(abierta) : null;

    const hist = await this.prisma.$queryRaw<any[]>`
      SELECT c.*, u.nombre AS usuario
      FROM cajas c
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE c.estado = 'cerrada'
      ORDER BY c.id DESC
      LIMIT 30
    `;

    return { abierta, res, hist };
  }

  async abrirCaja(montoInicial: number, userId: number, userName: string, ip = '') {
    const existing = await this.prisma.caja.findFirst({ where: { estado: 'abierta' } });
    if (existing) {
      throw new BadRequestException('Ya existe una caja abierta.');
    }

    const caja = await this.prisma.caja.create({
      data: {
        usuario_id: userId,
        monto_inicial: Math.max(0, Number(montoInicial || 0)),
        estado: 'abierta',
      },
    });
    await this.prisma.logAction(userId, userName, 'caja', 'Apertura de caja', ip);
    return { ok: true, caja };
  }

  async cerrarCaja(
    body: { monto_final?: number; observaciones?: string },
    userId: number,
    userName: string,
    ip = '',
  ) {
    const caja = await this.prisma.caja.findFirst({
      where: { estado: 'abierta' },
      orderBy: { id: 'desc' },
    });
    if (!caja) {
      throw new BadRequestException('No hay ninguna caja abierta.');
    }

    const res = await this.resumenCaja(caja);
    const updated = await this.prisma.caja.update({
      where: { id: caja.id },
      data: {
        estado: 'cerrada',
        fecha_cierre: new Date(),
        monto_final: Number(body.monto_final || 0),
        monto_esperado: res.esperado,
        observaciones: (body.observaciones || '').trim() || null,
      },
    });

    await this.prisma.logAction(userId, userName, 'caja', `Cierre de caja #${caja.id}`, ip);
    return { ok: true, caja: updated, res };
  }
}
