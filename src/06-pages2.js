<script>
(() => {
'use strict';
/* =========================================================
   Planejamento, Investimentos, Metas, Relatórios, Carteira, Configurações
   ========================================================= */
const MF = window.MF;
const { $, $$, esc, brl, brl0, nf, ic, todayS, mOf, mAdd, mDays, mLabel, mShort, dn, ds, pad, MES, S, UI, isDemo, cfg, cats, catsRec,
  catOf, catName, accList, accOf, invAccs, D, balAt, allAt, sumYield, CLASSES, ACC_TIPOS, clamp, shortDate, moneyIn, parseMoney } = MF;
const { PAGES, empty, demoBanner } = MF;
const SYNC_CLAUDE = `<div class="card-h">${MF.ic('sync')}<h2>Sincronização</h2><span class="sp"></span><span class="tag g">ligada</span></div><p class="sub" style="margin:0">Tudo fica salvo na sua conta do Claude. Abra este mesmo link no celular e no computador — o que você anota em um aparece no outro.</p>`;
const C = () => MF.charts;

// ============================================================
// PLANEJAMENTO
// ============================================================
const fixedTotal = () => Object.values(MF.src().subs).filter(s => s.ativo).reduce((a, s) => a + (+s.valor || 0), 0);
function subStatus(s) {
  const m = mOf(todayS()), id = 'sub_' + s.id + '_' + m, dia = Math.min(s.dia || 1, mDays(m)), date = m + '-' + pad(dia);
  const done = (MF.src().tx[m] || {})[id] || D().txs.some(t => t.sub === s.id && mOf(t.data) === m);
  if (!s.ativo) return '<span class="tag">pausada</span>';
  if (done) return '<span class="tag g">lançada este mês</span>';
  if ((s.pulados || []).includes(m)) return '<span class="tag">pulada este mês</span>';
  const k = dn(date) - dn(todayS());
  if (k < 0) return s.auto ? '<span class="tag y">lançando…</span>' : `<button class="btn btn-sm" data-act="sub-launch" data-id="${esc(s.id)}">${ic('check')}Lançar</button>`;
  return `<span class="tag ${k <= 3 ? 'y' : ''}">${k === 0 ? 'vence hoje' : k === 1 ? 'vence amanhã' : 'vence em ' + k + ' dias'}</span>`;
}
PAGES.planejamento = {
  shell: () => {
    const c = cfg();
    return `<div data-r="demo"></div>
    <section class="hero"><div class="grow"><h1>Planejamento</h1><p>Decida quanto pode gastar por mês e deixe assinaturas e contas fixas no automático.</p></div></section>
    <div class="stats" data-r="pstats"></div>
    <div class="cols">
      <div class="stack">
        <section class="card"><div class="card-h">${ic('plan')}<h2>Seu mês planejado</h2></div>
          <form class="form" id="p-form">
            <div class="two">
              <label class="field"><span>Quanto entra por mês (aprox.)</span><div class="money"><input class="in num" id="p-renda" inputmode="decimal" value="${moneyIn(c.rendaMensal)}" placeholder="0,00"></div></label>
              <label class="field"><span>Quanto quer guardar por mês</span><div class="money"><input class="in num" id="p-guardar" inputmode="decimal" value="${moneyIn(c.metaGuardar)}" placeholder="0,00"></div></label>
            </div>
            <label class="field"><span>Limite de gastos do mês</span><div class="money"><input class="in num" id="p-limite" inputmode="decimal" value="${moneyIn(c.limiteMensal)}" placeholder="0,00"></div>
              <small id="p-sug"></small></label>
            <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-p" type="submit">${ic('check')}Salvar plano</button><button class="btn" type="button" data-act="p-sugerir">Usar sugestão</button></div>
          </form></section>
        <section class="card"><div class="card-h">${ic('pie')}<h2>Limite por categoria</h2><span class="sp"></span><span class="sub">${MES[+mOf(todayS()).slice(5) - 1]}</span></div>
          <div id="p-budgets">${MF.catRows(mOf(todayS()), true)}</div>
          <button class="btn" style="margin-top:14px" data-act="p-save-budgets">${ic('check')}Salvar limites</button></section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-h">${ic('repeat')}<h2>Assinaturas e contas fixas</h2><span class="sp"></span><button class="btn btn-sm btn-p" data-act="sub-new">${ic('plus')}Adicionar</button></div>
          <div data-r="subs"></div></section>
        <div class="note">${ic('info')}<span>Com “lançar sozinho” ligado, no dia do vencimento o app anota o gasto por você (em “Plataformas e assinaturas” ou na categoria escolhida). Se cancelar uma assinatura, é só pausar.</span></div>
      </div>
    </div>`;
  },
  mount: main => {
    const sug = () => { const r = parseMoney($('#p-renda').value) || 0, g = parseMoney($('#p-guardar').value) || 0, s = Math.max(0, r - g - fixedTotal());
      $('#p-sug').textContent = r ? `Sugestão: ${brl(s)} (entrada − guardar − contas fixas de ${brl(fixedTotal())}).` : 'Preencha quanto entra por mês para ver uma sugestão.'; return s; };
    MF._sug = sug; sug();
    ['#p-renda', '#p-guardar'].forEach(id => $(id, main).addEventListener('input', sug));
    $('#p-form', main).addEventListener('submit', e => { e.preventDefault(); if (MF.guard()) return;
      MF.store.saveSettings({ rendaMensal: parseMoney($('#p-renda').value) || 0, metaGuardar: parseMoney($('#p-guardar').value) || 0, limiteMensal: parseMoney($('#p-limite').value) || 0 }); MF.toast('Plano salvo'); });
  },
  r: {
    demo: demoBanner,
    pstats: () => {
      const c = cfg(), fx = fixedTotal(), livre = (c.rendaMensal || 0) - (c.metaGuardar || 0) - fx;
      return `<div class="stat"><small>Entra por mês</small><b class="num">${brl(c.rendaMensal)}</b></div>
      <div class="stat"><small>Contas fixas e assinaturas</small><b class="num neg">${brl(fx)}</b><em>por mês</em></div>
      <div class="stat"><small>Meta de guardar</small><b class="num">${brl(c.metaGuardar)}</b><em>por mês</em></div>
      <div class="stat"><small>Livre para o dia a dia</small><b class="num ${livre >= 0 ? 'pos' : 'neg'}">${brl(livre)}</b><em>≈ ${brl(Math.max(0, livre) / 30)} por dia</em></div>`;
    },
    subs: () => {
      const list = Object.values(MF.src().subs).sort((a, b) => (b.ativo - a.ativo) || a.dia - b.dia);
      if (!list.length) return empty('Nenhuma conta fixa ainda', 'Adicione Netflix, Spotify, academia, internet… e o app lança todo mês.');
      return `<div class="list">${list.map(s => { const c = catOf(s.cat), a = accOf(s.conta);
        return `<div class="li" style="--c:${c.cor};${s.ativo ? '' : 'opacity:.55'}"><div class="cic">${ic(c.icon)}</div><div class="t"><b>${esc(s.nome)}</b><small>todo dia ${s.dia}${a ? ' · ' + esc(a.nome) : ''}${s.auto ? ' · lança sozinho' : ''}</small></div>
        <div style="text-align:right"><div class="val num">${brl(s.valor)}</div>${subStatus(s)}</div>
        <div class="acts"><button data-act="sub-edit" data-id="${esc(s.id)}" aria-label="Editar">${ic('edit')}</button><button data-act="sub-del" data-id="${esc(s.id)}" aria-label="Apagar">${ic('trash')}</button></div></div>`; }).join('')}</div>
        <div class="day-h" style="padding-top:14px"><span>Total por mês</span><span class="num">${brl(fixedTotal())}</span></div>`;
    },
  },
};

// ============================================================
// INVESTIMENTOS
// ============================================================
const IR = days => days <= 180 ? .225 : days <= 360 ? .20 : days <= 720 ? .175 : .15;
function simulate() {
  const v = id => parseMoney($(id)?.value) || 0, ini = v('#s-ini'), ap = v('#s-ap'), n = clamp(Math.round(+$('#s-n')?.value || 12), 1, 600), p = +String($('#s-p')?.value || '105').replace(',', '.') || 0;
  const rm = Math.pow(1 + MF.yearRate(p), 1 / 12) - 1, total = [ini], inv = [ini];
  for (let i = 1; i <= n; i++) { total.push(total[i - 1] * (1 + rm) + ap); inv.push(inv[i - 1] + ap); }
  let ir = 0; // cada aporte tem sua própria idade para o IR regressivo
  const lots = [[0, ini]]; for (let i = 1; i <= n; i++) lots.push([i, ap]);
  for (const [k, a] of lots) { if (!a) continue; const y = a * (Math.pow(1 + rm, n - k) - 1); ir += y * IR((n - k) * 30); }
  return { n, p, rm, total, inv, bruto: total[n], colocado: inv[n], rend: total[n] - inv[n], ir, liq: total[n] - ir };
}
PAGES.investimentos = {
  shell: () => {
    const mp = invAccs()[0], ini = mp ? balAt(mp.id, todayS()) : 0;
    return `<div data-r="demo"></div>
    <section class="hero"><div class="grow"><h1>Investimentos</h1><p>Seu dinheiro rendendo — calculado dia útil a dia útil pelo CDI, já contando feriados.</p></div>
      <button class="btn btn-p" data-act="acc-new" data-tipo="invest">${ic('plus')}Novo investimento</button></section>
    <div class="stats" data-r="istats"></div>
    <div class="cards3" data-r="iaccs" style="margin-bottom:20px"></div>
    <div class="cols">
      <section class="card"><div class="card-h">${ic('spark')}<h2>Simulador: quanto vou ter?</h2></div>
        <div class="form" id="sim">
          <div class="two"><label class="field"><span>Começo com</span><div class="money"><input class="in num" id="s-ini" inputmode="decimal" value="${moneyIn(Math.round(ini))}"></div></label>
          <label class="field"><span>Guardo por mês</span><div class="money"><input class="in num" id="s-ap" inputmode="decimal" value="${moneyIn(cfg().metaGuardar || 500)}"></div></label></div>
          <div class="two"><label class="field"><span>Por quantos meses</span><input class="in num" id="s-n" type="number" min="1" max="600" value="24"></label>
          <label class="field"><span>Rendendo (% do CDI)</span><input class="in num" id="s-p" inputmode="decimal" value="${mp ? mp.cdiPct || 105 : 105}"></label></div>
        </div>
        <div id="sim-out" style="margin-top:16px"></div>
        <div class="chart" data-ch="proj" style="margin-top:10px"></div>
        <p class="sub" style="margin:8px 0 0"><span style="color:var(--green)">━</span> saldo projetado &nbsp; <span style="color:var(--blue)">╌</span> o que você colocou</p></section>
      <div class="stack">
        <section class="card" data-r="cdi"></section>
        <div class="note">${ic('info')}<span>O saldo aqui é uma <b>estimativa</b>. De vez em quando abra o app do Mercado Pago e use “Conferir saldo” com o valor que aparece lá — a diferença entra como rendimento e o cálculo segue certinho a partir dali.</span></div>
      </div>
    </div>`;
  },
  mount: main => {
    const upd = () => { const s = simulate();
      $('#sim-out').innerHTML = `<div class="stats sim-stats">
        <div class="stat"><small>Em ${s.n} meses você terá</small><b class="num pos">${brl(s.bruto)}</b><em>bruto</em></div>
        <div class="stat"><small>Você colocou</small><b class="num">${brl(s.colocado)}</b></div>
        <div class="stat"><small>O dinheiro rendeu</small><b class="num">${brl(s.rend)}</b><em>IR estimado ${brl(s.ir)}</em></div>
        <div class="stat"><small>Líquido se sacar tudo</small><b class="num">${brl(s.liq)}</b><em>${nf(s.rm * 100, 2)}% ao mês</em></div></div>`;
      const el = $('[data-ch="proj"]'); if (el) C().proj(el, { total: s.total, invested: s.inv }); };
    $$('#sim input', main).forEach(i => i.addEventListener('input', upd));
    MF._simUpd = upd; upd();
  },
  r: {
    demo: demoBanner,
    istats: () => {
      const t = todayS(), m = mOf(t), tot = MF.invAt(t), mes = sumYield(null, m + '-01', t), ano = sumYield(null, ds(dn(t) - 364), t);
      const daily = invAccs().reduce((s, a) => s + Math.max(0, balAt(a.id, t)) * MF.cdiDaily() * (a.cdiPct || 0) / 100, 0);
      return `<div class="stat"><small>Total investido</small><b class="num">${brl(tot)}</b></div>
      <div class="stat"><small>Rendeu este mês</small><b class="num pos">+${brl(mes)}</b></div>
      <div class="stat"><small>Rendeu em 12 meses</small><b class="num pos">+${brl(ano)}</b></div>
      <div class="stat"><small>Rende por dia útil (hoje)</small><b class="num">≈ ${brl(daily)}</b><em>≈ ${brl(daily * 21)} por mês</em></div>`;
    },
    iaccs: () => {
      const list = invAccs(), t = todayS(), m = mOf(t);
      if (!list.length) return `<section class="card">${empty('Nenhum investimento cadastrado', 'Cadastre o Mercado Pago (105% do CDI) com o saldo que aparece lá hoje.', `<button class="btn btn-p btn-sm" data-act="acc-new" data-tipo="invest">${ic('plus')}Adicionar Mercado Pago</button>`)}</section>`;
      return list.map(a => { const cl = CLASSES.find(c => c.id === (a.classe || 'rf')) || CLASSES[0], b = balAt(a.id, t), y = sumYield(a.id, m + '-01', t), tot = sumYield(a.id, a.dataInicial, t);
        return `<section class="card acc" style="--c:${a.cor || cl.cor}"><div class="acc-h"><div class="cic">${ic('trend')}</div><div class="t"><b>${esc(a.nome)}</b><span class="sub">${a.cdiPct ? nf(a.cdiPct, 0) + '% do CDI · ' : ''}${esc(cl.nome)}</span></div><button class="icon-btn" data-act="acc-edit" data-id="${esc(a.id)}" aria-label="Editar">${ic('edit')}</button></div>
        <div><div class="acc-v num">${brl(b)}</div><div class="sub">${a.cdiPct ? `≈ ${nf(MF.yearRate(a.cdiPct) * 100, 2)}% ao ano · ` : ''}rendeu <b class="pos">+${brl(y)}</b> este mês · <b class="pos">+${brl(tot)}</b> desde ${shortDate(a.dataInicial)}</div></div>
        <div class="acc-acts"><button class="btn btn-sm btn-p" data-act="inv-save" data-id="${esc(a.id)}">${ic('save')}Guardar</button><button class="btn btn-sm" data-act="inv-take" data-id="${esc(a.id)}">${ic('withdraw')}Resgatar</button><button class="btn btn-sm" data-act="acc-adjust" data-id="${esc(a.id)}">${ic('sync')}Conferir saldo</button></div></section>`; }).join('');
    },
    cdi: () => { const c = cfg(), p = (invAccs()[0] || {}).cdiPct || 105;
      return `<div class="card-h">${ic('bars')}<h2>CDI de referência</h2><span class="sp"></span><button class="btn btn-sm" data-act="cdi-edit">${ic('edit')}Alterar</button></div>
      <div style="display:flex;gap:28px;flex-wrap:wrap"><div><div class="sub">CDI hoje</div><div class="acc-v num">${nf(c.cdi, 2)}% <small class="sub" style="font-size:14px">ao ano</small></div><div class="sub">atualizado em ${shortDate(c.cdiData)}/${c.cdiData.slice(0, 4)}</div></div>
      <div><div class="sub">${nf(p, 0)}% do CDI</div><div class="acc-v num pos">${nf(MF.yearRate(p) * 100, 2)}%</div><div class="sub">≈ ${nf((Math.pow(1 + MF.yearRate(p), 1 / 12) - 1) * 100, 2)}% ao mês</div></div></div>
      <div class="tbl-wrap" style="margin-top:16px"><table class="tbl" style="min-width:0"><thead><tr><th>IR sobre o rendimento (no saque)</th><th>Alíquota</th></tr></thead><tbody>
      <tr><td>até 180 dias</td><td>22,5%</td></tr><tr><td>181 a 360 dias</td><td>20%</td></tr><tr><td>361 a 720 dias</td><td>17,5%</td></tr><tr><td>acima de 720 dias</td><td>15%</td></tr></tbody></table></div>`; },
  },
  ch: { proj: () => MF._simUpd && MF._simUpd() },
};

// ============================================================
// METAS
// ============================================================
PAGES.metas = {
  shell: () => `<div data-r="demo"></div>
  <section class="hero"><div class="grow"><h1>Metas</h1><p>Dê um nome para o seu dinheiro guardado e veja quanto falta.</p></div><button class="btn btn-p" data-act="goal-new">${ic('plus')}Nova meta</button></section>
  <div class="cards3" data-r="goals"></div>`,
  r: {
    demo: demoBanner,
    goals: () => {
      const list = Object.values(MF.src().goals);
      if (!list.length) return `<section class="card">${empty('Nenhuma meta ainda', 'Ex.: reserva de emergência, viagem, moto, óculos de VR…', `<button class="btn btn-p btn-sm" data-act="goal-new">${ic('plus')}Criar meta</button>`)}</section>`;
      return list.map(g => { const p = MF.goalProgress(g), a = g.modo === 'conta' ? accOf(g.conta) : null, done = p.p >= 1;
        return `<section class="card acc" style="--c:${g.cor || 'var(--green)'}"><div class="acc-h"><div class="cic">${ic(g.icon || 'target')}</div><div class="t"><b>${esc(g.nome)}</b><span class="sub">${g.prazo ? 'até ' + MES[+g.prazo.slice(5) - 1].slice(0, 3) + '/' + g.prazo.slice(0, 4) : 'sem prazo'}${a ? ' · acompanha ' + esc(a.nome) : ''}</span></div>
        <button class="icon-btn" data-act="goal-edit" data-id="${esc(g.id)}" aria-label="Editar">${ic('edit')}</button></div>
        <div><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><div class="acc-v num">${brl(p.v)}</div><b class="num" style="color:${g.cor || 'var(--green)'}">${nf(p.p * 100, 0)}%</b></div>
        <div class="prog" style="--c:${g.cor || 'var(--green)'};height:10px;margin:10px 0"><i style="width:${p.p * 100}%"></i></div>
        <div class="sub">${done ? '<span class="tag g">Meta batida!</span>' : `Faltam <b style="color:var(--text)">${brl(p.falta)}</b> de ${brl(g.alvo)}${p.meses ? ` · guarde <b style="color:var(--text)">${brl(p.porMes)}/mês</b>` : ''}`}</div></div>
        ${done ? '' : `<div class="acc-acts">${g.modo === 'conta' && a ? `<button class="btn btn-sm btn-p" data-act="inv-save" data-id="${esc(a.id)}">${ic('save')}Guardar em ${esc(a.nome)}</button>` : `<button class="btn btn-sm btn-p" data-act="goal-add" data-id="${esc(g.id)}">${ic('plus')}Adicionar valor</button>`}</div>`}</section>`; }).join('');
    },
  },
};

// ============================================================
// RELATÓRIOS
// ============================================================
function insights(m) {
  const mm = D().M(m), prev = D().M(mAdd(m, -1)), out = [];
  const byW = [0, 0, 0, 0, 0, 0, 0]; for (const [d, v] of Object.entries(mm.days)) byW[MF.wd(dn(d))] += v;
  const wmax = byW.indexOf(Math.max(...byW)); if (mm.desp) out.push(['cal', `Você gasta mais às <b>${MF.SEM[wmax]}s</b> (${brl(byW[wmax])} no mês).`]);
  let up = null; for (const c of cats()) { const a = mm.cats[c.id] || 0, b = prev.cats[c.id] || 0; if (b > 0 && a - b > 20 && (!up || a - b > up.d)) up = { c, d: a - b, p: (a - b) / b }; }
  if (up) out.push(['up', `<b>${esc(up.c.nome)}</b> subiu ${brl(up.d)} (+${nf(up.p * 100, 0)}%) em relação a ${MES[+mAdd(m, -1).slice(5) - 1]}.`]);
  const bs = mm.cats.besteira || 0; if (bs) out.push(['icecream', `Besteiras somaram <b>${brl(bs)}</b> — guardado a 105% do CDI por um ano, viraria ≈ ${brl(bs * (1 + MF.yearRate(105) * 0.85))}.`]);
  if (mm.rec) out.push(['save', `Você ficou com <b>${nf(Math.max(0, (mm.rec - mm.desp) / mm.rec * 100), 0)}%</b> do que entrou no mês.`]);
  return out;
}
PAGES.relatorios = {
  shell: () => `<div data-r="demo"></div>
  <section class="hero"><div class="grow"><h1>Relatórios</h1><p>Para onde o dinheiro foi, mês a mês.</p></div>
    <div class="daynav"><button class="icon-btn" data-act="rel-year" data-k="-1" aria-label="Ano anterior">${ic('left')}</button><b data-r="year" style="min-width:60px"></b><button class="icon-btn" data-act="rel-year" data-k="1" aria-label="Próximo ano">${ic('right')}</button></div>
    <button class="btn" data-act="export-csv">${ic('file')}Exportar CSV</button></section>
  <section class="card" style="margin-bottom:20px"><div class="card-h">${ic('bars')}<h2>Entradas × gastos</h2><span class="sp"></span><span class="sub"><span style="color:var(--green)">■</span> entradas &nbsp;<span style="color:var(--red)">■</span> gastos</span></div><div class="chart" data-ch="pairs"></div></section>
  <div class="cols">
    <section class="card"><div class="card-h">${ic('report')}<h2>Mês a mês</h2></div><div class="tbl-wrap" data-r="table"></div></section>
    <div class="stack">
      <section class="card"><div class="card-h"><h2 data-r="mtitle"></h2><span class="sp"></span><button class="pill sm" data-act="month-pop" data-r="monthbtn"></button></div><div data-r="mcats"></div></section>
      <section class="card" data-r="pagto"></section>
      <section class="card"><div class="card-h">${ic('spark')}<h2>O que chama atenção</h2></div><div data-r="ins"></div></section>
      <section class="card"><div class="card-h">${ic('receipt')}<h2>Maiores gastos do mês</h2></div><div data-r="top"></div></section>
      <section class="card" id="ai-card" hidden><div class="card-h">${ic('spark')}<h2>Análise do Claude</h2><span class="sp"></span><button class="btn btn-sm btn-p" data-act="ai-ask" id="ai-btn">Pedir dicas</button></div>
        <p class="sub" style="margin:0">O Claude lê o resumo dos seus últimos meses e sugere onde dá para economizar. Usa o seu plano do Claude.</p><div class="ai-out" id="ai-out"></div></section>
    </div>
  </div>`,
  mount: () => MF.aiSetup && MF.aiSetup(),
  r: {
    demo: demoBanner, monthbtn: MF.monthBtn,
    year: () => String(UI.relYear),
    table: () => {
      const rows = []; let tr = 0, td = 0;
      const temCartao = MF.cardList().length > 0; let tc = 0;
      for (let k = 1; k <= 12; k++) { const m = UI.relYear + '-' + pad(k); if (m > mOf(todayS())) break; const mm = D().M(m), cg = MF.cardGasto(m); tr += mm.rec; td += mm.desp; tc += cg;
        rows.push(`<tr class="${m === UI.month ? 'cur' : ''}"><td><button class="link" style="color:var(--text)" data-act="set-month" data-m="${m}">${MF.cap(MES[k - 1])}</button></td><td class="pos">${brl(mm.rec)}</td><td class="neg">${brl(mm.desp)}</td>${temCartao ? `<td>${cg ? brl(cg) : '—'}</td>` : ''}<td class="${mm.rec - mm.desp >= 0 ? 'pos' : 'neg'}">${brl(mm.rec - mm.desp)}</td><td>${mm.rec ? nf(Math.max(0, (mm.rec - mm.desp) / mm.rec * 100), 0) + '%' : '—'}</td></tr>`); }
      if (!rows.length) return empty('Sem dados neste ano', '');
      return `<table class="tbl"><thead><tr><th>Mês</th><th>Entradas</th><th>Gastos</th>${temCartao ? '<th>No cartão</th>' : ''}<th>Sobrou</th><th>% que sobrou</th></tr></thead><tbody>${rows.join('')}</tbody>
      <tfoot><tr><td><b>Total</b></td><td class="pos"><b>${brl(tr)}</b></td><td class="neg"><b>${brl(td)}</b></td>${temCartao ? `<td><b>${brl(tc)}</b></td>` : ''}<td><b>${brl(tr - td)}</b></td><td><b>${tr ? nf(Math.max(0, (tr - td) / tr * 100), 0) + '%' : '—'}</b></td></tr></tfoot></table>`;
    },
    pagto: () => {
      const m = UI.month, g = MF.cardGastoMes(m), tot = g.total + g.semCartao;
      const head = `<div class="card-h">${ic('card')}<h2>Como você pagou em ${MES[+m.slice(5) - 1]}</h2></div>`;
      if (!tot) return head + empty('Nenhum gasto neste mês', 'Assim que anotar, a divisão entre cartão e conta aparece aqui.');
      const linha = (nome, icone, cor, valor, extra) => `<div class="cat-row" style="--c:${cor}"><div class="cic">${ic(icone)}</div><div class="t"><div><span>${esc(nome)}</span><em class="num">${brl(valor)}</em></div><div class="prog" style="--c:${cor}"><i style="width:${tot ? valor / tot * 100 : 0}%"></i></div>${extra ? `<div style="margin-top:6px"><em class="sub">${extra}</em></div>` : ''}</div><span class="tag">${nf(tot ? valor / tot * 100 : 0, 0)}%</span></div>`;
      const cards = MF.cardList().map(c => { const v = g.porCartao[c.id] || 0; if (!v) return ''; const st = MF.cardStats(c.id);
        return linha(c.nome + ' (cartão)', 'card', c.cor || 'var(--indigo)', v, `fatura atual ${brl(st.atual)} · ${brl(st.livre)} de limite livre · fecha ${shortDate(st.fecha)}`); }).join('');
      return head + cards + (g.semCartao ? linha('Conta, Pix e dinheiro', 'wallet', 'var(--green)', g.semCartao, '') : '')
        + `<div class="day-h" style="padding-top:14px"><span>Gasto no cartão no mês</span><span class="num">${brl(g.total)} de ${brl(tot)}</span></div>`
        + (g.pagamentos ? `<p class="sub" style="margin:10px 0 0">Você pagou <b style="color:var(--text)">${brl(g.pagamentos)}</b> de faturas neste mês — isso saiu da conta, mas não conta como gasto novo (os gastos já foram somados no dia da compra).</p>` : '')
        + (MF.cardList().length ? '' : `<div style="margin-top:12px"><button class="btn btn-sm" data-act="card-new">${ic('plus')}Adicionar cartão de crédito</button></div>`);
    },
    mtitle: () => 'Gastos de ' + MES[+UI.month.slice(5) - 1],
    mcats: () => MF.catRows(UI.month, false),
    ins: () => { const l = insights(UI.month); return l.length ? `<div class="list">${l.map(([i, t]) => `<div class="li" style="--c:var(--blue)"><div class="cic">${ic(i)}</div><div class="t" style="white-space:normal"><span>${t}</span></div></div>`).join('')}</div>` : empty('Poucos dados ainda', 'Anote gastos por alguns dias e volte aqui.'); },
    top: () => { const l = D().txs.filter(t => t.tipo === 'despesa' && mOf(t.data) === UI.month).sort((a, b) => b.valor - a.valor).slice(0, 5);
      return l.length ? `<div class="list">${l.map(t => MF.txRow(t, true)).join('')}</div>` : empty('Nenhum gasto neste mês', ''); },
  },
  ch: {
    pairs: el => { const ms = Array.from({ length: 12 }, (_, i) => UI.relYear + '-' + pad(i + 1));
      C().pairs(el, { labels: ms.map(mShort), full: ms.map(mLabel), a: ms.map(m => D().M(m).rec), b: ms.map(m => D().M(m).desp), aria: 'Entradas e gastos por mês' }); },
  },
};

// ============================================================
// CARTEIRA
// ============================================================
PAGES.carteira = {
  shell: () => `<div data-r="demo"></div>
  <section class="hero"><div class="grow"><h1>Carteira</h1><p>Onde está cada real: contas, dinheiro vivo, investimentos e cartões.</p></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="transfer">${ic('swap')}Transferir</button><button class="btn btn-p" data-act="acc-new">${ic('plus')}Nova conta</button></div></section>
  <div class="stats" data-r="cstats"></div>
  <div class="cards3" data-r="accs" style="margin-bottom:20px"></div>
  <section class="card" style="margin-bottom:20px"><div class="card-h">${ic('card')}<h2>Cartões de crédito</h2><span class="sp"></span><button class="btn btn-sm btn-p" data-act="card-new">${ic('plus')}Adicionar cartão</button></div>
    <div data-r="cards"></div></section>
  <div class="note">${ic('info')}<span>O saldo de cada conta = saldo inicial + entradas − gastos ± transferências (e rendimento, se render % do CDI). <b>Gasto no cartão não sai do saldo na hora</b>: ele ocupa limite e entra na fatura; o dinheiro sai quando você usa “Pagar fatura”. Se algum saldo não bater com o banco, use “Conferir saldo”.</span></div>`,
  r: {
    demo: demoBanner,
    cstats: () => { const t = todayS(), by = k => accList().filter(a => a.tipo === k).reduce((s, a) => s + balAt(a.id, t), 0);
      return `<div class="stat"><small>Patrimônio total</small><b class="num">${brl(allAt(t))}</b></div><div class="stat"><small>Em contas</small><b class="num">${brl(by('conta'))}</b></div><div class="stat"><small>Dinheiro vivo</small><b class="num">${brl(by('dinheiro'))}</b></div><div class="stat"><small>Investido</small><b class="num pos">${brl(by('invest'))}</b></div>
      ${MF.cardList().length ? `<div class="stat"><small>Faturas em aberto</small><b class="num neg">${brl(MF.faturasAbertas())}</b><em>sai do saldo quando você pagar</em></div>` : ''}`; },
    cards: () => MF.cardTiles(true),
    accs: () => { const list = accList(), t = todayS(), def = MF.defaultAcc();
      if (!list.length) return `<section class="card">${empty('Nenhuma conta ainda', 'Adicione sua conta do dia a dia e o Mercado Pago.', `<button class="btn btn-p btn-sm" data-act="acc-new">${ic('plus')}Nova conta</button>`)}</section>`;
      return list.map(a => { const T = ACC_TIPOS[a.tipo] || ACC_TIPOS.conta;
        return `<section class="card acc" style="--c:${a.cor || T.cor}"><div class="acc-h"><div class="cic">${ic(T.icon)}</div><div class="t"><b>${esc(a.nome)}</b><span class="sub">${T.nome}${a.cdiPct ? ' · ' + nf(a.cdiPct, 0) + '% do CDI' : ''}</span></div>${a.id === def ? '<span class="tag g">padrão dos gastos</span>' : ''}<button class="icon-btn" data-act="acc-edit" data-id="${esc(a.id)}" aria-label="Editar">${ic('edit')}</button></div>
        <div class="acc-v num ${balAt(a.id, t) < 0 ? 'neg' : ''}">${brl(balAt(a.id, t))}</div>
        <div class="acc-acts"><button class="btn btn-sm" data-act="transfer" data-from="${esc(a.id)}">${ic('swap')}Transferir</button><button class="btn btn-sm" data-act="acc-adjust" data-id="${esc(a.id)}">${ic('sync')}Conferir saldo</button></div></section>`; }).join('');
    },
  },
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================
function catList(rec) {
  const list = rec ? catsRec() : cats();
  return `<div class="list">${list.map(c => `<div class="li" style="--c:${c.cor}"><div class="cic">${ic(c.icon)}</div><div class="t"><b>${esc(c.nome)}</b></div><div class="acts"><button data-act="cat-edit" data-id="${esc(c.id)}" data-rec="${rec ? 1 : ''}" aria-label="Editar">${ic('edit')}</button><button data-act="cat-del" data-id="${esc(c.id)}" data-rec="${rec ? 1 : ''}" aria-label="Apagar">${ic('trash')}</button></div></div>`).join('')}</div>
  <button class="btn btn-sm" style="margin-top:10px" data-act="cat-new" data-rec="${rec ? 1 : ''}">${ic('plus')}Nova categoria</button>`;
}
PAGES.config = {
  shell: () => { const c = cfg();
    return `<div data-r="demo"></div>
    <section class="hero"><div class="grow"><h1>Configurações</h1><p>Seu nome, CDI, categorias e backup.</p></div></section>
    <div class="cols">
      <div class="stack">
        <section class="card"><div class="card-h">${ic('home')}<h2>Você</h2></div>
          <form class="form" id="c-form"><label class="field"><span>Seu nome</span><input class="in" id="c-nome" value="${esc(c.nome)}" maxlength="40"></label>
          <label class="field"><span>Conta padrão dos gastos</span><select class="in" id="c-conta">${accList().map(a => `<option value="${esc(a.id)}" ${a.id === MF.defaultAcc() ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></label>
          <div class="two"><label class="field"><span>CDI atual (% ao ano)</span><input class="in num" id="c-cdi" inputmode="decimal" value="${nf(c.cdi, 2)}"></label>
          <label class="field"><span>Data do CDI</span><input class="in" id="c-cdid" type="date" value="${esc(c.cdiData)}"></label></div>
          <small class="sub">Fonte: Banco Central (CDI anualizado). Em 17/09/2026 estava em 13,65% ao ano.</small>
          <button class="btn btn-p" type="submit">${ic('check')}Salvar</button></form></section>
        <section class="card"><div class="card-h">${ic('sun')}<h2>Aparência</h2></div>
          <p class="sub" style="margin:0 0 12px">Escolha o tema. “Automático” segue o do celular ou do computador.</p>
          <div class="theme-pick" data-r="tema"></div></section>
        <section class="card" data-r="sync"></section>
        <section class="card"><div class="card-h">${ic('cloud')}<h2>Backup</h2></div>
          <p class="sub" style="margin-top:0">Baixe uma cópia de tudo (arquivo .json) ou traga de volta uma cópia salva.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-act="export-json">${ic('save')}Exportar backup</button>
          <label class="btn" for="c-import">${ic('upload')}Importar backup</label><input type="file" id="c-import" accept=".json,application/json" hidden></div>
          <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
          <button class="btn btn-danger" data-act="wipe">${ic('trash')}Apagar todos os dados</button></section>
      </div>
      <div class="stack">
        <section class="card"><div class="card-h">${ic('receipt')}<h2>Categorias de gasto</h2></div><div data-r="cats"></div></section>
        <section class="card"><div class="card-h">${ic('trend')}<h2>Categorias de entrada</h2></div><div data-r="catsrec"></div></section>
      </div>
    </div>`; },
  mount: main => {
    $('#c-form', main).addEventListener('submit', e => { e.preventDefault(); if (MF.guard()) return;
      const cdi = parseFloat(String($('#c-cdi').value).replace(',', '.'));
      MF.store.saveSettings({ nome: $('#c-nome').value.trim() || 'Juliemerson', contaPadrao: $('#c-conta').value, cdi: isFinite(cdi) && cdi > 0 && cdi < 100 ? cdi : cfg().cdi, cdiData: $('#c-cdid').value || cfg().cdiData });
      MF.toast('Configurações salvas'); });
    $('#c-import', main).addEventListener('change', e => MF.importFile(e.target.files[0]));
    main.addEventListener('submit', e => {
      if (e.target.id === 'sb-cfg-form') { e.preventDefault(); MF.cloudSalvar($('#sb-url').value, $('#sb-key').value); }
      if (e.target.id === 'sb-login-form') { e.preventDefault(); MF.cloudEntrar($('#sb-mail').value.trim(), $('#sb-pass').value); }
    });
  },
  r: {
    demo: demoBanner,
    cats: () => catList(false), catsrec: () => catList(true),
    tema: () => MF.THEMES.map(([k, l, i]) => `<button type="button" class="${MF.themeNow() === k ? 'on' : ''}" data-t="${k}" data-act="set-theme"><span class="sw"></span>${ic(i)}${l}</button>`).join(''),
    sync: () => {
      if (S.mode === 'db') return SYNC_CLAUDE;
      const st = MF.cloud.status(), h = `<div class="card-h">${ic('cloud')}<h2>Sincronizar entre aparelhos</h2><span class="sp"></span>${
        st.estado === 'on' ? '<span class="tag g">ligada</span>' : st.estado === 'offline' ? '<span class="tag y">sem conexão</span>' : st.estado === 'conectando' ? '<span class="tag">conectando…</span>' : '<span class="tag">só neste aparelho</span>'}</div>`;
      if (st.estado === 'on' || st.estado === 'offline') {
        return h + `<p class="sub" style="margin:0 0 12px">Ligada como <b style="color:var(--text)">${esc(st.email)}</b>. O que você anota aqui aparece nos seus outros aparelhos em alguns segundos.${st.pendentes ? ` <b style="color:var(--gold)">${st.pendentes} lançamento(s) esperando internet.</b>` : ''}</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-sm" data-act="sb-push">${ic('upload')}Enviar tudo agora</button><button class="btn btn-sm" data-act="sb-logout">Sair desta conta</button></div>`;
      }
      if (st.configurado) {
        return h + `<p class="sub" style="margin:0 0 12px">Projeto conectado. Entre com seu login para sincronizar.${st.erro ? ` <b style="color:var(--red)">${esc(st.erro)}</b>` : ''}</p>
        <form class="form" id="sb-login-form"><div class="two"><label class="field"><span>Seu e-mail</span><input class="in" type="email" id="sb-mail" autocomplete="email" required></label>
        <label class="field"><span>Senha</span><input class="in" type="password" id="sb-pass" autocomplete="current-password" minlength="6" required></label></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-p" type="submit">${ic('check')}Entrar</button><button class="btn" type="button" data-act="sb-signup">Criar meu login</button><button class="btn" type="button" data-act="sb-remove">Desligar nuvem</button></div></form>`;
      }
      return h + `<p class="sub" style="margin:0 0 12px">Sem isso, seus dados ficam só neste aparelho. Ligando, celular e computador ficam iguais. É de graça e leva uns 5 minutos — os dados ficam num banco seu, só seu.</p>
      <ol class="passos">
        <li>Crie uma conta grátis em <b>supabase.com</b> e um projeto novo (região São Paulo).</li>
        <li>No projeto, abra <b>SQL Editor</b>, cole o comando abaixo e clique em <b>Run</b>.</li>
        <li>Vá em <b>Settings → API</b> e copie o <b>Project URL</b> e a chave <b>anon public</b> (nunca a service_role) nos campos abaixo.</li>
      </ol>
      <details style="margin-bottom:14px"><summary class="link" style="cursor:pointer">Ver o comando SQL</summary>
      <pre class="sql" id="sb-sql">${esc(MF.SQL_NUVEM)}</pre>
      <button class="btn btn-sm" style="margin-top:8px" data-act="sb-copy">${ic('file')}Copiar comando</button></details>
      <form class="form" id="sb-cfg-form"><label class="field"><span>Project URL</span><input class="in" id="sb-url" placeholder="https://xxxxxxxx.supabase.co" required></label>
      <label class="field"><span>Chave anon public</span><input class="in" id="sb-key" placeholder="eyJhbGciOi..." required></label>
      <button class="btn btn-p" type="submit">${ic('cloud')}Conectar</button></form>`;
    },
    syncOld: () => S.mode === 'db'
      ? `<div class="card-h">${ic('sync')}<h2>Sincronização</h2><span class="sp"></span><span class="tag g">ligada</span></div><p class="sub" style="margin:0">Tudo fica salvo na sua conta do Claude. Abra este mesmo link no celular e no computador — o que você anota em um aparece no outro.</p>`
      : `<div class="card-h">${ic('phone')}<h2>Onde seus dados ficam</h2><span class="sp"></span><span class="tag y">neste aparelho</span></div><p class="sub" style="margin:0">Esta cópia salva só neste navegador. Para usar no celular e no computador com os mesmos dados, abra pelo link do Claude — lá a sincronização é automática. Use o backup para levar os dados de um lugar para outro.</p>`,
  },
};
})();
</script>
