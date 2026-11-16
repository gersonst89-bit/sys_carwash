import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { money, num } from '../../utils/format';

export const ProductosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, prRes] = await Promise.all([
        http.get('/productos'),
        http.get('/proveedores'),
      ]);
      setRows(Array.isArray(pRes.data) ? pRes.data : pRes.data.rows || []);
      setProveedores(Array.isArray(prRes.data) ? prRes.data : prRes.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <CrudPage
      title="Productos e Insumos"
      subtitle="Control de stock de shampoos, ceras, accesorios y bebidas para venta en POS"
      icon="bi-box-seam"
      rows={rows}
      loading={loading}
      createLabel="Nuevo producto"
      searchKeys={['nombre', 'codigo', 'proveedor']}
      columns={[
        { key: 'codigo', label: 'Código' },
        { key: 'nombre', label: 'Producto / Insumo', render: (r) => <b>{r.nombre}</b> },
        { key: 'proveedor', label: 'Proveedor', render: (r) => r.proveedor || r.proveedor_nombre || '-' },
        {
          key: 'stock',
          label: 'Stock Actual',
          align: 'center',
          render: (r) => {
            const low = Number(r.stock) <= Number(r.stock_minimo);
            return (
              <span className={`badge badge-soft-${low ? 'danger' : 'success'}`}>
                {num(r.stock)} {r.unidad}
              </span>
            );
          },
        },
        { key: 'precio_compra', label: 'Costo', align: 'right', render: (r) => money(r.precio_compra) },
        {
          key: 'precio_venta',
          label: 'Precio Venta',
          align: 'right',
          render: (r) => <b className="text-primary">{money(r.precio_venta)}</b>,
        },
      ]}
      fields={[
        { name: 'codigo', label: 'Código / SKU', colSpan: 4 },
        { name: 'nombre', label: 'Nombre del producto', required: true, colSpan: 8 },
        {
          name: 'proveedor_id',
          label: 'Proveedor',
          type: 'select',
          options: proveedores.map((p) => ({ value: p.id, label: p.nombre })),
        },
        { name: 'unidad', label: 'Unidad (UND, LT, GLN)', defaultValue: 'UND' },
        { name: 'precio_compra', label: 'Precio de Compra', type: 'number', step: '0.01', defaultValue: 0 },
        { name: 'precio_venta', label: 'Precio de Venta', type: 'number', step: '0.01', defaultValue: 0 },
        { name: 'stock', label: 'Stock Inicial / Actual', type: 'number', step: '0.01', defaultValue: 0 },
        { name: 'stock_minimo', label: 'Stock Mínimo Alerta', type: 'number', step: '0.01', defaultValue: 5 },
        { name: 'se_vende', label: 'Se vende en POS', type: 'checkbox', defaultValue: 1 },
        { name: 'estado', label: 'Activo', type: 'checkbox', defaultValue: 1 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/productos/${id}`, data);
        else await http.post('/productos', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/productos/${row.id}`);
        await load();
      }}
    />
  );
};
