<script>
(() => {
'use strict';
/* =========================================================
   Peças de interface: aviso, janelas, menus e formulários
   ========================================================= */
const MF = window.MF;
const { $, $$, esc, uid, brl, nf, ic, todayS, mOf, mAdd, mDays, mLabel, pad, dn, MES, MES3, S, UI, isDemo, cfg, cats, catsRec, catOf,
  accList, accOf, invAccs, balAt, parseMoney, moneyIn, store, CLASSES, ACC_TIPOS, SUB_SUGEST, CAT_ICONS, COLORS, clamp, shortDate } = MF;

// ---------- aviso rápido ----------
function toast(msg, undo) {
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `${ic('check')}<span>${esc(msg)}</span>${undo ? '<button type="button">Desfazer</button>' : ''}`;
  if (undo) el.querySelector('button').onclick = () => { undo(); el.remove(); };
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), undo ? 6000 : 3200);
}
MF.toast = toast; MF.setToast(toast);

// ---------- janela (modal no computador, folha no celular) ----------
function modal(html, onMount, cls = '') {
  closeModal();
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'ov';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  $('#modals').appendChild(ov);
  const m = ov.firstElementChild;
  $$('[data-close]', m).forEach(b => b.addEventListener('click', closeModal));
  onMount && onMount(m);
  const f = m.querySelector('[autofocus]') || m.querySelector('input:not([type=hidden]):not([type=checkbox]),select');
  if (f && matchMedia('(min-width: 861px)').matches) setTimeout(() => f.focus(), 30);
  return m;
}
function closeModal() { const o = $('#ov'); if (o) o.remove(); }
const head = t => `<div class="modal-h"><h2>${t}</h2><button type="button" class="icon-btn" data-close aria-label="Fechar">${ic('x')}</button></div>`;
MF.modal = modal; MF.closeModal = closeModal;

function confirmBox(title, text, yes, onYes, danger = true) {
  modal(`${head(esc(title))}<p class="sub" style="font-size:14.5px;margin:0">${text}</p><div class="modal-f"><button class="btn" data-close>Cancelar</button><button class="btn ${danger ? 'btn-danger' : 'btn-p'}" id="cf-yes">${esc(yes)}</button></div>`,
    m => { $('#cf-yes', m).onclick = () => { closeModal(); onYes(); }; });
}
MF.confirmBox = confirmBox;

// ---------- menus flutuantes ----------
function closePop() { $('#pops').innerHTML = ''; }
function pop(anchor, html, onMount) {
  closePop();
  const p = document.createElement('div'); p.className = 'pop'; p.innerHTML = html;
  $('#pops').appendChild(p);
  const r = anchor.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
  let left = Math.min(r.right - w, innerWidth - w - 12); left = Math.max(12, left);
  let top = r.bottom + 8; if (top + h > innerHeight - 12) top = Math.max(12, r.top - h - 8);
  p.style.left = left + 'px'; p.style.top = top + 'px';
  onMount && onMount(p);
  setTimeout(() => { const off = e => { if (!p.contains(e.target)) { closePop(); document.removeEventListener('pointerdown', off, true); } }; document.addEventListener('pointerdown', off, true); }, 0);
  return p;
}
function menu(anchor, items) {
  pop(anchor, items.map((it, i) => `<button class="mi" data-i="${i}">${it.icon ? ic(it.icon) : ''}${esc(it.label)}${it.on ? `<span style="margin-left:auto;color:var(--green)">${ic('check')}</span>` : ''}</button>`).join(''),
    p => $$('button.mi', p).forEach(b => b.onclick = () => { closePop(); items[+b.dataset.i].fn(); }));
}
function monthPop(anchor) {
  let y = +UI.month.slice(0, 4); const cur = mOf(todayS());
  const draw = p => { p.innerHTML = `<div class="pop-h"><button class="icon-btn" data-y="-1" aria-label="Ano anterior">${ic('left')}</button><span>${y}</span><button class="icon-btn" data-y="1" aria-label="Próximo ano">${ic('right')}</button></div>
    <div class="months">${MES3.map((l, i) => { const m = y + '-' + pad(i + 1); return `<button data-m="${m}" class="${m === UI.month ? 'on' : ''}" ${m > cur ? 'disabled' : ''}>${l}</button>`; }).join('')}</div>`;
    $$('[data-y]', p).forEach(b => b.onclick = () => { y += +b.dataset.y; draw(p); });
    $$('[data-m]', p).forEach(b => b.onclick = () => { UI.month = b.dataset.m; closePop(); MF.render(); }); };
  pop(anchor, '', draw);
}
MF.pop = pop; MF.menu = menu; MF.closePop = closePop; MF.monthPop = monthPop;

