# 🚗 CarWash Pro · Sistema Integral de Gestión Empresarial y CRM con IA

![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/frontend-React%2018%20%7C%20Vite%20%7C%20TS-61DAFB?style=flat-square&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2016+-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/ORM-Prisma%205-2D3748?style=flat-square&logo=prisma&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/styles-TailwindCSS%203-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

**CarWash Pro** es una plataforma web integral de nivel empresarial para centros de lavado, detailing y servicios automotrices. Diseñada bajo una arquitectura desacoplada y escalable, integra el ciclo operativo completo (POS, Kanban en vivo, recepción técnica con mapa de daños), fidelización avanzada de clientes (CRM con segmentación RFM, puntos y cupones), nóminas y comisiones, finanzas integrales con emisión de comprobantes, y un motor analítico impulsado por **Inteligencia Artificial (Text-to-SQL)** para consultas en lenguaje natural.

---

## 🏗️ Arquitectura del Sistema

```mermaid
flowchart TD
    subgraph Frontend ["Frontend (SPA · React 18 + Vite + TS)"]
        UI["Interfaz Web Responsiva (Tailwind CSS)"]
        Store["Gestión de Estado (Zustand + JWT)"]
        Router["Enrutador Protegido (React Router 6)"]
        Chat["Widget Flotante Asistente IA"]
        UI --> Store
        UI --> Router
        UI --> Chat
    end

    subgraph Backend ["Backend API (NestJS 10 + Node.js)"]
        Guard["Auth Guard & RBAC Decorators"]
        Modules["10 Módulos de Negocio"]
        IAService["Motor IA / Text-to-SQL Sanitizer"]
        PrismaService["Prisma Client & Database Service"]
        Guard --> Modules
        Modules --> PrismaService
        Modules --> IAService
    end

    subgraph Database ["Base de Datos (PostgreSQL 16+)"]
        Tables["38 Tablas Relacionales (ACID)"]
        Views["14 Vistas de Solo Lectura (v_ia_*)"]
    end

    subgraph AI_Providers ["Proveedores de Inteligencia Artificial"]
        LLM["OpenAI / Gemini / Groq / OpenRouter / Ollama"]
    end

    Router <==>|"REST API / JSON (Axios con Bearer Token)"| Guard
    Chat <==>|"REST API / Streaming"| IAService
    PrismaService <==>|"Queries Transaccionales"| Tables
    IAService <==>|"Text-to-SQL (SELECT restringido)"| Views
    IAService <==>|"Prompt / Completion"| LLM
```

---

## ✨ Módulos y Funcionalidades

### 1. 📊 Panel de Control (Dashboard en Tiempo Real)
- **KPIs en Vivo:** Ventas de hoy, órdenes activas, ingresos mensuales, utilidad neta proyectada y cuentas por cobrar.
- **Gráficos Dinámicos:** Evolución temporal de ingresos y gastos (7, 15, 30 y 90 días), comparativa a 12 meses, métodos de pago más utilizados y ranking de servicios y empleados más productivos.
- **Alertas Operativas:** Alertas de stock crítico en insumos y citas programadas para el día.

### 2. ⚡ Operaciones y Taller
- **Nueva Orden de Servicio:** Precios dinámicos autocalculados por categoría de servicio y tipo de vehículo (Sedán, SUV, Camioneta, Moto, etc.). Soporte de paquetes prepagados, descuentos y validación de cupones.
- **Venta Rápida (POS Mostrador):** Facturación inmediata de productos y servicios rápidos sin registro complejo.
- **Recepción con Inspección de Daños:** Checklist de ingreso, registro fotográfico y lienzo interactivo para marcar abolladuras, rayones y roturas preexistentes con firma digital del cliente.
- **Tablero en Vivo (Kanban Operativo):** Flujo visual drag-and-drop / acción rápida: *Pendiente ➔ En Proceso ➔ Terminado ➔ Entregado*.
- **Cotizaciones:** Generación de presupuestos con cálculo de impuestos y conversión a orden de servicio en un clic.
- **Citas y Reservas:** Calendario interactivo mensual/semanal y lista de turnos programados con prevención de solapamiento.
- **Control de Caja y Arqueo:** Apertura con saldo inicial, registro de ingresos/egresos en efectivo, arqueo ciego, cálculo de diferencias y cierre formal de turno.

### 3. 👥 Clientes y Vehículos 360°
- **Ficha Integral de Cliente:** Historial de atenciones, consumo acumulado, saldo pendiente, vehículos vinculados e interacciones comerciales registradas.
- **Gestión de Vehículos:** Control por placa, marca, modelo, año, color y asignación de tipo de vehículo para tarificación.
- **Paquetes y Membresías Prepago:** Venta de abonos de lavado (ej. *10 lavados al precio de 8*) con control automático de usos restantes y fecha de caducidad.

### 4. 🎯 CRM y Fidelización
- **Segmentación RFM Inteligente:** Clasificación automática de clientes según Recencia, Frecuencia y Monto monetario (*Campeones, Fieles, Potenciales, En Riesgo, Dormidos*).
- **Pipeline de Oportunidades:** Tablero comercial para gestión de prospectos y servicios corporativos.
- **Puntos de Fidelidad:** Acumulación por monto consumido y catálogo de recompensas canjeables.
- **Cupones de Descuento:** Creación de códigos promocionales con límite de usos, fecha de vigencia y monto fijo o porcentual.
- **Campañas de Marketing:** Envío de recordatorios masivos o personalizados mediante enlaces directos a WhatsApp Web.
- **Encuestas de Satisfacción (CSAT):** Generación de tokens únicos por orden para calificación del servicio (1 a 5 estrellas) con formulario público adaptable a móviles.

### 5. 📦 Catálogo, Inventario y Compras
- **Matriz de Servicios y Precios:** Configuración de precios diferenciados por tipo de vehículo para cada servicio.
- **Control de Insumos y Kardex:** Registro de movimientos (entradas, salidas, ajustes por merma), alertas de stock mínimo y costeo promedio.
- **Gestión de Proveedores y Compras:** Registro de facturas de compra, recepción de mercadería y actualización automática de existencias.

### 6. 👷 Personal y Nómina
- **Gestión de Empleados:** Asignación de cargos, sueldos base y esquemas de comisiones porcentuales por servicio.
- **Liquidación de Comisiones:** Reporte detallado de comisiones devengadas por técnico con filtros de fecha.
- **Control de Asistencia:** Registro diario de entradas, salidas, tardanzas y justificaciones.
- **Generación de Planilla (Nómina):** Cálculo automático de salario neto considerando sueldo base, comisiones ganadas, adelantos otorgados y descuentos.

### 7. 💵 Finanzas y Facturación
- **Comprobantes Electrónicos:** Emisión y control correlativo de Boletas (`B001`), Facturas (`F001`) y Notas de Venta (`NV01`) con formato para ticketera térmica de 80mm/58mm.
- **Cuentas por Cobrar (Créditos):** Historial de saldos pendientes con amortización cronológica (FIFO).
- **Cuentas por Pagar:** Programación de pagos pendientes a proveedores.
- **Gastos Operativos:** Categorización de gastos fijos y variables (alquiler, servicios, insumos, mantenimiento).
- **Reportes Analíticos:** Exportación en formatos CSV/Excel de ventas, gastos, utilidades y balance general.

### 8. 🤖 Inteligencia Artificial (Text-to-SQL Blindado)
- **Asistente Analítico Integrado:** Permite a administradores y supervisores hacer preguntas de negocio en lenguaje natural (ej. *"¿Cuánto vendimos en servicios de detailing la semana pasada agrupado por empleado?"*).
- **Seguridad y Aislamiento:**
  - El motor traduce el lenguaje natural a consultas SQL ejecutadas **únicamente en 14 vistas de solo lectura (`v_ia_*`)**.
  - Bloqueo estricto de sentencias de escritura (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`).
  - Compatible con OpenAI (GPT-4o), Google Gemini, Groq, OpenRouter o modelos locales vía Ollama.

### 9. ⚙️ Administración y Seguridad
- **Control de Acceso Basado en Roles (RBAC):** Permisos granulares por módulo (`Administrador`, `Cajero`, `Supervisor`, etc.).
- **Auditoría (Bitácora del Sistema):** Trazabilidad de cada acción crítica (creación, edición, eliminación) con usuario, fecha e IP.
- **Configuración de Empresa:** Personalización de logo, moneda (`PEN`, `USD`, `MXN`, `EUR`, etc.), porcentaje de impuestos (IGV/IVA) y prefijos de comprobante.
- **Generador de Datos Demo:** Carga de clientes, vehículos y órdenes sintéticas para demostraciones y pruebas inmediatas.

---

## 🛠️ Tecnologías Utilizadas

| Capa | Tecnologías |
|---|---|
| **Backend** | NestJS 10, TypeScript, Prisma ORM, Passport JWT, Bcrypt, RxJS, Express |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Zustand, React Router 6, Chart.js, Lucide Icons, Bootstrap Icons |
| **Base de Datos** | PostgreSQL 16+ (38 tablas normalizadas + 14 vistas SQL analíticas) |
| **Inteligencia Artificial** | Integración Multi-LLM (OpenAI API compatible) + Pipeline Text-to-SQL seguro |

---

## 🚀 Instalación y Despliegue Local

### Requisitos Previos
1. **Node.js** v18 o superior instalado.
2. **PostgreSQL** v15 o superior instalado y en ejecución.

---

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd sys_carwash
```

---

### Paso 2: Configurar y Levantar el Backend

1. Entra al directorio del backend:
   ```bash
   cd backend
   ```

2. Crea tu archivo de variables de entorno copiando la plantilla:
   ```bash
   cp .env.example .env
   ```

3. Edita `.env` con las credenciales de tu PostgreSQL:
   ```env
   DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5433/sys_carwash?schema=public"
   JWT_SECRET="clave_secreta_jwt_muy_segura_2026"
   PORT=3001
   FRONTEND_URL="http://localhost:5173"
   ```

4. Instala las dependencias:
   ```bash
   npm install
   ```

5. Aplica el esquema de la base de datos y ejecuta los datos semilla:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

6. Inicia el backend en modo desarrollo:
   ```bash
   npm run start:dev
   ```
   > 🚀 API corriendo en: `http://localhost:3001/api`

---

### Paso 3: Configurar y Levantar el Frontend

1. En una nueva terminal, entra al directorio del frontend:
   ```bash
   cd frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Inicia el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
   > 🌐 Aplicación web disponible en: `http://localhost:5173`

---

## 🔑 Credenciales por Defecto

Al ejecutar `npx prisma db seed`, se crea automáticamente el usuario administrador:

- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** `Administrador General` (Acceso completo a todos los módulos)

> *Se recomienda cambiar la contraseña desde el módulo de Perfil / Usuarios tras el primer inicio de sesión.*

---

## 🧪 Cargar Datos de Demostración

Si deseas visualizar el Dashboard con gráficos, estadísticas de ventas, órdenes y clientes de prueba:
1. Inicia sesión en `http://localhost:5173`.
2. En el menú lateral, dirígete a **Sistema** ➔ **Respaldo y restauración** (`/respaldo`).
3. En la sección **Datos de demostración**, haz clic en **"Cargar datos demo"**.
4. ¡Listo! El Dashboard, CRM y Kanban se poblarán instantáneamente con métricas realistas.

---

## 📄 Scripts Disponibles

### Backend (`/backend`)
- `npm run start:dev`: Inicia el servidor NestJS en modo observador (*watch mode*).
- `npm run build`: Compila el proyecto TypeScript para producción en `/dist`.
- `npm run start:prod`: Ejecuta la versión compilada en producción.
- `npm run prisma:push`: Sincroniza el modelo de Prisma con PostgreSQL sin crear migraciones intermedias.
- `npm run prisma:seed`: Ejecuta la carga de datos base iniciales.

### Frontend (`/frontend`)
- `npm run dev`: Inicia el servidor local de Vite con Hot Module Replacement (HMR).
- `npm run build`: Compila la aplicación optimizada para producción en `/dist`.
- `npm run preview`: Previsualiza localmente el build de producción.

---

## 🛡️ Seguridad y Buenas Prácticas
- **Autenticación Stateless:** Tokens JWT con expiración configurable y validación en cabeceras `Bearer`.
- **Protección de Credenciales:** Contraseñas hasheadas con `bcrypt` (10 rounds de salting).
- **Auditoría de Acciones:** Registro de logs de actividad (`ip`, `usuario_id`, `accion`, `detalle`, `created_at`).
- **Seguridad en Text-to-SQL:** Validación léxica mediante regex para permitir exclusivamente sentencias `SELECT` dirigidas a vistas específicas (`v_ia_*`), bloqueando inyecciones y accesos a tablas del sistema.

---

## 📜 Licencia
Este proyecto se encuentra bajo la Licencia **MIT**. Eres libre de usarlo, modificarlo y distribuirlo para fines comerciales o personales.
