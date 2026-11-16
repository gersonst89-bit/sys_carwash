import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { fdate, todayYmd } from '../../utils/format';
import { http, apiErrorMsg } from '../../api/http';

interface MenuItem {
  mod: string;
  path: string;
  icon: string;
  label: string;
}

const MENU: Record<string, MenuItem[]> = {
  Principal: [{ mod: 'dashboard', path: '/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' }],
  Operaciones: [
    { mod: 'ordenes', path: '/ordenes/nueva', icon: 'bi-plus-circle-fill', label: 'Nueva orden' },
    { mod: 'ordenes', path: '/ventas', icon: 'bi-basket3', label: 'Venta rápida (POS)' },
    { mod: 'ordenes', path: '/cotizaciones', icon: 'bi-file-earmark-text', label: 'Cotizaciones' },
    { mod: 'ordenes', path: '/recepciones', icon: 'bi-clipboard2-check', label: 'Recepción de vehículos' },
    { mod: 'ordenes', path: '/tablero', icon: 'bi-activity', label: 'Tablero en vivo' },
    { mod: 'ordenes', path: '/ordenes', icon: 'bi-card-checklist', label: 'Órdenes de servicio' },
    { mod: 'citas', path: '/citas', icon: 'bi-calendar-check', label: 'Citas / Reservas' },
    { mod: 'citas', path: '/citas/calendario', icon: 'bi-calendar3', label: 'Calendario' },
    { mod: 'caja', path: '/caja', icon: 'bi-cash-coin', label: 'Caja' },
  ],
  Clientes: [
    { mod: 'clientes', path: '/clientes', icon: 'bi-people', label: 'Clientes' },
    { mod: 'vehiculos', path: '/vehiculos', icon: 'bi-car-front', label: 'Vehículos' },
    { mod: 'clientes', path: '/paquetes', icon: 'bi-gift', label: 'Paquetes y membresías' },
    { mod: 'clientes', path: '/paquetes/vendidos', icon: 'bi-bag-check', label: 'Paquetes vendidos' },
  ],
  CRM: [
    { mod: 'clientes', path: '/crm', icon: 'bi-heart-pulse', label: 'Panel CRM' },
    { mod: 'clientes', path: '/crm/segmentos', icon: 'bi-pie-chart', label: 'Segmentos' },
    { mod: 'clientes', path: '/crm/seguimientos', icon: 'bi-telephone-outbound', label: 'Seguimientos' },
    { mod: 'clientes', path: '/crm/pipeline', icon: 'bi-kanban', label: 'Oportunidades' },
    { mod: 'clientes', path: '/crm/fidelidad', icon: 'bi-award', label: 'Fidelización' },
    { mod: 'clientes', path: '/crm/cupones', icon: 'bi-ticket-perforated', label: 'Cupones' },
    { mod: 'clientes', path: '/crm/campanas', icon: 'bi-megaphone', label: 'Campañas' },
    { mod: 'clientes', path: '/crm/encuestas', icon: 'bi-emoji-smile', label: 'Encuestas' },
  ],
  'Catálogo e inventario': [
    { mod: 'servicios', path: '/servicios', icon: 'bi-droplet-half', label: 'Servicios' },
    { mod: 'servicios', path: '/categorias', icon: 'bi-bookmarks', label: 'Categorías de servicio' },
    { mod: 'servicios', path: '/tiposvehiculo', icon: 'bi-truck-front', label: 'Tipos de vehículo' },
    { mod: 'productos', path: '/productos', icon: 'bi-box-seam', label: 'Productos / Insumos' },
    { mod: 'productos', path: '/inventario', icon: 'bi-arrow-left-right', label: 'Movimientos de inventario' },
    { mod: 'proveedores', path: '/proveedores', icon: 'bi-truck', label: 'Proveedores' },
    { mod: 'productos', path: '/compras', icon: 'bi-bag-plus', label: 'Compras' },
  ],
  Personal: [
    { mod: 'empleados', path: '/empleados', icon: 'bi-person-badge', label: 'Empleados' },
    { mod: 'empleados', path: '/comisiones', icon: 'bi-percent', label: 'Liquidar comisiones' },
    { mod: 'empleados', path: '/asistencia', icon: 'bi-clock-history', label: 'Asistencia' },
    { mod: 'empleados', path: '/planilla', icon: 'bi-cash-stack', label: 'Planilla' },
  ],
  Finanzas: [
    { mod: 'caja', path: '/comprobantes', icon: 'bi-file-earmark-ruled', label: 'Comprobantes' },
    { mod: 'caja', path: '/cobranzas', icon: 'bi-receipt-cutoff', label: 'Cuentas por cobrar' },
    { mod: 'productos', path: '/porpagar', icon: 'bi-credit-card-2-front', label: 'Cuentas por pagar' },
    { mod: 'gastos', path: '/gastos', icon: 'bi-wallet2', label: 'Gastos' },
    { mod: 'reportes', path: '/reportes', icon: 'bi-bar-chart-line', label: 'Reportes' },
  ],
  Inteligencia: [
    { mod: 'ia', path: '/asistente', icon: 'bi-stars', label: 'Asistente IA' },
    { mod: 'ia', path: '/chatia', icon: 'bi-chat-dots', label: 'Chat IA' },
  ],
  Sistema: [
    { mod: 'usuarios', path: '/usuarios', icon: 'bi-shield-lock', label: 'Usuarios y roles' },
    { mod: 'configuracion', path: '/configuracion', icon: 'bi-gear', label: 'Configuración' },
    { mod: 'respaldo', path: '/respaldo', icon: 'bi-database-check', label: 'Respaldo y restauración' },
    { mod: 'bitacora', path: '/bitacora', icon: 'bi-clock-history', label: 'Bitácora' },
  ],
};