// ---------- avisos do sininho ----------
function notifications() {
  if (!S.ready) return [];
  const out = [], t = todayS(), m = mOf(t), mm = MF.D().M(m), b = cfg().budgets || {};
  for (const p of MF.pendingSubs()) if (!p.sub.auto) out.push({ icon: 'repeat', cor: 'var(--gold)', t: `${p.sub.nome} venceu dia ${+p.date.slice(8)}`, s: `Toque para lançar ${brl(p.sub.valor)}`, act: () => launchSub(p) });
  for (const u of MF.upcomingSubs(3)) out.push({ icon: 'cal', cor: 'var(--blue)', t: `${u.sub.nome} ${u.k === 0 ? 'vence hoje' : u.k === 1 ? 'vence amanhã' : 'vence em ' + u.k + ' dias'}`, s: brl(u.sub.valor), act: () => MF.go('planejamento') });
  for (const c of cats()) { const lim = +b[c.id], v = mm.cats[c.id] || 0; if (lim && v >= lim * .8) out.push({ icon: 'alert', cor: v >= lim ? 'var(--red)' : 'var(--gold)', t: `${c.nome}: ${nf(v / lim * 100, 0)}% do limite`, s: `${brl(v)} de ${brl(lim)} em ${MES[+m.slice(5) - 1]}`, act: () => MF.go('gastos') }); }
  for (const c of MF.cardList()) {
    if (c.ativo === false) continue;
    const st = MF.cardStats(c.id), k = dn(st.venceFechada) - dn(t);
    if (st.fechada > 0 && k >= -10 && k <= 5) out.push({ icon: 'card', cor: k < 0 ? 'var(--red)' : 'var(--gold)', t: `Fatura do ${c.nome} ${k < 0 ? 'venceu dia ' + (+st.venceFechada.slice(8)) : k === 0 ? 'vence hoje' : 'vence em ' + k + ' dias'}`, s: `${brl(st.fechada)} — toque para registrar o pagamento`, act: () => payFatura(c.id) });
    if (st.limite && st.pct >= .8) out.push({ icon: 'alert', cor: st.pct >= 1 ? 'var(--red)' : 'var(--gold)', t: `${c.nome}: ${nf(st.pct * 100, 0)}% do limite usado`, s: `sobram ${brl(st.livre)} de ${brl(st.limite)}`, act: () => MF.go('carteira') });
  }
  const db = MF.dailyBudget(); if (db && db.rest < 0) out.push({ icon: 'alert', cor: 'var(--red)', t: 'Você passou do limite de hoje', s: `${brl(-db.rest)} acima de ${brl(db.per)}`, act: () => MF.go('gastos') });
  for (const g of Object.values(MF.src().goals)) if (MF.goalProgress(g).p >= 1) out.push({ icon: 'target', cor: 'var(--green)', t: `Meta “${g.nome}” batida!`, s: 'Hora de criar a próxima', act: () => MF.go('metas') });
  if (dn(t) - dn(cfg().cdiData) > 45) out.push({ icon: 'bars', cor: 'var(--blue)', t: 'Confira a taxa do CDI', s: `Última atualização em ${shortDate(cfg().cdiData)}`, act: () => MF.go('config') });
  return out;
}
MF.notifications = notifications;
function notifPop(anchor) {
  const list = notifications();
  pop(anchor, `<div class="pop-h" style="padding:8px 10px">Avisos</div>${list.length ? list.map((n, i) => `<button class="mi notif" data-i="${i}" style="align-items:flex-start"><span style="color:${n.cor}">${ic(n.icon)}</span><span>${esc(n.t)}<small>${esc(n.s)}</small></span></button>`).join('') : '<div class="notif"><span class="sub">Tudo em dia por aqui.</span></div>'}`,
    p => $$('[data-i]', p).forEach(b => b.onclick = () => { closePop(); list[+b.dataset.i].act(); }));
}
MF.notifPop = notifPop;

// ---------- modo exemplo: qualquer gravação pede o cadastro inicial ----------
function guard() { if (isDemo()) { onboarding(); return true; } return false; }
MF.guard = guard;

// ---------- campos reutilizáveis ----------
const accOptions = (sel, filter) => accList().filter(filter || (() => true)).map(a => `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.nome)}</option>`).join('');
const catChips = (list, sel) => list.map(c => `<button type="button" class="chip ${c.id === sel ? 'on' : ''}" style="--c:${c.cor}" data-cat="${esc(c.id)}"><span class="cdot">${ic(c.icon)}</span>${esc(c.nome)}</button>`).join('');
function wireChips(m, name) { $$('[data-cat]', m).forEach(b => b.onclick = () => { $$('[data-cat]', m).forEach(x => x.classList.toggle('on', x === b)); m.dataset[name] = b.dataset.cat; }); }
// ---------- "pagou com": contas e cartoes juntos ----------
const payValue = t => t && t.cartao ? 'card:' + t.cartao : 'acc:' + (t && t.conta ? t.conta : MF.defaultAcc());
function payOptions(sel) {
  const cds = MF.cardList().filter(c => c.ativo !== false);
  const accs = accList().map(a => `<option value="acc:${esc(a.id)}" ${sel === 'acc:' + a.id ? 'selected' : ''}>${esc(a.nome)}</option>`).join('');
  const cards = cds.map(c => { const st = MF.cardStats(c.id); return `<option value="card:${esc(c.id)}" ${sel === 'card:' + c.id ? 'selected' : ''}>${esc(c.nome)} · sobra ${brl(st.livre)}</option>`; }).join('');
  return `<optgroup label="Contas">${accs || '<option value="">(sem conta)</option>'}</optgroup>${cards ? `<optgroup label="Cartões de crédito">${cards}</optgroup>` : ''}`;
}
function payParse(v) {
  const [k, id] = String(v || '').split(':');
  return k === 'card' ? { cartao: id, conta: '' } : { conta: id || MF.defaultAcc(), cartao: '' };
}
// mostra na hora quanto sobra de limite (ou de saldo) depois do gasto digitado
function wirePayHint(selEl, valEl, hintEl) {
  const upd = () => {
    const p = payParse(selEl.value), v = parseMoney(valEl.value) || 0;
    if (p.cartao) {
      const st = MF.cardStats(p.cartao), dep = st.livre - v;
      hintEl.innerHTML = `${ic('card')}<span>Limite: <b>${brl(st.livre)}</b> livres de ${brl(st.limite)}${v ? ` · depois deste gasto: <b class="${dep < 0 ? 'neg' : 'pos'}">${brl(dep)}</b>` : ''} · fatura atual ${brl(st.atual + v)}</span>`;
      hintEl.hidden = false;
    } else if (p.conta) {
      const b = MF.balAt(p.conta, todayS());
      hintEl.innerHTML = `${ic('wallet')}<span>Saldo: <b>${brl(b)}</b>${v ? ` · depois deste gasto: <b class="${b - v < 0 ? 'neg' : ''}">${brl(b - v)}</b>` : ''}</span>`;
      hintEl.hidden = false;
    } else hintEl.hidden = true;
  };
  selEl.addEventListener('change', upd); valEl.addEventListener('input', upd); upd();
  return upd;
}
MF.payOptions = payOptions; MF.payParse = payParse; MF.wirePayHint = wirePayHint; MF.payValue = payValue;

