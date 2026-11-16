import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { MainLayout } from './components/layout/MainLayout';

import { LoginPage } from './features/auth/LoginPage';
import { PerfilPage } from './features/auth/PerfilPage';

import { DashboardPage } from './features/dashboard/DashboardPage';

import { NuevaOrdenPage } from './features/operaciones/NuevaOrdenPage';
import { OrdenesListPage } from './features/operaciones/OrdenesListPage';
import { OrdenVerPage } from './features/operaciones/OrdenVerPage';
import { VentaRapidaPage } from './features/operaciones/VentaRapidaPage';
import { RecepcionesPage } from './features/operaciones/RecepcionesPage';
import { TableroVivoPage } from './features/operaciones/TableroVivoPage';
import { CotizacionesPage } from './features/operaciones/CotizacionesPage';
import { CitasPage } from './features/operaciones/CitasPage';
import { CalendarioCitasPage } from './features/operaciones/CalendarioCitasPage';
import { CajaPage } from './features/operaciones/CajaPage';

import { ClientesPage } from './features/clientes/ClientesPage';
import { ClienteFichaPage } from './features/clientes/ClienteFichaPage';
import { VehiculosPage } from './features/clientes/VehiculosPage';
import { PaquetesPage } from './features/clientes/PaquetesPage';

import { CrmPanelPage } from './features/crm/CrmPanelPage';
import { CrmSegmentosPage } from './features/crm/CrmSegmentosPage';
import { CrmSeguimientosPage } from './features/crm/CrmSeguimientosPage';
import { CrmPipelinePage } from './features/crm/CrmPipelinePage';
import { CrmFidelidadPage } from './features/crm/CrmFidelidadPage';
import { CrmCuponesPage } from './features/crm/CrmCuponesPage';
import { CrmCampanasPage } from './features/crm/CrmCampanasPage';
import { CrmEncuestasPage } from './features/crm/CrmEncuestasPage';
import { CrmConfigPage } from './features/crm/CrmConfigPage';
import { EncuestaPublicaPage } from './features/crm/EncuestaPublicaPage';

import { ServiciosPage } from './features/catalogo/ServiciosPage';
import { CategoriasPage } from './features/catalogo/CategoriasPage';
import { TiposVehiculoPage } from './features/catalogo/TiposVehiculoPage';
import { ProductosPage } from './features/catalogo/ProductosPage';
import { InventarioPage } from './features/catalogo/InventarioPage';
import { ProveedoresPage } from './features/catalogo/ProveedoresPage';
import { ComprasPage } from './features/catalogo/ComprasPage';

import { EmpleadosPage } from './features/personal/EmpleadosPage';
import { ComisionesPage } from './features/personal/ComisionesPage';
import { AsistenciaPage } from './features/personal/AsistenciaPage';
import { PlanillaPage } from './features/personal/PlanillaPage';

import { ComprobantesPage } from './features/finanzas/ComprobantesPage';
import { CobranzasPage } from './features/finanzas/CobranzasPage';
import { PorPagarPage } from './features/finanzas/PorPagarPage';
import { GastosPage } from './features/finanzas/GastosPage';
import { ReportesPage } from './features/finanzas/ReportesPage';

import { AsistenteIaPage } from './features/ia/AsistenteIaPage';
import { ChatIaPage } from './features/ia/ChatIaPage';

import { UsuariosPage } from './features/sistema/UsuariosPage';
import { ConfiguracionPage } from './features/sistema/ConfiguracionPage';
import { RespaldoDemoPage } from './features/sistema/RespaldoDemoPage';
import { BitacoraPage } from './features/sistema/BitacoraPage';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/encuesta/:token" element={<EncuestaPublicaPage />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/perfil" element={<PerfilPage />} />

          <Route path="/ordenes" element={<OrdenesListPage />} />
          <Route path="/ordenes/nueva" element={<NuevaOrdenPage />} />
          <Route path="/ordenes/:id" element={<OrdenVerPage />} />
          <Route path="/ventas" element={<VentaRapidaPage />} />
          <Route path="/cotizaciones" element={<CotizacionesPage />} />
          <Route path="/recepciones" element={<RecepcionesPage />} />
          <Route path="/tablero" element={<TableroVivoPage />} />
          <Route path="/citas" element={<CitasPage />} />
          <Route path="/citas/calendario" element={<CalendarioCitasPage />} />
          <Route path="/caja" element={<CajaPage />} />

          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<ClienteFichaPage />} />
          <Route path="/vehiculos" element={<VehiculosPage />} />
          <Route path="/paquetes" element={<PaquetesPage />} />
          <Route path="/paquetes/vendidos" element={<PaquetesPage />} />

          <Route path="/crm" element={<CrmPanelPage />} />
          <Route path="/crm/segmentos" element={<CrmSegmentosPage />} />
          <Route path="/crm/seguimientos" element={<CrmSeguimientosPage />} />
          <Route path="/crm/pipeline" element={<CrmPipelinePage />} />
          <Route path="/crm/fidelidad" element={<CrmFidelidadPage />} />
          <Route path="/crm/cupones" element={<CrmCuponesPage />} />
          <Route path="/crm/campanas" element={<CrmCampanasPage />} />
          <Route path="/crm/encuestas" element={<CrmEncuestasPage />} />
          <Route path="/crm/config" element={<CrmConfigPage />} />

          <Route path="/servicios" element={<ServiciosPage />} />
          <Route path="/categorias" element={<CategoriasPage />} />
          <Route path="/tiposvehiculo" element={<TiposVehiculoPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/proveedores" element={<ProveedoresPage />} />
          <Route path="/compras" element={<ComprasPage />} />

          <Route path="/empleados" element={<EmpleadosPage />} />
          <Route path="/comisiones" element={<ComisionesPage />} />
          <Route path="/asistencia" element={<AsistenciaPage />} />
          <Route path="/planilla" element={<PlanillaPage />} />

          <Route path="/comprobantes" element={<ComprobantesPage />} />
          <Route path="/cobranzas" element={<CobranzasPage />} />
          <Route path="/porpagar" element={<PorPagarPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />

          <Route path="/asistente" element={<AsistenteIaPage />} />
          <Route path="/chatia" element={<ChatIaPage />} />

          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="/respaldo" element={<RespaldoDemoPage />} />
          <Route path="/bitacora" element={<BitacoraPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
