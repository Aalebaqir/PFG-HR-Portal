/* PFG HRMS – core: utilities, store, auth, UI helpers, leave engine */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = p => p + Math.random().toString(36).slice(2,8);
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const D = {
  parse: s => { const [y,m,d] = s.slice(0,10).split('-').map(Number); return new Date(y,m-1,d,12); },
  iso: d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
  add: (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; },
  diff: (a,b) => Math.round((D.parse(b)-D.parse(a))/864e5),
  today: () => { const t = new Date(); t.setHours(12,0,0,0); return t; },
  todayIso: () => D.iso(D.today()),
  wk: d => { const t = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const n = t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-n); const y0 = new Date(Date.UTC(t.getUTCFullYear(),0,1)); return Math.ceil(((t-y0)/864e5+1)/7); }
};
const fmt = s => { if(!s) return '—'; const d = D.parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const fmtS = s => { const d = D.parse(s); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}`; };
const fmtDT = s => s && s.length>10 ? `${fmt(s)} ${s.slice(11,16)}` : fmt(s);
const gbp = n => '£' + Number(n||0).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const num1 = n => (Math.round(n*2)/2).toString();

/* ---------- icons ---------- */
const IC = {
 home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
 cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
 users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
 brief:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
 clip:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
 check:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
 warn:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
 bell:'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
 search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
 plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
 down:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
 up:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
 l:'<polyline points="15 18 9 12 15 6"/>', r:'<polyline points="9 18 15 12 9 6"/>', chev:'<polyline points="6 9 12 15 18 9"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
 book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
 msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 chart:'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
 out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
 lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
 mail:'<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
 eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
 eyeoff:'<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
 x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
 award:'<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
 grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
 edit:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
 trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
 video:'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
 act:'<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
 org:'<rect x="9" y="2" width="6" height="5"/><rect x="2" y="17" width="6" height="5"/><rect x="16" y="17" width="6" height="5"/><path d="M12 7v5M5 17v-5h14v5"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
 pound:'<path d="M18 7c0-3-2-4-5-4s-5 2-5 5v4H5m3 0v5c0 2-1 3-3 4h14m-11-9h7"/>',
 smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
 flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
 star:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
 map:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
 list:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
 ms:'<rect x="2" y="2" width="9" height="9" fill="#f25022" stroke="none"/><rect x="13" y="2" width="9" height="9" fill="#7fba00" stroke="none"/><rect x="2" y="13" width="9" height="9" fill="#00a4ef" stroke="none"/><rect x="13" y="13" width="9" height="9" fill="#ffb900" stroke="none"/>'
};
const ico = (n, cls='') => `<svg class="i ${cls}" viewBox="0 0 24 24">${IC[n]||''}</svg>`;
const LOGO = (sm, big) => `<span class="logo ${sm?'sm':''} ${big?'lg':''}"><img src="assets/logo.png" alt="PFG Group"><span class="ls">HR Management System</span></span>`;

/* ---------- store ---------- */
let DB, SESSION = { uid: null };
const mem = {};
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return mem[k] ?? null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){ mem[k] = v; } },
  del(k){ try { localStorage.removeItem(k); } catch(e){ delete mem[k]; } }
};
function ensureTestUsers(){
  const T = [{id:'e27',name:'Adnan Ali',email:'adnan.ali@pentagonfoodgroup.co.uk',title:'Sales Executive (test account)',depts:['Sales / KAM'],mgr:'e5'},
    {id:'e28',name:'Fatima Noor',email:'fatima.noor@pentagonfoodgroup.co.uk',title:'Junior BI Analyst (test account, PK probation)',depts:['BI / Data'],mgr:'e21',region:'PK',start:'2026-09-14',dob:'1998-03-10',contract:'Permanent (probation)'}];
  let ch = false;
  T.forEach(u => { if(DB.emps.some(e => e.email.toLowerCase()===u.email)) return; ch = true;
    DB.emps.push(Object.assign({role:'employee',region:'UK',company:'PFG Group',start:'2026-10-01',dob:'1995-06-15',status:'active',manages:[],phone:'07xxx xxx 227',photo:null,carry:{},extraDays:0,shift:'Mon–Fri 09:00–17:30',emergency:{name:'Emergency contact (sample)',rel:'Next of kin',phone:'07xxx xxx xxx'},bank:'•••• (to be entered)',tax:'—',ni:'—',contract:'Permanent (test account)',fte:1,grade:'G3',docs:[],disc:[],history:[{t:D.todayIso()+' 09:00',by:'System',what:'Test employee account created'}]}, u)); });
  if(typeof migrate5==='function') migrate5();
  if(ch) saveDB();
}
function loadDB(){
  try { const r = store.get(DB_KEY); if(r){ DB = JSON.parse(r); if(DB.v===2){ ensureTestUsers(); return; } } } catch(e){}
  DB = seedDB(); ensureTestUsers(); saveDB();
}
function saveDB(){ store.set(DB_KEY, JSON.stringify(DB)); }
function resetDB(){ store.del(DB_KEY); DB = seedDB(); saveDB(); }
const emp = id => DB.emps.find(e => e.id === id);
const empName = id => emp(id)?.name || id || '—';
const me = () => emp(SESSION.uid);
const RANK = {employee:0,manager:1,hr:2,admin:3};
const isMgr = () => RANK[me().role] >= 1;
const isHR = () => RANK[me().role] >= 2;
const isAdmin = () => RANK[me().role] >= 3;
function log(action, detail='', target){
  const u = me(); const te = target ? emp(target) : u;
  DB.log.unshift({id:uid('a'),t:D.todayIso()+' '+new Date().toTimeString().slice(0,5),user:u?u.name:'System',uid:u?.id,action,detail,region:te?.region||'UK',dept:(te?.depts||[]).join(', ')});
  if(DB.log.length>800) DB.log.length = 800;
}
function notify(to, text, link){ (Array.isArray(to)?to:[to]).filter(Boolean).forEach(t => DB.notes.unshift({id:uid('n'),to:t,text,link:link||'',t:D.todayIso(),read:false})); }
function managersOf(e){ // approvers: line manager + anyone who manages one of the employee's departments
  const set = new Set(); if(e.mgr) set.add(e.mgr);
  DB.emps.filter(m => m.status==='active' && m.id!==e.id && m.manages.some(d => e.depts.includes(d))).forEach(m => set.add(m.id));
  return [...set];
}
const canApprove = (rec) => { const u = me(), e = emp(rec.emp); return e.id!==u.id && (isHR() || managersOf(e).includes(u.id)); };
function visibleEmps(opts={}){ // who the viewer may see (leavers optional)
  const u = me(); let list = DB.emps;
  if(!opts.leavers) list = list.filter(e => e.status==='active');
  if(isHR()) return list;
  if(u.role==='manager') return list.filter(e => e.id===u.id || e.depts.some(d => u.manages.includes(d) || u.depts.includes(d)));
  return list.filter(e => e.depts.some(d => u.depts.includes(d)));
}
const manageable = () => { const u = me(); if(isHR()) return DB.emps; if(u.role==='manager') return DB.emps.filter(e => e.id!==u.id && (e.mgr===u.id || e.depts.some(d => u.manages.includes(d)))); return []; };

/* ---------- UI helpers ---------- */
const COLORS = ['#1e3fa8','#0e7490','#7c3aed','#be185d','#b45309','#15803d','#0369a1','#9333ea','#c2410c','#4d7c0f'];
function av(e, size=34){
  if(typeof e==='string') e = emp(e); if(!e) return '';
  if(e.photo) return `<img class="av" src="${e.photo}" style="width:${size}px;height:${size}px" alt="">`;
  const ini = e.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const c = COLORS[(e.id.slice(1)|0)%COLORS.length];
  return `<span class="av" style="width:${size}px;height:${size}px;background:${c};font-size:${Math.round(size*.38)}px">${ini}</span>`;
}
const badge = (t, c='') => `<span class="badge ${c}">${esc(t)}</span>`;
const statusBadge = s => badge(s, /approved|open|active|published|complete|paid|resolved|confirmed|hired|verified|closed|done|yes|valid/i.test(s)?'ok':/pending|progress|screen|review|due|investig|interview|offer|sourcing/i.test(s)?'warn':/reject|escalat|overdue|expired|unauth|declin|breach|no$/i.test(s)?'bad':'info');
function toast(msg, type=''){
  let w = $('.toasts'); if(!w){ w = document.createElement('div'); w.className='toasts'; document.body.appendChild(w); }
  const t = document.createElement('div'); t.className = 'toast '+type; t.textContent = msg; w.appendChild(t);
  setTimeout(()=>t.remove(), 3800);
}
function modal({title, body, actions=[], size=''}){
  closeModal();
  const m = document.createElement('div'); m.className='mask'; m.id='modal';
  m.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true"><header><h3>${title}</h3><button class="btn ghost sm" data-act="closeModal" aria-label="Close">${ico('x')}</button></header><div class="body">${body}</div>${actions.length?`<footer>${actions.map(a=>`<button class="btn ${a.cls||''}" ${a.act?`data-act="${a.act}"`:''} ${a.data||''}>${a.label}</button>`).join('')}</footer>`:''}</div>`;
  m.addEventListener('mousedown', e => { if(e.target===m) closeModal(); });
  document.body.appendChild(m);
  const f = m.querySelector('input:not([type=hidden]),select,textarea'); if(f && !f.value) f.focus();
}
const closeModal = () => { $('#modal')?.remove(); };
function confirmBox(msg, onYes, label='Confirm'){
  window.__yes = onYes;
  modal({title:'Please confirm',body:`<p>${msg}</p>`,actions:[{label:'Cancel',act:'closeModal'},{label,cls:'pri',act:'confirmYes'}]});
}
function table(cols, rows, opt={}){
  if(!rows.length) return `<div class="empty">${opt.empty||'No records to show.'}</div>`;
  return `<div class="tw" ${opt.max?`style="max-height:${opt.max}px"`:''}><table class="t"><thead><tr>${cols.map(c=>`<th class="${c.cls||''}">${c.h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr ${opt.row?opt.row(r):''}>${cols.map(c=>`<td class="${c.cls||''}">${c.f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function csvDownload(name, headers, rows){
  const q = v => '"'+String(v??'').replace(/"/g,'""')+'"';
  const txt = [headers,...rows].map(r=>r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+txt],{type:'text/csv;charset=utf-8'}));
  a.download = name+'_'+D.todayIso()+'.csv'; document.body.appendChild(a); a.click(); a.remove();
  log('Export', name+'.csv ('+rows.length+' rows)'); toast('Exported '+rows.length+' rows to CSV','ok');
}
function fileDownload(name, text, type='text/plain'){ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text],{type})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
const deptOptions = (sel) => DB.depts.map(d=>`<option ${d===sel?'selected':''}>${esc(d)}</option>`).join('');
const empOptions = (list, sel) => list.map(e=>`<option value="${e.id}" ${e.id===sel?'selected':''}>${esc(e.name)}</option>`).join('');
const pageHead = (t, sub, right='') => `<div class="ph"><div><h1>${t}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="row wrap">${right}</div></div>`;
const formVal = (root, name) => root.querySelector(`[name="${name}"]`)?.value ?? '';

/* ---------- bank holidays (computed; HR must verify annually) ---------- */
function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y,mo-1,da,12); }
const PHC = {};
function phYear(y, region){
  const key = y+region; if(PHC[key]) return PHC[key];
  const out = {}; const add = (d,n) => { out[D.iso(d)] = n; };
  const dt = (m,d) => new Date(y,m,d,12);
  if(region==='UK'){
    let ny = dt(0,1); if(ny.getDay()===6) ny = dt(0,3); else if(ny.getDay()===0) ny = dt(0,2); add(ny,"New Year's Day"+(ny.getDate()!==1?' (substitute)':''));
    const e = easter(y); add(D.add(e,-2),'Good Friday'); add(D.add(e,1),'Easter Monday');
    const mon = (m,first) => { if(first){ let d = dt(m,1); while(d.getDay()!==1) d = D.add(d,1); return d; } let d = new Date(y,m+1,0,12); while(d.getDay()!==1) d = D.add(d,-1); return d; };
    add(mon(4,true),'Early May bank holiday'); add(mon(4,false),'Spring bank holiday'); add(mon(7,false),'Summer bank holiday');
    const dow = dt(11,25).getDay();
    if(dow===6){ add(dt(11,27),'Christmas Day (substitute)'); add(dt(11,28),'Boxing Day (substitute)'); }
    else if(dow===0){ add(dt(11,26),'Boxing Day'); add(dt(11,27),'Christmas Day (substitute)'); }
    else if(dow===5){ add(dt(11,25),'Christmas Day'); add(dt(11,28),'Boxing Day (substitute)'); }
    else { add(dt(11,25),'Christmas Day'); add(dt(11,26),'Boxing Day'); }
  } else {
    add(dt(1,5),'Kashmir Solidarity Day'); add(dt(2,23),'Pakistan Day'); add(dt(4,1),'Labour Day'); add(dt(7,14),'Independence Day'); add(dt(10,9),'Iqbal Day'); add(dt(11,25),'Quaid-e-Azam Day');
  }
  return PHC[key] = out;
}
function phName(iso, region){
  const y = +iso.slice(0,4); const n = phYear(y,region)[iso];
  if(n) return {type:'PH', name:n};
  const c = (DB.holidays||[]).find(h => h.date===iso && (h.region==='All'||h.region===region)); return c ? {type:'HR', name:c.name} : null;
}
const isWeekend = iso => { const g = D.parse(iso).getDay(); return g===0||g===6; };

/* ---------- leave engine ---------- */
function dayValue(rec, iso, region){ // working-day value of a record on a date
  if(iso<rec.start||iso>rec.end||isWeekend(iso)) return 0;
  if(rec.type==='HOL' && phName(iso,region)) return 0;
  return rec.half ? 0.5 : 1;
}
function recDays(rec, region){ let n=0; for(let d=D.parse(rec.start); D.iso(d)<=rec.end; d=D.add(d,1)) n += dayValue(rec, D.iso(d), region); return n; }
function entitlement(e, year){
  const base = (DB.settings.quota[e.region]||0) + (e.extraDays||0);
  let from = new Date(year,0,1,12), to = new Date(year,11,31,12);
  const s = D.parse(e.start), l = e.leaveDate ? D.parse(e.leaveDate) : null;
  if(s>from) from = s; if(l && l<to) to = l;
  if(to<from) return 0;
  const days = (to-from)/864e5+1, total = (new Date(year,11,31)-new Date(year,0,1))/864e5+1;
  return Math.round(base*days/total*2)/2;
}
function accrued(e, year, asOf){ // accrued to date (pro-rata by day, capped at entitlement)
  const ent = entitlement(e, year); const y0 = new Date(year,0,1,12), y1 = new Date(year,11,31,12);
  const a = asOf<y0 ? 0 : asOf>y1 ? 1 : ((asOf-y0)/864e5+1)/((y1-y0)/864e5+1);
  return Math.round(ent*a*2)/2;
}
function balance(e, year){
  const carry = (e.carry||{})[year]||0, ent = entitlement(e,year);
  let taken=0, upcoming=0, pending=0; const today = D.todayIso();
  DB.leave.filter(l => l.emp===e.id && l.type==='HOL' && l.status!=='rejected' && l.status!=='cancelled').forEach(l => {
    for(let d=D.parse(l.start); D.iso(d)<=l.end; d=D.add(d,1)){ const i = D.iso(d); if(+i.slice(0,4)!==year) continue; const v = dayValue(l,i,e.region); if(!v) continue;
      if(l.status==='pending') pending += v; else if(i<=today) taken += v; else upcoming += v; }
  });
  const total = ent+carry;
  return {ent, carry, total, taken, upcoming, pending, remaining: total-taken-upcoming, free: total-taken-upcoming-pending, acc: accrued(e,year,D.today())+carry};
}
function overlaps(empId, s, en, ignore){ return DB.leave.find(l => l.emp===empId && l.id!==ignore && l.status!=='rejected' && l.status!=='cancelled' && !(en<l.start||s>l.end)); }
function recFor(empId, iso){ return DB.leave.find(l => l.emp===empId && l.status!=='rejected' && l.status!=='cancelled' && iso>=l.start && iso<=l.end); }
function absentToday(iso=D.todayIso()){ return DB.leave.filter(l => l.status==='approved' && !LT[l.type].wfh && l.type!=='WFH' && l.type!=='HALF' && iso>=l.start && iso<=l.end && !isRest(emp(l.emp), iso) && emp(l.emp)?.status==='active' && !(l.type==='HOL' && phName(iso,emp(l.emp).region))); }
function sickRecords(empId, sinceIso){ return DB.leave.filter(l => LT[l.type].sick && l.emp===empId && l.status!=='rejected' && l.end>=sinceIso); }
function bradford(empId, asOf=D.todayIso()){
  const since = D.iso(D.add(D.parse(asOf),-364)); const recs = sickRecords(empId, since).filter(l=>l.start<=asOf);
  const spells = recs.length; let days = 0; recs.forEach(r => { days += recDays({...r,start:r.start<since?since:r.start,end:r.end>asOf?asOf:r.end}, emp(empId).region); });
  return {spells, days, score: spells*spells*days};
}
const bradLevel = s => { const t = DB.settings.bradford; return s>=t[2]?['Final stage','bad']:s>=t[1]?['Stage 2','bad']:s>=t[0]?['Stage 1','warn']:['Below trigger','ok']; };
function fridayMonday(empId){ const since = D.iso(D.add(D.today(),-182)); let fm=0, tot=0;
  sickRecords(empId,since).forEach(r => { for(let d=D.parse(r.start); D.iso(d)<=r.end; d=D.add(d,1)){ if(D.iso(d)<since||isWeekend(D.iso(d))) continue; tot++; if([1,5].includes(d.getDay())) fm++; } });
  return {fm, tot}; }