function money(id, v, big, label = 'Valor') { return `<div class="money ${big ? 'big' : ''}"><input class="in num" id="${id}" inputmode="decimal" placeholder="0,00" value="${moneyIn(v)}" aria-label="${esc(label)}"></div>`; }
function need(v, el, msg) { if (!(v > 0)) { toast(msg); el && el.focus(); return false; } return true; }

// ---------- gasto / receita ----------
function txForm(tipo, tx) {
  if (guard()) return;
  const isEdit = !!tx; tipo = tx ? tx.tipo : tipo;
  const m = modal(`${head(isEdit ? 'Editar lançamento' : tipo === 'receita' ? 'Nova receita' : 'Novo gasto')}
    <form class="form" id="tf">
      ${isEdit ? '' : `<div class="seg full"><button type="button" data-t="despesa" class="${tipo === 'despesa' ? 'on' : ''}">Gasto</button><button type="button" data-t="receita" class="${tipo === 'receita' ? 'on' : ''}">Receita</button></div>`}
      <label class="field"><span>Valor</span>${money('tf-v', tx && tx.valor, true)}</label>
      <div class="field"><span>Categoria</span><div class="chips" id="tf-cats"></div></div>
      <label class="field"><span>Descrição (opcional)</span><input class="in" id="tf-d" maxlength="80" value="${esc(tx ? tx.desc || '' : '')}"></label>
      <div class="two"><label class="field"><span>Dia</span><input class="in" type="date" id="tf-dt" value="${tx ? tx.data : UI.day <= todayS() && UI.route === 'gastos' ? UI.day : todayS()}"></label>
      <label class="field"><span id="tf-cl">${tipo === 'receita' ? 'Entrou em' : 'Pagou com'}</span><select class="in" id="tf-c">${tipo === 'receita' ? accOptions(tx ? tx.conta : MF.defaultAcc()) : payOptions(payValue(tx))}</select></label></div>
      <div class="pay-hint" id="tf-hint" hidden></div>
      <div class="modal-f">${isEdit ? `<button type="button" class="btn btn-danger" id="tf-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div>
    </form>`, m => {
    const drawCats = () => { const list = tipo === 'receita' ? catsRec() : cats(); let sel = m.dataset.cat; if (!list.some(c => c.id === sel)) sel = (tx && tx.tipo === tipo ? tx.cat : null) || (tipo === 'receita' ? list[0].id : UI.gCat) || list[0].id; m.dataset.cat = sel; $('#tf-cats', m).innerHTML = catChips(list, sel); wireChips(m, 'cat'); };
    drawCats();
    const selEl = $('#tf-c', m), upd = wirePayHint(selEl, $('#tf-v', m), $('#tf-hint', m));
    $$('[data-t]', m).forEach(b => b.onclick = () => {
      tipo = b.dataset.t; $$('[data-t]', m).forEach(x => x.classList.toggle('on', x === b));
      $('#tf-cl', m).textContent = tipo === 'receita' ? 'Entrou em' : 'Pagou com';
      selEl.innerHTML = tipo === 'receita' ? accOptions(MF.defaultAcc()) : payOptions('acc:' + MF.defaultAcc());
      upd(); m.dataset.cat = ''; drawCats();
    });
    if (isEdit) $('#tf-del', m).onclick = () => { closeModal(); delTx(tx); };
    $('#tf', m).onsubmit = e => { e.preventDefault(); const v = parseMoney($('#tf-v', m).value); if (!need(v, $('#tf-v', m), 'Digite o valor.')) return;
      const pay = tipo === 'receita' ? { conta: $('#tf-c', m).value, cartao: '' } : payParse($('#tf-c', m).value);
      const nt = { ...(tx || {}), id: tx ? tx.id : uid('t'), tipo, valor: v, cat: m.dataset.cat, desc: $('#tf-d', m).value.trim(), data: $('#tf-dt', m).value || todayS(), conta: pay.conta, cartao: pay.cartao, criado: tx ? tx.criado : Date.now() };
      store.putTx(nt, tx); closeModal(); toast(isEdit ? 'Lançamento atualizado' : tipo === 'receita' ? 'Receita adicionada' : 'Gasto adicionado', isEdit ? null : () => store.delTx(nt)); };
  });
}
function delTx(tx) {
  if (guard()) return;
  if (tx.sub && tx.id.startsWith('sub_')) { const s = MF.src().subs[tx.sub]; if (s) store.put('subs', { ...s, pulados: [...new Set([...(s.pulados || []), mOf(tx.data)])] }); }
  store.delTx(tx);
  toast('Lançamento apagado', () => { store.putTx(tx); const s = MF.src().subs[tx.sub]; if (s && s.pulados) store.put('subs', { ...s, pulados: s.pulados.filter(x => x !== mOf(tx.data)) }); });
}
MF.txForm = txForm; MF.delTx = delTx;

// ---------- transferir / guardar / resgatar ----------
function transferForm(o = {}) {
  if (guard()) return;
  if (accList().length < 2) { toast('Cadastre pelo menos duas contas na Carteira.'); MF.go('carteira'); return; }
  const tx = o.tx, de = tx ? tx.de : o.de || MF.defaultAcc(), para = tx ? tx.para : o.para || (accList().find(a => a.id !== de) || {}).id;
  const title = tx ? 'Editar transferência' : o.title || 'Transferir entre contas';
  modal(`${head(esc(title))}<form class="form" id="xf">
    <label class="field"><span>Valor</span>${money('xf-v', tx && tx.valor, true)}</label>
    <div class="two"><label class="field"><span>Sai de</span><select class="in" id="xf-de">${accOptions(de)}</select></label><label class="field"><span>Vai para</span><select class="in" id="xf-para">${accOptions(para)}</select></label></div>
    <div class="two"><label class="field"><span>Dia</span><input class="in" type="date" id="xf-dt" value="${tx ? tx.data : todayS()}"></label><label class="field"><span>Descrição</span><input class="in" id="xf-d" maxlength="80" value="${esc(tx ? tx.desc || '' : o.desc || '')}" placeholder="opcional"></label></div>
    <div class="modal-f">${tx ? `<button type="button" class="btn btn-danger" id="xf-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Confirmar</button></div></form>`, m => {
    if (tx) $('#xf-del', m).onclick = () => { closeModal(); delTx(tx); };
    $('#xf', m).onsubmit = e => { e.preventDefault(); const v = parseMoney($('#xf-v', m).value); if (!need(v, $('#xf-v', m), 'Digite o valor.')) return;
      const a = $('#xf-de', m).value, b = $('#xf-para', m).value; if (a === b) { toast('Escolha contas diferentes.'); return; }
      const pb = accOf(b), pa = accOf(a), desc = $('#xf-d', m).value.trim() || (pb && pb.tipo === 'invest' ? 'Guardar no ' + pb.nome : pa && pa.tipo === 'invest' ? 'Resgate do ' + pa.nome : 'Transferência');
      const nt = { ...(tx || {}), id: tx ? tx.id : uid('t'), tipo: 'transf', valor: v, de: a, para: b, desc, data: $('#xf-dt', m).value || todayS(), criado: tx ? tx.criado : Date.now() };
      store.putTx(nt, tx); closeModal(); toast(tx ? 'Transferência atualizada' : desc, tx ? null : () => store.delTx(nt)); };
  });
}
function adjustForm(acc, tx) {
  if (guard()) return;
  acc = acc || accOf(tx.conta); if (!acc) return;
  const d0 = tx ? tx.data : todayS(), est = balAt(acc.id, d0);
  modal(`${head('Conferir saldo — ' + esc(acc.nome))}<form class="form" id="af">
    <div class="note">${ic('info')}<span>Pelo app, o saldo ${tx ? 'era' : 'está'} em <b class="num" style="color:var(--text)">${brl(est)}</b>. Digite o valor que aparece no ${esc(acc.nome)} — a diferença ${acc.tipo === 'invest' ? 'entra como rendimento' : 'é corrigida'}.</span></div>
    <label class="field"><span>Saldo real</span>${money('af-v', tx ? tx.saldo : null, true, 'Saldo real')}</label>
    <label class="field"><span>Em que dia</span><input class="in" type="date" id="af-dt" value="${d0}" max="${todayS()}"></label>
    <div class="modal-f">${tx ? `<button type="button" class="btn btn-danger" id="af-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar saldo</button></div></form>`, m => {
    if (tx) $('#af-del', m).onclick = () => { closeModal(); delTx(tx); };
    $('#af', m).onsubmit = e => { e.preventDefault(); const v = parseMoney($('#af-v', m).value); if (isNaN(v)) { toast('Digite o saldo.'); return; }
      const nt = { ...(tx || {}), id: tx ? tx.id : uid('t'), tipo: 'ajuste', conta: acc.id, saldo: v, data: $('#af-dt', m).value || todayS(), criado: tx ? tx.criado : Date.now() };
      store.putTx(nt, tx); closeModal(); toast(`Saldo de ${acc.nome} conferido`); };
  });
}
MF.transferForm = transferForm; MF.adjustForm = adjustForm;

