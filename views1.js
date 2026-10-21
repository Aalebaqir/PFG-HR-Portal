/* Dashboard, Leave Calendar, Leave & Absence */
const REACTS = [['like','👍','Like'],['clap','👏','Clap'],['smile','😊','Smile']];
function reactBar(key){
  const r = DB.reactions[key] || {};
  return `<span class="react">${REACTS.map(([k,e,l]) => { const n = (r[k]||[]).length, on = (r[k]||[]).includes(SESSION.uid); return `<button class="rbtn ${on?'on':''}" data-act="react" data-key="${key}" data-k="${k}" title="${l}" aria-label="${l}">${e} ${n||''}</button>`; }).join('')}</span>`;
}
ACT.react = el => { const r = DB.reactions[el.dataset.key] ||= {}; const a = r[el.dataset.k] ||= []; const i = a.indexOf(SESSION.uid); i<0 ? a.push(SESSION.uid) : a.splice(i,1); saveDB(); render(); };
const reactCount = key => Object.values(DB.reactions[key]||{}).reduce((s,a)=>s+a.length,0);
const nextWorkday = (iso, who) => { const e = who && typeof who==='object' ? who : null, region = e ? e.region : who; let d = D.add(D.parse(iso),1); while((e ? isRest(e,D.iso(d)) : isWeekend(D.iso(d))) || phName(D.iso(d),region)) d = D.add(d,1); return D.iso(d); };
function upcomingDates(field, days){ // birthdays / anniversaries
  const t = D.today(), out = [];
  DB.emps.filter(e=>e.status==='active').forEach(e => { const s = e[field]; if(!s) return; const [,m,d] = s.split('-').map(Number);
    let n = new Date(t.getFullYear(), m-1, d, 12); if(D.iso(n) < D.iso(t)) n = new Date(t.getFullYear()+1, m-1, d, 12);
    const diff = D.diff(D.iso(t), D.iso(n)); if(diff<=days){ const yrs = n.getFullYear()-D.parse(s).getFullYear(); out.push({e, date:D.iso(n), diff, yrs}); } });
  return out.sort((a,b)=>a.diff-b.diff);
}
const MOODS = [['😀','Great'],['🙂','Good'],['😐','Okay'],['😟','Low'],['😣','Stressed']];

