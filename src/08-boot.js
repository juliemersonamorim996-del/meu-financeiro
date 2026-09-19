<script>
(() => {
'use strict';
/* =========================================================
   Ações, exportação, Claude, rotas e início
   ========================================================= */
const MF = window.MF;
const { $, $$, esc, uid, brl, nf, ic, todayS, mOf, mAdd, dn, ds, pad, MES, S, UI, isDemo, cfg, cats, catsRec, catOf, accOf, store,
  parseMoney, toast, D, NAV } = MF;
const ACT = MF.ACT;

// ---------- gasto rápido (tela Gasto diário) ----------
MF.quickAdd = () => {
  if (MF.guard()) return;
  const vEl = $('#g-valor'), v = parseMoney(vEl.value);
  if (!(v > 0)) { toast('Digite quanto foi.'); vEl.focus(); return; }
  const pay = MF.payParse($('#g-conta').value);
  const t = { id: uid('t'), tipo: 'despesa', valor: v, cat: UI.gCat, desc: $('#g-desc').value.trim(), data: $('#g-data').value || todayS(), ...pay, criado: Date.now() };
  store.putTx(t);
  vEl.value = ''; $('#g-desc').value = '';
  UI.day = t.data; vEl.focus({ preventScroll: true });
  if (MF.gHint) setTimeout(MF.gHint, 60);
  const k = pay.cartao && MF.cardOf(pay.cartao);
  toast(k ? `${brl(v)} no ${k.nome} · sobra ${brl(MF.cardStats(pay.cartao).livre)} de limite` : `${brl(v)} em ${MF.catName(catOf(t.cat))}`, () => store.delTx(t));
};

// ---------- lançar assinaturas vencidas (uma vez por sessão/dia) ----------
let launchedFor = '';
MF.autoLaunch = () => {
  if (!S.ready || isDemo()) return;
  const key = todayS() + ':' + Object.keys(S.subs).length;
  if (launchedFor === key) return; launchedFor = key;
  const names = [];
  for (const p of MF.pendingSubs()) if (p.sub.auto) {
    store.putTx({ id: p.id, tipo: 'despesa', valor: p.sub.valor, cat: p.sub.cat, desc: p.sub.nome, data: p.date, conta: p.sub.conta || MF.defaultAcc(), sub: p.sub.id, criado: Date.now() });
    names.push(p.sub.nome);
  }
  if (names.length) toast(names.length === 1 ? `${names[0]} lançada automaticamente` : `${names.length} contas fixas lançadas: ${names.join(', ')}`);
};

// ---------- exportar / importar ----------
let downloads = null;
async function saveFile(filename, data, type) {
  if (downloads) {
    try { await downloads.save({ filename, data }); return; }
    catch (e) { if (e && e.code === 'declined') return; if (!['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(e && e.code)) { toast('Não consegui gerar o arquivo.'); return; } }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = filename;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csv() {
  const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"', n = v => nf(v, 2).replace(/\./g, '');
  const rows = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Conta', 'Destino'].map(q).join(';')];
  for (const t of D().txs) {
    const tipo = { despesa: 'Gasto', receita: 'Receita', transf: 'Transferência', ajuste: 'Ajuste de saldo' }[t.tipo];
    const cat = t.tipo === 'despesa' || t.tipo === 'receita' ? catOf(t.cat, t.tipo === 'receita').nome : '';
    const val = t.tipo === 'despesa' ? -t.valor : t.tipo === 'ajuste' ? t.saldo : t.valor;
    rows.push([t.data.split('-').reverse().join('/'), tipo, cat, t.desc || '', n(val), (accOf(t.conta || t.de) || {}).nome || '', (accOf(t.para) || {}).nome || ''].map(q).join(';'));
  }
  return '﻿' + rows.join('\r\n');
}
MF.importFile = file => {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    let j; try { j = JSON.parse(r.result); } catch (e) { toast('Esse arquivo não é um backup válido.'); return; }
    if (!j || j.app !== 'MeuFinanceiro') { toast('Esse arquivo não é um backup do MeuFinanceiro.'); return; }
    const n = Object.values(j.tx || {}).reduce((s, m) => s + Object.values(m).filter(Boolean).length, 0);
    MF.confirmBox('Importar backup?', `O backup tem ${n} lançamentos e ${Object.keys(j.accounts || {}).length} contas. <b>Tudo que está no app agora será substituído.</b>`, 'Substituir e importar', async () => {
      toast('Importando…'); await store.replaceAll(j); MF.rebuild(); toast('Backup importado');
    });
  };
  r.readAsText(file);
  const inp = $('#c-import'); if (inp) inp.value = '';
};

// ---------- Claude: dicas a partir do resumo ----------
let sample = null, aiCtl = null;
MF.aiSetup = () => { const card = $('#ai-card'); if (card) card.hidden = !sample || isDemo(); };
async function aiAsk() {
  const out = $('#ai-out'), btn = $('#ai-btn'); if (!sample || !out) return;
  if (aiCtl) { aiCtl.abort(); return; }
  const months = [0, 1, 2].map(k => mAdd(mOf(todayS()), -k)).reverse();
  const lines = months.map(m => { const mm = D().M(m); return `${MES[+m.slice(5) - 1]}/${m.slice(0, 4)}: entradas ${brl(mm.rec)}, gastos ${brl(mm.desp)} — ` + Object.entries(mm.cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${catOf(c).nome} ${brl(v)}`).join(', '); });
  const c = cfg(), subs = Object.values(S.subs).filter(s => s.ativo).map(s => `${s.nome} ${brl(s.valor)}`).join(', ');
  const cartoes = MF.cardList().map(k => { const st = MF.cardStats(k.id); return `${k.nome}: em aberto ${brl(st.usado)} de ${brl(st.limite)} de limite, fatura atual ${brl(st.atual)}`; }).join('; ');
  const prompt = `Você é um consultor de finanças pessoais brasileiro, direto e gentil. Analise o resumo abaixo de ${c.nome} e escreva em português do Brasil, em até 170 palavras, 4 dicas práticas e específicas (com valores em R$) de onde dá para economizar e como guardar mais. Use lista com "• ". Sem introdução longa. Ele guarda dinheiro no Mercado Pago rendendo ${nf((MF.invAccs()[0] || {}).cdiPct || 105, 0)}% do CDI (CDI ${nf(c.cdi, 2)}% a.a.).\n\nÚltimos meses:\n${lines.join('\n')}\n\nLimite de gastos do mês: ${c.limiteMensal ? brl(c.limiteMensal) : 'não definido'}. Meta de guardar por mês: ${c.metaGuardar ? brl(c.metaGuardar) : 'não definida'}.\nAssinaturas ativas: ${subs || 'nenhuma'}.\nCartões de crédito: ${cartoes || 'nenhum'} (gasto no cartão neste mês: ${brl(MF.cardGasto(mOf(todayS())))}).\nTotal investido hoje: ${brl(MF.invAt(todayS()))}.`;
  aiCtl = new AbortController(); btn.textContent = 'Parar'; out.textContent = 'Pensando…';
  try { await sample(prompt, { signal: aiCtl.signal, onText: ({ text }) => { out.textContent = text; } }); }
  catch (e) {
    out.textContent = e.text || '';
    const msg = { not_granted: 'Sem permissão para usar o Claude aqui.', sampling_disabled: 'O Claude não está disponível nesta conta.', rate_limited: 'Muitos pedidos agora — tente daqui a pouco.', session_expired: 'Entre de novo na sua conta do Claude.' }[e.code];
    if (e.code !== 'cancelled') toast(msg || 'Não deu para gerar a análise agora. Tente de novo.');
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) { sample = null; MF.aiSetup(); }
  } finally { aiCtl = null; btn.textContent = 'Pedir dicas'; }
}

// ---------- mapa de ações (data-act) ----------
const txById = el => (S.tx[el.dataset.m] || {})[el.dataset.id] || (MF.src().tx[el.dataset.m] || {})[el.dataset.id];
Object.assign(ACT, {
  'nav': el => MF.go(el.dataset.to),
  'add-gasto': () => { if (UI.route === 'gastos' && $('#g-valor')) { $('#g-valor').focus(); $('#g-valor').scrollIntoView({ block: 'center', behavior: 'smooth' }); } else MF.txForm('despesa'); },
  'add-receita': () => MF.txForm('receita'),
  'transfer': el => MF.transferForm({ de: el.dataset.from }),
  'onboard': () => MF.onboarding(),
  'month-pop': el => MF.monthPop(el),
  'set-month': el => { UI.month = el.dataset.m; MF.render(); },
  'notifs': el => MF.notifPop(el),
  'theme-pop': el => MF.menu(el, MF.THEMES.map(([k, l, i]) => ({ label: l, icon: i, on: MF.themeNow() === k, fn: () => setTheme(k) }))),
  'set-theme': el => setTheme(el.dataset.t),
  'user-pop': el => MF.menu(el, [
    { label: 'Configurações', icon: 'gear', fn: () => MF.go('config') },
    { label: 'Planejamento', icon: 'plan', fn: () => MF.go('planejamento') },
    { label: 'Exportar backup', icon: 'save', fn: () => ACT['export-json']() },
  ]),
  'rec-range': el => MF.menu(el, [6, 12, 24].map(n => ({ label: `Últimos ${n} meses`, on: UI.recRange === n, fn: () => { UI.recRange = n; MF.render(); } }))),
  'gasto-mode': el => MF.menu(el, [['cat', 'Por categoria'], ['dia', 'Por dia']].map(([k, l]) => ({ label: l, on: UI.gastoMode === k, fn: () => { UI.gastoMode = k; MF.render(); } }))),
  'inv-mode': el => MF.menu(el, [['tipo', 'Por tipo de ativo'], ['app', 'Por aplicação']].map(([k, l]) => ({ label: l, on: UI.invMode === k, fn: () => { UI.invMode = k; MF.render(); } }))),
  'rent-p': el => { UI.rentP = el.dataset.p; MF.render(); },
  'kpi-menu': el => {
    const k = el.dataset.k, inv = MF.invAccs()[0];
    const items = {
      gastos: [{ label: 'Adicionar gasto', icon: 'plus', fn: () => MF.txForm('despesa') }, { label: 'Ver gasto diário', icon: 'receipt', fn: () => MF.go('gastos') }],
      receitas: [{ label: 'Adicionar receita', icon: 'plus', fn: () => MF.txForm('receita') }, { label: 'Ver transações', icon: 'swap', fn: () => MF.go('transacoes') }],
      invest: [inv ? { label: 'Guardar no ' + inv.nome, icon: 'save', fn: () => ACT['inv-save']({ dataset: { id: inv.id } }) } : { label: 'Adicionar investimento', icon: 'plus', fn: () => MF.accForm(null, 'invest') }, { label: 'Ver investimentos', icon: 'bars', fn: () => MF.go('investimentos') }],
      patrimonio: [{ label: 'Ver carteira', icon: 'wallet', fn: () => MF.go('carteira') }, { label: 'Transferir entre contas', icon: 'swap', fn: () => MF.transferForm() }],
    }[k];
    MF.menu(el, items);
  },
  'g-cat': el => { UI.gCat = el.dataset.id; MF.render(); },
  'day-shift': el => { const n = dn(UI.day) + +el.dataset.k; if (n <= dn(todayS())) { UI.day = ds(n); const d = $('#g-data'); if (d) d.value = UI.day; MF.render(); } },
  'day-today': () => { UI.day = todayS(); const d = $('#g-data'); if (d) d.value = UI.day; MF.render(); },
  'set-day': el => { UI.day = el.dataset.d; const d = $('#g-data'); if (d) d.value = UI.day; MF.render(); },
  'tx-edit': el => { const t = txById(el); if (!t) return; if (t.tipo === 'transf') MF.transferForm({ tx: t }); else if (t.tipo === 'ajuste') MF.adjustForm(null, t); else MF.txForm(t.tipo, t); },
  'tx-del': el => { const t = txById(el); if (t) MF.delTx(t); },
  'ftipo': el => { UI.ftipo = el.dataset.k; UI.fcat = ''; MF.render(); },
  'clear-q': () => { UI.q = ''; $('#q').value = ''; MF.render(); },
  'export-csv': () => saveFile(`meufinanceiro-${todayS()}.csv`, csv(), 'text/csv'),
  'export-json': () => saveFile(`meufinanceiro-backup-${todayS()}.json`, JSON.stringify(MF.snapshotData(), null, 1), 'application/json'),
  'wipe': () => { if (MF.guard()) return; MF.modal(`<div class="modal-h"><h2>Apagar todos os dados?</h2><button class="icon-btn" data-close aria-label="Fechar">${ic('x')}</button></div>
    <p class="sub" style="font-size:14.5px;margin:0 0 14px">Some tudo — lançamentos, contas, metas e configurações — em todos os aparelhos. Exporte um backup antes se quiser guardar. Para confirmar, digite <b style="color:var(--text)">APAGAR</b>.</p>
    <input class="in" id="wp" autocomplete="off"><div class="modal-f"><button class="btn" data-close>Cancelar</button><button class="btn btn-danger" id="wp-y">${ic('trash')}Apagar tudo</button></div>`, m => {
      $('#wp-y', m).onclick = async () => { if ($('#wp', m).value.trim().toUpperCase() !== 'APAGAR') { toast('Digite APAGAR para confirmar.'); return; } MF.closeModal(); await store.replaceAll({}); MF.go('dashboard'); MF.rebuild(); toast('Dados apagados'); }; }); },
  'p-sugerir': () => { const s = MF._sug && MF._sug(); if (s) $('#p-limite').value = MF.moneyIn(Math.floor(s)); },
  'p-save-budgets': () => { if (MF.guard()) return; const b = {}; $$('[data-budget]').forEach(i => { const v = parseMoney(i.value); if (v > 0) b[i.dataset.budget] = v; }); store.saveSettings({ budgets: b }); toast('Limites salvos'); MF.rebuild(); },
  'sub-new': () => MF.subForm(),
  'sub-edit': el => MF.subForm(MF.src().subs[el.dataset.id]),
  'sub-del': el => { if (MF.guard()) return; const s = S.subs[el.dataset.id]; if (s) MF.confirmBox('Apagar ' + s.nome + '?', 'Os meses já lançados continuam no histórico.', 'Apagar', () => store.del('subs', s.id)); },
  'sub-launch': el => { const p = MF.pendingSubs().find(x => x.sub.id === el.dataset.id); if (p) MF.launchSub(p); },
  'card-new': () => MF.cardForm(),
  'card-edit': el => MF.cardForm(MF.cardOf(el.dataset.id)),
  'card-pay': el => MF.payFatura(el.dataset.id),
  'acc-new': el => MF.accForm(null, el.dataset.tipo),
  'acc-edit': el => MF.accForm(MF.src().accounts[el.dataset.id]),
  'acc-adjust': el => MF.adjustForm(MF.src().accounts[el.dataset.id]),
  'inv-save': el => { const a = accOf(el.dataset.id); MF.transferForm({ para: a.id, de: MF.defaultAcc() === a.id ? undefined : MF.defaultAcc(), title: 'Guardar no ' + a.nome }); },
  'inv-take': el => { const a = accOf(el.dataset.id); MF.transferForm({ de: a.id, para: MF.defaultAcc() === a.id ? undefined : MF.defaultAcc(), title: 'Resgatar do ' + a.nome }); },
  'cdi-edit': () => MF.cdiForm(),
  'goal-new': () => MF.goalForm(),
  'goal-edit': el => MF.goalForm(MF.src().goals[el.dataset.id]),
  'goal-add': el => MF.goalAdd(MF.src().goals[el.dataset.id]),
  'cat-new': el => MF.catForm(null, !!el.dataset.rec),
  'cat-edit': el => MF.catForm((el.dataset.rec ? catsRec() : cats()).find(c => c.id === el.dataset.id), !!el.dataset.rec),
  'cat-del': el => MF.catDel(el.dataset.id, !!el.dataset.rec),
  'rel-year': el => { UI.relYear += +el.dataset.k; MF.render(); },
  'ai-ask': () => aiAsk(),
});

function setTheme(t) {
  MF.applyTheme(t, true);
  if (!isDemo()) store.saveSettings({ tema: t });
  MF.render();
}

// ---------- eventos globais ----------
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const f = ACT[el.dataset.act]; if (!f) return;
  e.preventDefault(); f(el, e);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { MF.closePop(); MF.closeModal(); } });
let qT;
$('#q').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { UI.q = e.target.value; if (UI.q && UI.route !== 'transacoes') MF.go('transacoes'); else MF.render(); }, 180); });
let rT;
new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(MF.drawCharts, 120); }).observe($('#main'));
document.addEventListener('visibilitychange', () => { if (!document.hidden) { MF.autoLaunch(); MF.render(); } });

function route() {
  const r = (location.hash.match(/^#\/([\w-]+)/) || [])[1];
  UI.route = NAV.some(n => n[0] === r) ? r : 'dashboard';
  MF.closePop(); MF.closeModal(); MF.rebuild();
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

// ---------- início ----------
MF.applyTheme(MF.storedTheme(), false);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => MF.applyTheme(MF.themeNow(), false));
MF.render();
route();
(async () => {
  store.init();
  if (window.claude && typeof window.claude.use === 'function') {
    window.claude.use('downloads').then(d => { downloads = d; }).catch(() => {});
    window.claude.use('sample').then(s => { sample = s; MF.aiSetup(); }).catch(() => {});
  }
  const wait = setInterval(() => { if (S.ready) { clearInterval(wait); MF.autoLaunch(); } }, 400);
})();
})();
</script>
