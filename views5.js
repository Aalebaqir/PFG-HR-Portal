/* Phase 3: leave year (Apr–Mar for PK), PK probation allocation, shift patterns with effective dates,
   quotes / thought of the day, new-employee creation + credentials, bulk upload */

/* ================= THOUGHT OF THE DAY ================= */
const QUOTES = [
 'Small steps, taken every day, build the biggest results.','Great teams are built on trust, kindness and a shared goal.','Your attitude today shapes the day of everyone around you.',
 'Do the simple things well, every single time.','Progress, not perfection.','A good day starts with a good intention.','Quality is what we do when nobody is watching.',
 'Ask for help early – it makes the whole team stronger.','Every delivery, every order, every call is a chance to make someone’s day.','Courage is trying again tomorrow.',
 'Listen first. Understand. Then respond.','Safety is everyone’s job, every shift.','Learning never stops – stay curious.','Celebrate small wins; they add up to big ones.',
 'Be the colleague you would like to work with.','Fresh thinking starts with a fresh attitude.','Consistency beats intensity.','What you do today builds the business of tomorrow.',
 'A thank you costs nothing and means everything.','Challenges are just opportunities in work clothes.','Respect is the foundation of every strong team.','Focus on what you can control.',
 'Kind words are free – use plenty of them.','The best way to predict the future is to help create it.','Hard work and honesty never go out of style.','Together we deliver more than any of us can alone.',
 'Take pride in the details.','Your effort matters more than you know.','Stay positive, work hard, make it happen.','Today is a good day to improve something by 1%.',
 'Leave things a little better than you found them.','Teamwork turns ordinary days into great ones.','Energy is contagious – share the good kind.','Be proud of how far you have come.'];
const quoteIdx = (off=0) => { const t = D.today(); const doy = Math.floor((t - new Date(t.getFullYear(),0,0,12))/864e5); return (doy + off) % QUOTES.length; };
const quoteOfDay = (off=0) => QUOTES[quoteIdx(off)];
ACT.nextQuote = el => { ST.qoff = ((ST.qoff||0)+1) % QUOTES.length; const q = $('#tq'); if(q) q.textContent = '“'+quoteOfDay(ST.qoff)+'”'; };

/* ================= LEAVE YEAR + SHIFT PATTERNS (override helpers) ================= */
const PATTERNS_DEFAULT = [
 {id:'P5',name:'Mon–Fri',days:[1,2,3,4,5],start:'09:00',end:'17:30'},
 {id:'P6',name:'Mon–Sat',days:[1,2,3,4,5,6],start:'08:00',end:'16:30'},
 {id:'PT',name:'Tue–Sat',days:[2,3,4,5,6],start:'08:00',end:'16:30'},
 {id:'PU',name:'Sun–Thu',days:[0,1,2,3,4],start:'09:00',end:'17:30'},
 {id:'PW',name:'Wed–Sun',days:[3,4,5,6,0],start:'09:00',end:'17:30'},
 {id:'P3',name:'Mon / Wed / Fri (part-time)',days:[1,3,5],start:'09:00',end:'17:00'}];
const patterns = () => (DB.patterns ||= JSON.parse(JSON.stringify(PATTERNS_DEFAULT)));
function patternAt(e, iso){ const list = (e.shifts||[]).filter(s=>s.from<=iso).sort((a,b)=>a.from.localeCompare(b.from)); const id = list.length ? list[list.length-1].pattern : 'P5'; return patterns().find(p=>p.id===id) || patterns()[0]; }
function isRest(e, iso){ if(!e) return isWeekend(iso); return !patternAt(e,iso).days.includes(D.parse(iso).getDay()); }
const defShift = (e, d) => isRest(e,d) ? 'OFF' : 'D';
const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const patDays = p => p.days.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>dayNames[d]).join(' ');

const lyStart = e => ((DB.settings.leaveYearStart||{})[e.region]) || 1;
const leaveYearOf = (e, iso) => { const sm = lyStart(e), y = +iso.slice(0,4), m = +iso.slice(5,7); return sm===1 ? y : (m>=sm ? y : y-1); };
const curLY = e => leaveYearOf(e, D.todayIso());
function lyRange(e, ly){ const sm = lyStart(e), p = n => String(n).padStart(2,'0'); const from = `${ly}-${p(sm)}-01`; const next = sm===1 ? `${ly+1}-01-01` : `${ly+1}-${p(sm)}-01`; return [from, D.iso(D.add(D.parse(next),-1))]; }
const lyLabel = (e, ly) => lyStart(e)===1 ? String(ly) : `${ly}/${String(ly+1).slice(2)}`;
const lyText = (e, ly) => { const [a,b] = lyRange(e,ly); return `${fmt(a)} – ${fmt(b)}`; };

