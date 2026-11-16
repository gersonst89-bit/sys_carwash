import React, { useEffect, useState } from 'react';
import { CrudPage } from '../../components/ui/CrudPage';
import { http } from '../../api/http';
import { fdate } from '../../utils/format';

export const BitacoraPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http
      .get('/bitacora')
      .then((r) => setRows(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CrudPage
      title="Bitácora del Sistema"
      subtitle="Auditoría de acciones realizadas por los usuarios"
      icon="bi-clock-history"
      rows={rows}
      loading={loading}
      canCreate={false}
      canEdit={false}
      canDelete={false}
      searchKeys={['usuario', 'accion', 'detalle', 'ip']}
      columns={[
        { key: 'created_at', label: 'Fecha y Hora', render: (r) => fdate(r.created_at, true) },
        { key: 'usuario', label: 'Usuario', render: (r) => <strong>{r.usuario || '-'}</strong> },
        {
          key: 'accion',
          label: 'Acción',
          render: (r) => <span className="badge bg-secondary">{r.accion}</span>,
        },
        { key: 'detalle', label: 'Detalle' },
        { key: 'ip', label: 'IP' },
      ]}
    />
  );
};
