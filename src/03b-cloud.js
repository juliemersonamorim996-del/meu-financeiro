<script>
(() => {
'use strict';
/* =========================================================
   Sincronização na nuvem (Supabase) — opcional.
   Só liga quando você põe o link do projeto + a chave e faz login.
   Sem isso, o app continua salvando só neste aparelho.
   ========================================================= */
const MF = window.MF;
const { S, store, mOf, changed } = MF;

const CFG_KEY = 'mf:sb', FILA_KEY = 'mf:fila';
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const TABELA = 'mf_itens';

const ls = {
  get(k, f) { try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch (e) { return f; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { } },
};

let sb = null, uid = null, email = '', estado = 'off', erro = '', canal = null;
const fila = () => ls.get(FILA_KEY, []);
const cfg = () => ls.get(CFG_KEY, null);

function setEstado(e, msg = '') { estado = e; erro = msg; changed(); }
const status = () => ({ estado, email, erro, pendentes: fila().length, configurado: !!cfg() });

function carregarLib() {
  if (window.supabase) return Promise.resolve(window.supabase);
  return new Promise((ok, falhou) => {
    const s = document.createElement('script');
    s.src = LIB; s.onload = () => ok(window.supabase); s.onerror = () => falhou(new Error('lib'));
    document.head.appendChild(s);
  });
}

// ---------- estado do app <-> linhas da tabela ----------
function linhas() { // tudo que está no app, pronto para subir
  const out = [];
  if (S.settings) out.push(['settings', 'main', S.settings]);
  for (const c of ['accounts', 'cards', 'goals', 'subs']) for (const [id, o] of Object.entries(S[c] || {})) out.push([c, id, o]);
  for (const [m, items] of Object.entries(S.tx || {})) for (const [id, t] of Object.entries(items)) if (t) out.push(['tx', m + ':' + id, t]);
  return out;
}
function aplicar(colecao, item_id, dados, apagado) {
  if (colecao === 'settings') { S.settings = apagado ? null : dados; return; }
  if (colecao === 'tx') {
    const [m, id] = item_id.split(':');
    if (!m || !id) return;
    S.tx = { ...S.tx, [m]: { ...(S.tx[m] || {}), [id]: apagado ? null : dados } };
    return;
  }
  if (!['accounts', 'cards', 'goals', 'subs'].includes(colecao)) return;
  const o = { ...S[colecao] };
  if (apagado) delete o[item_id]; else o[item_id] = { ...dados, id: item_id };
  S[colecao] = o;
}

// ---------- envio ----------
function enfileirar(colecao, item_id, dados) {
  const f = fila().filter(x => !(x[0] === colecao && x[1] === item_id));
  f.push([colecao, item_id, dados]);
  ls.set(FILA_KEY, f.slice(-800));
  changed();
}
async function enviar(itens) {
  if (!sb || !uid || !itens.length) return false;
  const agora = new Date().toISOString();
  const linhas = itens.map(([colecao, item_id, dados]) => ({ user_id: uid, colecao, item_id, dados: dados || null, apagado: !dados, atualizado: agora }));
  for (let i = 0; i < linhas.length; i += 200) {
    const { error } = await sb.from(TABELA).upsert(linhas.slice(i, i + 200), { onConflict: 'user_id,colecao,item_id' });
    if (error) throw error;
  }
  return true;
}
async function flush() {
  const f = fila();
  if (!f.length || !sb || !uid) return;
  try { await enviar(f); ls.set(FILA_KEY, []); setEstado('on'); }
  catch (e) { setEstado('offline', e.message || 'sem conexão'); }
}
MF.cloudPush = (colecao, item_id, dados) => {
  if (!cfg()) return;           // nuvem nem configurada: só local
  enfileirar(colecao, item_id, dados);
  if (sb && uid) flush();
};

// ---------- entrada ----------
async function puxarTudo() {
  const { data, error } = await sb.from(TABELA).select('colecao,item_id,dados,apagado').eq('user_id', uid);
  if (error) throw error;
  const remoto = new Set();
  for (const r of data) { aplicar(r.colecao, r.item_id, r.dados, r.apagado); remoto.add(r.colecao + '|' + r.item_id); }
  // o que só existe aqui sobe (nada se perde ao ligar a nuvem)
  const subir = linhas().filter(([c, id]) => !remoto.has(c + '|' + id));
  store.saveLocal(); changed();
  if (subir.length) { try { await enviar(subir); } catch (e) { subir.forEach(x => enfileirar(...x)); } }
}
function ouvir() {
  if (canal) { try { sb.removeChannel(canal); } catch (e) { } }
  canal = sb.channel('mf-' + uid)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABELA, filter: 'user_id=eq.' + uid }, p => {
      const r = p.new && p.new.item_id ? p.new : p.old;
      if (!r) return;
      aplicar(r.colecao, r.item_id, r.dados, r.apagado || p.eventType === 'DELETE');
      store.saveLocal(); changed();
    })
    .subscribe();
}
async function sessao(s) {
  if (!s) { uid = null; email = ''; setEstado(cfg() ? 'config' : 'off'); return; }
  uid = s.user.id; email = s.user.email || '';
  setEstado('conectando');
  try { await puxarTudo(); ouvir(); await flush(); setEstado('on'); }
  catch (e) { setEstado('offline', e.message || 'sem conexão'); }
}

async function iniciar() {
  const c = cfg();
  if (!c || !c.url || !c.key) { setEstado('off'); return; }
  if (S.mode === 'db') { setEstado('off'); return; }  // dentro do Claude a sincronização já é do Claude
  setEstado('conectando');
  try {
    const lib = await carregarLib();
    sb = lib.createClient(c.url, c.key, { auth: { persistSession: true, autoRefreshToken: true } });
    sb.auth.onAuthStateChange((_, s) => sessao(s));
    const { data } = await sb.auth.getSession();
    await sessao(data && data.session);
  } catch (e) { setEstado('erro', 'Não consegui conectar. Confira o link e a chave do projeto.'); }
}

// ---------- ações usadas pela tela de Configurações ----------
MF.cloud = {
  status, cfg,
  async salvarCfg(url, key) {
    url = String(url || '').trim().replace(/\/+$/, ''); key = String(key || '').trim();
    if (!/^https:\/\/.+\.supabase\.co$/.test(url)) throw new Error('O link do projeto é parecido com https://abcdefg.supabase.co');
    if (key.length < 30) throw new Error('A chave anon public é bem longa — confira se copiou inteira.');
    ls.set(CFG_KEY, { url, key }); sb = null; uid = null;
    await iniciar();
  },
  removerCfg() { ls.del(CFG_KEY); ls.del(FILA_KEY); if (canal) { try { sb.removeChannel(canal); } catch (e) { } } sb = null; uid = null; email = ''; setEstado('off'); },
  async entrar(mail, senha) {
    if (!sb) await iniciar();
    if (!sb) throw new Error('Configure o link e a chave primeiro.');
    const { error } = await sb.auth.signInWithPassword({ email: mail, password: senha });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha não conferem.' : error.message);
  },
  async criar(mail, senha) {
    if (!sb) await iniciar();
    if (!sb) throw new Error('Configure o link e a chave primeiro.');
    const { data, error } = await sb.auth.signUp({ email: mail, password: senha });
    if (error) throw new Error(error.message);
    return !(data && data.session); // true = precisa confirmar o e-mail
  },
  async sair() { if (sb) await sb.auth.signOut(); uid = null; email = ''; setEstado('config'); },
  async subirTudo() {
    if (!sb || !uid) throw new Error('Entre com seu login primeiro.');
    await enviar(linhas()); await flush(); setEstado('on');
  },
  iniciar,
};

addEventListener('online', flush);
setInterval(() => { if (fila().length && sb && uid) flush(); }, 30000);
setTimeout(iniciar, 600);
})();
</script>
