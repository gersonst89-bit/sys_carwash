import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';

export const VehiculosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [tipos, setTipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [vRes, cRes, tRes] = await Promise.all([
        http.get('/vehiculos'),
        http.get('/clientes'),
        http.get('/tiposvehiculo'),
      ]);
      setRows(Array.isArray(vRes.data) ? vRes.data : vRes.data.rows || []);
      setClientes(Array.isArray(cRes.data) ? cRes.data : cRes.data.rows || []);
      setTipos(Array.isArray(tRes.data) ? tRes.data : tRes.data.rows || []);
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
      title="Padrón de Vehículos"
      subtitle="Vehículos asociados a clientes y tarifas por tipo de carrocería"
      icon="bi-car-front"
      rows={rows}
      loading={loading}
      createLabel="Nuevo vehículo"
      searchKeys={['placa', 'marca', 'modelo', 'cliente', 'color']}
      columns={[
        {
          key: 'placa',
          label: 'Placa',
          render: (r) => <span className="bd-placa">{r.placa}</span>,
        },
        {
          key: 'marca',
          label: 'Marca / Modelo',
          render: (r) => (
            <span className="fw-semibold">
              {r.marca || '-'} {r.modelo || ''} {r.anio ? `(${r.anio})` : ''}
            </span>
          ),
        },
        { key: 'color', label: 'Color' },
        { key: 'tipo', label: 'Tipo Vehículo', render: (r) => r.tipo || r.tipo_nombre || '-' },
        { key: 'cliente', label: 'Propietario', render: (r) => r.cliente || r.cliente_nombre || '-' },
      ]}
      fields={[
        {
          name: 'cliente_id',
          label: 'Propietario / Cliente',
          type: 'select',
          required: true,
          options: clientes.map((c) => ({ value: c.id, label: c.nombre })),
        },
        { name: 'placa', label: 'Placa', required: true },
        { name: 'marca', label: 'Marca', placeholder: 'Ej: Toyota' },
        { name: 'modelo', label: 'Modelo', placeholder: 'Ej: Hilux' },
        { name: 'color', label: 'Color' },
        { name: 'anio', label: 'Año', type: 'number' },
        {
          name: 'tipo_vehiculo_id',
          label: 'Tipo de Vehículo',
          type: 'select',
          options: tipos.map((t) => ({ value: t.id, label: t.nombre })),
        },
        { name: 'notas', label: 'Observaciones', colSpan: 12 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/vehiculos/${id}`, data);
        else await http.post('/vehiculos', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/vehiculos/${row.id}`);
        await load();
      }}
    />
  );
};
