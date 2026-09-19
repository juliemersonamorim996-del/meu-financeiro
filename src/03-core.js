<script>
(() => {
'use strict';
/* =========================================================
   MeuFinanceiro — núcleo: utilidades, dados, cálculos
   ========================================================= */

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = v => Math.round((v || 0) * 100) / 100;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = v => BRL.format(r2(v)).replace(/ /g, ' ');
const brl0 = v => 'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');
const nf = (v, d = 1) => (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v, d = 1) => (v < 0 ? '−' : '') + nf(Math.abs(v), d) + '%';
function parseMoney(s) {
  s = String(s ?? '').replace(/[R$\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  const v = parseFloat(s);
  return isFinite(v) ? r2(v) : NaN;
}
const moneyIn = v => (v || v === 0) && !isNaN(v) ? nf(v, 2) : '';
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const clean = o => JSON.parse(JSON.stringify(o));

// ---------- datas (sempre 'AAAA-MM-DD', sem fuso) ----------
const DAY = 864e5;
const pad = n => String(n).padStart(2, '0');
const dn = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const ds = n => new Date(n * DAY).toISOString().slice(0, 10);
const todayS = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const mOf = s => s.slice(0, 7);
const mAdd = (m, k) => { let [y, mm] = m.split('-').map(Number); mm += k; y += Math.floor((mm - 1) / 12); mm = ((mm - 1) % 12 + 12) % 12 + 1; return `${y}-${pad(mm)}`; };
const mDays = m => { const [y, mm] = m.split('-').map(Number); return new Date(Date.UTC(y, mm, 0)).getUTCDate(); };
const mLast = m => m + '-' + pad(mDays(m));
const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES3 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SEM = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const SEM3 = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const wd = n => (((n + 4) % 7) + 7) % 7; // 0 = domingo
const mLabel = m => cap(MES[+m.slice(5) - 1]) + ' de ' + m.slice(0, 4);
const mShort = m => MES3[+m.slice(5) - 1];
function dayLabel(s) {
  const t = todayS();
  if (s === t) return 'Hoje';
  if (dn(s) === dn(t) - 1) return 'Ontem';
  const [y, m, d] = s.split('-').map(Number);
  return cap(SEM[wd(dn(s))]) + ', ' + d + ' de ' + MES[m - 1] + (y !== +t.slice(0, 4) ? ' de ' + y : '');
}
const shortDate = s => s.slice(8) + '/' + s.slice(5, 7);
const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

// Feriados nacionais (o CDI só rende em dia útil)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return Math.round(Date.UTC(y, mo - 1, da) / DAY);
}
const _hol = {};
function holidays(y) {
  if (_hol[y]) return _hol[y];
  const s = new Set();
  ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'].concat(y >= 2024 ? ['11-20'] : [])
    .forEach(md => s.add(dn(`${y}-${md}`)));
  const e = easter(y);
  [-48, -47, -2, 60].forEach(k => s.add(e + k)); // carnaval, sexta santa, corpus christi
  return (_hol[y] = s);
}
const isBiz = n => { const w = wd(n); return w !== 0 && w !== 6 && !holidays(+ds(n).slice(0, 4)).has(n); };

// ---------- ícones ----------
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  swap: '<path d="M4 7h15"/><path d="m16 4 3 3-3 3"/><path d="M20 17H5"/><path d="m8 14-3 3 3 3"/>',
  plan: '<rect x="4" y="4" width="16" height="17" rx="2.5"/><path d="M9 3v3M15 3v3M8 11h8M8 15h5"/>',
  bars: '<path d="M5 20v-5M10 20V9M15 20v-7M20 20V5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  report: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="m8 15 3-3 2 2 3-4"/>',
  wallet: '<path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H6a2 2 0 0 0 0 4h13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V6"/><path d="M16 13.5h.01"/>',
  gear: '',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bell: '<path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  down: '<path d="m6 9 6 6 6-6"/>', left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  dots: '<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pie: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5"/><path d="M13.5 3a7.5 7.5 0 0 1 7.5 7.5h-7.5z"/>',
  coins: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 10v4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-4"/><path d="M5 14v4c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', dn: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  food: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M17 21V3c-2 1.5-3 4-3 7v3h3"/>',
  icecream: '<path d="M7.5 11a4.5 4.5 0 1 1 9 0"/><path d="M7 11h10l-5 10z"/><path d="M10 14.5l4 0"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 8.5 4 2.5-4 2.5z"/>',
  car: '<path d="M5 11l1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L19 11"/><rect x="3" y="11" width="18" height="6" rx="2"/><path d="M6 17v2M18 17v2"/><circle cx="7.5" cy="14" r=".6" fill="currentColor"/><circle cx="16.5" cy="14" r=".6" fill="currentColor"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  game: '<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7 10.5v3.5M5.3 12.2h3.4"/><circle cx="15.5" cy="11.2" r=".8" fill="currentColor"/><circle cx="17.5" cy="13.4" r=".8" fill="currentColor"/>',
  bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12.5h18"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9S10.5 4.5 8 5.2 8 9 12 9zM12 9s1.5-4.5 4-3.8S16 9 12 9z"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16v4M17 18h4"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  save: '<path d="M12 3v11M7 9l5 5 5-5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  withdraw: '<path d="M12 14V3M7 8l5-5 5 5"/><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  repeat: '<path d="M17 2.5l3 3-3 3"/><path d="M4 11V9.5a4 4 0 0 1 4-4h12"/><path d="M7 21.5l-3-3 3-3"/><path d="M20 13v1.5a4 4 0 0 1-4 4H4"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M6 15h3"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.6-4.4L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.4l1.4-1.9"/><path d="M20 20v-4.5h-4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  cloud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.9 8a4.3 4.3 0 0 1 .1 8.5z"/>',
  file: '<path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5"/><path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="m8.5 8.5 7 7"/>',
  paw: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M8 16.5c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 1.7-1.3 2.5-2.5 2.5-.8 0-1-.5-1.5-.5s-.7.5-1.5.5C9.3 19 8 18.2 8 16.5z"/>',
  shirt: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/><path d="M3 4h2.5l2.2 11h10.6L20.5 8H7"/>',
};
(() => { // engrenagem gerada (8 dentes)
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2 - Math.PI / 16, r = i % 2 ? 7.2 : 9.4, w = Math.PI / 16 * .78;
    [a0 + Math.PI / 16 - w, a0 + Math.PI / 16 + w].forEach(a => pts.push([12 + r * Math.cos(a), 12 + r * Math.sin(a)]));
  }
  IC.gear = '<path d="M' + pts.map(p => p.map(v => v.toFixed(2)).join(' ')).join('L') + 'z"/><circle cx="12" cy="12" r="3"/>';
})();
const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || IC.dots}</svg>`;
const LOGO = (k = '') => `<svg viewBox="0 0 36 36" aria-hidden="true"><defs><linearGradient id="lg1${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5FF6C9"/><stop offset="1" stop-color="#10B07F"/></linearGradient><linearGradient id="lg2${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2BE3AA"/><stop offset="1" stop-color="#0B7F5D"/></linearGradient></defs><rect x="4" y="12" width="12" height="21" rx="6" fill="url(#lg2${k})"/><rect x="15" y="3" width="13" height="23" rx="6.5" fill="url(#lg1${k})"/></svg>`;

// ---------- catálogos ----------
const DEFAULT_CATS = [
  { id: 'comida', nome: 'Comida', icon: 'food', cor: '#3B8BFF' },
  { id: 'besteira', nome: 'Besteira', icon: 'icecream', cor: '#FF4D6D' },
  { id: 'assinaturas', nome: 'Plataformas e assinaturas', curto: 'Assinaturas', icon: 'tv', cor: '#9B6BFF' },
  { id: 'transporte', nome: 'Transporte', icon: 'car', cor: '#FF8A3D' },
  { id: 'moradia', nome: 'Moradia', icon: 'home', cor: '#F2C14E' },
  { id: 'saude', nome: 'Saúde', icon: 'heart', cor: '#34D399' },
  { id: 'lazer', nome: 'Lazer', icon: 'game', cor: '#22D3EE' },
  { id: 'outros', nome: 'Outros', icon: 'dots', cor: '#94A3B8' },
];
const DEFAULT_CATS_REC = [
  { id: 'salario', nome: 'Salário', icon: 'briefcase', cor: '#22E3A5' },
  { id: 'comissao', nome: 'Comissões', icon: 'trend', cor: '#2F9BFF' },
  { id: 'extra', nome: 'Extras e bicos', icon: 'spark', cor: '#E9B949' },
  { id: 'outrosr', nome: 'Outras entradas', icon: 'gift', cor: '#94A3B8' },
];
const CAT_ICONS = ['food', 'icecream', 'tv', 'car', 'home', 'heart', 'game', 'bag', 'cart', 'shirt', 'pill', 'paw', 'bolt', 'phone', 'book', 'gift', 'briefcase', 'trend', 'spark', 'cash', 'dots'];
const COLORS = ['#3B8BFF', '#FF4D6D', '#9B6BFF', '#FF8A3D', '#F2C14E', '#34D399', '#22D3EE', '#F472B6', '#A3E635', '#94A3B8'];
const CLASSES = [
  { id: 'rf', nome: 'Renda Fixa', cor: '#2F9BFF' }, { id: 'acoes', nome: 'Ações', cor: '#22E3A5' },
  { id: 'fii', nome: 'Fundos Imobiliários', cor: '#E9B949' }, { id: 'etf', nome: 'ETFs', cor: '#8B6CFF' },
  { id: 'cripto', nome: 'Criptomoedas', cor: '#FF8A3D' }, { id: 'outros', nome: 'Outros', cor: '#94A3B8' },
];
const ACC_TIPOS = { conta: { nome: 'Conta', icon: 'bank', cor: '#2F9BFF' }, dinheiro: { nome: 'Dinheiro vivo', icon: 'cash', cor: '#E9B949' }, invest: { nome: 'Investimento', icon: 'trend', cor: '#22E3A5' } };
const SUB_SUGEST = [['Netflix', 44.9], ['Spotify', 21.9], ['YouTube Premium', 24.9], ['Amazon Prime', 19.9], ['Disney+', 43.9], ['Max', 34.9], ['Globoplay', 22.9], ['iCloud', 5.9], ['Google One', 9.99], ['Academia', 99.9], ['Celular', 49.9], ['Internet', 99.9]];
const QUOTES = [
  'Grandes conquistas começam com boas decisões financeiras.',
  'Quem anota o pouco, controla o muito.',
  'Todo real guardado hoje trabalha por você amanhã.',
  'Gasto pequeno todo dia vira conta grande no fim do mês.',
  'Dinheiro parado no CDI também é dinheiro trabalhando.',
];
const DEF = { nome: 'Juliemerson', cdi: 13.65, cdiData: '2026-09-17', contaPadrao: '', limiteMensal: 0, rendaMensal: 0, metaGuardar: 0, budgets: {} };

// ---------- estado ----------
const S = { ready: false, mode: 'local', settings: null, accounts: {}, cards: {}, goals: {}, subs: {}, tx: {}, v: 0 };
const UI = {
  route: 'dashboard', month: mOf(todayS()), day: todayS(), q: '', ftipo: 'todos', fcat: '',
  recRange: 12, gastoMode: 'cat', invMode: 'tipo', rentP: '1A', relYear: +todayS().slice(0, 4), gCat: 'comida', gConta: '',
};
let renderQueued = false;
function changed() { S.v++; if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; window.MF.render(); }); } }
const isDemo = () => S.ready && !(S.settings && S.settings.onboarded);

// ---------- armazenamento: Claude (sincroniza) ou este navegador ----------
const LS_KEY = 'meufinanceiro:v1';
const store = {
  db: null, q: {},
  async init() {
    let db = null;
    if (window.claude && typeof window.claude.use === 'function') {
      try { db = await window.claude.use('db'); } catch (e) { db = null; }
    }
    if (db) { this.db = db; S.mode = 'db'; this.subscribe(); return; }
    S.mode = 'local';
    this.loadLocal();
    addEventListener('storage', e => { if (e.key === LS_KEY) { this.loadLocal(); changed(); } });
    S.ready = true; changed();
  },
  subscribe() {
    const db = this.db, wait = new Set(['settings', 'accounts', 'goals', 'subs', 'tx']);
    const done = k => { wait.delete(k); if (!wait.size) S.ready = true; changed(); };
    const err = e => { console.warn('[db]', e); if (e && e.code === 'revoked') toast('O acesso aos dados foi encerrado nesta tela.'); };
    db.doc('app/settings').onSnapshot(s => { S.settings = s.exists ? { ...s.data() } : null; done('settings'); }, err);
    for (const c of ['accounts', 'cards', 'goals', 'subs']) {
      db.collection(c).onSnapshot(q => { const o = {}; q.docs.forEach(d => { o[d.id] = { ...d.data(), id: d.id }; }); S[c] = o; done(c); }, err);
    }
    db.collection('tx').onSnapshot(q => { const o = {}; q.docs.forEach(d => { o[d.id] = { ...((d.data() || {}).items || {}) }; }); S.tx = o; done('tx'); }, err);
  },
  loadLocal() {
    try {
      const j = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (j) { S.settings = j.settings || null; S.accounts = j.accounts || {}; S.cards = j.cards || {}; S.goals = j.goals || {}; S.subs = j.subs || {}; S.tx = j.tx || {}; }
    } catch (e) { /* sem armazenamento */ }
  },
  saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ settings: S.settings, accounts: S.accounts, cards: S.cards, goals: S.goals, subs: S.subs, tx: S.tx })); }
    catch (e) { toast('Este navegador não deixou salvar. Exporte um backup em Configurações.'); }
  },
  run(path, fn) {
    const p = (this.q[path] || Promise.resolve()).catch(() => {}).then(fn);
    this.q[path] = p;
    return p.catch(e => {
      console.warn('[db] write', path, e);
      toast(e && e.code === 'quota_exceeded' ? 'O espaço de dados encheu. Apague lançamentos antigos.' : 'Não consegui salvar. Confira a internet e tente de novo.');
    });
  },
  saveSettings(patch) {
    S.settings = { ...(S.settings || {}), ...patch }; changed();
    if (this.db) { const body = clean(S.settings); return this.run('app/settings', () => this.db.doc('app/settings').set(body)); }
    this.saveLocal(); return Promise.resolve();
  },
  put(coll, obj) {
    S[coll] = { ...S[coll], [obj.id]: obj }; changed();
    if (this.db) { const { id, ...body } = obj; const b = clean(body); return this.run(coll + '/' + id, () => this.db.collection(coll).doc(id).set(b)); }
    this.saveLocal(); return Promise.resolve();
  },
  del(coll, id) {
    const o = { ...S[coll] }; delete o[id]; S[coll] = o; changed();
    if (this.db) return this.run(coll + '/' + id, () => this.db.collection(coll).doc(id).delete());
    this.saveLocal(); return Promise.resolve();
  },
  putTx(tx, prev) {
    if (prev && mOf(prev.data) !== mOf(tx.data)) this.delTx(prev);
    const m = mOf(tx.data), existed = !!S.tx[m];
    S.tx = { ...S.tx, [m]: { ...(S.tx[m] || {}), [tx.id]: tx } }; changed();
    if (this.db) {
      const ref = this.db.doc('tx/' + m), body = clean(tx);
      return this.run('tx/' + m, async () => {
        if (existed) {
          try { await ref.update({ items: { [tx.id]: body } }); return; }
          catch (e) { if (!e || e.code !== 'invalid_argument') throw e; }
        }
        const snap = await ref.get();
        if (snap.exists) await ref.update({ items: { [tx.id]: body } });
        else await ref.set({ items: { [tx.id]: body } });
      });
    }
    this.saveLocal(); return Promise.resolve();
  },
  delTx(tx) {
    const m = mOf(tx.data);
    S.tx = { ...S.tx, [m]: { ...(S.tx[m] || {}), [tx.id]: null } }; changed();
    if (this.db) return this.run('tx/' + m, () => this.db.doc('tx/' + m).update({ items: { [tx.id]: null } }));
    this.saveLocal(); return Promise.resolve();
  },
  async replaceAll(data) { // importar backup / apagar tudo
    if (!this.db) {
      S.settings = data.settings || null; S.accounts = data.accounts || {}; S.cards = data.cards || {}; S.goals = data.goals || {}; S.subs = data.subs || {}; S.tx = data.tx || {};
      this.saveLocal(); changed(); return;
    }
    const db = this.db;
    for (const c of ['accounts', 'cards', 'goals', 'subs']) {
      for (const id of Object.keys(S[c])) if (!(data[c] || {})[id]) await db.collection(c).doc(id).delete();
      for (const [id, o] of Object.entries(data[c] || {})) { const { id: _, ...b } = o; await db.collection(c).doc(id).set(clean(b)); }
    }
    for (const m of Object.keys(S.tx)) if (!(data.tx || {})[m]) await db.doc('tx/' + m).delete();
    for (const [m, items] of Object.entries(data.tx || {})) await db.doc('tx/' + m).set({ items: clean(items) });
    if (data.settings) await db.doc('app/settings').set(clean(data.settings)); else await db.doc('app/settings').delete();
  },
};
function snapshotData() {
  const tx = {};
  for (const [m, items] of Object.entries(S.tx)) { const o = {}; for (const [id, t] of Object.entries(items)) if (t || id.startsWith('sub_')) o[id] = t; tx[m] = o; }
  return clean({ app: 'MeuFinanceiro', versao: 2, exportado: new Date().toISOString(), settings: S.settings, accounts: S.accounts, cards: S.cards, goals: S.goals, subs: S.subs, tx });
}

// ---------- dados de exemplo (só aparecem até você começar) ----------
let _demo = null;
function demoData() {
  if (_demo && _demo.day === todayS()) return _demo;
  let seed = 20260919;
  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const between = (a, b) => r2(a + rnd() * (b - a));
  const t = todayS(), start = mAdd(mOf(t), -12) + '-01', tx = {};
  let n = 0;
  const add = o => { if (o.data > t) return; const id = 'd' + (n++); (tx[mOf(o.data)] ||= {})[id] = { id, criado: n, ...o }; };
  const cards = { nu: { id: 'nu', nome: 'Nubank', limite: 3500, fechamento: 3, vencimento: 10, conta: 'main', cor: '#9B6BFF', ativo: true } };
  const accounts = {
    main: { id: 'main', nome: 'Conta principal', tipo: 'conta', saldoInicial: 1450, dataInicial: start, cdiPct: 0 },
    mp: { id: 'mp', nome: 'Mercado Pago', tipo: 'invest', classe: 'rf', cdiPct: 105, saldoInicial: 5200, dataInicial: start },
    cash: { id: 'cash', nome: 'Dinheiro na carteira', tipo: 'dinheiro', saldoInicial: 90, dataInicial: start, cdiPct: 0 },
  };
  for (let k = 0; k <= 12; k++) {
    const m = mAdd(start.slice(0, 7), k), days = mDays(m), grow = 1 + k * 0.035;
    add({ tipo: 'receita', valor: r2(2600 * (k > 6 ? 1.08 : 1)), cat: 'salario', desc: 'Salário', data: m + '-05', conta: 'main' });
    add({ tipo: 'receita', valor: between(350, 900) * grow, cat: 'comissao', desc: 'Comissões B2B', data: m + '-20', conta: 'main' });
    if (rnd() > .5) add({ tipo: 'receita', valor: between(120, 380), cat: 'extra', desc: 'Evento extra', data: m + '-' + pad(10 + (k % 9)), conta: 'main' });
    add({ tipo: 'transf', valor: r2(Math.round(between(1050, 1500) / 50) * 50), de: 'main', para: 'mp', desc: 'Guardar no Mercado Pago', data: m + '-06' });
    add({ tipo: 'transf', valor: 100, de: 'main', para: 'cash', desc: 'Saque', data: m + '-02' });
    add({ tipo: 'despesa', valor: 99.9, cat: 'moradia', desc: 'Internet', data: m + '-10', conta: 'main' });
    [['Netflix', 44.9, 5], ['Spotify', 21.9, 12], ['YouTube Premium', 24.9, 18]].forEach(([d, v, dia]) => add({ tipo: 'despesa', valor: v, cat: 'assinaturas', desc: d, data: m + '-' + pad(dia), cartao: 'nu', sub: 's_' + d.slice(0, 3).toLowerCase() }));
    for (let d = 1; d <= days; d++) {
      const s = m + '-' + pad(d), w = wd(dn(s));
      if (rnd() < .78) add({ tipo: 'despesa', valor: between(14, 42), cat: 'comida', desc: ['Almoço', 'Marmita', 'Padaria', 'Lanche', 'Mercado'][Math.floor(rnd() * 5)], data: s, ...(rnd() < .45 ? { cartao: 'nu' } : { conta: rnd() < .9 ? 'main' : 'cash' }) });
      if (rnd() < .42) add({ tipo: 'despesa', valor: between(6, 28), cat: 'besteira', desc: ['Açaí', 'Refrigerante', 'Doce', 'Salgado', 'Sorvete', 'iFood'][Math.floor(rnd() * 6)], data: s, ...(rnd() < .5 ? { cartao: 'nu' } : { conta: 'main' }) });
      if (w === 1 || w === 4) add({ tipo: 'despesa', valor: between(25, 60), cat: 'transporte', desc: rnd() < .5 ? 'Combustível' : 'Uber', data: s, conta: 'main' });
      if (w === 6 && rnd() < .5) add({ tipo: 'despesa', valor: between(40, 120), cat: 'lazer', desc: ['Cinema', 'Barzinho', 'Passeio'][Math.floor(rnd() * 3)], data: s, cartao: 'nu' });
      if (rnd() < .03) add({ tipo: 'despesa', valor: between(30, 140), cat: 'saude', desc: 'Farmácia', data: s, conta: 'main' });
    }
  }
  // paga cada fatura já fechada no dia do vencimento
  const porCiclo = {};
  for (const items of Object.values(tx)) for (const x of Object.values(items)) {
    if (x.tipo !== 'despesa' || x.cartao !== 'nu') continue;
    const c = +x.data.slice(8) <= 3 ? mOf(x.data) : mAdd(mOf(x.data), 1);
    porCiclo[c] = (porCiclo[c] || 0) + x.valor;
  }
  const cicloAgora = +t.slice(8) <= 3 ? mOf(t) : mAdd(mOf(t), 1);
  for (const [c, v] of Object.entries(porCiclo)) {
    if (c >= cicloAgora) continue;
    const venc = c + '-10';
    add({ tipo: 'pagfatura', valor: r2(v), cartao: 'nu', conta: 'main', desc: 'Fatura Nubank', data: venc });
  }
  const settings = {
    onboarded: false, nome: (S.settings && S.settings.nome) || DEF.nome, cdi: DEF.cdi, cdiData: DEF.cdiData, contaPadrao: 'main',
    limiteMensal: 2100, rendaMensal: 3400, metaGuardar: 700,
    budgets: { comida: 750, besteira: 220, assinaturas: 100, transporte: 400, lazer: 250 },
  };
  const goals = {
    g1: { id: 'g1', nome: 'Reserva de emergência', alvo: 15000, prazo: mAdd(mOf(t), 10), modo: 'conta', conta: 'mp', icon: 'target', cor: '#22E3A5' },
    g2: { id: 'g2', nome: 'Óculos VR próprio', alvo: 3500, prazo: mAdd(mOf(t), 5), modo: 'manual', guardado: 1350, icon: 'game', cor: '#8B6CFF' },
  };
  const subs = {
    s_net: { id: 's_net', nome: 'Netflix', valor: 44.9, dia: 5, cat: 'assinaturas', conta: 'main', ativo: true, auto: true, desde: start.slice(0, 7) },
    s_spo: { id: 's_spo', nome: 'Spotify', valor: 21.9, dia: 12, cat: 'assinaturas', conta: 'main', ativo: true, auto: true, desde: start.slice(0, 7) },
    s_you: { id: 's_you', nome: 'YouTube Premium', valor: 24.9, dia: 18, cat: 'assinaturas', conta: 'main', ativo: true, auto: true, desde: start.slice(0, 7) },
    s_int: { id: 's_int', nome: 'Internet', valor: 99.9, dia: 10, cat: 'moradia', conta: 'main', ativo: true, auto: false, desde: start.slice(0, 7) },
  };
  return (_demo = { day: t, settings, accounts, cards, goals, subs, tx, v: 0 });
}

// ---------- cálculos ----------
const src = () => isDemo() ? demoData() : S;
const cfg = () => ({ ...DEF, ...(src().settings || {}) });
const cats = () => cfg().cats || DEFAULT_CATS;
const catsRec = () => cfg().catsRec || DEFAULT_CATS_REC;
const FALLBACK_CAT = { id: 'outros', nome: 'Outros', icon: 'dots', cor: '#94A3B8' };
const catOf = (id, rec) => (rec ? catsRec() : cats()).find(c => c.id === id) || (rec ? catsRec().at(-1) : cats().find(c => c.id === 'outros')) || FALLBACK_CAT;
const catName = c => c.curto || c.nome;
const accList = () => Object.values(src().accounts).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(b.nome));
const accOf = id => src().accounts[id];
const invAccs = () => accList().filter(a => a.tipo === 'invest');
const defaultAcc = () => { const c = cfg(); const l = accList().filter(a => a.tipo !== 'invest'); return (c.contaPadrao && accOf(c.contaPadrao)) ? c.contaPadrao : (l[0] || accList()[0] || {}).id || ''; };
const cdiDaily = () => Math.pow(1 + cfg().cdi / 100, 1 / 252) - 1;
const yearRate = p => Math.pow(1 + cdiDaily() * p / 100, 252) - 1;

// ---------- cartões de crédito ----------
// Gasto no cartão não sai do saldo da conta: ele ocupa limite e entra na fatura.
// A fatura fecha no dia "fechamento" e vence no dia "vencimento".
const cardList = () => Object.values(src().cards || {}).sort((a, b) => (b.ativo !== false) - (a.ativo !== false) || String(a.nome).localeCompare(String(b.nome)));
const cardOf = id => (src().cards || {})[id];
const cicloDe = (card, data) => +data.slice(8) <= (card.fechamento || 1) ? mOf(data) : mAdd(mOf(data), 1);
function vencDe(card, ciclo) { // ciclo = mês em que a fatura fecha
  const f = card.fechamento || 1, v = card.vencimento || 10, m = v > f ? ciclo : mAdd(ciclo, 1);
  return m + '-' + pad(Math.min(v, mDays(m)));
}
function cardStats(id) {
  const card = cardOf(id) || {}, t = todayS(), ciclo = cicloDe(card, t);
  let gasto = 0, pago = 0, atual = 0, proxima = 0, nAtual = 0;
  for (const x of D().txs) {
    if (x.cartao !== id) continue;
    if (x.tipo === 'despesa') {
      gasto += x.valor;
      const c = cicloDe(card, x.data);
      if (c === ciclo) { atual += x.valor; nAtual++; } else if (c > ciclo) proxima += x.valor;
    } else if (x.tipo === 'pagfatura') pago += x.valor;
  }
  const usado = Math.max(0, gasto - pago), fechada = Math.max(0, usado - atual - proxima);
  const limite = +card.limite || 0;
  return { card, limite, usado, atual, proxima, fechada, nAtual, livre: limite - usado, pct: limite ? clamp(usado / limite, 0, 1) : 0,
    ciclo, fecha: ciclo + '-' + pad(Math.min(card.fechamento || 1, mDays(ciclo))), vence: vencDe(card, ciclo), venceFechada: vencDe(card, mAdd(ciclo, -1)) };
}
const faturasAbertas = () => cardList().reduce((s, c) => s + cardStats(c.id).usado, 0);
function cardGastoMes(m) { // { total, porCartao: {id: valor}, semCartao, pagamentos }
  const out = { total: 0, porCartao: {}, semCartao: 0, pagamentos: 0 };
  for (const x of D().txs) {
    if (mOf(x.data) !== m) continue;
    if (x.tipo === 'despesa') {
      if (x.cartao) { out.total += x.valor; out.porCartao[x.cartao] = (out.porCartao[x.cartao] || 0) + x.valor; }
      else out.semCartao += x.valor;
    } else if (x.tipo === 'pagfatura') out.pagamentos += x.valor;
  }
  return out;
}
const cardGasto = m => { let s = 0; for (const x of D().txs) if (x.tipo === 'despesa' && x.cartao && mOf(x.data) === m) s += x.valor; return s; };

let _memo = { k: null };
function D() {
  const s = src(), k = (isDemo() ? 'd' : 'r') + S.v + todayS() + cfg().cdi;
  if (_memo.k === k) return _memo;
  const txs = [];
  for (const items of Object.values(s.tx)) for (const t of Object.values(items)) if (t && t.data && t.tipo) txs.push(t);
  txs.sort((a, b) => a.data < b.data ? 1 : a.data > b.data ? -1 : (b.criado || 0) - (a.criado || 0));
  const byM = {};
  const M = m => byM[m] || (byM[m] = { desp: 0, rec: 0, cats: {}, catsRec: {}, days: {}, n: 0 });
  for (const t of txs) {
    const o = M(mOf(t.data));
    if (t.tipo === 'despesa') { o.desp += t.valor; o.cats[t.cat] = (o.cats[t.cat] || 0) + t.valor; o.days[t.data] = (o.days[t.data] || 0) + t.valor; o.n++; }
    else if (t.tipo === 'receita') { o.rec += t.valor; o.catsRec[t.cat] = (o.catsRec[t.cat] || 0) + t.valor; }
  }
  _memo = { k, txs, byM, M: m => byM[m] || { desp: 0, rec: 0, cats: {}, catsRec: {}, days: {}, n: 0 }, led: simulate(s, txs) };
  return _memo;
}

// Simula o saldo de cada conta dia a dia. Contas com % do CDI rendem em dia útil.
// O saldo inicial vale no começo da data inicial; lançamentos anteriores não mexem no saldo.
// "Ajuste" define o saldo real naquele dia (a diferença, em investimento, conta como rendimento).
function simulate(s, txs) {
  const accs = Object.values(s.accounts), t = dn(todayS());
  if (!accs.length) return { start: t, n: 1, t, acc: {}, inv: { bal: [0], yld: [0], flow: [0] }, all: [0] };
  const start = Math.min(t, ...accs.map(a => dn(a.dataInicial || todayS())));
  const n = t - start + 1, dr = cdiDaily(), mv = {};
  accs.forEach(a => { mv[a.id] = new Map(); });
  const push = (acc, d, m) => { if (!mv[acc]) return; const i = dn(d) - start; if (i < 0 || i >= n) return; const l = mv[acc].get(i); l ? l.push(m) : mv[acc].set(i, [m]); };
  for (const x of txs) {
    if (x.tipo === 'despesa') { if (!x.cartao) push(x.conta, x.data, { k: 'f', v: -x.valor }); }
    else if (x.tipo === 'pagfatura') push(x.conta, x.data, { k: 'f', v: -x.valor });
    else if (x.tipo === 'receita') push(x.conta, x.data, { k: 'f', v: +x.valor });
    else if (x.tipo === 'transf') { push(x.de, x.data, { k: 'f', v: -x.valor }); push(x.para, x.data, { k: 'f', v: +x.valor }); }
    else if (x.tipo === 'ajuste') push(x.conta, x.data, { k: 'a', v: +x.saldo });
  }
  const inv = { bal: new Float64Array(n), yld: new Float64Array(n), flow: new Float64Array(n) }, all = new Float64Array(n), acc = {};
  for (const a of accs) {
    const s0 = Math.max(0, dn(a.dataInicial || todayS()) - start), bal = new Float64Array(n), yld = new Float64Array(n);
    const f = (a.cdiPct || 0) > 0 ? dr * a.cdiPct / 100 : 0, isInv = a.tipo === 'invest';
    let b = 0;
    for (let i = s0; i < n; i++) {
      if (i === s0) { b = +a.saldoInicial || 0; if (isInv) inv.flow[i] += b; }
      else if (f && b > 0 && isBiz(start + i)) { const y = b * f; b += y; yld[i] += y; }
      const list = mv[a.id].get(i);
      if (list) {
        list.sort((p, q) => (p.k === 'a') - (q.k === 'a'));
        for (const m of list) {
          if (m.k === 'f') { b += m.v; if (isInv) inv.flow[i] += m.v; }
          else { const d = m.v - b; b = m.v; if (isInv) yld[i] += d; }
        }
      }
      bal[i] = b;
    }
    acc[a.id] = { bal, yld, s0 };
    for (let i = 0; i < n; i++) { all[i] += bal[i]; if (isInv) { inv.bal[i] += bal[i]; inv.yld[i] += yld[i]; } }
  }
  return { start, n, t, acc, inv, all };
}
const li = (L, s) => { const i = dn(s) - L.start; return i < 0 ? -1 : Math.min(i, L.n - 1); };
const endOf = m => { const t = todayS(), e = mLast(m); return e < t ? e : t; };
function balAt(accId, s) { const L = D().led, i = li(L, s), a = L.acc[accId]; return i < 0 || !a ? 0 : a.bal[i]; }
function invAt(s) { const L = D().led, i = li(L, s); return i < 0 ? 0 : L.inv.bal[i]; }
function allAt(s) { const L = D().led, i = li(L, s); return i < 0 ? 0 : L.all[i]; }
function sumYield(accId, from, to) { // inclusivo
  const L = D().led, a = accId ? L.acc[accId] : null, arr = accId ? (a ? a.yld : null) : L.inv.yld;
  if (!arr) return 0;
  let i0 = dn(from) - L.start, i1 = dn(to) - L.start, s = 0;
  i0 = Math.max(0, i0); i1 = Math.min(L.n - 1, i1);
  for (let i = i0; i <= i1; i++) s += arr[i];
  return s;
}
// Rentabilidade ponderada no tempo da carteira de investimentos (fromS exclusivo, toS inclusivo)
function twrCurve(fromS, toS) {
  const L = D().led, out = [];
  let p = 1, i0 = Math.max(1, dn(fromS) - L.start + 1), i1 = Math.min(L.n - 1, dn(toS) - L.start);
  for (let i = i0; i <= i1; i++) { const b = L.inv.bal[i - 1]; if (b > 1) p *= 1 + L.inv.yld[i] / b; out.push({ d: ds(L.start + i), v: p - 1 }); }
  return out;
}
const twr = (a, b) => { const c = twrCurve(a, b); return c.length ? c.at(-1).v : 0; };

// Orçamento do dia: o que sobra do limite do mês dividido pelos dias que faltam
function dailyBudget(day = todayS()) {
  const c = cfg(); if (!c.limiteMensal) return null;
  const m = mOf(day), mm = D().M(m); let before = 0;
  for (const [d, v] of Object.entries(mm.days)) if (d < day) before += v;
  const left = mDays(m) - +day.slice(8) + 1, per = Math.max(0, (c.limiteMensal - before) / left), spent = mm.days[day] || 0;
  return { per, spent, rest: per - spent, restMonth: c.limiteMensal - mm.desp };
}

// Assinaturas e contas fixas que venceram no mês e ainda não foram lançadas
function pendingSubs(m = mOf(todayS())) {
  const t = todayS(), out = [], s = src();
  for (const sub of Object.values(s.subs)) {
    if (!sub.ativo || (sub.desde && sub.desde > m) || (sub.pulados || []).includes(m)) continue;
    const dia = Math.min(sub.dia || 1, mDays(m)), date = m + '-' + pad(dia);
    if (date > t) continue;
    const id = 'sub_' + sub.id + '_' + m;
    if ((s.tx[m] || {}).hasOwnProperty(id)) continue;
    if (isDemo()) continue;
    out.push({ sub, id, date });
  }
  return out;
}
function upcomingSubs(days = 5) {
  const t = todayS(), tn = dn(t), out = [];
  for (const sub of Object.values(src().subs)) {
    if (!sub.ativo) continue;
    for (const m of [mOf(t), mAdd(mOf(t), 1)]) {
      const date = m + '-' + pad(Math.min(sub.dia || 1, mDays(m))), k = dn(date) - tn;
      if (k >= 0 && k <= days) out.push({ sub, date, k });
    }
  }
  return out.sort((a, b) => a.k - b.k);
}
function goalProgress(g) {
  const v = g.modo === 'conta' && g.conta ? balAt(g.conta, todayS()) : (+g.guardado || 0);
  const falta = Math.max(0, (g.alvo || 0) - v), meses = g.prazo ? Math.max(1, monthsBetween(mOf(todayS()), g.prazo)) : 0;
  return { v, p: g.alvo ? clamp(v / g.alvo, 0, 1) : 0, falta, meses, porMes: meses ? falta / meses : 0 };
}

// ---------- tema: claro, escuro ou o do aparelho ----------
const THEME_KEY = 'mf:theme';
const THEMES = [['auto', 'Automático', 'contrast'], ['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon']];
let themeNow = 'auto';
function storedTheme() { try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; } }
function isDarkNow() {
  const r = document.documentElement;
  if (themeNow !== 'auto') return themeNow === 'dark';
  const host = r.getAttribute('data-theme');
  if (host) return host === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(t, save) {
  themeNow = ['light', 'dark'].includes(t) ? t : 'auto';
  const r = document.documentElement;
  if (themeNow === 'auto') r.removeAttribute('data-mf-theme'); else r.setAttribute('data-mf-theme', themeNow);
  if (save) { try { localStorage.setItem(THEME_KEY, themeNow); } catch (e) { /* sem armazenamento */ } }
  const meta = document.getElementById('mf-theme-color');
  if (meta) meta.setAttribute('content', isDarkNow() ? '#0A0B0E' : '#ECEEF3');
  requestAnimationFrame(() => window.MF.drawCharts && window.MF.drawCharts());
}

let toast = () => {};
window.MF = {
  $, $$, esc, uid, clamp, r2, brl, brl0, nf, pct, parseMoney, moneyIn, cap, clean,
  dn, ds, todayS, mOf, mAdd, mDays, mLast, MES, MES3, SEM, SEM3, wd, mLabel, mShort, dayLabel, shortDate, monthsBetween, isBiz, pad,
  IC, ic, LOGO, DEFAULT_CATS, DEFAULT_CATS_REC, CAT_ICONS, COLORS, CLASSES, ACC_TIPOS, SUB_SUGEST, QUOTES, DEF,
  S, UI, changed, isDemo, store, snapshotData, src, cfg, cats, catsRec, catOf, catName, accList, accOf, invAccs, defaultAcc,
  cardList, cardOf, cicloDe, vencDe, cardStats, faturasAbertas, cardGasto, cardGastoMes,
  cdiDaily, yearRate, D, balAt, invAt, allAt, sumYield, twrCurve, twr, endOf, dailyBudget, pendingSubs, upcomingSubs, goalProgress,
  THEMES, applyTheme, storedTheme, isDarkNow, themeNow: () => themeNow,
  setToast(fn) { toast = fn; },
};
})();
</script>
