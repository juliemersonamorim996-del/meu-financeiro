<script>
(() => {
'use strict';
/* =========================================================
   Estrutura, navegação, Dashboard, Gasto diário, Transações
   ========================================================= */
const MF = window.MF;
const { $, $$, esc, brl, brl0, nf, pct, ic, todayS, mOf, mAdd, mDays, mLabel, mShort, dayLabel, dn, ds, pad, wd, SEM3, MES,
  S, UI, isDemo, cfg, cats, catsRec, catOf, catName, accList, accOf, invAccs, D, balAt, invAt, allAt, endOf, dailyBudget,
  twrCurve, CLASSES, ACC_TIPOS, QUOTES, LOGO, clamp, shortDate } = MF;
const C = () => MF.charts;

const NAV = [
  ['dashboard', 'Dashboard', 'home'], ['gastos', 'Gasto diário', 'receipt', 'Gastos'], ['transacoes', 'Transações', 'swap'],
  ['planejamento', 'Planejamento', 'plan'], ['investimentos', 'Investimentos', 'bars'], ['metas', 'Metas', 'target'],
  ['relatorios', 'Relatórios', 'report'], ['carteira', 'Carteira', 'wallet'], ['config', 'Configurações', 'gear'],
];
const PAGES = {};
MF.PAGES = PAGES; MF.NAV = NAV; MF.ACT = MF.ACT || {};
const ACT = MF.ACT;

// ---------- pedaços reutilizáveis ----------
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia!' : h < 18 ? 'Boa tarde!' : 'Boa noite!'; };
const firstName = () => String(cfg().nome || 'você').trim().split(/\s+/)[0];
const initials = () => firstName().charAt(0).toUpperCase() || 'J';
const monthBtn = () => `${ic('cal')}<span>${mLabel(UI.month)}</span>${ic('down')}`;
MF.monthBtn = monthBtn;
function demoBanner() {
  if (!isDemo()) return '';
  return `<div class="demo">${ic('info')}<div class="sp"><b>Estes são dados de exemplo.</b> Veja como o app fica cheio — quando quiser, comece com os seus números.</div><button class="btn btn-p btn-sm" data-act="onboard">Começar com meus dados ${ic('arrow')}</button></div>`;
}
MF.demoBanner = demoBanner;
function empty(title, text, btn) { return `<div class="empty"><b>${esc(title)}</b>${esc(text)}${btn ? `<div style="margin-top:14px">${btn}</div>` : ''}</div>`; }
MF.empty = empty;
function delta(cur, prev, invert, label = 'em relação ao mês anterior') {
  if (!prev) return `<div class="delta"><b class="neutral">—</b><span>sem base no mês anterior</span></div>`;
  const d = (cur - prev) / Math.abs(prev) * 100, upGood = !invert, good = d === 0 ? true : (d > 0) === upGood;
  return `<div class="delta"><b class="${good ? 'up' : 'bad'}">${ic(d >= 0 ? 'up' : 'dn')}${nf(Math.abs(d), 0)}%</b><span>${label}</span></div>`;
}
function txView(t) {
  if (t.tipo === 'pagfatura') { const k = MF.cardOf(t.cartao), a = accOf(t.conta); return { icon: 'card', cor: (k && k.cor) || 'var(--indigo)', title: 'Fatura ' + (k ? k.nome : 'do cartão'), sub: (a ? a.nome + ' · ' : '') + 'pagamento de fatura', val: brl(t.valor), cls: '' }; }
  if (t.tipo === 'despesa' || t.tipo === 'receita') {
    const c = catOf(t.cat, t.tipo === 'receita'), k = t.cartao && MF.cardOf(t.cartao), a = accOf(t.conta);
    const onde = k ? k.nome + ' (cartão)' : a ? a.nome : '';
    return { icon: c.icon, cor: c.cor, title: t.desc || c.nome, sub: [t.desc ? catName(c) : '', onde, t.sub ? 'recorrente' : ''].filter(Boolean).join(' · '), val: (t.tipo === 'despesa' ? '−' : '+') + brl(t.valor), cls: t.tipo === 'despesa' ? 'neg' : 'pos' };
  }
  if (t.tipo === 'transf') { const a = accOf(t.de), b = accOf(t.para); return { icon: 'swap', cor: '#2F9BFF', title: t.desc || 'Transferência', sub: `${a ? a.nome : '?'} → ${b ? b.nome : '?'}`, val: brl(t.valor), cls: '' }; }
  const a = accOf(t.conta); return { icon: 'sync', cor: '#E9B949', title: 'Ajuste de saldo', sub: (a ? a.nome : '') + ' · saldo conferido', val: '= ' + brl(t.saldo), cls: '' };
}
function txRow(t, showDate) {
  const v = txView(t);
  return `<div class="li" style="--c:${v.cor}"><div class="cic">${ic(v.icon)}</div><div class="t"><b>${esc(v.title)}</b><small>${showDate ? shortDate(t.data) + ' · ' : ''}${esc(v.sub)}</small></div><div class="val num ${v.cls}">${v.val}</div>
  <div class="acts"><button data-act="tx-edit" data-id="${esc(t.id)}" data-m="${mOf(t.data)}" aria-label="Editar">${ic('edit')}</button><button data-act="tx-del" data-id="${esc(t.id)}" data-m="${mOf(t.data)}" aria-label="Apagar">${ic('trash')}</button></div></div>`;
}
MF.txRow = txRow; MF.txView = txView;

// ---------- moldura: menu, topo ----------
function renderChrome() {
  const nav = NAV.map(([id, label, icon]) => `<a href="#/${id}" class="${UI.route === id ? 'on' : ''}" ${UI.route === id ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span></a>`).join('');
  const navB = NAV.map(([id, label, icon, short]) => `<a href="#/${id}" class="${UI.route === id ? 'on' : ''}">${ic(icon)}<span>${short || label}</span></a>`).join('');
  if ($('#nav-side').dataset.k !== UI.route) {
    $('#nav-side').innerHTML = nav; $('#nav-side').dataset.k = UI.route;
    $('#nav-bottom').innerHTML = navB; $('#nav-bottom').dataset.k = UI.route;
    const on = $('#nav-bottom a.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  if (!$('#logo-side').innerHTML) {
    const logo = k => `${LOGO(k)}<div><b>MeuFinanceiro</b><small>Mais controle para o seu futuro</small></div>`;
    $('#logo-side').innerHTML = logo('s'); $('#logo-top').innerHTML = logo('t');
    $('#btn-add').innerHTML = `${ic('plus')}Novo gasto`; $('#fab').innerHTML = ic('plus');
  }
  $('#tb-month').innerHTML = `${ic('cal')}<span>${MF.mShort(UI.month)} ${UI.month.slice(2, 4)}</span>`;
  $('#tb-month').hidden = !['dashboard', 'transacoes', 'relatorios'].includes(UI.route);
  const tm = MF.themeNow(), tIcon = tm === 'dark' ? 'moon' : tm === 'light' ? 'sun' : 'contrast';
  $('#btn-theme').innerHTML = ic(tIcon);
  if (S.ready && cfg().tema && cfg().tema !== tm) MF.applyTheme(cfg().tema, true);
  const n = S.ready ? MF.notifications().length : 0;
  $('#btn-bell').innerHTML = ic('bell') + (n ? '<span class="dot"></span>' : '');
  $('#user-btn').innerHTML = `<span class="avatar">${esc(initials())}</span><span class="who"><b>Olá, ${esc(firstName())}</b><small>${greet()}</small></span>${ic('down')}`;
  // cartão lateral: meta principal
  const g = Object.values(MF.src().goals)[0];
  let prog = 0, sub = 'Crie uma meta e acompanhe aqui.';
  if (g) { const p = MF.goalProgress(g); prog = p.p; sub = `${esc(g.nome)}: ${nf(p.p * 100, 0)}%`; }
  $('#side-card').innerHTML = `<div class="bars"><i style="height:9px"></i><i style="height:15px"></i><i style="height:22px"></i></div><p>Disciplina hoje,<br>liberdade amanhã.</p><small>${sub}</small><div class="prog"><i style="width:${prog * 100}%"></i></div>`;
}

let shellFor = null;
function render() {
  renderChrome();
  const main = $('#main');
  if (!S.ready) { if (shellFor !== 'loading') { main.innerHTML = `<div class="loading"><div class="spin"></div><div>Carregando suas finanças…</div></div>`; shellFor = 'loading'; } return; }
  const P = PAGES[UI.route] || PAGES.dashboard, key = UI.route + (isDemo() ? ':demo' : '');
  if (shellFor !== key) { main.innerHTML = P.shell(); shellFor = key; P.mount && P.mount(main); }
  $$('[data-r]', main).forEach(el => { const f = P.r && P.r[el.dataset.r]; if (f) { const h = f(el); if (h !== undefined && el._h !== h) { el.innerHTML = h; el._h = h; } } });
  drawCharts();
}
function drawCharts() {
  const P = PAGES[UI.route]; if (!P || !P.ch) return;
  $$('[data-ch]', $('#main')).forEach(el => { const f = P.ch[el.dataset.ch]; if (f && el.offsetParent !== null) f(el); });
}
MF.render = render; MF.drawCharts = drawCharts; MF.rebuild = () => { shellFor = null; render(); };

function go(route) { if (location.hash !== '#/' + route) location.hash = '#/' + route; else { UI.route = route; MF.rebuild(); } }
MF.go = go;

// ============================================================
// DASHBOARD
// ============================================================
function kpis() {
  const m = UI.month, prev = mAdd(m, -1), d = D(), cur = d.M(m), pm = d.M(prev), t = todayS();
  let pDesp = pm.desp, pRec = pm.rec;
  if (m === mOf(t)) { // compara com o mesmo pedaço do mês passado
    const day = +t.slice(8); pDesp = 0; pRec = 0;
    for (const x of d.txs) if (mOf(x.data) === prev && +x.data.slice(8) <= day) { if (x.tipo === 'despesa') pDesp += x.valor; else if (x.tipo === 'receita') pRec += x.valor; }
  }
  const e = endOf(m), pe = MF.mLast(prev), inv = invAt(e), pinv = invAt(pe), all = allAt(e), pall = allAt(pe);
  const card = (cls, icon, title, v, dl, menu) => `<article class="kpi ${cls}"><div class="ico">${ic(icon)}</div><h3>${title}</h3><button class="icon-btn more" data-act="kpi-menu" data-k="${menu}" aria-label="Opções de ${title}">${ic('dots')}</button><div class="v num">${brl(v)}</div>${dl}</article>`;
  return card('k-green', 'wallet', 'Gastos', cur.desp, delta(cur.desp, pDesp, true), 'gastos')
    + card('k-blue', 'trend', 'Receitas Mensais', cur.rec, delta(cur.rec, pRec), 'receitas')
    + card('k-indigo', 'pie', 'Investimentos', inv, delta(inv, pinv), 'invest')
    + card('k-gold', 'coins', 'Patrimônio em Dinheiro', all, delta(all, pall), 'patrimonio');
}
function gastoItems(m, max = 7) {
  const cs = D().M(m).cats, list = Object.entries(cs).filter(([, v]) => v > 0).map(([id, v]) => { const c = catOf(id); return { id: c.id, label: catName(c), icon: c.icon, color: c.cor, value: v }; });
  const merged = {}; list.forEach(i => { merged[i.id] ? merged[i.id].value += i.value : merged[i.id] = i; });
  const arr = Object.values(merged).sort((a, b) => b.value - a.value);
  if (arr.length > max) { const rest = arr.splice(max - 1); arr.push({ id: '_rest', label: 'Outros', icon: 'dots', color: '#94A3B8', value: rest.reduce((s, i) => s + i.value, 0) }); }
  return arr;
}
MF.gastoItems = gastoItems;
function invItems(mode, when) {
  const accs = invAccs();
  if (mode === 'app') return accs.map((a, i) => ({ label: a.nome, color: a.cor || CLASSES[i % CLASSES.length].cor, value: Math.max(0, balAt(a.id, when)) })).filter(i => i.value > 0);
  return CLASSES.map(c => ({ label: c.nome, color: c.cor, value: accs.filter(a => (a.classe || 'rf') === c.id).reduce((s, a) => s + Math.max(0, balAt(a.id, when)), 0) })).filter(i => i.value > 0);
}
MF.invItems = invItems;
const PERIODS = { '1M': [1, 'no último mês'], '3M': [3, 'nos últimos 3 meses'], '6M': [6, 'nos últimos 6 meses'], '1A': [12, 'no último ano'], '5A': [60, 'nos últimos 5 anos'], 'Todo': [0, 'desde o início'] };
function periodFrom(p) {
  const t = todayS(), [k] = PERIODS[p];
  if (!k) return ds(D().led.start);
  const m = mAdd(mOf(t), -k), day = Math.min(+t.slice(8), mDays(m));
  return m + '-' + pad(day);
}

PAGES.dashboard = {
  shell: () => `<div data-r="demo"></div>
  <section class="hero"><div class="grow"><h1 data-r="hello"></h1><p>Aqui está um resumo da sua vida financeira.</p></div>
    <div class="quote">“${esc(QUOTES[new Date().getDate() % QUOTES.length])}”</div>
    <button class="pill hero-month" data-act="month-pop" data-r="monthbtn"></button></section>
  <div class="grid kpis" data-r="kpis"></div>
  <div class="grid row2">
    <section class="card"><div class="card-h">${ic('trend')}<h2>Receitas Mensais</h2><span class="sp"></span><button class="pill sm" data-act="rec-range" data-r="recrange"></button></div><div class="chart" data-ch="rec"></div></section>
    <section class="card"><div class="card-h">${ic('wallet')}<h2>Gastos</h2><span class="sp"></span><button class="pill sm" data-act="gasto-mode" data-r="gmode"></button></div><div data-r="gchart"></div></section>
  </div>
  <div data-r="cardsrow"></div>
  <div class="grid row3">
    <section class="card" data-r="inv"></section>
    <section class="card" data-r="rent"></section>
    <section class="card c-pat" data-r="pat"></section>
  </div>`,
  r: {
    demo: demoBanner,
    hello: () => `Olá, ${esc(firstName())}!`,
    monthbtn: monthBtn,
    kpis,
    recrange: () => `${UI.recRange === 12 ? 'Últimos 12 meses' : UI.recRange === 6 ? 'Últimos 6 meses' : 'Últimos 24 meses'}${ic('down')}`,
    gmode: () => `${UI.gastoMode === 'cat' ? 'Por categoria' : 'Por dia'}${ic('down')}`,
    gchart: () => {
      if (!D().M(UI.month).desp) return empty('Nenhum gasto em ' + mLabel(UI.month).toLowerCase(), 'Toque em “Novo gasto” para anotar o primeiro.', `<button class="btn btn-p btn-sm" data-act="add-gasto">${ic('plus')}Novo gasto</button>`);
      return `<div class="chart" data-ch="${UI.gastoMode === 'cat' ? 'gcat' : 'gday'}"></div>`;
    },
    cardsrow: () => MF.cardList().length ? `<section class="card" style="margin-bottom:18px"><div class="card-h">${ic('card')}<h2>Gasto com cartões</h2><span class="sp"></span><span class="sub">${brl(MF.cardGasto(UI.month))} em ${mLabel(UI.month).toLowerCase()}</span><button class="pill sm" data-act="card-new">${ic('plus')}Cartão</button></div>${cardTiles(false)}</section>` : '',
    inv: () => {
      const e = endOf(UI.month), items = invItems(UI.invMode, e), tot = items.reduce((s, i) => s + i.value, 0);
      const head = `<div class="card-h">${ic('pie')}<h2>Investimentos</h2><span class="sp"></span><button class="pill sm" data-act="inv-mode">${UI.invMode === 'app' ? 'Por aplicação' : 'Por tipo de ativo'}${ic('down')}</button></div>`;
      if (!tot) return head + empty('Nada investido ainda', 'Cadastre onde você guarda dinheiro, como o Mercado Pago rendendo 105% do CDI.', `<button class="btn btn-sm" data-act="acc-new" data-tipo="invest">${ic('plus')}Adicionar investimento</button>`);
      return head + `<div class="donut-wrap">${C().donut(items, 186, 30, `<b class="num">${brl(tot)}</b><small>Total investido</small>`)}
      <div class="legend">${items.map(i => `<div><i style="background:${i.color}"></i><span>${esc(i.label)}</span><em class="num">${nf(i.value / tot * 100, 0)}%</em><s class="num">${brl(i.value)}</s></div>`).join('')}</div></div>`;
    },
    rent: () => {
      const t = todayS(), from = periodFrom(UI.rentP), r = MF.twr(from, t), mr = MF.twr(ds(dn(mOf(t) + '-01') - 1), t);
      const head = `<div class="card-h">${ic('trend')}<h2>Rentabilidade dos Investimentos</h2></div>`;
      if (!invAccs().length) return head + empty('Sem investimentos', 'Quando você cadastrar, o rendimento aparece aqui.');
      return head + `<div class="rent-top"><div><div class="rent-big num">${r >= 0 ? '+ ' : '− '}${nf(Math.abs(r * 100), 1)}%</div><div class="sub" style="font-size:15px;color:var(--text-2)">${PERIODS[UI.rentP][1]}</div></div>
      <div class="rent-badge"><b class="num">${mr >= 0 ? '+ ' : '− '}${nf(Math.abs(mr * 100), 2)}%</b><small>este mês</small></div></div>
      <div class="chart" data-ch="rent" style="margin-top:8px"></div>
      <div class="periods">${Object.keys(PERIODS).map(p => `<button class="${UI.rentP === p ? 'on' : ''}" data-act="rent-p" data-p="${p}">${p}</button>`).join('')}</div>`;
    },
    pat: () => {
      const e = endOf(UI.month), accs = accList(), tot = allAt(e), fat = MF.faturasAbertas();
      const rows = accs.slice(0, 4).map(a => `<div>${ic(ACC_TIPOS[a.tipo]?.icon || 'wallet')}<span>${esc(a.nome)}</span><b class="num">${brl(balAt(a.id, e))}</b></div>`).join('');
      return `<div class="card-h">${ic('coins')}<h2>Patrimônio em Dinheiro</h2></div>
      <div class="pat-grid"><div><div class="pat-v num">${brl(tot)}</div><div class="sub" style="font-size:14px">Total disponível${e < todayS() ? ' em ' + shortDate(e) : ''}</div></div>
      ${accs.length ? `<div class="pat-list">${rows}${accs.length > 4 ? `<div><span class="sub">+ ${accs.length - 4} conta(s)</span></div>` : ''}${fat ? `<div>${ic('card')}<span>Faturas em aberto</span><b class="num neg">−${brl(fat)}</b></div>` : ''}</div>` : '<div class="pat-list"><div><span class="sub">Nenhuma conta cadastrada</span></div></div>'}
      <button class="btn btn-p btn-block" data-act="nav" data-to="carteira">Ver detalhes ${ic('arrow')}</button></div>`;
    },
  },
  ch: {
    rec: el => {
      const n = UI.recRange, ms = Array.from({ length: n }, (_, i) => mAdd(UI.month, i - n + 1));
      if (!ms.some(m => D().M(m).rec)) { el.innerHTML = empty('Nenhuma entrada anotada ainda', 'Anote seu salário e comissões para ver a evolução aqui.', `<button class="btn btn-sm" data-act="add-receita">${ic('plus')}Adicionar receita</button>`); return; }
      C().line(el, { id: 'rc', labels: ms.map(mShort), full: ms.map(mLabel), values: ms.map(m => D().M(m).rec), aria: 'Receitas por mês' });
    },
    gcat: el => C().bars(el, { id: 'gc', items: gastoItems(UI.month), aria: 'Gastos por categoria', onClick: () => go('gastos') }),
    gday: el => {
      const m = UI.month, n = mDays(m), days = D().M(m).days, t = todayS(), cur = m === mOf(t);
      C().days(el, { values: Array.from({ length: n }, (_, i) => days[m + '-' + pad(i + 1)] || 0), limit: cfg().limiteMensal ? cfg().limiteMensal / n : 0, hi: cur ? +t.slice(8) - 1 : -1, last: cur ? +t.slice(8) - 1 : n, aria: 'Gastos por dia',
        onClick: i => { UI.day = m + '-' + pad(i + 1); go('gastos'); } });
    },
    rent: el => C().spark(el, { id: 'rt', points: twrCurve(periodFrom(UI.rentP), todayS()), aria: 'Rentabilidade acumulada' }),
  },
};

// ============================================================
// GASTO DIÁRIO
// ============================================================
PAGES.gastos = {
  shell: () => {
    return `<div data-r="demo"></div>
    <section class="hero"><div class="grow"><h1>Gasto diário</h1><p>Anote na hora. O app divide o seu limite do mês pelos dias que faltam.</p></div>
      <div class="daynav" data-r="daynav"></div></section>
    <div class="stats" data-r="stats"></div>
    <div class="cols">
      <div class="stack">
        <section class="card"><div class="card-h">${ic('plus')}<h2>Anotar gasto</h2></div>
          <form class="form" id="g-form" autocomplete="off">
            <label class="field"><span>Quanto foi?</span><div class="money big"><input class="in num" id="g-valor" inputmode="decimal" placeholder="0,00" required aria-label="Valor"></div></label>
            <div class="field"><span>Categoria</span><div class="chips" data-r="gchips"></div></div>
            <label class="field"><span>Descrição (opcional)</span><input class="in" id="g-desc" list="g-sug" placeholder="Ex.: almoço, açaí, Netflix…" maxlength="80"><datalist id="g-sug" data-r="gsug"></datalist></label>
            <div class="two">
              <label class="field"><span>Dia</span><input class="in" type="date" id="g-data" value="${UI.day}" max="${mAdd(mOf(todayS()), 12)}-28"></label>
              <label class="field"><span>Pagou com</span><select class="in" id="g-conta">${MF.payOptions(UI.gConta || 'acc:' + MF.defaultAcc())}</select></label>
            </div>
            <div class="pay-hint" id="g-hint" data-r="hint" hidden></div>
            <button class="btn btn-p" type="submit" style="height:50px;font-size:15px">${ic('check')}Adicionar gasto</button>
          </form></section>
        <section class="card"><div class="card-h" data-r="dayhead"></div><div data-r="daylist"></div></section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-h">${ic('bars')}<h2>Últimos 7 dias</h2></div><div data-r="week"></div></section>
        <section class="card"><div class="card-h" data-r="cathead"></div><div data-r="catmonth"></div></section>
      </div>
    </div>`;
  },
  mount: main => {
    $('#g-form', main).addEventListener('submit', e => { e.preventDefault(); MF.quickAdd(); });
    $('#g-data', main).addEventListener('change', e => { if (e.target.value) { UI.day = e.target.value; MF.render(); } });
    $('#g-conta', main).addEventListener('change', e => { UI.gConta = e.target.value; });
    MF.gHint = MF.wirePayHint($('#g-conta', main), $('#g-valor', main), $('#g-hint', main));
    if (matchMedia('(min-width: 861px)').matches) setTimeout(() => { const v = $('#g-valor'); v && v.focus({ preventScroll: true }); }, 50);
  },
  r: {
    demo: demoBanner,
    hint: () => { if (MF.gHint) MF.gHint(); },
    daynav: () => `<button class="icon-btn" data-act="day-shift" data-k="-1" aria-label="Dia anterior">${ic('left')}</button><b>${dayLabel(UI.day)}${UI.day !== todayS() ? `<small class="sub" style="display:block;font-weight:500">${shortDate(UI.day)}/${UI.day.slice(0, 4)}</small>` : ''}</b><button class="icon-btn" data-act="day-shift" data-k="1" aria-label="Próximo dia" ${UI.day >= todayS() ? 'disabled style="opacity:.3"' : ''}>${ic('right')}</button>${UI.day !== todayS() ? `<button class="btn btn-sm" data-act="day-today">Hoje</button>` : ''}`,
    stats: () => {
      const day = UI.day, m = mOf(day), mm = D().M(m), spent = mm.days[day] || 0, n = D().txs.filter(t => t.tipo === 'despesa' && t.data === day).length, c = cfg();
      const b = dailyBudget(day), cr = cfg().criado, passed = Math.max(1, Math.min(mDays(m), m === mOf(todayS()) ? +todayS().slice(8) : mDays(m)) - (cr && mOf(cr) === m ? +cr.slice(8) - 1 : 0));
      const lim = c.limiteMensal, pm = lim ? clamp(mm.desp / lim, 0, 1) : 0;
      return `<div class="stat"><small>Gasto ${day === todayS() ? 'hoje' : 'no dia'}</small><b class="num">${brl(spent)}</b><em>${n} ${n === 1 ? 'lançamento' : 'lançamentos'}</em></div>
      ${b ? `<div class="stat"><small>${b.rest >= 0 ? 'Ainda pode gastar ' + (day === todayS() ? 'hoje' : 'neste dia') : 'Passou do limite do dia'}</small><b class="num ${b.rest >= 0 ? 'pos' : 'neg'}">${brl(Math.abs(b.rest))}</b><div class="prog" style="--c:${b.rest >= 0 ? 'var(--green)' : 'var(--red)'}"><i style="width:${b.per ? clamp(b.spent / b.per, 0, 1) * 100 : 100}%"></i></div><em>limite do dia: ${brl(b.per)}</em></div>`
        : `<div class="stat"><small>Limite por dia</small><b style="font-size:16px;margin-top:8px"><button class="link" data-act="nav" data-to="planejamento">Defina seu limite do mês →</button></b><em>para o app calcular quanto pode gastar por dia</em></div>`}
      <div class="stat"><small>No mês (${MES[+m.slice(5) - 1]})</small><b class="num">${brl(mm.desp)}</b>${lim ? `<div class="prog" style="--c:${pm >= 1 ? 'var(--red)' : pm > .8 ? 'var(--gold)' : 'var(--green)'}"><i style="width:${pm * 100}%"></i></div><em>${brl(Math.max(0, lim - mm.desp))} livres de ${brl(lim)}</em>` : '<em>sem limite definido</em>'}</div>
      <div class="stat"><small>Média por dia</small><b class="num">${brl(mm.desp / Math.max(1, passed))}</b><em>em ${passed} ${passed === 1 ? 'dia' : 'dias'} de ${MES[+m.slice(5) - 1]}</em></div>`;
    },
    gchips: () => cats().map(c => `<button type="button" class="chip ${UI.gCat === c.id ? 'on' : ''}" style="--c:${c.cor}" data-act="g-cat" data-id="${esc(c.id)}"><span class="cdot">${ic(c.icon)}</span>${esc(c.nome)}</button>`).join('') + `<button type="button" class="chip" style="--c:var(--muted)" data-act="nav" data-to="config" title="Editar categorias"><span class="cdot">${ic('edit')}</span>Editar</button>`,
    gsug: () => { const seen = new Set(); for (const t of D().txs) { if (t.tipo === 'despesa' && t.desc && t.cat === UI.gCat) seen.add(t.desc); if (seen.size > 14) break; } return [...seen].map(s => `<option value="${esc(s)}"></option>`).join(''); },
    dayhead: () => { const tot = D().M(mOf(UI.day)).days[UI.day] || 0; return `${ic('receipt')}<h2>${UI.day === todayS() ? 'Gastos de hoje' : 'Gastos de ' + dayLabel(UI.day).toLowerCase()}</h2><span class="sp"></span><b class="num neg">${tot ? '−' + brl(tot) : ''}</b>`; },
    daylist: () => {
      const list = D().txs.filter(t => t.tipo === 'despesa' && t.data === UI.day);
      return list.length ? `<div class="list">${list.map(t => txRow(t)).join('')}</div>` : empty('Nada anotado neste dia', 'Os gastos que você adicionar aparecem aqui.');
    },
    week: () => {
      const end = dn(UI.day) < dn(todayS()) - 3 ? dn(UI.day) + 3 : dn(todayS()), arr = [];
      for (let k = 6; k >= 0; k--) { const s = ds(end - k); arr.push({ s, v: D().M(mOf(s)).days[s] || 0 }); }
      const max = Math.max(...arr.map(a => a.v), 1), lim = cfg().limiteMensal ? cfg().limiteMensal / mDays(mOf(UI.day)) : 0;
      return `<div class="week">${arr.map(a => `<button data-act="set-day" data-d="${a.s}" class="${a.s === UI.day ? 'on' : ''} ${lim && a.v > lim ? 'over' : ''}" title="${dayLabel(a.s)}: ${brl(a.v)}"><em class="num">${a.v ? brl0(a.v) : '–'}</em><i style="height:${Math.max(3, a.v / max * 92)}px"></i><small>${SEM3[wd(dn(a.s))]} ${+a.s.slice(8)}</small></button>`).join('')}</div>
      ${lim ? `<p class="sub" style="margin:12px 0 0">Barras vermelhas passaram da média do limite (${brl(lim)}/dia).</p>` : ''}`;
    },
    cathead: () => `${ic('pie')}<h2>Por categoria em ${MES[+UI.day.slice(5, 7) - 1]}</h2>`,
    catmonth: () => catRows(mOf(UI.day), false),
  },
};
// Bloco de cartões usado no Dashboard e na Carteira
function cardTiles(full) {
  const list = MF.cardList();
  if (!list.length) return empty('Nenhum cartão de crédito cadastrado', 'Adicione o Nubank, Itaú ou qualquer outro para acompanhar limite e fatura.', `<button class="btn btn-p btn-sm" data-act="card-new">${ic('plus')}Adicionar cartão</button>`);
  return `<div class="cards-grid">${list.map(c => {
    const st = MF.cardStats(c.id), col = st.pct >= .9 ? 'var(--red)' : st.pct > .7 ? 'var(--gold)' : (c.cor || 'var(--indigo)');
    return `<div class="ctile ${c.ativo === false ? 'off' : ''}" style="--c:${c.cor || 'var(--indigo)'}">
      <div class="ct-h"><div class="cic">${ic('card')}</div><b>${esc(c.nome)}</b>${c.ativo === false ? '<span class="tag">pausado</span>' : st.fechada > 0 ? `<span class="tag y">vence ${shortDate(st.venceFechada)}</span>` : `<span class="tag">fecha ${shortDate(st.fecha)}</span>`}</div>
      <div class="ct-v num">${brl(st.usado)}<small>em aberto no cartão</small></div>
      <div class="prog" style="--c:${col}"><i style="width:${st.pct * 100}%"></i></div>
      <div class="ct-f"><span><b>${brl(st.livre)}</b> de limite livre</span><span>total ${brl(st.limite)}</span></div>
      <div class="ct-f"><span>fatura atual (fecha ${shortDate(st.fecha)})</span><b class="num">${brl(st.atual)}</b></div>
      ${st.fechada > 0 ? `<div class="ct-f"><span>fatura fechada a pagar</span><b class="num neg">${brl(st.fechada)}</b></div>` : ''}
      ${full ? `<div class="acc-acts"><button class="btn btn-sm btn-p" data-act="card-pay" data-id="${esc(c.id)}">${ic('check')}Pagar fatura</button><button class="btn btn-sm" data-act="card-edit" data-id="${esc(c.id)}">${ic('edit')}Editar</button></div>` : ''}</div>`;
  }).join('')}</div>`;
}
MF.cardTiles = cardTiles;

function catRows(m, editable) {
  const mm = D().M(m), b = cfg().budgets || {};
  const list = cats().map(c => ({ c, v: mm.cats[c.id] || 0, lim: +b[c.id] || 0 })).filter(x => editable || x.v || x.lim).sort((a, z) => z.v - a.v);
  if (!list.length) return empty('Sem gastos neste mês', 'Assim que você anotar, a divisão aparece aqui.');
  return list.map(({ c, v, lim }) => {
    const p = lim ? v / lim : 0, col = !lim ? c.cor : p >= 1 ? 'var(--red)' : p > .8 ? 'var(--gold)' : c.cor;
    return `<div class="cat-row" style="--c:${c.cor}"><div class="cic">${ic(c.icon)}</div><div class="t"><div><span>${esc(c.nome)}</span><em class="num">${brl(v)}${lim ? ' de ' + brl0(lim) : ''}</em></div><div class="prog" style="--c:${col}"><i style="width:${lim ? clamp(p, 0, 1) * 100 : (mm.desp ? v / mm.desp * 100 : 0)}%"></i></div></div>
    ${editable ? `<div class="money"><input class="in num" data-budget="${esc(c.id)}" inputmode="decimal" placeholder="sem limite" value="${lim ? MF.moneyIn(lim) : ''}" aria-label="Limite para ${esc(c.nome)}"></div>` : `<span class="tag ${!lim ? '' : p >= 1 ? 'r' : p > .8 ? 'y' : 'g'}">${lim ? nf(p * 100, 0) + '%' : nf(mm.desp ? v / mm.desp * 100 : 0, 0) + '% do mês'}</span>`}</div>`;
  }).join('');
}
MF.catRows = catRows;

// ============================================================
// TRANSAÇÕES
// ============================================================
function filtered() {
  const q = UI.q.trim().toLowerCase();
  return D().txs.filter(t => {
    if (!q && mOf(t.data) !== UI.month) return false;
    if (UI.ftipo !== 'todos' && t.tipo !== UI.ftipo && !(UI.ftipo === 'transf' && t.tipo === 'ajuste')) return false;
    if (UI.fcat && t.cat !== UI.fcat) return false;
    if (q) { const v = txView(t); return (v.title + ' ' + v.sub + ' ' + (t.desc || '') + ' ' + catOf(t.cat, t.tipo === 'receita').nome).toLowerCase().includes(q); }
    return true;
  });
}
MF.filtered = filtered;
PAGES.transacoes = {
  shell: () => `<section class="hero"><div class="grow"><h1>Transações</h1><p>Tudo que entrou, saiu e foi guardado — dia a dia.</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="add-receita">${ic('plus')}Receita</button><button class="btn" data-act="transfer">${ic('swap')}Transferir</button><button class="btn btn-p" data-act="add-gasto">${ic('plus')}Gasto</button></div>
    <button class="pill hero-month" data-act="month-pop" data-r="monthbtn"></button></section>
  <div class="stats" data-r="tstats"></div>
  <section class="card">
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
      <div class="seg" data-r="tseg"></div>
      <select class="in" id="t-cat" style="width:auto;min-width:170px;height:40px" data-r="tcat" aria-label="Categoria"></select>
      <span style="flex:1"></span>
      <button class="btn btn-sm" data-act="export-csv">${ic('file')}Exportar CSV</button>
    </div>
    <div data-r="tlist"></div>
  </section>`,
  mount: main => { $('#t-cat', main).addEventListener('change', e => { UI.fcat = e.target.value; MF.render(); }); },
  r: {
    monthbtn: monthBtn,
    tstats: () => {
      const mm = D().M(UI.month), saved = D().txs.filter(t => t.tipo === 'transf' && mOf(t.data) === UI.month && accOf(t.para)?.tipo === 'invest').reduce((s, t) => s + t.valor, 0);
      return `<div class="stat"><small>Entradas</small><b class="num pos">${brl(mm.rec)}</b></div><div class="stat"><small>Gastos</small><b class="num neg">${brl(mm.desp)}</b></div>
      <div class="stat"><small>Sobrou no mês</small><b class="num ${mm.rec - mm.desp >= 0 ? 'pos' : 'neg'}">${brl(mm.rec - mm.desp)}</b></div><div class="stat"><small>Guardado em investimentos</small><b class="num">${brl(saved)}</b></div>`;
    },
    tseg: () => [['todos', 'Todas'], ['despesa', 'Gastos'], ['receita', 'Receitas'], ['transf', 'Transferências']].map(([k, l]) => `<button class="${UI.ftipo === k ? 'on' : ''}" data-act="ftipo" data-k="${k}">${l}</button>`).join(''),
    tcat: () => `<option value="">Todas as categorias</option>` + (UI.ftipo !== 'receita' ? `<optgroup label="Gastos">${cats().map(c => `<option value="${esc(c.id)}" ${UI.fcat === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>` : '') + (UI.ftipo !== 'despesa' ? `<optgroup label="Receitas">${catsRec().map(c => `<option value="${esc(c.id)}" ${UI.fcat === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</optgroup>` : ''),
    tlist: () => {
      const list = filtered();
      const head = UI.q ? `<div class="note" style="margin-bottom:12px">${ic('search')}<span>Resultados para “${esc(UI.q)}” em todos os meses — ${list.length} encontrado(s). <button class="link" data-act="clear-q">Limpar busca</button></span></div>` : '';
      if (!list.length) return head + empty('Nada por aqui', UI.q ? 'Tente outra palavra.' : 'Nenhuma transação com esses filtros em ' + mLabel(UI.month).toLowerCase() + '.');
      let out = '', cur = null, buf = [];
      const flush = () => { if (!cur) return; const tot = buf.reduce((s, t) => s + (t.tipo === 'despesa' ? -t.valor : t.tipo === 'receita' ? t.valor : 0), 0); out += `<div class="day-h"><span>${dayLabel(cur)}${UI.q ? ' · ' + shortDate(cur) + '/' + cur.slice(0, 4) : ''}</span><span class="num ${tot < 0 ? 'neg' : tot > 0 ? 'pos' : ''}">${tot ? (tot < 0 ? '−' : '+') + brl(Math.abs(tot)) : ''}</span></div><div class="list">${buf.map(t => txRow(t)).join('')}</div>`; };
      for (const t of list.slice(0, 600)) { if (t.data !== cur) { flush(); cur = t.data; buf = []; } buf.push(t); }
      flush();
      return head + out + (list.length > 600 ? `<p class="sub">Mostrando as 600 mais recentes.</p>` : '');
    },
  },
};
})();
</script>
