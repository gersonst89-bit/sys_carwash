import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';

export const ProveedoresPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/proveedores');
      setRows(Array.isArray(data) ? data : data.rows || []);
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
      title="Proveedores"
      subtitle="Directorio de proveedores de insumos químicos, repuestos y productos"
      icon="bi-truck"
      rows={rows}
      loading={loading}
      createLabel="Nuevo proveedor"
      searchKeys={['nombre', 'ruc', 'contacto', 'telefono']}
      columns={[
        { key: 'nombre', label: 'Razón Social / Proveedor', render: (r) => <b>{r.nombre}</b> },
        { key: 'ruc', label: 'RUC' },
        { key: 'contacto', label: 'Contacto' },
        { key: 'telefono', label: 'Teléfono' },
        { key: 'email', label: 'Correo' },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre o Razón Social', required: true, colSpan: 8 },
        { name: 'ruc', label: 'RUC', colSpan: 4 },
        { name: 'contacto', label: 'Persona de contacto' },
        { name: 'telefono', label: 'Teléfono' },
        { name: 'email', label: 'Correo electrónico', type: 'email' },
        { name: 'direccion', label: 'Dirección' },
        { name: 'estado', label: 'Activo', type: 'checkbox', defaultValue: 1 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/proveedores/${id}`, data);
        else await http.post('/proveedores', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/proveedores/${row.id}`);
        await load();
      }}
    />
  );
};
