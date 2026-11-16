import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export const CrmNav: React.FC = () => {
  const location = useLocation();
  const { can } = useAuthStore();

  const tabs = [
    { path: '/crm', label: 'Panel CRM', icon: 'bi-heart-pulse' },
    { path: '/crm/segmentos', label: 'Segmentos', icon: 'bi-pie-chart' },
    { path: '/crm/seguimientos', label: 'Seguimientos', icon: 'bi-telephone-outbound' },
    { path: '/crm/pipeline', label: 'Oportunidades', icon: 'bi-kanban' },
    { path: '/crm/fidelidad', label: 'Fidelización', icon: 'bi-award' },
    { path: '/crm/cupones', label: 'Cupones', icon: 'bi-ticket-perforated' },
    { path: '/crm/campanas', label: 'Campañas', icon: 'bi-megaphone' },
    { path: '/crm/encuestas', label: 'Encuestas CSAT', icon: 'bi-emoji-smile' },
  ];

  if (can('configuracion')) {
    tabs.push({ path: '/crm/config', label: 'Configuración', icon: 'bi-sliders' });
  }

  return (
    <div className="crm-tabs mb-3">
      {tabs.map((t) => {
        const active =
          t.path === '/crm'
            ? location.pathname === '/crm'
            : location.pathname.startsWith(t.path);
        return (
          <Link key={t.path} to={t.path} className={active ? 'on' : ''}>
            <i className={`bi ${t.icon}`}></i>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
};
