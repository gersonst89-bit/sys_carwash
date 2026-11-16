import { create } from 'zustand';
import { http } from '../api/http';

export interface UserPayload {
  id: number;
  nombre: string;
  usuario: string;
  email?: string | null;
  rol_id: number;
  rol: string;
  permisos: string;
  ultimo_acceso?: string | null;
}

export interface EmpresaConfig {
  id: number;
  nombre: string;
  razon_social?: string | null;
  ruc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  web?: string | null;
  logo?: string | null;
  moneda_codigo: string;
  moneda_simbolo: string;
  simbolo_posicion: string;
  decimales: number;
  sep_decimal: string;
  sep_miles: string;
  impuesto_nombre: string;
  impuesto_porcentaje: number;
  precios_incluyen_impuesto: number;
  zona_horaria: string;
  formato_fecha: string;
  prefijo_orden: string;
  pie_ticket?: string | null;
}

const DEFAULT_EMPRESA: EmpresaConfig = {
  id: 1,
  nombre: 'Mi Carwash',
  moneda_codigo: 'PEN',
  moneda_simbolo: 'S/',
  simbolo_posicion: 'antes',
  decimales: 2,
  sep_decimal: '.',
  sep_miles: ',',
  impuesto_nombre: 'IGV',
  impuesto_porcentaje: 18,
  precios_incluyen_impuesto: 1,
  zona_horaria: 'America/Lima',
  formato_fecha: 'd/m/Y',
  prefijo_orden: 'OS-',
  pie_ticket: 'Gracias por su preferencia',
};

interface AuthState {
  user: UserPayload | null;
  token: string | null;
  empresa: EmpresaConfig;
  loading: boolean;
  can: (modulo: string) => boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setEmpresa: (emp: Partial<EmpresaConfig>) => void;
  setUser: (u: UserPayload, token?: string) => void;
}

function getInitialUser(): UserPayload | null {
  try {
    const raw = localStorage.getItem('cw_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getInitialEmpresa(): EmpresaConfig {
  try {
    const raw = localStorage.getItem('cw_empresa');
    return raw ? { ...DEFAULT_EMPRESA, ...JSON.parse(raw) } : DEFAULT_EMPRESA;
  } catch {
    return DEFAULT_EMPRESA;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getInitialUser(),
  token: localStorage.getItem('cw_token'),
  empresa: getInitialEmpresa(),
  loading: false,

  can: (modulo: string) => {
    const u = get().user;
    if (!u) return false;
    const p = (u.permisos || '').trim();
    if (p === '*') return true;
    const mods = p.split(',').map((m) => m.trim());
    return mods.includes(modulo);
  },

  login: async (usuario: string, password: string) => {
    set({ loading: true });
    try {
      const { data } = await http.post('/auth/login', { usuario, password });
      const emp = { ...DEFAULT_EMPRESA, ...(data.empresa || {}) };
      localStorage.setItem('cw_token', data.token);
      localStorage.setItem('cw_user', JSON.stringify(data.user));
      localStorage.setItem('cw_empresa', JSON.stringify(emp));
      set({ user: data.user, token: data.token, empresa: emp, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await http.post('/auth/logout');
    } catch {}
    localStorage.removeItem('cw_token');
    localStorage.removeItem('cw_user');
    set({ user: null, token: null });
  },

  refreshMe: async () => {
    const token = get().token;
    if (!token) {
      try {
        const { data } = await http.get('/auth/empresa');
        const emp = { ...DEFAULT_EMPRESA, ...(data || {}) };
        localStorage.setItem('cw_empresa', JSON.stringify(emp));
        set({ empresa: emp });
      } catch {}
      return;
    }
    try {
      const { data } = await http.get('/auth/me');
      const emp = { ...DEFAULT_EMPRESA, ...(data.empresa || {}) };
      localStorage.setItem('cw_user', JSON.stringify(data.user));
      localStorage.setItem('cw_empresa', JSON.stringify(emp));
      set({ user: data.user, empresa: emp });
    } catch {
      localStorage.removeItem('cw_token');
      localStorage.removeItem('cw_user');
      set({ user: null, token: null });
    }
  },

  setEmpresa: (emp: Partial<EmpresaConfig>) => {
    const updated = { ...get().empresa, ...emp };
    localStorage.setItem('cw_empresa', JSON.stringify(updated));
    set({ empresa: updated });
  },

  setUser: (u: UserPayload, token?: string) => {
    localStorage.setItem('cw_user', JSON.stringify(u));
    if (token) {
      localStorage.setItem('cw_token', token);
      set({ user: u, token });
    } else {
      set({ user: u });
    }
  },
}));
