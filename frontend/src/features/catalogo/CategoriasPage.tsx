import React, { useState, useEffect } from 'react';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';

export const CategoriasPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/categorias');
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
      title="Categorías de Servicio"
      subtitle="Agrupa los servicios de lavado, pulido, detailing y desinfección"
      icon="bi-bookmarks"
      rows={rows}
      loading={loading}
      createLabel="Nueva categoría"
      columns={[
        { key: 'id', label: '#' },
        { key: 'nombre', label: 'Categoría', render: (r) => <b>{r.nombre}</b> },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => (
            <span className={`badge badge-soft-${r.estado ? 'success' : 'secondary'}`}>
              {r.estado ? 'Activa' : 'Inactiva'}
            </span>
          ),
        },
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre de la categoría', required: true, colSpan: 8 },
        { name: 'estado', label: 'Activa', type: 'checkbox', defaultValue: 1, colSpan: 4 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/categorias/${id}`, data);
        else await http.post('/categorias', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/categorias/${row.id}`);
        await load();
      }}
    />
  );
};
