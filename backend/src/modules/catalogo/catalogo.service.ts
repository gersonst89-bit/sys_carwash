import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogoService {
  constructor(private readonly prisma: PrismaService) {}

  async listarServicios() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT s.*, c.nombre AS categoria
      FROM servicios s
      LEFT JOIN categorias_servicio c ON c.id = s.categoria_id
      ORDER BY s.id DESC
    `;
    const categorias = await this.prisma.categoriaServicio.findMany({
      where: { estado: 1 },
      orderBy: { nombre: 'asc' },
    });
    const tipos = await this.prisma.tipoVehiculo.findMany({
      where: { estado: 1 },
      orderBy: { id: 'asc' },
    });
    const preciosRows = await this.prisma.servicioPrecio.findMany();
    const precios: Record<number, Record<number, number>> = {};
    for (const r of preciosRows) {
      if (!precios[r.servicio_id]) precios[r.servicio_id] = {};
      precios[r.servicio_id][r.tipo_vehiculo_id] = Number(r.precio);
    }
    return { rows, categorias, tipos, precios };
  }

  async guardarServicio(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del servicio es obligatorio.');
    const data = {
      nombre: nombre.slice(0, 120),
      categoria_id: body.categoria_id ? Number(body.categoria_id) : null,
      descripcion: body.descripcion ? String(body.descripcion).trim().slice(0, 255) : null,
      precio: Math.max(0, Number(body.precio || 0)),
      duracion_min: Math.max(1, Number(body.duracion_min || 30)),
      comision_pct: Math.max(0, Number(body.comision_pct || 0)),
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };

    const saved = id
      ? await this.prisma.servicio.update({ where: { id }, data })
      : await this.prisma.servicio.create({ data });

    if (body.precio_tipo && typeof body.precio_tipo === 'object') {
      await this.prisma.servicioPrecio.deleteMany({ where: { servicio_id: saved.id } });
      const entries = Object.entries(body.precio_tipo);
      for (const [tid, val] of entries) {
        if (val !== '' && val !== null && val !== undefined && !isNaN(Number(val))) {
          await this.prisma.servicioPrecio.create({
            data: {
              servicio_id: saved.id,
              tipo_vehiculo_id: Number(tid),
              precio: Math.max(0, Number(val)),
            },
          });
        }
      }
    }

    await this.prisma.logAction(uid, uname, 'servicios:save', `Servicio ${nombre}`, ip);
    return saved;
  }

  async eliminarServicio(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.servicio.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'servicios:delete', `Servicio #${id}`, ip);
    return { ok: true };
  }

  async listarCategorias() {
    return this.prisma.categoriaServicio.findMany({ orderBy: { id: 'desc' } });
  }

  async guardarCategoria(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre de la categoría es obligatorio.');
    const data = {
      nombre: nombre.slice(0, 80),
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    const res = id
      ? await this.prisma.categoriaServicio.update({ where: { id }, data })
      : await this.prisma.categoriaServicio.create({ data });
    await this.prisma.logAction(uid, uname, 'categorias:save', `Categoría ${nombre}`, ip);
    return res;
  }

  async eliminarCategoria(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.categoriaServicio.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'categorias:delete', `Categoría #${id}`, ip);
    return { ok: true };
  }

  async listarTiposVehiculo() {
    return this.prisma.tipoVehiculo.findMany({ orderBy: { id: 'asc' } });
  }

  async guardarTipoVehiculo(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del tipo de vehículo es obligatorio.');
    const data = {
      nombre: nombre.slice(0, 60),
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    const res = id
      ? await this.prisma.tipoVehiculo.update({ where: { id }, data })
      : await this.prisma.tipoVehiculo.create({ data });
    await this.prisma.logAction(uid, uname, 'tipos_vehiculo:save', `Tipo ${nombre}`, ip);
    return res;
  }

  async eliminarTipoVehiculo(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.tipoVehiculo.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'tipos_vehiculo:delete', `Tipo #${id}`, ip);
    return { ok: true };
  }

  async listarProductos() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT p.*, pr.nombre AS proveedor
      FROM productos p
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      ORDER BY p.id DESC
    `;
    const proveedores = await this.prisma.proveedor.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return { rows, proveedores };
  }

  async guardarProducto(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del producto es obligatorio.');
    const data = {
      codigo: body.codigo ? String(body.codigo).trim().slice(0, 30) : null,
      nombre: nombre.slice(0, 150),
      unidad: String(body.unidad || 'UND').slice(0, 20),
      proveedor_id: body.proveedor_id ? Number(body.proveedor_id) : null,
      precio_compra: Math.max(0, Number(body.precio_compra || 0)),
      precio_venta: Math.max(0, Number(body.precio_venta || 0)),
      stock: Number(body.stock || 0),
      stock_minimo: Math.max(0, Number(body.stock_minimo || 0)),
      se_vende: body.se_vende !== undefined ? (body.se_vende ? 1 : 0) : 1,
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    const res = id
      ? await this.prisma.producto.update({ where: { id }, data })
      : await this.prisma.producto.create({ data });
    await this.prisma.logAction(uid, uname, 'productos:save', `Producto ${nombre}`, ip);
    return res;
  }

  async eliminarProducto(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.producto.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'productos:delete', `Producto #${id}`, ip);
    return { ok: true };
  }

  async listarInventario(pid = 0) {
    const rows = pid
      ? await this.prisma.$queryRaw<any[]>`
          SELECT m.*, p.nombre AS producto, p.unidad, u.nombre AS usuario
          FROM movimientos_inventario m
          JOIN productos p ON p.id = m.producto_id
          LEFT JOIN usuarios u ON u.id = m.usuario_id
          WHERE m.producto_id = ${pid}
          ORDER BY m.id DESC
          LIMIT 300
        `
      : await this.prisma.$queryRaw<any[]>`
          SELECT m.*, p.nombre AS producto, p.unidad, u.nombre AS usuario
          FROM movimientos_inventario m
          JOIN productos p ON p.id = m.producto_id
          LEFT JOIN usuarios u ON u.id = m.usuario_id
          ORDER BY m.id DESC
          LIMIT 300
        `;
    const productos = await this.prisma.producto.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true, stock: true, unidad: true },
      orderBy: { nombre: 'asc' },
    });
    return { rows, productos, pid };
  }

  async registrarInventario(body: any, uid: number, uname: string, ip: string) {
    const id = Number(body.producto_id || 0);
    const tipo = String(body.tipo || '');
    const cant = Number(body.cantidad ?? 0);
    const p = await this.prisma.producto.findUnique({ where: { id } });
    if (!p || !['entrada', 'salida', 'ajuste'].includes(tipo) || cant < 0 || (tipo !== 'ajuste' && cant <= 0)) {
      throw new BadRequestException('Datos del movimiento inválidos.');
    }
    const currentStock = Number(p.stock);
    if (tipo === 'salida' && cant > currentStock) {
      throw new BadRequestException(`La salida supera el stock disponible (${currentStock}).`);
    }
    const delta = tipo === 'entrada' ? cant : tipo === 'salida' ? -cant : cant - currentStock;

    await this.prisma.$transaction(async (tx) => {
      const updateData: any = { stock: currentStock + delta };
      if (tipo === 'entrada' && Number(body.precio_compra || 0) > 0) {
        updateData.precio_compra = Number(body.precio_compra);
      }
      await tx.producto.update({ where: { id }, data: updateData });
      await tx.movimientoInventario.create({
        data: {
          producto_id: id,
          tipo,
          cantidad: tipo === 'ajuste' ? Math.abs(delta) : cant,
          motivo: body.motivo ? String(body.motivo).trim().slice(0, 150) : `${tipo} manual`,
          usuario_id: uid,
        },
      });
    });

    await this.prisma.logAction(uid, uname, 'inventario', `${tipo} ${p.nombre}: ${delta}`, ip);
    return { ok: true, nuevo_stock: currentStock + delta };
  }

  async listarProveedores() {
    return this.prisma.proveedor.findMany({ orderBy: { id: 'desc' } });
  }

  async guardarProveedor(id: number | null, body: any, uid: number, uname: string, ip: string) {
    const nombre = String(body.nombre || '').trim();
    if (!nombre) throw new BadRequestException('El nombre del proveedor es obligatorio.');
    const data = {
      nombre: nombre.slice(0, 150),
      ruc: body.ruc ? String(body.ruc).trim().slice(0, 20) : null,
      contacto: body.contacto ? String(body.contacto).trim().slice(0, 100) : null,
      telefono: body.telefono ? String(body.telefono).trim().slice(0, 30) : null,
      email: body.email ? String(body.email).trim().slice(0, 120) : null,
      direccion: body.direccion ? String(body.direccion).trim().slice(0, 200) : null,
      estado: body.estado !== undefined ? (body.estado ? 1 : 0) : 1,
    };
    const res = id
      ? await this.prisma.proveedor.update({ where: { id }, data })
      : await this.prisma.proveedor.create({ data });
    await this.prisma.logAction(uid, uname, 'proveedores:save', `Proveedor ${nombre}`, ip);
    return res;
  }

  async eliminarProveedor(id: number, uid: number, uname: string, ip: string) {
    await this.prisma.proveedor.delete({ where: { id } });
    await this.prisma.logAction(uid, uname, 'proveedores:delete', `Proveedor #${id}`, ip);
    return { ok: true };
  }

  async listarCompras() {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.*, p.nombre AS proveedor, u.nombre AS usuario,
        (SELECT COUNT(*)::int FROM compra_detalle d WHERE d.compra_id = c.id) AS items,
        (c.total - c.pagado)::float AS saldo
      FROM compras c
      LEFT JOIN proveedores p ON p.id = c.proveedor_id
      LEFT JOIN usuarios u ON u.id = c.usuario_id
      ORDER BY c.id DESC
      LIMIT 300
    `;
    const proveedores = await this.prisma.proveedor.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    const productos = await this.prisma.producto.findMany({
      where: { estado: 1 },
      select: { id: true, nombre: true, unidad: true, precio_compra: true },
      orderBy: { nombre: 'asc' },
    });
    return { rows, proveedores, productos };
  }

  async verCompra(id: number) {
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT c.*, p.nombre AS proveedor
      FROM compras c
      LEFT JOIN proveedores p ON p.id = c.proveedor_id
      WHERE c.id = ${id}
    `;
    if (!rows[0]) throw new NotFoundException('Compra no encontrada.');
    const items = await this.prisma.$queryRaw<any[]>`
      SELECT d.*, p.nombre, p.unidad
      FROM compra_detalle d
      JOIN productos p ON p.id = d.producto_id
      WHERE d.compra_id = ${id}
    `;
    const pagos = await this.prisma.$queryRaw<any[]>`
      SELECT x.*, u.nombre AS usuario
      FROM compra_pagos x
      LEFT JOIN usuarios u ON u.id = x.usuario_id
      WHERE x.compra_id = ${id}
      ORDER BY x.id ASC
    `;
    return { c: rows[0], items, pagos };
  }

  async crearCompra(body: any, uid: number, uname: string, ip: string) {
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items = rawItems.filter(
      (i: any) => Number(i.producto_id || 0) > 0 && Number(i.cantidad || 0) > 0,
    );
    if (!items.length) throw new BadRequestException('Agrega al menos un producto con cantidad.');

    const fechaStr = /^\d{4}-\d{2}-\d{2}$/.test(body.fecha || '')
      ? body.fecha
      : new Date().toISOString().slice(0, 10);

    return this.prisma.$transaction(async (tx) => {
      let total = 0;
      const lineas: Array<{ pr: any; cant: number; costo: number }> = [];
      for (const i of items) {
        const pr = await tx.producto.findUnique({ where: { id: Number(i.producto_id) } });
        if (!pr) continue;
        const cant = Number(i.cantidad);
        const costo = Math.max(0, Number(i.costo || 0));
        lineas.push({ pr, cant, costo });
        total += Math.round(cant * costo * 100) / 100;
      }
      if (!lineas.length) throw new BadRequestException('Productos inválidos.');

      const credito = body.condicion === 'credito' && total > 0;
      const proveedor_id = body.proveedor_id ? Number(body.proveedor_id) : null;
      if (credito && !proveedor_id) {
        throw new BadRequestException('Una compra a crédito requiere proveedor.');
      }
      const dias = Math.max(0, Math.min(365, Number(body.dias_credito ?? 30)));
      const fechaDate = new Date(fechaStr);
      const venceDate = credito ? new Date(fechaDate.getTime() + dias * 86400000) : null;

      const compra = await tx.compra.create({
        data: {
          proveedor_id,
          fecha: fechaDate,
          nro_doc: body.nro_doc ? String(body.nro_doc).trim().slice(0, 40) : null,
          condicion: credito ? 'credito' : 'contado',
          vence: venceDate,
          pagado: credito ? 0 : total,
          total,
          notas: body.notas ? String(body.notas).trim().slice(0, 255) : null,
          usuario_id: uid,
        },
      });

      for (const { pr, cant, costo } of lineas) {
        await tx.compraDetalle.create({
          data: {
            compra_id: compra.id,
            producto_id: pr.id,
            cantidad: cant,
            costo,
            subtotal: Math.round(cant * costo * 100) / 100,
          },
        });
        await tx.producto.update({
          where: { id: pr.id },
          data: {
            stock: Number(pr.stock) + cant,
            ...(costo > 0 ? { precio_compra: costo } : {}),
          },
        });
        await tx.movimientoInventario.create({
          data: {
            producto_id: pr.id,
            tipo: 'entrada',
            cantidad: cant,
            motivo: `Compra #${compra.id}`,
            usuario_id: uid,
          },
        });
      }

      if (!credito && body.registrar_gasto !== false && total > 0) {
        await tx.gasto.create({
          data: {
            fecha: fechaDate,
            categoria: 'Insumos',
            concepto: `Compra #${compra.id}${body.nro_doc ? ' · ' + String(body.nro_doc).trim() : ''}`,
            monto: total,
            usuario_id: uid,
          },
        });
      }

      await this.prisma.logAction(uid, uname, 'compras', `Compra #${compra.id} por ${total}`, ip);
      return compra;
    });
  }
}