VIEWS.dashboard = () => {
  const u = me(), yr = curLY(u), bal = balance(u, yr), today = D.todayIso();
  const off = absentToday(today).filter(l => visibleEmps().some(e=>e.id===l.emp));
  const pend = isMgr() ? DB.leave.filter(l => l.status==='pending' && canApprove(l)) : [];
  const myTickets = DB.tickets.filter(t => isHR()? t.status!=='Resolved' : t.emp===u.id && t.status!=='Resolved');
  const rtwDue = DB.rtw.filter(r => r.status==='Due' && (isHR() || managersOf(emp(r.emp)).includes(u.id) || r.emp===u.id));
  const moodToday = DB.mood.find(m => m.uid===u.id && m.date===today);
  const bd = upcomingDates('dob', 14), an = upcomingDates('start', 14).filter(x=>x.yrs>0);
  const hour = new Date().getHours(), greet = hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
  // sickness trend: last 6 months, spells starting
  const months = []; for(let i=5;i>=0;i--){ const d = new Date(D.today().getFullYear(), D.today().getMonth()-i, 1, 12); months.push({k:D.iso(d).slice(0,7), l:MONTHS[d.getMonth()].slice(0,3), n:0}); }
  DB.leave.filter(l => LT[l.type].sick && l.status!=='rejected' && visibleEmps({leavers:true}).some(e=>e.id===l.emp)).forEach(l => { const m = months.find(x=>x.k===l.start.slice(0,7)); if(m) m.n += recDays(l, emp(l.emp).region); });
  const mx = Math.max(1,...months.map(m=>m.n));
  const byDept = {}; DB.emps.filter(e=>e.status==='active').forEach(e => e.depts.forEach(d => byDept[d]=(byDept[d]||0)+1));
  const act = DB.emps.filter(e=>e.status==='active');
  const alerts = [];
  if(isHR()){
    const exp = DB.rtwChecks.filter(r => r.expiry && D.diff(today,r.expiry)<=30);
    if(exp.length) alerts.push(['bad',`${exp.length} right-to-work expiry${exp.length>1?'ies':'y'} due within 30 days or overdue`,'rtw']);
    const rv = DB.requisitions.filter(r=>r.status==='Revision requested').length; if(rv) alerts.push(['warn',`${rv} requisition awaiting revision`,'requisitions']);
    const sl = DB.tickets.filter(t=>t.status!=='Resolved' && D.diff(t.raised,today)>t.sla).length; if(sl) alerts.push(['bad',`${sl} helpdesk ticket${sl>1?'s':''} past SLA`,'helpdesk']);
    const bf = act.filter(e=>bradford(e.id).score>=DB.settings.bradford[0]).length; if(bf) alerts.push(['warn',`${bf} employee${bf>1?'s':''} at or above the Bradford Factor trigger`,'reports']);
  }
  return `
  ${pageHead(`${greet}, ${esc(u.name.split(' ')[0])}`, `${fmt(today)} · ${DAYS[D.today().getDay()]} · ${ROLES[u.role]}`,
     `<button class="btn" data-act="dashCfg">${ico('grid')} Customise</button><button class="btn" data-act="dashRefresh">${ico('act')} Refresh</button><button class="btn" data-act="dashBI">${ico('down')} Export to BI</button><button class="btn" data-act="leaveModal">${ico('plus')} Request leave</button><button class="btn" data-act="sickModal">${ico('warn')} Report sickness</button><a class="btn pri" href="#/calendar">${ico('cal')} Open leave calendar</a>`)}
  ${starterBanner()}${alerts.length?`<div class="grid g2" style="margin-bottom:16px">${alerts.map(a=>`<a class="banner ${a[0]==='bad'?'':'info'}" href="#/${a[2]}" style="${a[0]==='bad'?'background:var(--bad-l);color:#7f1d1d;border-color:#fecaca':''};margin:0">${ico('warn')}<span>${a[1]}</span></a>`).join('')}</div>`:''}
  <div class="grid g4" style="margin-bottom:16px">
    <div class="card kcard"><div class="kicon" style="background:#e2f4f8;color:#068aa2">${ico('cal')}</div><div class="kpi"><span class="v">${num1(bal.free)}</span><span class="t">Days available (${lyLabel(u,yr)})</span></div></div>
    <div class="card kcard"><div class="kicon" style="background:#fef3c7;color:#b45309">${ico('check')}</div><div class="kpi"><span class="v">${isMgr()?pend.length:DB.leave.filter(l=>l.emp===u.id&&l.status==='pending').length}</span><span class="t">${isMgr()?'Awaiting your approval':'My pending requests'}</span></div></div>
    <div class="card kcard"><div class="kicon" style="background:#dcfce7;color:#15803d">${ico('users')}</div><div class="kpi"><span class="v">${off.length}</span><span class="t">Colleagues off today</span></div></div>
    <div class="card kcard"><div class="kicon" style="background:#fee2e2;color:#b91c1c">${ico('help')}</div><div class="kpi"><span class="v">${myTickets.length}</span><span class="t">${isHR()?'Open helpdesk tickets':'My open tickets'}${rtwDue.length?` · ${rtwDue.length} RTW due`:''}</span></div></div>
  </div>
  <div class="grid g-main">
   <div class="grid">
    <div class="grid g2">
     <div class="card" data-w="leave"><h3><span class="l">${ico('clock')} Leave summary ${lyLabel(u,yr)}</span><a href="#/leave" class="small">Details</a></h3>
       <div class="row sp small"><span>Taken <b>${num1(bal.taken)}</b></span><span>Booked <b>${num1(bal.upcoming)}</b></span><span>Pending <b>${num1(bal.pending)}</b></span></div>
       <div class="prog" style="margin:8px 0"><i style="width:${Math.min(100,(bal.taken+bal.upcoming)/Math.max(1,bal.total)*100)}%"></i></div>
       <dl class="dl" style="grid-template-columns:130px 1fr"><dt>Entitlement</dt><dd>${num1(bal.ent)} days${bal.carry?` + ${num1(bal.carry)} carried`:''}</dd><dt>Accrued to date</dt><dd>${num1(bal.acc)} days</dd><dt>Remaining (year)</dt><dd><b>${num1(bal.remaining)}</b> days</dd>${bal.sickEnt?`<dt>Sick allowance</dt><dd>${num1(bal.sickTaken)} of ${num1(bal.sickEnt)} used</dd>`:''}</dl></div>
     <div class="card" data-w="off"><h3><span class="l">${ico('users')} Employees off today</span>${badge(off.length)}</h3>
       <div class="list" style="max-height:200px;overflow:auto">${off.map(l => { const e = emp(l.emp), t = LT[l.type], ret = nextWorkday(l.end, e); const hide = LT[l.type].sick && !isMgr() && l.emp!==u.id;
         return `<div class="li">${av(e,30)}<div class="grow"><b>${esc(e.name)}</b><div class="small muted">${hide?'Absent':esc(LEGEND_LABEL[l.type])}</div></div><div class="right small"><div class="muted">Return to work</div><b>${fmtS(ret)}</b></div></div>`; }).join('')||'<div class="empty">Everyone is in today.</div>'}</div></div>
    </div>
    <div class="grid g2">
     <div class="card" data-w="stats"><h3><span class="l">${ico('chart')} Company stats</span></h3>
       <div class="row sp small" style="margin-bottom:8px"><span>Active staff <b>${act.length}</b></span><span>UK <b>${act.filter(e=>e.region==='UK').length}</b></span><span>PK <b>${act.filter(e=>e.region==='PK').length}</b></span><span>Probation <b>${DB.probation.length}</b></span></div>
       ${Object.entries(byDept).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([d,n])=>`<div class="hbar"><span>${esc(d)}</span><div class="prog"><i style="width:${n/Math.max(...Object.values(byDept))*100}%"></i></div><b>${n}</b></div>`).join('')}</div>
     <div class="card" data-w="sick"><h3><span class="l">${ico('act')} Sickness trend</span>${isMgr()?badge('Managers and HR only'):''}</h3>
       ${isMgr()?`<div class="bars">${months.map(m=>`<div><b style="color:var(--text)">${num1(m.n)}</b><i style="height:${m.n/mx*80+3}%"></i>${m.l}</div>`).join('')}</div><p class="small muted" style="margin:10px 0 0">Working days lost to sickness by month of absence start.</p>`
       :`<div class="empty">${ico('lock')}<br>Sickness trends are restricted to line managers, team leads and HR.</div>`}</div>
    </div>
    <div class="card" data-w="news"><h3><span class="l">${ico('flag')} Latest news</span><a class="small" href="#/noticeboard">Notice board</a></h3>
      ${DB.news.slice(0,3).map(n=>`<div class="li"><div class="kicon" style="background:#e2f4f8;color:var(--blue);width:38px;height:38px">${ico(n.kind==='Promotion'?'award':n.kind==='Event'?'cal':'flag')}</div><div class="grow"><b>${esc(n.title)}</b><div class="small muted">${badge(n.kind)} ${fmt(n.date)} · ${esc(n.by)}</div></div>${reactBar('news-'+n.id)}</div>`).join('')}</div>
   </div>
   <div class="grid" style="align-content:start">
    <div class="card" data-w="thought" style="background:linear-gradient(135deg,#06566a,#068aa2);color:#fff;border:0"><h3 style="color:#fff"><span class="l">${ico('star')} Thought of the day</span></h3><div style="font-size:18px;font-weight:600;line-height:1.4">“${esc(quoteOfDay())}”</div></div>
    <div class="card" data-w="mood"><h3><span class="l">${ico('smile')} How are you feeling today?</span></h3>
      <div class="mood" role="group" aria-label="How are you feeling">${MOODS.map(([e,l])=>`<button class="${moodToday?.v===l?'on':''}" data-act="mood" data-v="${l}" aria-label="${l}"><b>${e}</b>${l}</button>`).join('')}</div>
      <p class="small muted" style="margin:10px 0 0">${moodToday?`Thanks – you told us you feel <b>${moodToday.v}</b> today.`:'Optional. Responses are only reported to HR in anonymised totals.'}</p>
      ${isHR()?`<div class="small" style="margin-top:8px">Today: ${MOODS.map(([e,l])=>`${e} ${DB.mood.filter(m=>m.date===today&&m.v===l).length}`).join(' · ')}</div>`:''}</div>
    <div class="card" data-w="bday"><h3><span class="l">${ico('award')} Birthdays &amp; anniversaries</span></h3>
      ${[...bd.map(x=>({...x,k:'bday',t:`Birthday`})),...an.map(x=>({...x,k:'anniv',t:`${x.yrs} year${x.yrs>1?'s':''} at PFG`}))].sort((a,b)=>a.diff-b.diff).map(x=>`<div class="li">${av(x.e,34)}<div class="grow"><b>${esc(x.e.name)}</b><div class="small muted">${x.t} · ${x.diff===0?'<b style="color:var(--blue)">Today</b>':fmtS(x.date)}</div><div style="margin-top:4px">${reactBar(x.k+'-'+x.e.id+'-'+x.date.slice(0,4))}</div></div>${x.e.id!==u.id?`<button class="btn sm" data-act="wish" data-id="${x.e.id}" data-k="${x.k}" data-date="${x.date}">${x.k==='bday'?'Wish':'Congratulate'}</button>`:''}</div>`).join('')||'<div class="empty">Nothing in the next 14 days.</div>'}</div>
    <div class="card" data-w="rec"><h3><span class="l">${ico('star')} Recognition – ${MONTHS[D.today().getMonth()]}</span></h3>
      ${DB.recognition.map(r=>{ const e = emp(r.who); return `<div class="li">${e?av(e,34):`<span class="av" style="width:34px;height:34px;background:#0e7490">${ico('users')}</span>`}<div class="grow"><b>${esc(e?e.name:r.who)}</b> ${badge(r.kind+' of the Month','pur')}<div class="small muted">${esc(r.why)}</div><div style="margin-top:4px">${reactBar('rec-'+r.id)} <span class="small muted">${reactCount('rec-'+r.id)} this month</span></div></div></div>`; }).join('')||'<div class="empty">No recognitions yet.</div>'}</div>
   </div>
  </div>`;
};
ACT.mood = el => { const t = D.todayIso(); DB.mood = DB.mood.filter(m => !(m.uid===SESSION.uid && m.date===t)); DB.mood.push({uid:SESSION.uid,date:t,v:el.dataset.v}); saveDB(); render(); };
ACT.wish = el => { const e = emp(el.dataset.id); const key = el.dataset.k+'-'+e.id+'-'+el.dataset.date.slice(0,4); const r = DB.reactions[key] ||= {}; (r.smile ||= []); if(!r.smile.includes(SESSION.uid)) r.smile.push(SESSION.uid);
  notify(e.id, `${me().name} sent you ${el.dataset.k==='bday'?'birthday wishes':'congratulations on your work anniversary'}.`, 'dashboard'); saveDB(); toast(`Message sent to ${e.name}`,'ok'); render(); };

/* ---------------- LEAVE CALENDAR ---------------- */
const mondayOf = d => D.add(d, -((d.getDay()+6)%7));
function calState(){ return ST.cal ||= { start: D.iso(mondayOf(D.today())), weeks:5, depts:[], q:'', leavers:false, brush:'HOL', half:'' }; }
function calEmps(){ const s = calState(); let list = visibleEmps({leavers: isHR() && s.leavers});
  if(s.depts.length) list = list.filter(e => e.depts.some(d => s.depts.includes(d)));
  if(s.q) list = list.filter(e => e.name.toLowerCase().includes(s.q.toLowerCase()));
  return list.sort((a,b)=>a.name.localeCompare(b.name)); }
