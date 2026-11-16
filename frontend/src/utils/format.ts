import { useAuthStore } from '../store/auth.store';

export function num(n: any, dec?: number): string {
  const emp = useAuthStore.getState().empresa;
  const val = Number(n ?? 0);
  if (isNaN(val)) return '0.00';
  const decimals = dec !== undefined ? dec : Number(emp.decimales ?? 2);
  const sepDec = emp.sep_decimal || '.';
  const sepMiles = emp.sep_miles || ',';

  const fixed = Math.abs(val).toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sepMiles);
  const formatted = parts.join(sepDec);
  return val < 0 ? `-${formatted}` : formatted;
}

export function money(n: any): string {
  const emp = useAuthStore.getState().empresa;
  const v = num(n);
  const sim = emp.moneda_simbolo || 'S/';
  return emp.simbolo_posicion === 'despues' ? `${v} ${sim}` : `${sim} ${v}`;
}

export function fdate(d?: string | Date | null, withTime = false): string {
  if (!d) return '-';
  let dateObj: Date;
  if (typeof d === 'string') {

    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      dateObj = new Date(y, m - 1, day);
    } else {
      dateObj = new Date(d);
    }
  } else {
    dateObj = d;
  }
  if (isNaN(dateObj.getTime())) return String(d);

  const emp = useAuthStore.getState().empresa;
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();

  let res = `${dd}/${mm}/${yyyy}`;
  if (emp.formato_fecha === 'Y-m-d') res = `${yyyy}-${mm}-${dd}`;
  else if (emp.formato_fecha === 'm/d/Y') res = `${mm}/${dd}/${yyyy}`;

  if (withTime) {
    const hh = String(dateObj.getHours()).padStart(2, '0');
    const min = String(dateObj.getMinutes()).padStart(2, '0');
    res += ` ${hh}:${min}`;
  }
  return res;
}

export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function firstOfMonthYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function whatsappLink(tel?: string | null, msg = '', prefijoPais = '51'): string {
  const digits = String(tel || '').replace(/\D+/g, '');
  if (!digits) return '';
  const phone = digits.length <= 9 ? `${prefijoPais}${digits}` : digits;
  return `https://wa.me/${phone}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

export function exportToCsv(filename: string, cols: string[], rows: Array<Array<any>>) {
  const escapeCell = (v: any) => {
    const s = v === null || v === undefined ? '' : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const header = cols.map(escapeCell).join(';');
  const body = rows.map((r) => r.map(escapeCell).join(';')).join('\n');
  const csvContent = `\uFEFF${header}\n${body}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let b = Math.max(0, Number(bytes || 0));
  let i = 0;
  while (b >= 1024 && i < 3) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(1)} ${units[i]}`;
}

export function estadoBadgeClass(e?: string | null): string {
  const map: Record<string, string> = {
    pendiente: 'warning',
    en_proceso: 'info',
    terminado: 'primary',
    entregado: 'success',
    cancelado: 'danger',
    programada: 'warning',
    confirmada: 'info',
    atendida: 'success',
    cancelada: 'danger',
    abierta: 'success',
    cerrada: 'secondary',
    borrador: 'secondary',
    enviada: 'info',
    aceptada: 'primary',
    rechazada: 'danger',
    convertida: 'success',
    presente: 'success',
    tardanza: 'warning',
    falta: 'danger',
    justificado: 'info',
    descanso: 'secondary',
  };
  const c = map[(e || '').toLowerCase()] || 'secondary';
  return `badge badge-soft-${c}`;
}

export function estadoLabel(e?: string | null): string {
  if (!e) return '-';
  const s = e.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
