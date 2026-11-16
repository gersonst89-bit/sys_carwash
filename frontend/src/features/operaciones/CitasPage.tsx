import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../../api/http';
import { CrudPage } from '../../components/ui/CrudPage';
import { fdate, estadoBadgeClass, estadoLabel } from '../../utils/format';

export const CitasPage: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [cat, setCat] = useState<any>({ clientes: [], vehiculos: [], servicios: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, catRes] = await Promise.all([
        http.get('/citas'),
        http.get('/ordenes/catalogos'),
      ]);
      setRows(Array.isArray(cRes.data) ? cRes.data : cRes.data.rows || []);
      setCat(catRes.data);
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
      title="Citas y Reservas"
      subtitle="Agenda de reservas programadas por clientes"
      icon="bi-calendar-check"
      rows={rows}
      loading={loading}
      createLabel="Nueva cita"
      searchKeys={['cliente', 'placa', 'servicio', 'notas']}
      extraHeaderActions={
        <Link to="/citas/calendario" className="btn btn-light border btn-sm">
          <i className="bi bi-calendar3 me-1"></i> Ver Calendario Mensual
        </Link>
      }
      columns={[
        {
          key: 'fecha_hora',
          label: 'Fecha y Hora',
          render: (r) => <span className="fw-bold">{fdate(r.fecha_hora, true)}</span>,
        },
        { key: 'cliente', label: 'Cliente' },
        {
          key: 'placa',
          label: 'Vehículo',
          render: (r) => (r.placa ? <span className="bd-placa">{r.placa}</span> : '-'),
        },
        { key: 'servicio', label: 'Servicio' },
        {
          key: 'estado',
          label: 'Estado',
          render: (r) => <span className={estadoBadgeClass(r.estado)}>{estadoLabel(r.estado)}</span>,
        },
        { key: 'notas', label: 'Notas' },
      ]}
      extraRowActions={(r) =>
        r.estado !== 'atendida' && r.estado !== 'cancelada' ? (
          <Link
            to={`/ordenes/nueva?cita=${r.id}`}
            className="btn btn-sm btn-outline-primary py-0 d-inline-flex align-items-center"
            title="Atender y crear orden"
          >
            <i className="bi bi-play-fill me-1"></i>Atender
          </Link>
        ) : null
      }
      fields={[
        {
          name: 'cliente_id',
          label: 'Cliente',
          type: 'select',
          required: true,
          options: (cat.clientes || []).map((c: any) => ({ value: c.id, label: c.nombre })),
        },
        {
          name: 'vehiculo_id',
          label: 'Vehículo',
          type: 'select',
          options: (cat.vehiculos || []).map((v: any) => ({
            value: v.id,
            label: `${v.placa} - ${v.marca || ''}`,
          })),
        },
        {
          name: 'servicio_id',
          label: 'Servicio principal',
          type: 'select',
          options: (cat.servicios || []).map((s: any) => ({ value: s.id, label: s.nombre })),
        },
        { name: 'fecha_hora', label: 'Fecha y hora', type: 'datetime-local', required: true },
        {
          name: 'estado',
          label: 'Estado',
          type: 'select',
          defaultValue: 'programada',
          options: [
            { value: 'programada', label: 'Programada' },
            { value: 'confirmada', label: 'Confirmada' },
            { value: 'atendida', label: 'Atendida' },
            { value: 'cancelada', label: 'Cancelada' },
          ],
        },
        { name: 'notas', label: 'Notas', type: 'textarea', colSpan: 12 },
      ]}
      onSave={async (data, id) => {
        if (id) await http.put(`/citas/${id}`, data);
        else await http.post('/citas', data);
        await load();
      }}
      onDelete={async (row) => {
        await http.delete(`/citas/${row.id}`);
        await load();
      }}
    />
  );
};