function chipFor(rec, e){
  const t = LT[rec.type]; const hide = t.sick && !isMgr() && e.id!==SESSION.uid;
  const bg = hide ? '#d6dbe6' : t.c, fg = hide ? '#44546f' : t.fg, lab = hide ? 'OFF' : t.code;
  return `<div class="chip ${rec.status==='pending'?'pend':''} ${rec.half?'half '+(rec.half==='PM'?'pm':''):''}" style="background:${bg};color:${fg};${rec.type==='HALF'?'border:1px solid #c5cddd':''}" title="${esc(hide?'Absent':LT[rec.type].name)}${rec.status==='pending'?' (pending approval)':''}"><span>${rec.half?'½':lab}</span></div>`;
}
VIEWS.calendar = () => {
  const s = calState(); const start = D.parse(s.start), days = s.weeks*7, list = calEmps(), today = D.todayIso();
  const dates = Array.from({length:days},(_,i)=>D.iso(D.add(start,i)));
  const idx = {}; DB.leave.filter(l => l.status!=='rejected' && l.status!=='cancelled' && l.end>=dates[0] && l.start<=dates[days-1]).forEach(l => { (idx[l.emp] ||= []).push(l); });
  const groups = (key, fn) => { const out = []; dates.forEach(d => { const k = fn(d); const last = out[out.length-1]; if(last && last.k===k) last.n++; else out.push({k,n:1,d}); }); return out; };
  const mHead = groups('m', d => MONTHS[D.parse(d).getMonth()]+' '+D.parse(d).getFullYear());
  const wHead = groups('w', d => { const dd = D.parse(d); return dd.getFullYear()+'-'+D.wk(dd); });
  const range = `${fmt(dates[0])} – ${fmt(dates[days-1])}`;
  const rows = list.map(e => { const recs = idx[e.id]||[];
    return `<tr><td class="lab"><div class="emprow">${av(e,24)}<a href="#/employees/${e.id}" ${isMgr()?'':'onclick="return false"'} style="color:inherit">${esc(e.name)}</a>${e.status==='leaver'?badge('Leaver','bad'):''}<span class="ex" data-act="calEmp" data-id="${e.id}" title="Balance">${ico('help')}</span></div></td>${dates.map(d => {
      const r = recs.find(l => d>=l.start && d<=l.end); const we = isRest(e,d), p = phName(d, e.region);
      const showRec = r && (!we || ['MAT_PAID','MAT_SSP','PAT'].includes(r.type)) && !(r.type==='HOL' && p);
      return `<td class="c ${we?'we':''} ${p?(p.type==='PH'?'ph':'hr'):''} ${d===today?'today':''}" data-act="calCell" data-emp="${e.id}" data-date="${d}" ${p?`title="${esc(p.name)}"`:''}>${showRec?chipFor(r,e):(we?'<span class="x">x</span>':'')}</td>`; }).join('')}</tr>`; }).join('');
  return `${pageHead('Leave Calendar','Department-wise calendar of leave, absence and working patterns. Click a day to request leave, or a coloured block to view it.',
   `<button class="btn" data-act="exportCal">${ico('down')} Export CSV</button><button class="btn pri" data-act="leaveModal">${ico('plus')} Request leave</button>`)}
  <div class="legend">${Object.keys(LT).map(k=>`<span class="lg" style="background:${LT[k].c};color:${LT[k].fg};${k==='HALF'?'border:1px solid #c5cddd':''}">${LEGEND_LABEL[k]}</span>`).join('')}</div>
  <div class="row wrap small" style="margin-bottom:10px"><b class="muted">NOTES:</b><span class="lg" style="background:#fff3c4;color:#6b5400;border:1px solid #f1dc84">PUBLIC</span><span class="lg" style="background:#fddddd;color:#7f1d1d;border:1px solid #f5b5b5">HR</span><span class="lg" style="background:#fff;border:2px dashed #888;color:#444">PENDING APPROVAL</span><span class="muted">Rest days (per shift pattern) shaded. ${isMgr()?'':'Colleagues’ sickness is shown only as “OFF”.'}</span></div>
  <div class="brush card flat" style="padding:10px 12px;margin-bottom:12px">
    <div class="row wrap" style="gap:8px"><b class="small">Click to book:</b>
      <button class="bchip ${s.brush==='view'?'on':''}" data-act="brush" data-t="view">View only</button>
      ${TYPES_BY_ROLE().filter(k=>k!=='HALF').map(k=>`<button class="bchip ${s.brush===k?'on':''}" data-act="brush" data-t="${k}" style="--c:${LT[k].c==='#ffffff'?'#c5cddd':LT[k].c}">${LEGEND_LABEL[k]}</button>`).join('')}
      <span class="grow"></span>
      <label class="small row" style="gap:6px;margin:0">Day part <select data-chg="brushHalf" style="width:auto;padding:5px 8px"><option value="" ${!s.half?'selected':''}>Full day</option><option value="AM" ${s.half==='AM'?'selected':''}>Morning off</option><option value="PM" ${s.half==='PM'?'selected':''}>Afternoon off</option></select></label>
    </div>
    <div class="small muted" style="margin-top:6px">${s.brush==='view'?'Click a coloured block to see its details.':`Selected: <b>${esc(LT[s.brush].name)}</b>. Click a day on your row to book it, or drag across several days. ${isMgr()?'Managers can click a team member’s row to book for them. ':''}Holiday requests go to your manager for approval.`}</div>
  </div>
  <div class="cal-nav">
    <button class="nb" data-act="calPrev" aria-label="Previous">${ico('l')}</button><button class="nb" data-act="calNext" aria-label="Next">${ico('r')}</button>
    <span class="range">${range}</span><button class="btn sm" data-act="calToday">Today</button>
    <input type="date" style="width:150px" value="${s.start}" data-chg="calJump" min="${D.iso(D.add(D.today(),-365))}" max="${D.iso(D.add(D.today(),365*3))}" aria-label="Jump to date" title="Jump to a date (plan up to two years ahead)">
    <select style="width:auto" data-chg="calWeeks" aria-label="Weeks to show">${[4,5,8,12].map(w=>`<option value="${w}" ${w===s.weeks?'selected':''}>${w} weeks</option>`).join('')}</select>
    <div class="msel ${ST.deptOpen?'open':''}" id="dsel"><button class="btn" data-act="deptToggle" style="min-width:210px;justify-content:space-between">${s.depts.length?s.depts.length+' department'+(s.depts.length>1?'s':''):'-- Select Department --'} ${ico('chev')}</button>
      <div class="mp"><label><input type="checkbox" data-chg="deptAll" ${!s.depts.length?'checked':''}> <b>All my departments</b></label>${(isHR()?DB.depts:[...new Set(visibleEmps().flatMap(e=>e.depts))].sort()).map(d=>`<label><input type="checkbox" data-chg="deptPick" value="${esc(d)}" ${s.depts.includes(d)?'checked':''}> ${esc(d)}</label>`).join('')}</div></div>
    <input type="search" class="search" style="width:190px" placeholder="Search employee" value="${esc(s.q)}" data-inp="calQ" id="calq">
    ${isHR()?`<label class="row small" style="gap:6px"><input type="checkbox" style="width:auto" data-chg="calLeavers" ${s.leavers?'checked':''}> Include leavers</label>`:''}
    <span class="muted small">${list.length} people</span>
  </div>
  <div class="calw"><table class="cal"><thead>
    <tr><th class="lab">Month</th>${mHead.map(g=>`<th colspan="${g.n}">${g.k}</th>`).join('')}</tr>
    <tr><th class="lab">Wk Days</th>${wHead.map(g=>`<th colspan="${g.n}">Wk ${g.k.split('-')[1]}</th>`).join('')}</tr>
    <tr><th class="lab"></th>${dates.map(d=>`<th class="${d===today?'today':''}">${'SMTWTFS'[D.parse(d).getDay()]}</th>`).join('')}</tr>
    <tr><th class="lab">Date</th>${dates.map(d=>`<th class="${d===today?'today':''}">${D.parse(d).getDate()}</th>`).join('')}</tr>
    <tr><th class="lab">Employee</th>${dates.map(()=>'<th></th>').join('')}</tr></thead>
    <tbody>${rows||`<tr><td class="lab" colspan="${days+1}"><div class="empty">No employees match this filter.</div></td></tr>`}</tbody></table></div>`;
};
AFTER.calendar = () => { if(ST.calScroll){ const w = $('.calw'); if(w){ w.scrollLeft = ST.calScroll[0]; w.scrollTop = ST.calScroll[1]; } ST.calScroll = null; } const f = $('#calq'); if(f && ST.calFocus){ f.focus(); f.setSelectionRange(f.value.length,f.value.length); } };
ACT.calPrev = () => { const s = calState(); s.start = D.iso(D.add(D.parse(s.start), -7*s.weeks)); render(); };
ACT.calNext = () => { const s = calState(); s.start = D.iso(D.add(D.parse(s.start), 7*s.weeks)); render(); };
ACT.calToday = () => { calState().start = D.iso(mondayOf(D.today())); render(); };
CHG.calJump = el => { if(el.value){ calState().start = D.iso(mondayOf(D.parse(el.value))); render(); } };
CHG.calWeeks = el => { calState().weeks = +el.value; render(); };
ACT.deptToggle = (el,e) => { e.stopPropagation(); $('#dsel').classList.toggle('open'); ST.deptOpen = $('#dsel').classList.contains('open'); };
CHG.deptAll = el => { calState().depts = []; ST.deptOpen = true; render(); };
CHG.deptPick = el => { const s = calState(); const a = new Set(s.depts); el.checked ? a.add(el.value) : a.delete(el.value); s.depts = [...a]; ST.deptOpen = true; render(); };
CHG.calQ = el => { calState().q = el.value; ST.calFocus = true; ST.deptOpen = false; render(); ST.calFocus = false; };
CHG.calLeavers = el => { calState().leavers = el.checked; render(); };
document.addEventListener('click', e => { if(!e.target.closest('.msel')) ST.deptOpen = false; });
ACT.exportCal = () => { const s = calState(); const from = s.start, to = D.iso(D.add(D.parse(s.start), s.weeks*7-1)); const ids = new Set(calEmps().map(e=>e.id));
  const rows = DB.leave.filter(l => ids.has(l.emp) && l.end>=from && l.start<=to).map(l => { const e = emp(l.emp); return [e.name, e.depts.join(' / '), e.region, LT[l.type].name, l.start, l.end, l.half||'', recDays(l,e.region), l.status]; });
  csvDownload('leave_calendar', ['Employee','Department(s)','Region','Type','From','To','Half day','Working days','Status'], rows); };