function entitlement(e, ly, kind='hol'){
  const [from, to] = lyRange(e, ly), S = DB.settings;
  const base = kind==='hol' ? ((S.quota[e.region]||0) + (e.extraDays||0)) : ((S.sickQuota||{})[e.region]||0);
  if(!base) return 0;
  const tot = D.diff(from,to)+1, pro = (a,b) => b<a ? 0 : Math.round(base*(D.diff(a,b)+1)/tot*2)/2;
  const mx = (...a) => a.reduce((x,y)=>x>y?x:y), end = e.leaveDate && e.leaveDate<to ? e.leaveDate : to;
  if(e.probation && e.region==='PK'){            // PK: 3 holidays during probation, full pro-rata after confirmation
    const lyS = leaveYearOf(e, e.start); if(ly < lyS) return 0;
    const grant = (S.probationGrant||{}).PK ?? 3; let total = 0;
    if(kind==='hol' && ly===lyS) total += grant;
    if(e.probation.done && e.probation.confirmed) total += pro(mx(e.probation.confirmed, from, e.start), end);
    return total;
  }
  return pro(mx(e.start, from), end);
}
function accrued(e, ly, asOf){ const ent = entitlement(e,ly), [a,b] = lyRange(e,ly), y0 = D.parse(a), y1 = D.parse(b); const f = asOf<y0 ? 0 : asOf>y1 ? 1 : ((asOf-y0)/864e5+1)/((y1-y0)/864e5+1); return Math.round(ent*f*2)/2; }
function balance(e, ly){
  const carry = (e.carry||{})[ly]||0, ent = entitlement(e,ly), today = D.todayIso(); let taken=0, upcoming=0, pending=0, sickTaken=0;
  DB.leave.filter(l => l.emp===e.id && l.status!=='rejected' && l.status!=='cancelled' && (l.type==='HOL' || LT[l.type].sick)).forEach(l => {
    for(let d=D.parse(l.start); D.iso(d)<=l.end; d=D.add(d,1)){ const i = D.iso(d); if(leaveYearOf(e,i)!==ly) continue; const v = dayValue(l,i,e.region); if(!v) continue;
      if(l.type!=='HOL'){ if(l.status==='approved') sickTaken += v; continue; }
      if(l.status==='pending') pending += v; else if(i<=today) taken += v; else upcoming += v; } });
  const total = ent+carry, sickEnt = entitlement(e,ly,'sick');
  return {ent, carry, total, taken, upcoming, pending, remaining: total-taken-upcoming, free: total-taken-upcoming-pending, acc: accrued(e,ly,D.today())+carry, sickEnt, sickTaken, sickRem: sickEnt-sickTaken};
}
function dayValue(rec, iso, region){
  if(iso<rec.start||iso>rec.end) return 0; const e = emp(rec.emp); if(isRest(e, iso)) return 0;
  if(rec.type==='HOL' && phName(iso, e ? e.region : region)) return 0; return rec.half ? 0.5 : 1;
}
function daysByYear(rec, region){ const e = emp(rec.emp), out = {}; for(let d=D.parse(rec.start); D.iso(d)<=rec.end; d=D.add(d,1)){ const i = D.iso(d), v = dayValue(rec,i,region); if(v){ const y = e ? leaveYearOf(e,i) : +i.slice(0,4); out[y] = (out[y]||0)+v; } } return out; }
function balanceModal(id){
  const e = emp(id), y = curLY(e);
  modal({title:`${esc(e.name)} – leave balance`, body:`<div class="grid g3">${[y,y+1,y+2].map(yr=>{ const b = balance(e,yr); return `<div class="card flat"><h3>${lyLabel(e,yr)}</h3><div class="small muted" style="margin:-6px 0 8px">${lyText(e,yr)}</div><dl class="dl" style="grid-template-columns:1fr auto"><dt>Holidays</dt><dd>${num1(b.ent)}</dd><dt>Carried over</dt><dd>${num1(b.carry)}</dd><dt>Taken</dt><dd>${num1(b.taken)}</dd><dt>Booked</dt><dd>${num1(b.upcoming)}</dd><dt>Pending</dt><dd>${num1(b.pending)}</dd><dt><b>Remaining</b></dt><dd><b>${num1(b.remaining)}</b></dd>${b.sickEnt?`<dt>Sick allowance</dt><dd>${num1(b.sickTaken)} / ${num1(b.sickEnt)}</dd>`:''}</dl></div>`; }).join('')}</div><p class="small muted" style="margin-top:12px">${e.region==='PK'?'PK: 3 holidays during probation; on confirmation the pro-rata balance (28 holidays, 5 sick days a year) is added. ':''}Leave year ${e.region==='PK'?'runs April to March':'runs January to December'}. ${esc(DB.settings.note||'')}</p>`, actions:[{label:'Close',act:'closeModal'}]});
}
CHG.leaveCalc = () => { const f = $('#lf'); if(!f) return; if(f.start.value && (!f.end.value || f.end.value<f.start.value)) f.end.value = f.start.value;
  const single = f.start.value===f.end.value; f.half.disabled = !single; if(!single) f.half.checked = false; f.ampm.disabled = !f.half.checked;
  const rec = leaveFormRec(), e = emp(rec.emp), by = daysByYear(rec, e.region), total = Object.values(by).reduce((a,b)=>a+b,0), ly = leaveYearOf(e, rec.start||D.todayIso()), b = balance(e, ly);
  let msg = `<b>${num1(total)}</b> working day(s)`;
  if(rec.type==='HOL') msg += ` · leave year ${lyLabel(e,ly)}: <b>${num1(b.free)}</b> available → <b>${num1(b.free-(by[ly]||0))}</b> after this request${e.region==='PK'&&e.probation&&!e.probation.done?' (probation: 3 holidays until confirmed)':''}`;
  if(LT[rec.type].sick && b.sickEnt) msg += ` · sick allowance used: ${num1(b.sickTaken+total)} of ${num1(b.sickEnt)}${b.sickTaken+total>b.sickEnt?' – <b>exceeds allowance, HR will review</b>':''}`;
  $('#lsum').innerHTML = `${ico('cal')} <span>${msg}</span>`;
};
function leaveMy(){
  const u = me(), y0 = curLY(u), yr = +(ST.f.leaveYear||y0), b = balance(u,yr), [from,to] = lyRange(u,yr);
  const mine = DB.leave.filter(l=>l.emp===u.id && l.end>=from && l.start<=to).sort((a,c)=>c.start.localeCompare(a.start));
  const cards = [['Holidays',b.ent+b.carry,`${num1(b.ent)} + ${num1(b.carry)} carried`],['Taken',b.taken,'Up to today'],['Booked / pending',b.upcoming+b.pending,`${num1(b.upcoming)} approved · ${num1(b.pending)} pending`],['Remaining',b.remaining,`${num1(b.acc-b.taken-b.upcoming)} accrued to date`]];
  if(b.sickEnt) cards.push(['Sick allowance',b.sickRem,`${num1(b.sickTaken)} used of ${num1(b.sickEnt)}`]);
  return `<div class="row wrap" style="margin-bottom:14px"><b>Leave year</b><select style="width:auto" data-chg="leaveYear">${[y0-1,y0,y0+1,y0+2].map(y=>`<option value="${y}" ${y===yr?'selected':''}>${lyLabel(u,y)}</option>`).join('')}</select><span class="muted small">${lyText(u,yr)}${yr>y0?' · planning ahead is allowed up to two years.':''}</span></div>
  ${u.region==='PK'&&u.probation&&!u.probation.done?`<div class="banner info">${ico('help')}<span><b>You are in probation</b> (ends ${fmt(u.probation.end)}). You have 3 holidays now. When probation is confirmed, your pro-rata holidays and 5 sick days a year are added.</span></div>`:''}
  <div class="grid g4" style="margin-bottom:16px">${cards.map(([t,v,s])=>`<div class="card kpi"><span class="t">${t}</span><span class="v">${num1(v)}</span><span class="s muted">${s}</span></div>`).join('')}</div>
  <div class="card"><h3>My requests &amp; absence – ${lyLabel(u,yr)}</h3>${table([{h:'Type',f:l=>`<span class="badge" style="background:${LT[l.type].c};color:${LT[l.type].fg};border:1px solid #cfd7e6">${LT[l.type].code}</span> ${esc(LT[l.type].name)}`},{h:'Dates',f:l=>`${fmt(l.start)}${l.end!==l.start?' – '+fmt(l.end):''}${l.half?' ('+l.half+')':''}`},{h:'Days',f:l=>num1(recDays(l,u.region))},{h:'Status',f:l=>statusBadge(l.status)},{h:'Decision',f:l=>`<span class="small muted">${esc(l.decision||'')}</span>`},{h:'',cls:'right',f:l=>`<button class="btn sm" data-act="detail" data-id="${l.id}">View</button>`}], mine, {empty:'No leave recorded for this leave year.'})}</div>`;
}
function leaveQuota(){
  const off = +(ST.f.qOff||0), q = ST.f.qQ||''; const list = DB.emps.filter(e=>e.status==='active' && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="toolbar"><select data-chg="qYear" style="width:auto"><option value="0" ${off===0?'selected':''}>Current leave year</option><option value="1" ${off===1?'selected':''}>Next leave year</option><option value="2" ${off===2?'selected':''}>Year after next</option></select><input type="search" class="search" placeholder="Search" value="${esc(q)}" data-inp="qQ" id="qq"><span class="grow"></span><button class="btn" data-act="bulkAlloc">${ico('users')} Bulk allocate</button><button class="btn" data-act="exportQuota">${ico('down')} Export</button></div>
  <div class="banner info">${ico('help')}<span>UK leave year: January–December, ${DB.settings.quota.UK} days. PK leave year: <b>April–March</b>, ${DB.settings.quota.PK} holidays + ${(DB.settings.sickQuota||{}).PK} sick days; during probation PK staff hold ${(DB.settings.probationGrant||{}).PK} holidays and no sick days, then pro-rata from the confirmation date. All active employees are listed, including zero balances.</span></div>
  ${table([{h:'Employee',f:e=>`<div class="row">${av(e,26)}<b>${esc(e.name)}</b></div>`},{h:'Region',f:e=>e.region},{h:'Leave year',f:e=>lyLabel(e,curLY(e)+off)},{h:'Status',f:e=>e.probation&&!e.probation.done?badge('Probation','warn'):badge('Confirmed','ok')},{h:'Holidays',f:e=>num1(balance(e,curLY(e)+off).ent)},{h:'Carry-over',f:e=>num1((e.carry||{})[curLY(e)+off]||0)},{h:'Accrued',f:e=>num1(balance(e,curLY(e)+off).acc)},{h:'Taken',f:e=>num1(balance(e,curLY(e)+off).taken)},{h:'Booked',f:e=>num1(balance(e,curLY(e)+off).upcoming)},{h:'Pending',f:e=>num1(balance(e,curLY(e)+off).pending)},{h:'Remaining',f:e=>{ const r = balance(e,curLY(e)+off).remaining; return `<b style="color:${r<=0?'var(--bad)':'inherit'}">${num1(r)}</b>`; }},{h:'Sick',f:e=>{ const b = balance(e,curLY(e)+off); return b.sickEnt?`${num1(b.sickTaken)}/${num1(b.sickEnt)}`:'—'; }},{h:'',cls:'right',f:e=>`<button class="btn sm" data-act="allocOne" data-id="${e.id}" data-y="${curLY(e)+off}">Allocate</button>`}],list)}`;
}
CHG.qYear = el => { ST.f.qOff = el.value; render(); };
ACT.exportQuota = () => { const off = +(ST.f.qOff||0); csvDownload('leave_allowances', ['Employee','Region','Leave year','Holidays','Extra','Carry-over','Accrued','Taken','Booked','Pending','Remaining','Sick allowance','Sick taken'], DB.emps.filter(e=>e.status==='active').map(e=>{ const y = curLY(e)+off, b = balance(e,y); return [e.name,e.region,lyLabel(e,y),b.ent,e.extraDays||0,b.carry,b.acc,b.taken,b.upcoming,b.pending,b.remaining,b.sickEnt,b.sickTaken]; })); };

/* PK probation: allocation on confirmation */
function allocationPreview(e, date){
  const ly = leaveYearOf(e, date), before = {h:entitlement(e,ly), s:entitlement(e,ly,'sick')};
  const old = e.probation; e.probation = {...old, done:true, confirmed:date}; const after = {h:entitlement(e,ly), s:entitlement(e,ly,'sick')}; e.probation = old;
  return {ly, before, after, addH:after.h-before.h, addS:after.s-before.s, range:lyText(e,ly)};
}

/* ================= SHIFT PATTERNS UI ================= */
function shiftTab(e, hr){
  const p = patternAt(e, D.todayIso()), hist = (e.shifts||[]).slice().sort((a,b)=>b.from.localeCompare(a.from)), canEdit = hr || manageable().some(m=>m.id===e.id);
  return `<div class="row sp wrap" style="margin-bottom:12px"><div><b style="font-size:16px">${esc(p.name)}</b><div class="muted small">${patDays(p)} · ${p.start}–${p.end} · applies to ${e.region} staff</div></div>${canEdit?`<div class="row"><button class="btn" data-act="shiftChange" data-id="${e.id}">${ico('edit')} Change shift pattern</button>${hr?`<button class="btn" data-act="patternLib">Pattern library</button>`:''}</div>`:''}</div>
  <div class="banner info">${ico('help')}<span>A change takes effect from the date you choose. The leave calendar, leave-day counts and rota follow the new pattern from that date; earlier dates keep the pattern that applied then.</span></div>
  ${table([{h:'Effective from',f:s=>`<b>${fmt(s.from)}</b>${s.from>D.todayIso()?' '+badge('Scheduled','warn'):''}`},{h:'Pattern',f:s=>{ const q = patterns().find(x=>x.id===s.pattern); return esc(q?q.name:s.pattern); }},{h:'Working days',f:s=>{ const q = patterns().find(x=>x.id===s.pattern); return q?patDays(q):''; }},{h:'Changed by',f:s=>esc(s.by||'—')},{h:'Note',f:s=>esc(s.note||'')}], hist)}`;
}
ACT.shiftChange = el => { const e = emp(el.dataset.id); modal({title:'Change shift pattern – '+esc(e.name),body:`<form id="sh"><div class="fgrid"><div class="field full"><label>New pattern</label><select name="p">${patterns().map(p=>`<option value="${p.id}">${esc(p.name)} (${patDays(p)})</option>`).join('')}</select></div><div class="field"><label>Effective from</label><input type="date" name="d" value="${D.todayIso()}"></div><div class="field"><label>Reason / note</label><input name="n"></div></div><div id="she" class="err"></div><p class="small muted">Leave already booked on days that become rest days is not counted against the balance from the effective date.</p></form>`,actions:[{label:'Cancel',act:'closeModal'},{label:'Apply',cls:'pri',act:'shiftSave',data:`data-id="${e.id}"`}]}); };
ACT.shiftSave = el => submitOnce(el, () => { const e = emp(el.dataset.id), f = $('#sh'), er = $('#she'); if(!f.d.value){ er.textContent='Choose the effective date.'; er.classList.add('show'); return; }
  applyShift(e, f.p.value, f.d.value, f.n.value.trim(), me().name); const conflicts = DB.leave.filter(l=>l.emp===e.id && l.status!=='rejected' && l.end>=f.d.value && recDays(l,e.region)!==recDays({...l,emp:'__x'},e.region)).length;
  saveDB(); closeModal(); toast('Shift pattern updated from '+fmt(f.d.value),'ok'); render(); });
function applyShift(e, pid, from, note, by){ e.shifts = (e.shifts||[]).filter(s=>s.from!==from); e.shifts.push({from,pattern:pid,by,note}); e.shifts.sort((a,b)=>a.from.localeCompare(b.from)); const p = patterns().find(x=>x.id===pid); e.shift = `${p.name} ${p.start}–${p.end}`;
  e.history.unshift({t:nowStamp(),by,what:`Shift pattern: ${p.name} from ${from}`}); log('Shift pattern changed',`${p.name} from ${from}`,e.id); notify(e.id, `Your shift pattern changes to ${p.name} from ${fmt(from)}.`, 'calendar'); }
ACT.patternLib = () => modal({title:'Shift pattern library',size:'wide',body:`${table([{h:'Name',f:p=>`<b>${esc(p.name)}</b>`},{h:'Days',f:p=>patDays(p)},{h:'Hours',f:p=>p.start+'–'+p.end},{h:'In use',f:p=>DB.emps.filter(e=>patternAt(e,D.todayIso()).id===p.id&&e.status==='active').length}], patterns())}<h4 style="margin:16px 0 8px">Add pattern</h4><form id="pl"><div class="fgrid"><div class="field"><label>Name</label><input name="n"></div><div class="field"><label>Hours</label><div class="row"><input type="time" name="s" value="09:00"><input type="time" name="e" value="17:30"></div></div><div class="field full"><label>Working days</label><div class="row wrap">${[1,2,3,4,5,6,0].map(d=>`<label class="row" style="margin:0;gap:5px;font-weight:500"><input type="checkbox" style="width:auto" name="d" value="${d}"> ${dayNames[d]}</label>`).join('')}</div></div></div></form>`,actions:[{label:'Close',act:'closeModal'},{label:'Add pattern',cls:'pri',act:'patternSave'}]});
ACT.patternSave = () => { const f = $('#pl'), days = $$('input[name=d]:checked',f).map(x=>+x.value); if(f.n.value.trim().length<3 || !days.length) return toast('Enter a name and choose working days.','bad'); if(patterns().some(p=>p.name.toLowerCase()===f.n.value.trim().toLowerCase())) return toast('That name already exists.','bad'); patterns().push({id:uid('P'),name:f.n.value.trim(),days,start:f.s.value,end:f.e.value}); log('Shift pattern added',f.n.value); saveDB(); ACT.patternLib(); };

/* ================= NEW EMPLOYEE SETUP + CREDENTIALS ================= */
const pwHash = s => { let h = 5381; for(const c of 'pfg-salt|'+s) h = ((h<<5)+h+c.charCodeAt(0))|0; return 'h'+(h>>>0).toString(16); };
const makeTemp = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for(let i=0;i<10;i++) s += a[rnd(a.length)]; return s+'#1'; };
const portalUrl = () => location.href.split('#')[0];
function setupProbation(e){ const end = D.iso(D.add(D.parse(e.start),90)); e.probation = {start:e.start, end, done:false, confirmed:null}; scheduleReviews(e); }
function scheduleReviews(e, legacy){ DB.probReviews ||= []; [30,60,90].forEach(n => { if(DB.probReviews.some(r=>r.emp===e.id && r.stage===n && !r.round)) return; const due = D.iso(D.add(D.parse(e.start),n)), lg = legacy && legacy.reviews && legacy.reviews[n];
  DB.probReviews.push({id:uid('pv'),emp:e.id,stage:n,due,status:lg?'Complete':'Scheduled',m:{},h:{},e:{},sigs:{},log:[{t:nowStamp(),w:lg?'Imported from legacy record':'Review scheduled'}],legacy:lg||''}); }); }
function onNewEmployee(e, opt={}){
  e.shifts = e.shifts && e.shifts.length ? e.shifts : [{from:e.start,pattern:'P5',by:'System'}];
  setupProbation(e); newPack(e);
  DB.onboarding.push({id:uid('ob'),emp:e.id,start:e.start,tasks:ONB_TASKS.map(t=>({t,d:0}))});
  if(!opt.noEmail && AUTOCFG().welcome!==0) sendCredentials(e);
  if(e.mgr) notify(e.mgr, `New starter: ${e.name} (${e.title}) starts ${fmt(e.start)}. Probation reviews are scheduled.`, 'probation');
  notify(DB.emps.filter(x=>x.role==='hr'||x.role==='admin').map(x=>x.id), `New employee ${e.name} added – welcome email sent and starter pack opened.`, 'onboarding');
}
function sendCredentials(e){
  e.tempPw = makeTemp(); e.mustChange = true; delete e.pwHash;
  const body = `Dear ${first(e.name)},\n\nWelcome to Pentagon Food Group (PFG). Your HR portal account is ready.\n\nPortal: ${portalUrl()}\nUsername: ${loginEmail(e)}${e.signInType==='Personal email account'?' (your personal email – no company account is needed)':''}\nTemporary password: ${e.tempPw}\n\nWhen you first sign in you will be asked to choose your own password. Please then complete your New Starter Pack in the portal: starter form, medical questionnaire, right-to-work documents and signatures.\n\nIf you have any problems please contact hr@pentagonfoodgroup.co.uk.\n\nGlobal HR Team`;
  const key = 'cred|'+e.id+'|'+Date.now(); ens('outbox',[]).unshift({id:uid('m'),t:nowStamp(),to:e.id,addr:loginEmail(e)===e.email?(e.personalEmail||e.email):e.personalEmail,subject:'Welcome to PFG – your HR portal sign-in details',body,kind:'New starter credentials',extra:{cred:true}}); notify(e.id,'Welcome to PFG! Complete your starter pack.','starter'); log('Credentials emailed',e.email,e.id);
}
ACT.resendCred = el => { const e = emp(el.dataset.id); sendCredentials(e); saveDB(); toast('New temporary password emailed (simulated)','ok'); render(); };

/* first-sign-in password change */
function forcePwModal(){ modal({title:'Choose your password',body:`<p class="muted small">For security you must replace your temporary password before continuing.</p><form id="pwf" onsubmit="return false"><div class="field"><label>New password</label><input type="password" name="a" autocomplete="new-password"></div><div class="field"><label>Confirm password</label><input type="password" name="b" autocomplete="new-password"></div><div id="pwe" class="err"></div><p class="small muted">At least 10 characters, with upper-case, lower-case and a number.</p></form>`,actions:[{label:'Save password',cls:'pri',act:'pwSave'}]}); const x = $('#modal .btn.ghost'); if(x) x.remove(); $('#modal').onmousedown = null; }
ACT.pwSave = () => { const f = $('#pwf'), a = f.a.value, er = $('#pwe'); if(a!==f.b.value || a.length<10 || !/[a-z]/.test(a) || !/[A-Z]/.test(a) || !/\d/.test(a)){ er.textContent='Passwords must match and meet the rules above.'; er.classList.add('show'); return; } const u = me(); u.pwHash = pwHash(a); delete u.tempPw; u.mustChange = false; log('Password changed',''); saveDB(); closeModal(); toast('Password saved','ok'); if(SP(u.id) && SP(u.id).status!=='Approved') location.hash = '#/starter'; render(); };

/* ================= BULK UPLOAD ================= */
function parseCSV(text){ const rows = []; let row = [], cur = '', q = false; text = text.replace(/^﻿/,'');
  for(let i=0;i<text.length;i++){ const c = text[i]; if(q){ if(c==='"'){ if(text[i+1]==='"'){ cur += '"'; i++; } else q = false; } else cur += c; } else if(c==='"') q = true; else if(c===','){ row.push(cur); cur = ''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(cur); cur = ''; if(row.some(x=>x.trim()!=='')) rows.push(row); row = []; } else cur += c; }
  row.push(cur); if(row.some(x=>x.trim()!=='')) rows.push(row); return rows; }
const pDate = s => { s = (s||'').trim(); let m; if(m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)) return s; if(m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; return ''; };
const validDate = s => { if(!s) return false; const d = D.parse(s); return D.iso(d)===s; };
const empByEmail = s => DB.emps.find(e=>e.email.toLowerCase()===(s||'').trim().toLowerCase());
const typeKey = s => { s = (s||'').trim().toUpperCase(); return Object.keys(LT).find(k=>k===s || LT[k].code===s || LT[k].name.toUpperCase()===s); };
const BULK = {
 employees:{name:'New employees',help:'Creates the employee record, probation reviews, starter pack and welcome email with sign-in details.',
  cols:['name','work_email','personal_email','job_title','departments','company','region','start_date','date_of_birth','line_manager_email','contract','fte','shift_pattern','role','sign_in_type'],
  sample:[['Sample Person','sample.person@pentagonfoodgroup.co.uk','sample.person@example.com','Warehouse Operative','Warehouse','PFGWholesale','UK','01/11/2026','15/06/1995','gary.moses@pentagonfoodgroup.co.uk','Permanent','1','Mon–Fri','employee','Personal']],
  check(r){ const er = []; const v = {};
   v.name = r.name.trim(); if(v.name.length<2) er.push('name required');
   v.email = r.work_email.trim().toLowerCase(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) er.push('work_email invalid'); else if(empByEmail(v.email) || (window.__bulkSeen||[]).includes(v.email)) er.push('work_email already exists');
   v.personalEmail = r.personal_email.trim(); if(v.personalEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.personalEmail)) er.push('personal_email invalid');
   v.title = r.job_title.trim(); if(!v.title) er.push('job_title required');
   v.depts = r.departments.split(/[;|]/).map(s=>s.trim()).filter(Boolean).map(s=>DB.depts.find(d=>d.toLowerCase()===s.toLowerCase())||s); const bad = v.depts.filter(d=>!DB.depts.includes(d)); if(!v.depts.length) er.push('departments required'); else if(bad.length) er.push('unknown department: '+bad.join(', '));
   v.company = COMPANIES.find(c=>c.toLowerCase()===r.company.trim().toLowerCase()); if(!v.company) er.push('company must be one of: '+COMPANIES.join(', '));
   v.region = r.region.trim().toUpperCase(); if(!REGIONS.includes(v.region)) er.push('region must be UK or PK');
   v.start = pDate(r.start_date); if(!validDate(v.start)) er.push('start_date invalid (use DD/MM/YYYY)'); v.dob = pDate(r.date_of_birth); if(!validDate(v.dob)) er.push('date_of_birth invalid'); else if(v.start && D.diff(v.dob,v.start)<16*365) er.push('under 16 at start');
   if(r.line_manager_email.trim()){ const m = empByEmail(r.line_manager_email); if(!m) er.push('line_manager_email not found'); else v.mgr = m.id; } else v.mgr = null;
   v.contract = r.contract.trim()||'Permanent'; v.fte = r.fte.trim()?+r.fte:1; if(!(v.fte>0&&v.fte<=1)) er.push('fte must be 0.1–1');
   if(r.shift_pattern.trim()){ const p = patterns().find(x=>x.name.toLowerCase()===r.shift_pattern.trim().toLowerCase()||x.id===r.shift_pattern.trim()); if(!p) er.push('unknown shift_pattern'); else v.pattern = p.id; } else v.pattern = 'P5';
   v.signInType = /personal/i.test(r.sign_in_type||'') ? 'Personal email account' : 'Company Microsoft account'; if(v.signInType==='Personal email account' && !v.personalEmail) er.push('personal_email is required for personal sign-in');
   v.role = (r.role.trim()||'employee').toLowerCase(); if(!['employee','manager','hr'].includes(v.role)) er.push('role must be employee, manager or hr');
   if(!er.length){ (window.__bulkSeen ||= []).push(v.email); } return {er, v}; },
  apply(v){ const id = 'e'+(Math.max(...DB.emps.map(x=>+x.id.slice(1)))+1);
   const e = {id,name:v.name,email:v.email,personalEmail:v.personalEmail,signInType:v.signInType,role:v.role,depts:v.depts,region:v.region,company:v.company,title:v.title,mgr:v.mgr,start:v.start,dob:v.dob,status:'active',manages:[],phone:'',photo:null,carry:{},extraDays:0,shift:'',emergency:{name:'',rel:'',phone:''},bank:'•••• (to be entered)',tax:'—',ni:'—',contract:v.contract,fte:v.fte,grade:'G3',docs:[],disc:[],history:[{t:nowStamp(),by:me().name,what:'Created by bulk upload'}],shifts:[{from:v.start,pattern:v.pattern,by:me().name}]};
   DB.emps.push(e); onNewEmployee(e, {noEmail:!window.__bulkMail}); log('Employee created (bulk)',e.name,e.id); } },
 leave:{name:'Leave & absence records',help:'Imports historic or planned leave. Overlaps and weekends are validated. Imported records are marked approved unless you set a status.',
  cols:['employee_email','type','from','to','half','status','note'],sample:[['sample.person@pentagonfoodgroup.co.uk','HOL','02/11/2026','04/11/2026','','approved','Imported']],
  check(r){ const er = [], v = {}; const e = empByEmail(r.employee_email); if(!e) er.push('employee not found'); else v.emp = e.id; v.type = typeKey(r.type); if(!v.type) er.push('unknown type (use HOL, SICK, SSP, WFH, LATE, UNAU, PAT, MAT, MSSP)');
   v.start = pDate(r.from); v.end = pDate(r.to); if(!validDate(v.start)||!validDate(v.end)) er.push('invalid dates'); else if(v.end<v.start) er.push('to before from');
   v.half = r.half.trim().toUpperCase()||null; if(v.half && !['AM','PM'].includes(v.half)) er.push('half must be AM or PM'); if(v.half && v.start!==v.end) er.push('half day needs a single date');
   v.status = (r.status.trim()||'approved').toLowerCase(); if(!['approved','pending','rejected'].includes(v.status)) er.push('status invalid'); v.note = r.note.trim();
   if(!er.length && overlaps(v.emp, v.start, v.end)) er.push('overlaps an existing record'); return {er, v}; },
  apply(v){ DB.leave.push({id:uid('l'),emp:v.emp,type:v.type,start:v.start,end:v.end,half:v.half,status:v.status,note:v.note,created:D.todayIso(),by:me().id}); log('Leave imported',`${v.type} ${v.start}→${v.end}`,v.emp); } },
 allocation:{name:'Leave allocations (carry-over / extra days)',help:'Leave year = the year in which it starts (PK April–March: 2026 means April 2026 to March 2027).',
  cols:['employee_email','leave_year','carry_over','extra_days'],sample:[['sample.person@pentagonfoodgroup.co.uk','2026','2','0']],
  check(r){ const er = [], v = {}; const e = empByEmail(r.employee_email); if(!e) er.push('employee not found'); else v.emp = e.id; v.y = +r.leave_year; if(!(v.y>=2020&&v.y<=2100)) er.push('leave_year invalid'); v.c = r.carry_over.trim()?+r.carry_over:0; v.x = r.extra_days.trim()?+r.extra_days:0; if(isNaN(v.c)||v.c<0||v.c>60) er.push('carry_over invalid'); if(isNaN(v.x)||v.x<-30||v.x>60) er.push('extra_days invalid'); return {er, v}; },
  apply(v){ const e = emp(v.emp); (e.carry ||= {})[v.y] = v.c; e.extraDays = v.x; e.history.unshift({t:nowStamp(),by:me().name,what:`Allocation (bulk): carry ${v.c}, extra ${v.x} for ${v.y}`}); log('Allocation imported',`${v.c}/${v.x} (${v.y})`,e.id); } },
 shift:{name:'Shift pattern assignments',help:'Each row applies from its effective date; earlier dates keep the previous pattern.',
  cols:['employee_email','shift_pattern','effective_from'],sample:[['sample.person@pentagonfoodgroup.co.uk','Mon–Sat','01/12/2026']],
  check(r){ const er = [], v = {}; const e = empByEmail(r.employee_email); if(!e) er.push('employee not found'); else v.emp = e.id; const p = patterns().find(x=>x.name.toLowerCase()===r.shift_pattern.trim().toLowerCase()||x.id===r.shift_pattern.trim()); if(!p) er.push('unknown shift_pattern'); else v.p = p.id; v.d = pDate(r.effective_from); if(!validDate(v.d)) er.push('effective_from invalid'); return {er, v}; },
  apply(v){ applyShift(emp(v.emp), v.p, v.d, 'Bulk upload', me().name); } },
 disciplinary:{name:'Disciplinary history',help:'Adds historic warnings to personnel files (HR only).',
  cols:['employee_email','date','level','reason'],sample:[['sample.person@pentagonfoodgroup.co.uk','12/03/2026','Verbal warning','Timekeeping']],
  check(r){ const er = [], v = {}; const e = empByEmail(r.employee_email); if(!e) er.push('employee not found'); else v.emp = e.id; v.d = pDate(r.date); if(!validDate(v.d)) er.push('date invalid'); v.l = LADDER.find(x=>x.toLowerCase()===r.level.trim().toLowerCase()); if(!v.l) er.push('level must be one of: '+LADDER.join(', ')); v.r = r.reason.trim(); if(v.r.length<3) er.push('reason required'); return {er, v}; },
  apply(v){ emp(v.emp).disc.push({date:v.d,level:v.l,reason:v.r}); log('Disciplinary imported',v.l,v.emp); } },
 holidays:{name:'Company / public holidays',help:'Adds company holidays (for example Eid dates) to the holiday calendar.',
  cols:['name','date','region'],sample:[['Eid ul-Fitr (day 1)','21/03/2027','PK']],
  check(r){ const er = [], v = {}; v.n = r.name.trim(); if(v.n.length<3) er.push('name required'); v.d = pDate(r.date); if(!validDate(v.d)) er.push('date invalid'); v.r = ['All','UK','PK'].find(x=>x.toLowerCase()===r.region.trim().toLowerCase()); if(!v.r) er.push('region must be All, UK or PK'); return {er, v}; },
  apply(v){ DB.holidays.push({id:uid('h'),name:v.n,date:v.d,region:v.r}); log('Holiday imported',v.n+' '+v.d); } }
};
VIEWS.bulk = () => { const ds = ST.f.bds5 || 'employees', B = BULK[ds], res = window.__bulk && window.__bulk.ds===ds ? window.__bulk : null;
  return pageHead('Bulk Upload','Upload many records at once using the PFG templates. Files must be CSV (in Excel: Save As ▸ CSV UTF-8).') +
  `<div class="card" style="margin-bottom:16px"><div class="fgrid"><div class="field"><label>1. What are you uploading?</label><select data-chg="bulkDs">${Object.entries(BULK).filter(([k])=>k!=='disciplinary'||isHR()).map(([k,b])=>`<option value="${k}" ${k===ds?'selected':''}>${b.name}</option>`).join('')}</select></div>
  <div class="field"><label>2. Download the template</label><button class="btn" data-act="bulkTpl">${ico('down')} ${esc(B.name)} template (CSV)</button></div></div>
  <p class="small muted">${esc(B.help)} Columns: <code>${B.cols.join(', ')}</code>. Dates as DD/MM/YYYY. Do not edit the header row.</p>
  ${ds==='employees'?`<label class="row" style="gap:8px;margin:8px 0"><input type="checkbox" style="width:auto" id="bulkMail" ${window.__bulkMail?'checked':''} data-chg="bulkMail"> Email sign-in details to each new employee (simulated)</label>`:''}
  <div class="field"><label>3. Choose your completed file</label><input type="file" accept=".csv,text/csv" data-chg="bulkFile"></div></div>` +
  (res ? `<div class="card"><div class="row sp wrap"><div><b>${esc(res.fname)}</b><div class="small muted">${res.rows.length} rows read · ${badge(res.rows.filter(r=>!r.er.length).length+' valid','ok')} ${res.rows.some(r=>r.er.length)?badge(res.rows.filter(r=>r.er.length).length+' with errors','bad'):''}</div></div><button class="btn pri" data-act="bulkImport" ${res.rows.some(r=>!r.er.length)?'':'disabled'}>Import ${res.rows.filter(r=>!r.er.length).length} valid row(s)</button></div>
  <div class="tw" style="margin-top:12px;max-height:380px"><table class="t"><thead><tr><th>Row</th><th>Result</th>${B.cols.slice(0,5).map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${res.rows.slice(0,200).map(r=>`<tr><td>${r.n}</td><td>${r.er.length?badge(r.er.join('; '),'bad'):badge('OK','ok')}</td>${B.cols.slice(0,5).map(c=>`<td>${esc(r.raw[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">Rows with errors are skipped – fix them in your file and upload again.</p></div>` : '');
};
CHG.bulkDs = el => { ST.f.bds5 = el.value; window.__bulk = null; render(); };
CHG.bulkMail = el => { window.__bulkMail = el.checked; };
ACT.bulkTpl = () => { const B = BULK[ST.f.bds5||'employees']; const q = v => '"'+String(v).replace(/"/g,'""')+'"'; fileDownload('PFG_template_'+(ST.f.bds5||'employees')+'.csv','﻿'+[B.cols,...B.sample].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n','text/csv;charset=utf-8'); toast('Template downloaded – the sample row is an example, delete it before uploading'); };
CHG.bulkFile = el => { const f = el.files[0]; if(!f) return; if(f.size>2*1024*1024) return toast('File is larger than 2 MB.','bad'); if(!/\.csv$/i.test(f.name)) return toast('Please upload a .csv file (Excel: Save As CSV).','bad');
  const rd = new FileReader(); rd.onload = () => { const ds = ST.f.bds5||'employees', B = BULK[ds], rows = parseCSV(rd.result); if(!rows.length) return toast('The file is empty.','bad');
    const head = rows[0].map(h=>h.trim().toLowerCase()), miss = B.cols.filter(c=>c!=='sign_in_type' && !head.includes(c)); if(miss.length){ window.__bulk = null; render(); return toast('Missing column(s): '+miss.join(', ')+'. Please use the template.','bad'); }
    window.__bulkSeen = []; const out = rows.slice(1).map((r,i) => { const raw = {}; B.cols.forEach(c => raw[c] = (r[head.indexOf(c)]||'').trim()); let res; try { res = B.check(raw); } catch(e){ res = {er:['unreadable row'],v:null}; } return {n:i+2, raw, er:res.er, v:res.v}; });
    window.__bulk = {ds, fname:f.name, rows:out}; log('Bulk file checked',`${ds}: ${out.length} rows`); render(); }; rd.readAsText(f); };
ACT.bulkImport = el => submitOnce(el, () => { const b = window.__bulk, B = BULK[b.ds], ok = b.rows.filter(r=>!r.er.length); ok.forEach(r => B.apply(r.v)); log('Bulk import',`${b.ds}: ${ok.length} imported, ${b.rows.length-ok.length} skipped`); saveDB(); window.__bulk = null; toast(`${ok.length} row(s) imported`,'ok'); render(); });

/* ================= MIGRATION (existing browser data) ================= */
function migrate5(){
  const S = DB.settings; if(typeof S.leaveYearStart !== 'object' || !S.leaveYearStart) S.leaveYearStart = {UK:1, PK:4}; if(!S.sickQuota){ S.sickQuota = {UK:0, PK:5}; if(S.quota.PK===20) S.quota.PK = 28; } S.probationGrant ||= {PK:3};
  DB.emps.forEach(e => { e.signInType ||= 'Company Microsoft account'; });
  patterns(); DB.probReviews ||= []; DB.starterPacks ||= {};
  DB.emps.forEach(e => { e.shifts ||= [{from:'2000-01-01',pattern:'P5',by:'System'}];
    if(!e.probation){ const pr = DB.probation.find(p=>p.emp===e.id), end = D.iso(D.add(D.parse(e.start),90)), inProb = !!pr || end>D.todayIso();
      e.probation = {start:e.start, end, done:!inProb, confirmed:inProb?null:end}; if(inProb) scheduleReviews(e, pr);
      if(inProb && !SP(e.id) && e.start>='2026-09-01') newPack(e); } });
}


/* ================= SIGN-IN TYPE + ACCESS CONTROL (company or personal email – same experience) ================= */
const loginEmail = e => (e.signInType==='Personal email account' && e.personalEmail) ? e.personalEmail : e.email;
const loginEmails = e => [e.email.toLowerCase(), ...(e.signInType==='Personal email account' && e.personalEmail ? [e.personalEmail.toLowerCase()] : [])];
const accessActive = e => !!e && e.status==='active' && !(e.access && e.access.status==='Disabled') && !(e.leaveDate && e.leaveDate < D.todayIso());
ACT.accessToggle = el => { const e = emp(el.dataset.id); if(!isHR()) return;
  if(accessActive(e)){ modal({title:'Disable portal access – '+esc(e.name),body:`<p>${esc(e.name)} will not be able to sign in, and any open session ends. Their records are kept.</p><div class="field"><label>Reason</label><select id="acr"><option>Left the company</option><option>Suspended pending investigation</option><option>Lost or compromised sign-in</option><option>Other</option></select></div>`,actions:[{label:'Cancel',act:'closeModal'},{label:'Disable access',cls:'bad',act:'accessOff',data:`data-id="${e.id}"`}]}); }
  else { if(e.status!=='active') return toast('This employee has left. Re-hire them before enabling access.','bad'); if(e.leaveDate && e.leaveDate<D.todayIso()) return toast('Remove or change the leaving date first.','bad'); e.access = {status:'Active',on:D.todayIso(),by:me().name}; e.history.unshift({t:nowStamp(),by:me().name,what:'Portal access enabled'}); log('Access enabled','',e.id); saveDB(); toast('Access enabled','ok'); render(); } };
ACT.accessOff = el => { const e = emp(el.dataset.id); e.access = {status:'Disabled',on:D.todayIso(),reason:$('#acr').value,by:me().name}; delete e.tempPw; e.history.unshift({t:nowStamp(),by:me().name,what:'Portal access disabled – '+$('#acr').value}); log('Access disabled',$('#acr').value,e.id); notify(DB.emps.filter(x=>x.role==='admin').map(x=>x.id), `Portal access disabled for ${e.name}. IT: disable the Microsoft account / invitation too.`, 'employees'); saveDB(); closeModal(); toast('Access disabled','ok'); render(); };
function deactivateLeavers(){ const today = D.todayIso(); let n = 0; DB.emps.forEach(e => { if(e.status==='active' && e.leaveDate && e.leaveDate < today){ e.status = 'leaver'; e.access = {status:'Disabled',on:today,reason:'Left the company',by:'System'}; delete e.tempPw; e.history.unshift({t:nowStamp(),by:'System',what:'Left the company – portal access removed'}); log('Leaver access removed',e.name,e.id); notify(DB.emps.filter(x=>x.role==='hr'||x.role==='admin').map(x=>x.id), `${e.name} has left: portal access removed. IT: disable their Microsoft account / invitation.`, 'employees'); n++; } }); return n; }
BRS.push(['NEW-09','Same portal experience for staff with or without a company account (personal-email sign-in); access removed automatically at leaving date; HR can disable or enable access','High','Personnel files, Automation','Built (real SSO / account provisioning in production)']);