const GROUP_COLORS: Record<string, string> = {
  Principal: '#0ea5e9',
  Operaciones: '#14b8a6',
  Clientes: '#8b5cf6',
  CRM: '#f43f5e',
  'Catálogo e inventario': '#f59e0b',
  Personal: '#6366f1',
  Finanzas: '#16a34a',
  Inteligencia: '#a855f7',
  Sistema: '#64748b',
};

export const MainLayout: React.FC = () => {
  const { user, empresa, can, logout, refreshMe } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [sbMini, setSbMini] = useState(() => localStorage.getItem('sbMini') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<
    Array<{ role: 'bot' | 'me'; text: string; rows?: any[]; sql?: string }>
  >([
    {
      role: 'bot',
      text: '¡Hola! Soy el asistente inteligente de CarWash Pro. Pregúntame sobre ventas, órdenes, clientes, caja o stock.',
    },
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshMe();
  }, []);

  useEffect(() => {
    if (sbMini) {
      document.body.classList.add('sb-mini');
      localStorage.setItem('sbMini', '1');
    } else {
      document.body.classList.remove('sb-mini');
      localStorage.setItem('sbMini', '0');
    }
  }, [sbMini]);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        if (sbMini) setSbMini(false);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sbMini]);

  let bestPath = '';
  let currentLabel = 'Panel';
  Object.values(MENU).forEach((items) => {
    items.forEach((it) => {
      if (
        (location.pathname === it.path || location.pathname.startsWith(it.path + '/')) &&
        it.path.length > bestPath.length
      ) {
        bestPath = it.path;
        currentLabel = it.label;
      }
    });
  });

  const toggleGroup = (g: string) => {
    setClosedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sendChatMessage = async (qText?: string) => {
    const msg = (qText ?? chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMsgs((prev) => [...prev, { role: 'me', text: msg }]);
    setChatLoading(true);
    try {
      const { data } = await http.post('/ia/chat', { mensaje: msg, pregunta: msg });
      setChatMsgs((prev) => [
        ...prev,
        {
          role: 'bot',
          text: data.respuesta || data.resumen || 'Aquí tienes el resultado de tu consulta.',
          rows: data.filas || data.rows,
          sql: data.sql,
        },
      ]);
    } catch (err) {
      setChatMsgs((prev) => [
        ...prev,
        { role: 'bot', text: apiErrorMsg(err, 'No pude procesar tu mensaje en este momento.') },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const searchTerm = search.trim().toLowerCase();
  let totalVisibleItems = 0;

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} id="sidebar">
        <div className="sb-brand">
          <div className="sb-logo">
            {empresa.logo ? (
              <img src={`/uploads/${empresa.logo}`} alt={empresa.nombre} />
            ) : (
              <i className="bi bi-droplet-half"></i>
            )}
          </div>
          <div className="sb-name">
            <div className="t">{empresa.nombre}</div>
            <small>Sistema de Carwash</small>
          </div>
          <button
            className="sb-collapse d-none d-lg-grid"
            type="button"
            onClick={() => setSbMini(!sbMini)}
            title="Contraer / expandir menú"
          >
            <i className="bi bi-chevron-double-left"></i>
          </button>
        </div>

        <div className="sb-search">
          <i className="bi bi-search"></i>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Buscar módulo…"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!search && <kbd>/</kbd>}
        </div>

        <nav className="sb-scroll" aria-label="Menú principal">
          {Object.entries(MENU).map(([group, items]) => {
            const vis = items.filter(
              (i) => can(i.mod) && (!searchTerm || i.label.toLowerCase().includes(searchTerm)),
            );
            if (vis.length === 0) return null;
            totalVisibleItems += vis.length;
            const isClosed = !searchTerm && closedGroups[group];
            return (
              <section
                key={group}
                className={`sb-group ${isClosed ? 'closed' : ''}`}
                style={{ '--g': GROUP_COLORS[group] || '#0ea5e9' } as React.CSSProperties}
              >
                <button className="sb-title" type="button" onClick={() => toggleGroup(group)}>
                  <span className="dot"></span>
                  <span className="tx">{group}</span>
                  <i className="bi bi-chevron-down"></i>
                </button>
                <div className="sb-items">
                  <div className="sb-inner">
                    {vis.map((it) => {
                      const active = it.path === bestPath;
                      return (
                        <Link
                          key={it.path}
                          to={it.path}
                          className={`sb-link ${active ? 'active' : ''}`}
                          title={it.label}
                        >
                          <span className="ic">
                            <i className={`bi ${it.icon}`}></i>
                          </span>
                          <span className="tx">{it.label}</span>
                          {it.mod === 'ia' && it.path === '/asistente' && <span className="pill">IA</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
          {totalVisibleItems === 0 && (
            <div className="sb-empty">Ningún módulo coincide con tu búsqueda.</div>
          )}
        </nav>

        <div className="sb-foot">
          <div className="sb-user">
            <div className="avatar">{(user?.nombre || 'U').charAt(0).toUpperCase()}</div>
            <div className="tx">
              <b>{user?.nombre}</b>
              <small>{user?.rol}</small>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="sb-out"
              title="Cerrar sesión"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="btn btn-light d-lg-none"
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <i className="bi bi-list fs-5"></i>
          </button>
          <div className="d-none d-md-block">
            <div className="fw-bold">{currentLabel}</div>
            <div className="text-muted small">
              <i className="bi bi-calendar3 me-1"></i>
              {fdate(todayYmd())}
            </div>
          </div>
          <div className="ms-auto d-flex align-items-center gap-3">
            {can('ordenes') && (
              <Link
                to="/ordenes/nueva"
                className="btn btn-grad btn-sm px-3 d-none d-sm-inline-flex align-items-center"
              >
                <i className="bi bi-plus-lg me-1"></i> Nueva orden
              </Link>
            )}
            <div className="dropdown position-relative">
              <button
                type="button"
                className="btn btn-link p-0 d-flex align-items-center gap-2 text-decoration-none text-dark"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="avatar">{(user?.nombre || 'U').charAt(0).toUpperCase()}</div>
                <div className="d-none d-md-block lh-1 text-start">
                  <div className="fw-bold small">{user?.nombre}</div>
                  <small className="text-muted">{user?.rol}</small>
                </div>
                <i className="bi bi-chevron-down small text-muted"></i>
              </button>
              {dropdownOpen && (
                <ul
                  className="dropdown-menu dropdown-menu-end shadow border-0 show"
                  style={{ position: 'absolute', right: 0, top: '110%' }}
                >
                  {can('configuracion') && (
                    <li>
                      <Link className="dropdown-item" to="/configuracion">
                        <i className="bi bi-gear me-2"></i>Configuración
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link className="dropdown-item" to="/perfil">
                      <i className="bi bi-person-gear me-2"></i>Mi perfil
                    </Link>
                  </li>
                  <li>
                    <button type="button" className="dropdown-item text-danger" onClick={handleLogout}>
                      <i className="bi bi-box-arrow-left me-2"></i>Cerrar sesión
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {can('ia') && location.pathname !== '/chatia' && (
        <div className="chat-root no-print">
          <button
            type="button"
            className="chat-fab"
            title="Chat IA"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <i className={`bi ${chatOpen ? 'bi-x-lg' : 'bi-chat-dots-fill'}`}></i>
          </button>
          {chatOpen && (
            <div className="chat-panel">
              <div className="chat-head">
                <div className="chat-av">
                  <i className="bi bi-robot fs-5"></i>
                </div>
                <div className="flex-grow-1">
                  <b>Chat IA · {empresa.nombre}</b>
                  <small>Consultas en tiempo real</small>
                </div>
                <Link
                  to="/chatia"
                  className="btn btn-sm text-white"
                  title="Abrir pantalla completa"
                  onClick={() => setChatOpen(false)}
                >
                  <i className="bi bi-arrows-fullscreen"></i>
                </Link>
                <button type="button" onClick={() => setChatOpen(false)}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="chat-msgs">
                {chatMsgs.map((m, idx) => (
                  <div key={idx} className={`chat-m ${m.role}`}>
                    <div className="chat-b">
                      <div>{m.text}</div>
                      {m.rows && m.rows.length > 0 && (
                        <div className="chat-tbl mt-2">
                          <table className="tbl">
                            <thead>
                              <tr>
                                {Object.keys(m.rows[0]).map((k) => (
                                  <th key={k}>{k}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.rows.slice(0, 8).map((r, ri) => (
                                <tr key={ri}>
                                  {Object.values(r).map((v: any, vi) => (
                                    <td key={vi}>{String(v ?? '-')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-m bot">
                    <div className="chat-b text-muted">
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Analizando datos...
                    </div>
                  </div>
                )}
                <div className="chat-sugs mt-1">
                  {['¿Cuánto vendimos hoy?', '¿Qué órdenes siguen en proceso?', 'Productos con stock bajo'].map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        className="chat-sug"
                        onClick={() => sendChatMessage(s)}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className="chat-in">
                <textarea
                  rows={1}
                  placeholder="Escribe tu pregunta..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={chatLoading || !chatInput.trim()}
                  onClick={() => sendChatMessage()}
                >
                  <i className="bi bi-send-fill"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
