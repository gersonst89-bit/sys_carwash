import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';

export const TiposVehiculoPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/tiposvehiculo');
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
      title="Tipos de Vehículo"
      subtitle="Clasificación de carrocerías (Auto, SUV, Pick-up, Van, Moto) para tarifas diferenciadas"
      icon="bi-truck-front"
      rows={rows}
      loading={loading}
      createLabel="Nuevo tipo"
      columns={[
        { key: 'id', label: '#' },
        { key: 'nombre', label: 'Tipo de Vehículo', render: (r) => <b>{r.nombre}</b> },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => (
            <span className={`badge badge-soft-${r.estado ? 'success' : 'secondary'}`}>
              {r.estado ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre (Ej: SUV / Camioneta)', required: true, colSpan: 8 },
        { name: 'estado', label: 'Activo', type: 'checkbox', defaultValue: 1, colSpan: 4 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/tiposvehiculo/${id}`, data);
        else await http.post('/tiposvehiculo', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/tiposvehiculo/${row.id}`);
        await load();
      }}
    />
  );
};
