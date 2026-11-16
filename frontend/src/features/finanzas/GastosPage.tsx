import React, { useEffect, useState } from 'react';
import { CrudPage } from '../../components/ui/CrudPage';
import { http } from '../../api/http';
import { fdate, money, todayYmd } from '../../utils/format';

export const GastosPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await http.get('/gastos');
      setRows(Array.isArray(data) ? data : data.rows || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <CrudPage
      title="Gastos Operativos"
      subtitle="Control de egresos del carwash"
      icon="bi-wallet2"
      rows={rows}
      loading={loading}
      searchKeys={['concepto', 'categoria']}
      columns={[
        { key: 'fecha', label: 'Fecha', render: (r) => fdate(r.fecha) },
        {
          key: 'categoria',
          label: 'Categoría',
          render: (r) => <span className="badge bg-secondary">{r.categoria}</span>,
        },
        { key: 'concepto', label: 'Concepto', render: (r) => <strong>{r.concepto}</strong> },
        { key: 'monto', label: 'Monto', align: 'right', render: (r) => money(r.monto) },
      ]}
      fields={[
        { name: 'fecha', label: 'Fecha', type: 'date', defaultValue: todayYmd(), required: true, colSpan: 4 },
        {
          name: 'categoria',
          label: 'Categoría',
          type: 'select',
          required: true,
          colSpan: 4,
          defaultValue: 'Insumos',
          options: [
            { value: 'Insumos', label: 'Insumos' },
            { value: 'Servicios', label: 'Servicios (Agua/Luz/Internet)' },
            { value: 'Alquiler', label: 'Alquiler' },
            { value: 'Sueldos', label: 'Sueldos y Comisiones' },
            { value: 'Mantenimiento', label: 'Mantenimiento de equipos' },
            { value: 'Otros', label: 'Otros' },
          ],
        },
        { name: 'monto', label: 'Monto', type: 'number', step: '0.01', required: true, colSpan: 4 },
        { name: 'concepto', label: 'Concepto / Descripción', required: true, colSpan: 12 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/gastos/${id}`, data);
        else await http.post('/gastos', data);
        await cargar();
      }}
      onDelete={async (row) => {
        await http.delete(`/gastos/${row.id}`);
        await cargar();
      }}
    />
  );
};