// ---------- contas ----------
function accForm(acc, tipo0) {
  if (guard()) return;
  let tipo = acc ? acc.tipo : tipo0 || 'conta';
  const isEdit = !!acc;
  modal(`${head(isEdit ? 'Editar ' + esc(acc.nome) : tipo === 'invest' ? 'Novo investimento' : 'Nova conta')}<form class="form" id="cf">
    <div class="seg full">${Object.entries(ACC_TIPOS).map(([k, v]) => `<button type="button" data-t="${k}" class="${tipo === k ? 'on' : ''}">${v.nome}</button>`).join('')}</div>
    <label class="field"><span>Nome</span><input class="in" id="cf-n" maxlength="40" value="${esc(acc ? acc.nome : tipo === 'invest' ? 'Mercado Pago' : '')}" placeholder="Ex.: Nubank, Mercado Pago, Carteira" required></label>
    <div class="two"><label class="field"><span id="cf-sl">${isEdit ? 'Saldo inicial' : 'Saldo de hoje'}</span>${money('cf-s', acc ? acc.saldoInicial : null, false, 'Saldo')}</label>
    <label class="field"><span>Saldo na data de</span><input class="in" type="date" id="cf-dt" value="${acc ? acc.dataInicial : todayS()}" max="${todayS()}"></label></div>
    <div class="two" id="cf-inv"><label class="field"><span>Rende quanto do CDI (%)</span><input class="in num" id="cf-p" inputmode="decimal" value="${acc ? acc.cdiPct || 0 : tipo === 'invest' ? 105 : 0}"><small>0 = não rende</small></label>
    <label class="field" id="cf-cl"><span>Tipo de ativo</span><select class="in" id="cf-c">${CLASSES.map(c => `<option value="${c.id}" ${(acc ? acc.classe || 'rf' : 'rf') === c.id ? 'selected' : ''}>${c.nome}</option>`).join('')}</select></label></div>
    <label class="check" id="cf-defw"><input type="checkbox" id="cf-def" ${acc && acc.id === MF.defaultAcc() ? 'checked' : ''}> Usar como conta padrão dos gastos</label>
    <div class="modal-f">${isEdit ? `<button type="button" class="btn btn-danger" id="cf-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    const sync = () => { $('#cf-cl', m).hidden = tipo !== 'invest'; $('#cf-defw', m).hidden = tipo === 'invest'; };
    sync();
    $$('[data-t]', m).forEach(b => b.onclick = () => { tipo = b.dataset.t; $$('[data-t]', m).forEach(x => x.classList.toggle('on', x === b)); if (tipo === 'invest' && !(+$('#cf-p', m).value)) $('#cf-p', m).value = 105; sync(); });
    if (isEdit) $('#cf-del', m).onclick = () => { const used = MF.D().txs.some(t => t.conta === acc.id || t.de === acc.id || t.para === acc.id);
      confirmBox('Apagar ' + acc.nome + '?', used ? 'Os lançamentos ligados a ela continuam nos relatórios, mas deixam de contar no saldo.' : 'Essa conta não tem lançamentos.', 'Apagar conta', () => store.del('accounts', acc.id)); };
    $('#cf', m).onsubmit = e => { e.preventDefault(); const nome = $('#cf-n', m).value.trim(); if (!nome) { toast('Dê um nome para a conta.'); return; }
      const p = parseFloat(String($('#cf-p', m).value).replace(',', '.')) || 0;
      const a = { ...(acc || {}), id: acc ? acc.id : uid('a'), nome, tipo, saldoInicial: parseMoney($('#cf-s', m).value) || 0, dataInicial: $('#cf-dt', m).value || todayS(), cdiPct: clamp(p, 0, 300), classe: tipo === 'invest' ? $('#cf-c', m).value : undefined, ordem: acc ? acc.ordem : accList().length };
      store.put('accounts', a);
      if (tipo !== 'invest' && ($('#cf-def', m).checked || !MF.defaultAcc())) store.saveSettings({ contaPadrao: a.id });
      closeModal(); toast(isEdit ? 'Conta atualizada' : 'Conta criada'); };
  });
}
MF.accForm = accForm;