ACT.brush = el => { const s = calState(); s.brush = el.dataset.t; render(); };
CHG.brushHalf = el => { calState().half = el.value; render(); };
ACT.calCell = el => {
  if(calState().brush!=='view') return; // booking is handled by the pointer handlers below
  const e = emp(el.dataset.emp), d = el.dataset.date, rec = recFor(e.id, d);
  if(rec && !(rec.type==='HOL' && phName(d,e.region)) && !isRest(e,d)) return leaveDetail(rec.id);
  if(isRest(e,d)) return;
  if(e.id===SESSION.uid || manageable().some(x=>x.id===e.id)) return leaveModal({emp:e.id, date:d});
  toast('You can only book leave on your own row.');
};
ACT.calEmp = el => { const e = emp(el.dataset.id); if(!isMgr() && e.id!==SESSION.uid) return toast('Balances are visible to managers and HR only.'); balanceModal(e.id); };
function balanceModal(id){
  const e = emp(id), y = D.today().getFullYear();
  modal({title:`${esc(e.name)} – leave balance`, body:`<div class="grid g3">${[y,y+1,y+2].map(yr=>{ const b = balance(e,yr); return `<div class="card flat"><h3>${yr}</h3><dl class="dl" style="grid-template-columns:1fr auto"><dt>Entitlement</dt><dd>${num1(b.ent)}</dd><dt>Carried over</dt><dd>${num1(b.carry)}</dd><dt>Taken</dt><dd>${num1(b.taken)}</dd><dt>Booked</dt><dd>${num1(b.upcoming)}</dd><dt>Pending</dt><dd>${num1(b.pending)}</dd><dt><b>Remaining</b></dt><dd><b>${num1(b.remaining)}</b></dd></dl></div>`; }).join('')}</div><p class="small muted" style="margin-top:12px">Region quota: ${e.region} ${DB.settings.quota[e.region]} days (pro-rata for starters and leavers). ${esc(DB.settings.note)}</p>`, actions:[{label:'Close',act:'closeModal'}]});
}

/* ---------- Leave request / detail ---------- */
const TYPES_BY_ROLE = () => isHR() ? Object.keys(LT) : isMgr() ? ['HOL','WFH','SICK','SICK_SSP','LATE','UNAUTH','PAT'] : ['HOL','WFH','SICK'];
function leaveModal(o={}){
  const u = me(), forEmp = o.emp || u.id, d = o.date || D.todayIso();
  const who = [u, ...manageable()].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i && x.status==='active');
  const types = o.type ? [o.type] : TYPES_BY_ROLE();
  modal({title: o.type && LT[o.type].sick ? 'Report sickness / absence' : 'Request leave or record absence', body:`<form id="lf" onsubmit="return false">
    <div class="fgrid"><div class="field full"><label>Employee</label><select name="emp" data-chg="leaveCalc" ${who.length<2?'disabled':''}>${empOptions(who, forEmp)}</select></div>
    <div class="field full"><label>Type</label><select name="type" data-chg="leaveCalc">${types.map(k=>`<option value="${k}" ${k===(o.type||'HOL')?'selected':''}>${LT[k].name}</option>`).join('')}</select></div>
    <div class="field"><label>From</label><input type="date" name="start" value="${d}" data-chg="leaveCalc" max="${D.iso(D.add(D.today(),365*2))}"></div>
    <div class="field"><label>To</label><input type="date" name="end" value="${d}" data-chg="leaveCalc" max="${D.iso(D.add(D.today(),365*2))}"></div>
    <div class="field"><label class="row" style="gap:8px;margin:0"><input type="checkbox" name="half" style="width:auto" data-chg="leaveCalc"> Half day (single date only)</label></div>
    <div class="field"><select name="ampm" data-chg="leaveCalc"><option value="AM">Morning off</option><option value="PM">Afternoon off</option></select></div>
    <div class="field full"><label>Notes</label><textarea name="note" placeholder="Optional"></textarea></div></div>
    <div id="lsum" class="banner info"></div><div id="lerr" class="err" role="alert"></div></form>`,
    actions:[{label:'Cancel',act:'closeModal'},{label:'Submit',cls:'pri',act:'saveLeave'}]});
  CHG.leaveCalc();
}
ACT.leaveModal = () => leaveModal();
ACT.sickModal = () => leaveModal({type:'SICK'});
function leaveFormRec(){ const f = $('#lf'); const half = f.half.checked && f.start.value===f.end.value;
  return { emp:f.emp.value, type:f.type.value, start:f.start.value, end:f.end.value, half: half ? f.ampm.value : null, note:f.note.value.trim() }; }
function daysByYear(rec, region){ const out = {}; for(let d=D.parse(rec.start); D.iso(d)<=rec.end; d=D.add(d,1)){ const i = D.iso(d), v = dayValue(rec,i,region); if(v) out[i.slice(0,4)] = (out[i.slice(0,4)]||0)+v; } return out; }
function leaveProblems(rec, ignore){
  const e = emp(rec.emp), u = me(), p = [];
  if(!rec.start || !rec.end) return ['Choose a start and end date.'];
  if(rec.end < rec.start) return ['The end date cannot be before the start date.'];
  if(rec.end > D.iso(D.add(D.today(),365*2+1))) p.push('Leave can be planned up to two years ahead.');
  if(rec.start < D.iso(D.add(D.today(),-60)) && !isHR()) p.push('Requests more than 60 days in the past must be entered by HR.');
  const by = daysByYear(rec, e.region), total = Object.values(by).reduce((a,b)=>a+b,0);
  if(!total && !['MAT_PAID','MAT_SSP','PAT'].includes(rec.type)) p.push('No working days in the selected range (weekends and public holidays are excluded).');
  const o = overlaps(rec.emp, rec.start, rec.end, ignore); if(o) p.push(`Overlaps an existing ${LT[o.type].name} entry (${fmtS(o.start)}–${fmtS(o.end)}).`);
  if(rec.type==='HOL'){ Object.entries(by).forEach(([y,n]) => { const b = balance(e,+y); const extra = ignore ? (DB.leave.find(l=>l.id===ignore) ? (daysByYear(DB.leave.find(l=>l.id===ignore),e.region)[y]||0) : 0) : 0;
      if(n > b.free + extra + 1e-9) p.push(`Only ${num1(b.free+extra)} day(s) available in ${y}; this request needs ${num1(n)}.${isHR()?' (HR may override.)':''}`); }); }
  return p;
}
CHG.leaveCalc = () => { const f = $('#lf'); if(!f) return; if(f.start.value && (!f.end.value || f.end.value<f.start.value) ) f.end.value = f.start.value;
  const single = f.start.value===f.end.value; f.half.disabled = !single; if(!single) f.half.checked = false; f.ampm.disabled = !f.half.checked;
  const rec = leaveFormRec(), e = emp(rec.emp), by = daysByYear(rec, e.region), total = Object.values(by).reduce((a,b)=>a+b,0);
  const b = balance(e, +(rec.start||D.todayIso()).slice(0,4));
  $('#lsum').innerHTML = `${ico('cal')} <span><b>${num1(total)}</b> working day(s)${rec.type==='HOL'?` · balance in ${(rec.start||'').slice(0,4)}: <b>${num1(b.free)}</b> available → <b>${num1(b.free-(by[(rec.start||'').slice(0,4)]||0))}</b> after this request`:''}</span>`;
};
function submitLeave(rec){
  const e = emp(rec.emp), u = me();
  const probs = leaveProblems(rec);
  const hard = probs.filter(p => !(isHR() && /available in/.test(p)));
  if(hard.length) return {ok:false, errors:hard};
  const self = e.id===u.id;
  const auto = LT[rec.type].sick || !['HOL','WFH'].includes(rec.type) ? true : (!self && manageable().some(x=>x.id===e.id));
  const r = { id:uid('l'), ...rec, status: auto ? 'approved' : 'pending', created:D.todayIso(), by:u.id };
  DB.leave.push(r); log('Leave '+(auto?'recorded':'requested'), `${LT[r.type].name} ${r.start}→${r.end} for ${e.name}`, e.id);
  if(r.status==='pending'){ const ap = managersOf(e).filter(x=>x!==u.id); const hr = DB.emps.filter(x=>x.role==='hr'||x.role==='admin').map(x=>x.id).filter(x=>x!==u.id);
    notify(ap.length?ap:hr, `${e.name} requested ${LT[r.type].name.toLowerCase()} (${fmtS(r.start)}${r.end!==r.start?'–'+fmtS(r.end):''}) – approval needed.`, 'leave'); }
  if(LT[r.type].sick){ const due = nextWorkday(r.end, e); DB.rtw.push({id:uid('rtw'), emp:e.id, absId:r.id, due, status:'Due'});
    notify([...managersOf(e)], `Return-to-work form due for ${e.name} by ${fmt(due)} (after absence ${fmtS(r.start)}–${fmtS(r.end)}).`, 'leave');
    const b = bradford(e.id); const [lv] = bradLevel(b.score); if(lv!=='Below trigger') notify(DB.emps.filter(x=>x.role==='hr'||x.role==='admin').map(x=>x.id), `${e.name} has reached Bradford Factor ${b.score} (${lv}).`, 'reports'); }
  saveDB();
  return {ok:true, rec:r, auto, days:recDays(r,e.region)};
}
ACT.saveLeave = () => {
  const er = $('#lerr'); const res = submitLeave(leaveFormRec());
  if(!res.ok){ er.innerHTML = res.errors.map(esc).join('<br>'); er.classList.add('show'); return; }
  closeModal(); toast(res.auto?'Recorded':'Request submitted for approval','ok'); render();
};
function leaveDetail(id){
  const l = DB.leave.find(x=>x.id===id), e = emp(l.emp), t = LT[l.type], hide = t.sick && !isMgr() && e.id!==SESSION.uid;
  const mine = e.id===SESSION.uid;
  modal({title:`${hide?'Absence':esc(t.name)}`, body:`<div class="row" style="margin-bottom:12px">${av(e,44)}<div><b>${esc(e.name)}</b><div class="small muted">${esc(e.depts.join(' / '))} · ${e.region}</div></div><span style="margin-left:auto">${statusBadge(l.status)}</span></div>
    <dl class="dl"><dt>Dates</dt><dd>${fmt(l.start)}${l.end!==l.start?' – '+fmt(l.end):''}${l.half?` (${l.half==='AM'?'morning':'afternoon'} off)`:''}</dd><dt>Working days</dt><dd>${num1(recDays(l,e.region))}</dd>${hide?'':`<dt>Notes</dt><dd>${esc(l.note)||'—'}</dd>`}<dt>Requested</dt><dd>${fmt(l.created)}${l.by&&l.by!==l.emp?' by '+esc(empName(l.by)):''}</dd>${l.decision?`<dt>Decision</dt><dd>${esc(l.decision)}</dd>`:''}</dl>`,
    actions:[ ...(l.status==='pending' && canApprove(l) ? [{label:'Reject',cls:'bad',act:'rejectLeave',data:`data-id="${id}"`},{label:'Approve',cls:'ok',act:'approveLeave',data:`data-id="${id}"`}] : []),
      ...((mine && l.status==='pending')||isHR() ? [{label:'Cancel request',act:'cancelLeave',data:`data-id="${id}"`}] : []), {label:'Close',act:'closeModal'}]});
}
ACT.approveLeave = el => { const l = DB.leave.find(x=>x.id===el.dataset.id); l.status='approved'; l.decision = `Approved by ${me().name} on ${fmt(D.todayIso())}`; notify(l.emp, `Your ${LT[l.type].name.toLowerCase()} request (${fmtS(l.start)}–${fmtS(l.end)}) was approved.`, 'leave'); log('Leave approved', `${LT[l.type].name} ${l.start}→${l.end}`, l.emp); saveDB(); closeModal(); toast('Approved','ok'); render(); };
ACT.rejectLeave = el => { const id = el.dataset.id; modal({title:'Reject request',body:`<div class="field"><label>Reason (shared with the employee)</label><textarea id="rj" placeholder="e.g. Minimum cover needed that week"></textarea></div>`,actions:[{label:'Back',act:'closeModal'},{label:'Reject request',cls:'bad',act:'rejectConfirm',data:`data-id="${id}"`}]}); };
ACT.rejectConfirm = el => { const l = DB.leave.find(x=>x.id===el.dataset.id); const why = $('#rj').value.trim(); if(!why) return toast('Please give a reason.','bad'); l.status='rejected'; l.decision = `Rejected by ${me().name}: ${why}`; notify(l.emp, `Your ${LT[l.type].name.toLowerCase()} request was rejected: ${why}`, 'leave'); log('Leave rejected', why, l.emp); saveDB(); closeModal(); render(); };
ACT.cancelLeave = el => { const l = DB.leave.find(x=>x.id===el.dataset.id); l.status='cancelled'; log('Leave cancelled', `${LT[l.type].name} ${l.start}→${l.end}`, l.emp); DB.rtw = DB.rtw.filter(r=>r.absId!==l.id || r.status==='Complete'); saveDB(); closeModal(); toast('Cancelled'); render(); };