// ---------- cartões de crédito ----------
function cardForm(card) {
  if (guard()) return;
  const isEdit = !!card;
  modal(`${head(isEdit ? 'Editar ' + esc(card.nome) : 'Novo cartão de crédito')}<form class="form" id="kc" data-cor="${esc(card ? card.cor || COLORS[2] : COLORS[2])}">
    ${isEdit ? '' : `<div class="chips">${['Nubank', 'Itaú', 'Inter', 'C6 Bank', 'Bradesco', 'Santander', 'Caixa', 'Banco do Brasil', 'Mercado Pago', 'PicPay'].map(n => `<button type="button" class="chip" style="--c:var(--indigo)" data-nome="${n}"><span class="cdot">${ic('card')}</span>${n}</button>`).join('')}</div>`}
    <label class="field"><span>Nome do cartão</span><input class="in" id="kc-n" maxlength="30" value="${esc(card ? card.nome : '')}" placeholder="Ex.: Nubank" required></label>
    <label class="field"><span>Limite total</span>${money('kc-l', card && card.limite)}<small>o valor que o banco liberou para você</small></label>
    <div class="two"><label class="field"><span>Fecha no dia</span><input class="in num" type="number" min="1" max="31" id="kc-f" value="${card ? card.fechamento : 3}"></label>
    <label class="field"><span>Vence no dia</span><input class="in num" type="number" min="1" max="31" id="kc-v" value="${card ? card.vencimento : 10}"></label></div>
    <label class="field"><span>Fatura é paga por</span><select class="in" id="kc-c">${accOptions(card ? card.conta : MF.defaultAcc(), a => a.tipo !== 'invest')}</select></label>
    <div class="field"><span>Cor</span><div class="swatches">${COLORS.map(x => `<button type="button" data-cor="${x}" style="--c:${x}" aria-label="cor"></button>`).join('')}</div></div>
    <label class="check"><input type="checkbox" id="kc-on" ${!card || card.ativo !== false ? 'checked' : ''}> Cartão em uso</label>
    <div class="modal-f">${isEdit ? `<button type="button" class="btn btn-danger" id="kc-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    const f = $('#kc', m), sync = () => $$('button[data-cor]', m).forEach(b => b.classList.toggle('on', b.dataset.cor === f.dataset.cor));
    sync();
    $$('button[data-cor]', m).forEach(b => b.onclick = () => { f.dataset.cor = b.dataset.cor; sync(); });
    $$('[data-nome]', m).forEach(b => b.onclick = () => { $('#kc-n', m).value = b.dataset.nome; $('#kc-l', m).focus(); });
    if (isEdit) $('#kc-del', m).onclick = () => confirmBox('Apagar ' + card.nome + '?', 'Os gastos feitos nele continuam no histórico, mas deixam de contar limite e fatura.', 'Apagar cartão', () => { store.del('cards', card.id); closeModal(); });
    f.onsubmit = e => { e.preventDefault(); const nome = $('#kc-n', m).value.trim(), lim = parseMoney($('#kc-l', m).value);
      if (!nome) { toast('Dê um nome para o cartão.'); return; }
      if (!need(lim, $('#kc-l', m), 'Digite o limite do cartão.')) return;
      store.put('cards', { ...(card || {}), id: card ? card.id : uid('k'), nome, limite: lim,
        fechamento: clamp(Math.round(+$('#kc-f', m).value || 1), 1, 31), vencimento: clamp(Math.round(+$('#kc-v', m).value || 10), 1, 31),
        conta: $('#kc-c', m).value, cor: f.dataset.cor, ativo: $('#kc-on', m).checked });
      closeModal(); toast(isEdit ? 'Cartão atualizado' : 'Cartão adicionado'); };
  });
}
function payFatura(cardId) {
  if (guard()) return;
  const st = MF.cardStats(cardId), card = st.card;
  if (!st.usado) { toast('Não há fatura em aberto neste cartão.'); return; }
  const sug = st.fechada || st.usado;
  modal(`${head('Pagar fatura — ' + esc(card.nome))}<form class="form" id="pf">
    <div class="note">${ic('card')}<span>Fatura fechada: <b>${brl(st.fechada)}</b> (vence ${shortDate(st.venceFechada)}) · fatura atual, ainda aberta: <b>${brl(st.atual)}</b> (fecha ${shortDate(st.fecha)}).</span></div>
    <label class="field"><span>Quanto você pagou</span>${money('pf-v', sug, true, 'Valor pago')}<small>pagou só uma parte? coloque o valor pago — o resto continua ocupando o limite</small></label>
    <div class="two"><label class="field"><span>Saiu de</span><select class="in" id="pf-c">${accOptions(card.conta || MF.defaultAcc(), a => a.tipo !== 'invest')}</select></label>
    <label class="field"><span>Dia</span><input class="in" type="date" id="pf-dt" value="${todayS()}"></label></div>
    <div class="modal-f"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Confirmar pagamento</button></div></form>`, m => {
    $('#pf', m).onsubmit = e => { e.preventDefault(); const v = parseMoney($('#pf-v', m).value); if (!need(v, $('#pf-v', m), 'Digite o valor pago.')) return;
      const t = { id: uid('t'), tipo: 'pagfatura', valor: v, cartao: cardId, conta: $('#pf-c', m).value, desc: 'Fatura ' + card.nome, data: $('#pf-dt', m).value || todayS(), criado: Date.now() };
      store.putTx(t); closeModal(); toast(`Fatura do ${card.nome} paga`, () => store.delTx(t)); };
  });
}
MF.cardForm = cardForm; MF.payFatura = payFatura;

// ---------- assinaturas / contas fixas ----------
function subForm(sub) {
  if (guard()) return;
  const isEdit = !!sub;
  modal(`${head(isEdit ? 'Editar ' + esc(sub.nome) : 'Nova assinatura ou conta fixa')}<form class="form" id="sf">
    ${isEdit ? '' : `<div class="chips">${SUB_SUGEST.map(([n, v]) => `<button type="button" class="chip" style="--c:var(--indigo)" data-sug="${esc(n)}" data-v="${v}">${esc(n)}</button>`).join('')}</div>`}
    <label class="field"><span>Nome</span><input class="in" id="sf-n" maxlength="40" value="${esc(sub ? sub.nome : '')}" required></label>
    <div class="two"><label class="field"><span>Valor por mês</span>${money('sf-v', sub && sub.valor)}</label><label class="field"><span>Dia do vencimento</span><input class="in num" type="number" min="1" max="31" id="sf-d" value="${sub ? sub.dia : +todayS().slice(8)}"></label></div>
    <div class="two"><label class="field"><span>Categoria</span><select class="in" id="sf-c">${cats().map(c => `<option value="${esc(c.id)}" ${(sub ? sub.cat : 'assinaturas') === c.id ? 'selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label>
    <label class="field"><span>Paga com</span><select class="in" id="sf-a">${payOptions(payValue(sub))}</select></label></div>
    <label class="check"><input type="checkbox" id="sf-auto" ${!sub || sub.auto ? 'checked' : ''}> Lançar sozinho todo mês no dia do vencimento</label>
    <label class="check"><input type="checkbox" id="sf-on" ${!sub || sub.ativo ? 'checked' : ''}> Ativa (desmarque se cancelou)</label>
    <div class="modal-f">${isEdit ? `<button type="button" class="btn btn-danger" id="sf-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    $$('[data-sug]', m).forEach(b => b.onclick = () => { $('#sf-n', m).value = b.dataset.sug; $('#sf-v', m).value = moneyIn(+b.dataset.v); $('#sf-c', m).value = ['Internet', 'Celular'].includes(b.dataset.sug) ? 'moradia' : b.dataset.sug === 'Academia' ? 'saude' : 'assinaturas'; });
    if (isEdit) $('#sf-del', m).onclick = () => confirmBox('Apagar ' + sub.nome + '?', 'Os meses já lançados continuam no histórico.', 'Apagar', () => { store.del('subs', sub.id); closeModal(); });
    $('#sf', m).onsubmit = e => { e.preventDefault(); const nome = $('#sf-n', m).value.trim(), v = parseMoney($('#sf-v', m).value); if (!nome) { toast('Dê um nome.'); return; } if (!need(v, $('#sf-v', m), 'Digite o valor.')) return;
      const s = { ...(sub || {}), id: sub ? sub.id : uid('s'), nome, valor: v, dia: clamp(Math.round(+$('#sf-d', m).value || 1), 1, 31), cat: $('#sf-c', m).value, ...payParse($('#sf-a', m).value), auto: $('#sf-auto', m).checked, ativo: $('#sf-on', m).checked, desde: sub ? sub.desde : mOf(todayS()) };
      store.put('subs', s); closeModal(); toast(isEdit ? 'Atualizado' : 'Adicionado'); setTimeout(MF.autoLaunch, 300); };
  });
}
function launchSub(p) {
  if (guard()) return;
  store.putTx({ id: p.id, tipo: 'despesa', valor: p.sub.valor, cat: p.sub.cat, desc: p.sub.nome, data: p.date, conta: p.sub.conta || MF.defaultAcc(), sub: p.sub.id, criado: Date.now() });
  toast(`${p.sub.nome} lançada`);
}
MF.subForm = subForm; MF.launchSub = launchSub;

// ---------- metas ----------
function goalForm(g) {
  if (guard()) return;
  const isEdit = !!g; let modo = g ? g.modo : (invAccs().length ? 'conta' : 'manual');
  modal(`${head(isEdit ? 'Editar meta' : 'Nova meta')}<form class="form" id="gf" data-icon="${esc(g ? g.icon || 'target' : 'target')}" data-cor="${esc(g ? g.cor || COLORS[5] : COLORS[5])}">
    <label class="field"><span>Nome da meta</span><input class="in" id="gf-n" maxlength="40" value="${esc(g ? g.nome : '')}" placeholder="Ex.: Reserva de emergência" required></label>
    <div class="two"><label class="field"><span>Quanto quer juntar</span>${money('gf-a', g && g.alvo)}</label><label class="field"><span>Até quando</span><input class="in" type="month" id="gf-p" value="${esc(g ? g.prazo || '' : mAdd(mOf(todayS()), 12))}"></label></div>
    <div class="field"><span>Como acompanhar</span><div class="seg full"><button type="button" data-mo="conta" class="${modo === 'conta' ? 'on' : ''}">Saldo de uma conta</button><button type="button" data-mo="manual" class="${modo === 'manual' ? 'on' : ''}">Anotar à mão</button></div></div>
    <label class="field" id="gf-cw"><span>Conta</span><select class="in" id="gf-c">${accOptions(g ? g.conta : (invAccs()[0] || {}).id)}</select><small>O progresso é o saldo dessa conta (com o rendimento).</small></label>
    <label class="field" id="gf-gw"><span>Já guardei</span>${money('gf-g', g && g.guardado)}</label>
    <div class="field"><span>Ícone e cor</span><div class="icons-pick">${['target', 'home', 'car', 'game', 'gift', 'heart', 'book', 'phone', 'briefcase', 'spark'].map(i => `<button type="button" data-ic="${i}">${ic(i)}</button>`).join('')}</div><div class="swatches" style="margin-top:8px">${COLORS.map(c => `<button type="button" data-cor="${c}" style="--c:${c}" aria-label="cor"></button>`).join('')}</div></div>
    <div class="modal-f">${isEdit ? `<button type="button" class="btn btn-danger" id="gf-del" style="margin-right:auto">${ic('trash')}Apagar</button>` : ''}<button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    const f = $('#gf', m), sync = () => { $('#gf-cw', m).hidden = modo !== 'conta'; $('#gf-gw', m).hidden = modo !== 'manual'; $$('[data-ic]', m).forEach(b => b.classList.toggle('on', b.dataset.ic === f.dataset.icon)); $$('[data-cor]', m).forEach(b => b.classList.toggle('on', b.dataset.cor === f.dataset.cor)); };
    sync();
    $$('[data-mo]', m).forEach(b => b.onclick = () => { modo = b.dataset.mo; $$('[data-mo]', m).forEach(x => x.classList.toggle('on', x === b)); sync(); });
    $$('[data-ic]', m).forEach(b => b.onclick = () => { f.dataset.icon = b.dataset.ic; sync(); });
    $$('button[data-cor]', m).forEach(b => b.onclick = () => { f.dataset.cor = b.dataset.cor; sync(); });
    if (isEdit) $('#gf-del', m).onclick = () => confirmBox('Apagar a meta ' + g.nome + '?', 'O dinheiro nas contas não é afetado.', 'Apagar', () => { store.del('goals', g.id); closeModal(); });
    f.onsubmit = e => { e.preventDefault(); const nome = $('#gf-n', m).value.trim(), alvo = parseMoney($('#gf-a', m).value); if (!nome) { toast('Dê um nome para a meta.'); return; } if (!need(alvo, $('#gf-a', m), 'Digite quanto quer juntar.')) return;
      if (modo === 'conta' && !$('#gf-c', m).value) { toast('Cadastre uma conta antes, ou escolha “Anotar à mão”.'); return; }
      store.put('goals', { ...(g || {}), id: g ? g.id : uid('g'), nome, alvo, prazo: $('#gf-p', m).value || '', modo, conta: modo === 'conta' ? $('#gf-c', m).value : '', guardado: modo === 'manual' ? parseMoney($('#gf-g', m).value) || 0 : (g ? g.guardado || 0 : 0), icon: f.dataset.icon, cor: f.dataset.cor });
      closeModal(); toast(isEdit ? 'Meta atualizada' : 'Meta criada'); };
  });
}
function goalAdd(g) {
  if (guard()) return;
  modal(`${head('Adicionar em “' + esc(g.nome) + '”')}<form class="form" id="ga"><label class="field"><span>Quanto você separou</span>${money('ga-v', null, true)}<small>Use um valor negativo (ex.: -50) se tirou dinheiro da meta.</small></label>
    <div class="modal-f"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Adicionar</button></div></form>`, m => {
    $('#ga', m).onsubmit = e => { e.preventDefault(); const raw = $('#ga-v', m).value.trim(), neg = raw.startsWith('-'), v = parseMoney(raw.replace('-', '')); if (!need(v, $('#ga-v', m), 'Digite o valor.')) return;
      store.put('goals', { ...g, guardado: Math.max(0, (+g.guardado || 0) + (neg ? -v : v)) }); closeModal(); toast('Meta atualizada'); };
  });
}
MF.goalForm = goalForm; MF.goalAdd = goalAdd;

// ---------- categorias ----------
function catForm(c, rec) {
  if (guard()) return;
  const isEdit = !!c;
  modal(`${head(isEdit ? 'Editar categoria' : 'Nova categoria')}<form class="form" id="kf" data-icon="${esc(c ? c.icon : 'bag')}" data-cor="${esc(c ? c.cor : COLORS[7])}">
    <label class="field"><span>Nome</span><input class="in" id="kf-n" maxlength="30" value="${esc(c ? c.nome : '')}" required></label>
    <div class="field"><span>Ícone</span><div class="icons-pick">${CAT_ICONS.map(i => `<button type="button" data-ic="${i}">${ic(i)}</button>`).join('')}</div></div>
    <div class="field"><span>Cor</span><div class="swatches">${COLORS.map(x => `<button type="button" data-cor="${x}" style="--c:${x}" aria-label="cor"></button>`).join('')}</div></div>
    <div class="modal-f"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    const f = $('#kf', m), sync = () => { $$('[data-ic]', m).forEach(b => b.classList.toggle('on', b.dataset.ic === f.dataset.icon)); $$('button[data-cor]', m).forEach(b => b.classList.toggle('on', b.dataset.cor === f.dataset.cor)); };
    sync();
    $$('[data-ic]', m).forEach(b => b.onclick = () => { f.dataset.icon = b.dataset.ic; sync(); });
    $$('button[data-cor]', m).forEach(b => b.onclick = () => { f.dataset.cor = b.dataset.cor; sync(); });
    f.onsubmit = e => { e.preventDefault(); const nome = $('#kf-n', m).value.trim(); if (!nome) return;
      const list = (rec ? catsRec() : cats()).map(x => ({ ...x }));
      if (isEdit) { const i = list.findIndex(x => x.id === c.id); const changedName = nome !== c.nome; list[i] = { ...list[i], nome, icon: f.dataset.icon, cor: f.dataset.cor }; if (changedName) delete list[i].curto; }
      else list.splice(Math.max(0, list.length - (list.at(-1) && /^outros/.test(list.at(-1).id) ? 1 : 0)), 0, { id: uid('c'), nome, icon: f.dataset.icon, cor: f.dataset.cor });
      store.saveSettings(rec ? { catsRec: list } : { cats: list }); closeModal(); toast('Categoria salva'); };
  });
}
function catDel(id, rec) {
  if (guard()) return;
  const list = rec ? catsRec() : cats(), c = list.find(x => x.id === id); if (!c) return;
  if (list.length <= 1) { toast('Mantenha pelo menos uma categoria.'); return; }
  confirmBox('Apagar “' + c.nome + '”?', 'Os lançamentos dessa categoria passam a aparecer como “Outros”.', 'Apagar', () => store.saveSettings(rec ? { catsRec: list.filter(x => x.id !== id) } : { cats: list.filter(x => x.id !== id) }));
}
MF.catForm = catForm; MF.catDel = catDel;

// ---------- CDI ----------
function cdiForm() {
  if (guard()) return;
  const c = cfg();
  modal(`${head('Taxa do CDI')}<form class="form" id="df"><div class="two"><label class="field"><span>CDI (% ao ano)</span><input class="in num" id="df-v" inputmode="decimal" value="${nf(c.cdi, 2)}"></label><label class="field"><span>Data</span><input class="in" type="date" id="df-d" value="${c.cdiData}"></label></div>
    <small class="sub">Veja o valor do dia no site do Banco Central ou em qualquer app de banco (“CDI hoje”).</small>
    <div class="modal-f"><button type="button" class="btn" data-close>Cancelar</button><button class="btn btn-p" type="submit">${ic('check')}Salvar</button></div></form>`, m => {
    $('#df', m).onsubmit = e => { e.preventDefault(); const v = parseFloat(String($('#df-v', m).value).replace(',', '.')); if (!(v > 0 && v < 100)) { toast('Digite a taxa em % ao ano, ex.: 13,65'); return; }
      store.saveSettings({ cdi: v, cdiData: $('#df-d', m).value || todayS() }); closeModal(); toast('CDI atualizado'); };
  });
}
MF.cdiForm = cdiForm;

// ---------- primeiro acesso ----------
function onboarding() {
  const c = cfg();
  modal(`${head('Vamos começar, ' + esc(String(c.nome).split(' ')[0]) + '!')}
  <p class="sub" style="margin:-6px 0 16px;font-size:14px">Três números e o app já fica com a sua cara. Dá para mudar tudo depois.</p>
  <form class="form" id="ob">
    <label class="field"><span>Seu nome</span><input class="in" id="ob-n" value="${esc(c.nome)}" maxlength="40"></label>
    <div class="two"><label class="field"><span>Quanto tem hoje no Mercado Pago</span>${money('ob-mp', null, false, 'Saldo no Mercado Pago')}</label><label class="field"><span>Rende quanto do CDI (%)</span><input class="in num" id="ob-p" inputmode="decimal" value="105"></label></div>
    <div class="two"><label class="field"><span>Conta do dia a dia</span><input class="in" id="ob-cn" value="Conta principal" maxlength="40"><small>onde cai o salário e saem os gastos</small></label><label class="field"><span>Saldo dela hoje</span>${money('ob-cs', null, false, 'Saldo da conta')}</label></div>
    <div class="two"><label class="field"><span>Dinheiro vivo na carteira</span>${money('ob-d', null, false, 'Dinheiro vivo')}<small>opcional</small></label><label class="field"><span>Limite de gastos por mês</span>${money('ob-l', null, false, 'Limite do mês')}<small>opcional — vira o seu limite por dia</small></label></div>
    <label class="check"><input type="checkbox" id="ob-mpdef"> Uso o próprio Mercado Pago para pagar tudo (não tenho outra conta)</label>
    <div class="modal-f"><button type="button" class="btn" data-close>Agora não</button><button class="btn btn-p" type="submit">Começar ${ic('arrow')}</button></div>
  </form>`, m => {
    const tog = () => { const on = $('#ob-mpdef', m).checked; $('#ob-cn', m).closest('.two').hidden = on; };
    $('#ob-mpdef', m).onchange = tog;
    $('#ob', m).onsubmit = async e => { e.preventDefault(); const t = todayS(), only = $('#ob-mpdef', m).checked, p = parseFloat(String($('#ob-p', m).value).replace(',', '.')) || 105;
      const mp = { id: 'mercadopago', nome: 'Mercado Pago', tipo: 'invest', classe: 'rf', cdiPct: p, saldoInicial: parseMoney($('#ob-mp', m).value) || 0, dataInicial: t, ordem: 1 };
      const accs = [mp];
      if (!only) accs.push({ id: 'principal', nome: $('#ob-cn', m).value.trim() || 'Conta principal', tipo: 'conta', cdiPct: 0, saldoInicial: parseMoney($('#ob-cs', m).value) || 0, dataInicial: t, ordem: 0 });
      const cash = parseMoney($('#ob-d', m).value); if (cash > 0) accs.push({ id: 'carteira', nome: 'Dinheiro na carteira', tipo: 'dinheiro', cdiPct: 0, saldoInicial: cash, dataInicial: t, ordem: 2 });
      closeModal();
      for (const a of accs) await store.put('accounts', a);
      await store.saveSettings({ onboarded: true, nome: $('#ob-n', m).value.trim() || 'Juliemerson', contaPadrao: only ? 'mercadopago' : 'principal', limiteMensal: parseMoney($('#ob-l', m).value) || 0, cdi: cfg().cdi, cdiData: cfg().cdiData, criado: t });
      UI.day = t; UI.month = mOf(t); MF.go('gastos'); MF.rebuild(); toast('Pronto! Anote seu primeiro gasto.'); };
  });
}
MF.onboarding = onboarding;
})();
</script>