/* ---------------- LEAVE & ABSENCE PAGE ---------------- */
VIEWS.leave = () => {
  const tabs = [['my','My leave'],...(isMgr()?[['team','Team requests']]:[]),['sick','Sickness & return to work'],...(isHR()?[['quota','Allowances']]:[]),['hols','Holiday calendar']];
  const k = tabOf('leave','my'); const ok = tabs.some(t=>t[0]===k); const cur = ok?k:'my';
  const fn = { my:leaveMy, team:leaveTeam, sick:leaveSick, quota:leaveQuota, hols:leaveHols }[cur];
  return pageHead('Leave & Absence','Balances, approvals, sickness and return-to-work.',`<button class="btn" data-act="leaveModal">${ico('plus')} Request leave</button>`) + tabsHtml('leave', tabs, 'my') + fn();
};
function leaveMy(){
  const u = me(), y0 = D.today().getFullYear(), yr = +(ST.f.leaveYear||y0), b = balance(u,yr);
  const mine = DB.leave.filter(l=>l.emp===u.id && +l.start.slice(0,4)<=yr && +l.end.slice(0,4)>=yr).sort((a,c)=>c.start.localeCompare(a.start));
  return `<div class="row wrap" style="margin-bottom:14px"><b>Leave year</b><select style="width:auto" data-chg="leaveYear">${[y0-1,y0,y0+1,y0+2].map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join('')}</select><span class="muted small">${yr>y0?'Planning ahead: you can book holidays up to two years in advance.':''}</span></div>
  <div class="grid g4" style="margin-bottom:16px">${[['Entitlement',b.ent+b.carry,`${num1(b.ent)} + ${num1(b.carry)} carried`],['Taken',b.taken,'Up to today'],['Booked / pending',b.upcoming+b.pending,`${num1(b.upcoming)} approved · ${num1(b.pending)} pending`],['Remaining',b.remaining,`${num1(b.acc-b.taken-b.upcoming)} accrued to date`]].map(([t,v,s])=>`<div class="card kpi"><span class="t">${t}</span><span class="v">${num1(v)}</span><span class="s muted">${s}</span></div>`).join('')}</div>
  <div class="card"><h3>My requests &amp; absence in ${yr}</h3>${table([{h:'Type',f:l=>`<span class="badge" style="background:${LT[l.type].c};color:${LT[l.type].fg};border:1px solid #cfd7e6">${LT[l.type].code}</span> ${esc(LT[l.type].name)}`},{h:'Dates',f:l=>`${fmt(l.start)}${l.end!==l.start?' – '+fmt(l.end):''}${l.half?' ('+l.half+')':''}`},{h:'Days',f:l=>num1(recDays(l,u.region))},{h:'Status',f:l=>statusBadge(l.status)},{h:'Decision',f:l=>`<span class="small muted">${esc(l.decision||'')}</span>`},{h:'',cls:'right',f:l=>`<button class="btn sm" data-act="detail" data-id="${l.id}">View</button>`}], mine, {empty:'No leave recorded for this year.'})}</div>`;
}
CHG.leaveYear = el => { ST.f.leaveYear = el.value; render(); };
ACT.detail = el => leaveDetail(el.dataset.id);
function leaveTeam(){
  const pend = DB.leave.filter(l=>l.status==='pending' && canApprove(l)).sort((a,b)=>a.start.localeCompare(b.start));
  const done = DB.leave.filter(l=>['approved','rejected'].includes(l.status) && l.decision && canApprove({emp:l.emp})).slice(-8).reverse();
  const clash = l => { const e = emp(l.emp); const n = DB.emps.filter(x=>x.id!==e.id && x.status==='active' && x.depts.some(d=>e.depts.includes(d)) && DB.leave.some(o=>o.emp===x.id && o.status==='approved' && !(o.end<l.start||o.start>l.end))).length; return n?badge(n+' colleague(s) already off','warn'):badge('No clashes','ok'); };
  return `<div class="card"><h3>Awaiting your approval ${badge(pend.length)}</h3>${table([{h:'Employee',f:l=>`<div class="row">${av(l.emp,28)}<b>${esc(empName(l.emp))}</b></div>`},{h:'Type',f:l=>esc(LT[l.type].name)},{h:'Dates',f:l=>`${fmt(l.start)}${l.end!==l.start?' – '+fmt(l.end):''}`},{h:'Days',f:l=>num1(recDays(l,emp(l.emp).region))},{h:'Balance after',f:l=>{ const b = balance(emp(l.emp), +l.start.slice(0,4)); return l.type==='HOL'?num1(b.remaining-recDays(l,emp(l.emp).region)):'—'; }},{h:'Cover',f:clash},{h:'',cls:'right nowrap',f:l=>`<button class="btn sm" data-act="detail" data-id="${l.id}">Review</button> <button class="btn sm ok" data-act="approveLeave" data-id="${l.id}">Approve</button> <button class="btn sm bad" data-act="rejectLeave" data-id="${l.id}">Reject</button>`}],pend,{empty:'Nothing waiting for approval.'})}</div>
  <div class="card" style="margin-top:16px"><h3>Recent decisions</h3>${table([{h:'Employee',f:l=>esc(empName(l.emp))},{h:'Type',f:l=>esc(LT[l.type].name)},{h:'Dates',f:l=>fmt(l.start)},{h:'Outcome',f:l=>statusBadge(l.status)},{h:'Decision',f:l=>`<span class="small muted">${esc(l.decision)}</span>`}],done,{empty:'No decisions yet.'})}</div>`;
}
function leaveSick(){
  const rtw = DB.rtw.filter(r => isHR() || r.emp===SESSION.uid || managersOf(emp(r.emp)).includes(SESSION.uid)).sort((a,b)=>a.due.localeCompare(b.due));
  const people = isMgr() ? visibleEmps().filter(e=>e.id!==SESSION.uid || true) : [me()];
  const brad = people.map(e => ({e, ...bradford(e.id), fm:fridayMonday(e.id)})).filter(x=>x.spells).sort((a,b)=>b.score-a.score);
  return `<div class="banner info">${ico('help')}<span>Sickness triggers use the <b>Bradford Factor</b> (spells² × days, rolling 52 weeks). Thresholds ${DB.settings.bradford.join(' / ')} are an <b>assumption</b> – HR to confirm against the Sickness &amp; Absence Policy.</span></div>
  <div class="card"><h3>Return-to-work forms</h3>${table([{h:'Employee',f:r=>esc(empName(r.emp))},{h:'Absence',f:r=>{ const l = DB.leave.find(x=>x.id===r.absId); return l?`${fmtS(l.start)} – ${fmtS(l.end)}`:'—'; }},{h:'Due by',f:r=>fmt(r.due)},{h:'Status',f:r=>r.status==='Complete'?badge('Complete','ok'):D.todayIso()>r.due?badge('Overdue','bad'):badge('Due','warn')},{h:'',cls:'right',f:r=>r.status==='Complete'?`<button class="btn sm" data-act="rtwForm" data-id="${r.id}">View</button>`:isMgr()?`<button class="btn sm pri" data-act="rtwForm" data-id="${r.id}">Complete form</button>`:''}],rtw,{empty:'No return-to-work forms outstanding.'})}</div>
  <div class="card" style="margin-top:16px"><h3>Sickness record &amp; triggers ${isMgr()?'':badge('My record')}</h3>${table([{h:'Employee',f:x=>esc(x.e.name)},{h:'Spells (52 wks)',f:x=>x.spells},{h:'Days',f:x=>num1(x.days)},{h:'Bradford score',f:x=>`<b>${x.score}</b>`},{h:'Stage',f:x=>{ const [l,c] = bradLevel(x.score); return badge(l,c); }},{h:'Fri / Mon pattern',f:x=>x.fm.tot&&x.fm.fm/x.fm.tot>=0.5&&x.fm.tot>=2?badge(`${x.fm.fm} of ${x.fm.tot} days – review`,'warn'):'<span class="muted small">No pattern</span>'},...(isHR()?[{h:'',cls:'right',f:x=>{ const [l] = bradLevel(x.score); return l==='Below trigger'?'':`<button class="btn sm" data-act="trigLetter" data-id="${x.e.id}">Trigger letter</button>`; }}]:[])],brad,{empty:'No sickness recorded in the last 52 weeks.'})}</div>`;
}
ACT.rtwForm = el => { const r = DB.rtw.find(x=>x.id===el.dataset.id), l = DB.leave.find(x=>x.id===r.absId), e = emp(r.emp), done = r.status==='Complete', d = r.form||{};
  modal({title:`Return-to-work interview – ${esc(e.name)}`,body:`<form id="rf" onsubmit="return false"><dl class="dl" style="margin-bottom:14px"><dt>Absence</dt><dd>${l?fmt(l.start)+' – '+fmt(l.end)+' ('+esc(LT[l.type].name)+')':'—'}</dd></dl>
  <div class="fgrid"><div class="field"><label>Interview date</label><input type="date" name="date" value="${d.date||D.todayIso()}" ${done?'disabled':''}></div><div class="field"><label>Reason category</label><select name="reason" ${done?'disabled':''}>${['Illness','Injury','Medical appointment','Family / dependants','Mental health','Other'].map(x=>`<option ${d.reason===x?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="field"><label>Fit to return?</label><select name="fit" ${done?'disabled':''}><option ${d.fit==='Yes'?'selected':''}>Yes</option><option ${d.fit==='Yes, with adjustments'?'selected':''}>Yes, with adjustments</option><option ${d.fit==='No'?'selected':''}>No</option></select></div>
  <div class="field"><label class="row" style="margin-top:26px;gap:8px"><input type="checkbox" name="med" style="width:auto" ${d.med?'checked':''} ${done?'disabled':''}> Medical evidence received</label></div>
  <div class="field full"><label>Adjustments / support agreed</label><textarea name="adj" ${done?'disabled':''}>${esc(d.adj||'')}</textarea></div>
  <div class="field full"><label>Manager notes</label><textarea name="notes" ${done?'disabled':''}>${esc(d.notes||'')}</textarea></div></div></form>`,
  actions: done ? [{label:'Close',act:'closeModal'}] : [{label:'Cancel',act:'closeModal'},{label:'Save & complete',cls:'pri',act:'rtwSave',data:`data-id="${r.id}"`}]}); };
ACT.rtwSave = el => { const r = DB.rtw.find(x=>x.id===el.dataset.id), f = $('#rf'); r.form = {date:f.date.value,reason:f.reason.value,fit:f.fit.value,med:f.med.checked,adj:f.adj.value,notes:f.notes.value,by:me().name}; r.status='Complete'; log('RTW completed','',r.emp); saveDB(); closeModal(); toast('Return-to-work form saved','ok'); render(); };
ACT.trigLetter = el => { const e = emp(el.dataset.id), b = bradford(e.id), [lv] = bradLevel(b.score);
  const txt = `PFG Group – ${e.company}\nPFG Confidential\n\nDate: ${fmt(D.todayIso())}\n\nDear ${e.name.split(' ')[0]},\n\nSickness absence review – ${lv}\n\nOur records show ${b.spells} spell(s) of absence totalling ${num1(b.days)} working day(s) in the last 52 weeks (Bradford Factor ${b.score}). Under the Sickness & Absence Policy (section: trigger points – clause to be inserted by HR) this requires a review meeting.\n\nYou are welcome to be accompanied. Please contact HR to arrange a date.\n\nThis is a DRAFT generated for HR review and must be approved by HR before issue.\n\nGlobal HR Services`;
  modal({title:`Draft trigger letter – ${esc(e.name)}`,body:`<pre style="white-space:pre-wrap;font:13px/1.5 var(--font);background:#f6f8fc;padding:14px;border-radius:10px">${esc(txt)}</pre>`,actions:[{label:'Close',act:'closeModal'},{label:'Download draft',cls:'pri',act:'dlLetter',data:`data-id="${e.id}"`}]}); window.__letter = txt; log('Trigger letter drafted',lv,e.id); saveDB(); };
ACT.dlLetter = el => fileDownload('Trigger_letter_DRAFT_'+emp(el.dataset.id).name.replace(/ /g,'_')+'.txt', window.__letter);
function leaveQuota(){
  const y0 = D.today().getFullYear(), yr = +(ST.f.qYear||y0); const q = ST.f.qQ||'';
  const list = DB.emps.filter(e=>e.status==='active' && (!q || e.name.toLowerCase().includes(q.toLowerCase()))).sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="toolbar"><select data-chg="qYear" style="width:auto">${[y0,y0+1,y0+2].map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join('')}</select><input type="search" class="search" placeholder="Search" value="${esc(q)}" data-inp="qQ" id="qq"><span class="grow"></span><button class="btn" data-act="bulkAlloc">${ico('users')} Bulk allocate</button><button class="btn" data-act="exportQuota">${ico('down')} Export</button></div>
  <div class="banner info">${ico('help')}<span>Quota by region: UK ${DB.settings.quota.UK} days · PK ${DB.settings.quota.PK} days (change in Settings). All active employees are listed, including those with a zero balance. Leavers are excluded from allocations and the calendar.</span></div>
  ${table([{h:'Employee',f:e=>`<div class="row">${av(e,26)}<b>${esc(e.name)}</b></div>`},{h:'Region',f:e=>e.region},{h:'Start date',f:e=>fmt(e.start)},{h:'Entitlement',f:e=>num1(balance(e,yr).ent)},{h:'Extra',f:e=>num1(e.extraDays||0)},{h:'Carry-over',f:e=>num1((e.carry||{})[yr]||0)},{h:'Accrued',f:e=>num1(balance(e,yr).acc)},{h:'Taken',f:e=>num1(balance(e,yr).taken)},{h:'Booked',f:e=>num1(balance(e,yr).upcoming)},{h:'Pending',f:e=>num1(balance(e,yr).pending)},{h:'Remaining',f:e=>{ const r = balance(e,yr).remaining; return `<b style="color:${r<=0?'var(--bad)':'inherit'}">${num1(r)}</b>`; }},{h:'',cls:'right',f:e=>`<button class="btn sm" data-act="allocOne" data-id="${e.id}" data-y="${yr}">Allocate</button>`}],list)}`;
}
CHG.qYear = el => { ST.f.qYear = el.value; render(); };
CHG.qQ = el => { ST.f.qQ = el.value; render(); const f = $('#qq'); f.focus(); f.setSelectionRange(f.value.length,f.value.length); };
ACT.exportQuota = () => { const yr = +(ST.f.qYear||D.today().getFullYear()); csvDownload('leave_allowances_'+yr, ['Employee','Region','Start','Entitlement','Extra','Carry-over','Accrued','Taken','Booked','Pending','Remaining'], DB.emps.filter(e=>e.status==='active').map(e=>{ const b = balance(e,yr); return [e.name,e.region,e.start,b.ent,e.extraDays||0,b.carry,b.acc,b.taken,b.upcoming,b.pending,b.remaining]; })); };
ACT.allocOne = el => { const e = emp(el.dataset.id), y = +el.dataset.y; modal({title:`Allocate – ${esc(e.name)} (${y})`,body:`<form id="af" onsubmit="return false"><div class="fgrid"><div class="field"><label>Extra days (all years)</label><input type="number" step="0.5" min="-30" max="60" name="extra" value="${e.extraDays||0}"></div><div class="field"><label>Carry-over into ${y}</label><input type="number" step="0.5" min="0" max="60" name="carry" value="${(e.carry||{})[y]||0}"></div></div><p class="small muted">Base entitlement ${DB.settings.quota[e.region]} days (${e.region}), pro-rata from ${fmt(e.start)}.</p></form>`,actions:[{label:'Cancel',act:'closeModal'},{label:'Save',cls:'pri',act:'allocSave',data:`data-id="${e.id}" data-y="${y}"`}]}); };
ACT.allocSave = el => { const e = emp(el.dataset.id), f = $('#af'); const x = +f.extra.value, c = +f.carry.value; if(isNaN(x)||isNaN(c)||c<0) return toast('Enter valid numbers.','bad'); e.extraDays = x; (e.carry ||= {})[el.dataset.y] = c; e.history.unshift({t:D.todayIso()+' '+new Date().toTimeString().slice(0,5),by:me().name,what:`Leave allocation updated: extra ${x}, carry-over ${c} for ${el.dataset.y}`}); log('Allocation updated',`${x} extra / ${c} carry (${el.dataset.y})`,e.id); saveDB(); closeModal(); toast('Allocation saved','ok'); render(); };
ACT.bulkAlloc = () => modal({title:'Bulk allocation',body:`<form id="bf" onsubmit="return false"><div class="fgrid"><div class="field"><label>Apply to</label><select name="scope"><option value="all">All active employees</option>${DB.depts.map(d=>`<option value="d:${esc(d)}">Department: ${esc(d)}</option>`).join('')}<option value="UK">Region: UK</option><option value="PK">Region: PK</option></select></div><div class="field"><label>Year</label><input type="number" name="y" value="${D.today().getFullYear()+1}" min="2020" max="2100"></div><div class="field"><label>Add carry-over (days)</label><input type="number" step="0.5" name="carry" value="0" min="0" max="30"></div><div class="field"><label>Add extra days (permanent)</label><input type="number" step="0.5" name="extra" value="0" min="0" max="30"></div></div><p class="small muted">Adds to existing values for the selected group. Changes are written to each employee’s audit history.</p></form>`,actions:[{label:'Cancel',act:'closeModal'},{label:'Apply',cls:'pri',act:'bulkSave'}]});
ACT.bulkSave = () => { const f = $('#bf'); const s = f.scope.value, y = f.y.value, c = +f.carry.value, x = +f.extra.value; if(c<0||x<0||isNaN(c)||isNaN(x)) return toast('Values must be zero or more.','bad');
  const ids = DB.emps.filter(e => e.status==='active' && (s==='all' || s===e.region || (s.startsWith('d:') && e.depts.includes(s.slice(2))))); ids.forEach(e => { (e.carry ||= {})[y] = ((e.carry||{})[y]||0)+c; e.extraDays = (e.extraDays||0)+x; e.history.unshift({t:D.todayIso()+' 00:00',by:me().name,what:`Bulk allocation: +${c} carry-over (${y}), +${x} extra days`}); });
  log('Bulk allocation', `${ids.length} employees: +${c} carry, +${x} extra`); saveDB(); closeModal(); toast(`Updated ${ids.length} employees`,'ok'); render(); };
function leaveHols(){
  const y0 = D.today().getFullYear(), yr = +(ST.f.hy||y0), rg = ST.f.hr||'UK';
  const list = Object.entries(phYear(yr,rg)).map(([d,n])=>({d,n,t:'Public'})).concat((DB.holidays||[]).filter(h=>h.date.startsWith(yr)&&(h.region==='All'||h.region===rg)).map(h=>({d:h.date,n:h.name,t:'Company (HR)',id:h.id}))).sort((a,b)=>a.d.localeCompare(b.d));
  return `<div class="toolbar"><select data-chg="hy" style="width:auto">${[y0,y0+1,y0+2].map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join('')}</select><select data-chg="hr" style="width:auto">${REGIONS.map(r=>`<option ${r===rg?'selected':''}>${r}</option>`).join('')}</select><span class="grow"></span>${isHR()?`<button class="btn pri" data-act="addHol">${ico('plus')} Add company holiday</button>`:''}</div>
  <div class="banner info">${ico('help')}<span>${rg==='UK'?'England &amp; Wales bank holidays are calculated automatically, including substitute days. Please verify each year against GOV.UK.':'Pakistan fixed-date national holidays only. <b>Religious holidays (Eid, Ashura, etc.) depend on moon sighting – HR should add them as company holidays when announced.</b>'}</span></div>
  ${table([{h:'Date',f:x=>`<b>${fmt(x.d)}</b>`},{h:'Day',f:x=>DAYS[D.parse(x.d).getDay()]},{h:'Holiday',f:x=>esc(x.n)},{h:'Type',f:x=>badge(x.t,x.t==='Public'?'warn':'bad')},{h:'',cls:'right',f:x=>x.id&&isHR()?`<button class="btn sm" data-act="delHol" data-id="${x.id}">${ico('trash')}</button>`:''}],list)}`;
}
CHG.hy = el => { ST.f.hy = el.value; render(); }; CHG.hr = el => { ST.f.hr = el.value; render(); };
ACT.addHol = () => modal({title:'Add company holiday',body:`<form id="hf" onsubmit="return false"><div class="fgrid"><div class="field full"><label>Name</label><input name="n" placeholder="e.g. Eid ul-Fitr (day 1)"></div><div class="field"><label>Date</label><input type="date" name="d" max="${D.iso(D.add(D.today(),365*3))}"></div><div class="field"><label>Region</label><select name="r"><option>All</option>${REGIONS.map(r=>`<option>${r}</option>`).join('')}</select></div></div></form>`,actions:[{label:'Cancel',act:'closeModal'},{label:'Add',cls:'pri',act:'saveHol'}]});
ACT.saveHol = () => { const f = $('#hf'); if(!f.n.value.trim()||!f.d.value) return toast('Name and date are required.','bad'); DB.holidays.push({id:uid('h'),name:f.n.value.trim(),date:f.d.value,region:f.r.value}); log('Company holiday added',f.n.value+' '+f.d.value); saveDB(); closeModal(); render(); };
ACT.delHol = el => { DB.holidays = DB.holidays.filter(h=>h.id!==el.dataset.id); saveDB(); render(); };

/* ---- click / drag to book on the calendar ---- */
const DRAG = { on:false, emp:null, a:null, b:null };
function dragPaint(){
  $$('td.c.sel').forEach(x=>x.classList.remove('sel'));
  if(!DRAG.on) return; const lo = DRAG.a<DRAG.b?DRAG.a:DRAG.b, hi = DRAG.a<DRAG.b?DRAG.b:DRAG.a;
  $$(`td.c[data-emp="${DRAG.emp}"]`).forEach(x=>{ if(x.dataset.date>=lo && x.dataset.date<=hi) x.classList.add('sel'); });
}
document.addEventListener('mousedown', e => {
  const td = e.target.closest('td.c'); if(!td || route().id!=='calendar' || e.button!==0) return;
  const s = calState(); if(s.brush==='view') return;
  const em = emp(td.dataset.emp);
  if(!(em.id===SESSION.uid || manageable().some(x=>x.id===em.id))){ toast('You can only book on your own row'+(isMgr()?' or your team’s.':'.')); return; }
  DRAG.on = true; DRAG.emp = em.id; DRAG.a = DRAG.b = td.dataset.date; dragPaint(); e.preventDefault();
});
document.addEventListener('mouseover', e => { if(!DRAG.on) return; const td = e.target.closest('td.c'); if(td && td.dataset.emp===DRAG.emp){ DRAG.b = td.dataset.date; dragPaint(); } });
document.addEventListener('mouseup', e => {
  if(!DRAG.on) return; DRAG.on = false; const s = calState(); const em = emp(DRAG.emp);
  let lo = DRAG.a<DRAG.b?DRAG.a:DRAG.b, hi = DRAG.a<DRAG.b?DRAG.b:DRAG.a; dragPaint();
  while(lo<=hi && isRest(em,lo)) lo = D.iso(D.add(D.parse(lo),1)); while(hi>=lo && isRest(em,hi)) hi = D.iso(D.add(D.parse(hi),-1));
  if(lo>hi){ toast('That is a rest day on this shift pattern.'); return; }
  const single = lo===hi, existing = single && recFor(em.id, lo);
  if(existing){ leaveDetail(existing.id); return; }
  const half = single && s.half ? s.half : null; if(s.half && !single) toast('Day part applies to a single day – booked as full days.');
  const res = submitLeave({emp:em.id, type:s.brush, start:lo, end:hi, half, note:''});
  if(!res.ok){ toast(res.errors[0], 'bad'); return; }
  const w = $('.calw'); ST.calScroll = w ? [w.scrollLeft, w.scrollTop] : null;
  toast(res.auto ? `${LT[s.brush].name} recorded – ${num1(res.days)} day(s)` : `${LT[s.brush].name} requested – ${num1(res.days)} day(s), awaiting approval`, 'ok'); render();
});

/* ---- configurable dashboard (real-time refresh, widgets, BI export) ---- */
const WIDGETS = [['thought','Thought of the day'],['leave','Leave summary'],['off','Employees off today'],['stats','Company stats'],['sick','Sickness trend'],['news','Latest news'],['mood','How are you feeling'],['bday','Birthdays & anniversaries'],['rec','Recognition']];
AFTER.dashboard = () => { const hid = me().hiddenWidgets || []; hid.forEach(w => $$(`[data-w="${w}"]`).forEach(x => x.style.display = 'none')); };
ACT.dashCfg = () => { const hid = me().hiddenWidgets || []; modal({title:'Customise dashboard',body:`<p class="muted small">Choose the widgets you want to see. Your choice is saved for your account.</p>${WIDGETS.map(([k,l])=>`<label class="row" style="margin:6px 0;gap:8px"><input type="checkbox" style="width:auto" name="wg" value="${k}" ${hid.includes(k)?'':'checked'}> ${l}</label>`).join('')}`,actions:[{label:'Cancel',act:'closeModal'},{label:'Save',cls:'pri',act:'dashCfgSave'}]}); };
ACT.dashCfgSave = () => { const on = $$('input[name=wg]:checked').map(x=>x.value); me().hiddenWidgets = WIDGETS.map(w=>w[0]).filter(k=>!on.includes(k)); saveDB(); closeModal(); render(); };
ACT.dashRefresh = () => { render(); toast('Dashboard refreshed '+new Date().toTimeString().slice(0,5),'ok'); };
ACT.dashBI = () => { const act = DB.emps.filter(e=>e.status==='active'); csvDownload('dashboard_snapshot',['Metric','Value'],[['Snapshot',nowStamp()],['Active staff',act.length],['UK',act.filter(e=>e.region==='UK').length],['PK',act.filter(e=>e.region==='PK').length],['Off today',absentToday().length],['Pending leave requests',DB.leave.filter(l=>l.status==='pending').length],['Open tickets',DB.tickets.filter(t=>t.status!=='Resolved').length],['RTW forms due',DB.rtw.filter(r=>r.status==='Due').length]]); };
setInterval(() => { if(SESSION.uid && route().id==='dashboard' && !$('#modal') && !document.hidden) render(); }, 60000); // near-real-time refresh
