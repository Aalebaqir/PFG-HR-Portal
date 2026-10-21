/* PFG HRMS – shell, auth, router, events */
const ACT = {}, CHG = {}, VIEWS = {}, AFTER = {};
const ST = { tab:{}, f:{} };            // view state (tabs, filters) kept across re-renders
const tabOf = (id, def) => ST.tab[id] || def;
const tabsHtml = (id, list, def) => `<div class="tabs">${list.map(([k,l]) => `<button class="${tabOf(id,def)===k?'on':''}" data-act="tab" data-v="${id}" data-k="${k}">${l}</button>`).join('')}</div>`;
ACT.tab = el => { ST.tab[el.dataset.v] = el.dataset.k; render(); };
ACT.closeModal = closeModal;
ACT.confirmYes = () => { const f = window.__yes; closeModal(); f && f(); };
ACT.go = el => { location.hash = '#/' + el.dataset.to; };

const PAGES = [
  {id:'dashboard',label:'Dashboard',icon:'home',g:'Main'},
  {id:'calendar',label:'Leave Calendar',icon:'cal',g:'Main'},
  {id:'leave',label:'Leave & Absence',icon:'clock',g:'Main'},
  {id:'noticeboard',label:'Notice Board',icon:'flag',g:'Main'},
  {id:'employees',label:'Personnel Files',icon:'users',g:'People',min:1},
  {id:'orgchart',label:'Organisation Chart',icon:'org',g:'People'},
  {id:'departments',label:'Departments',icon:'grid',g:'People',min:2},
  {id:'starter',label:'My Starter Pack',icon:'clip',g:'Main',cond:()=>typeof starterNeeded==='function' && starterNeeded()},
  {id:'probation',label:'Probation 30/60/90',icon:'check',g:'People'},
  {id:'rtw',label:'Right to Work',icon:'shield',g:'People',min:2},
  {id:'rota',label:'Rota',icon:'cal',g:'People',min:1},
  {id:'attendance',label:'Attendance Check',icon:'clock',g:'People',min:1},
  {id:'positions',label:'Positions & JD Register',icon:'brief',g:'People',min:1},
  {id:'requisitions',label:'Requisitions',icon:'clip',g:'Hiring',min:1},
  {id:'recruitment',label:'Recruitment (ATS)',icon:'brief',g:'Hiring',min:1},
  {id:'onboarding',label:'Onboarding & Exit',icon:'user',g:'Hiring',min:2},
  {id:'starterpacks',label:'Starter Packs (HR)',icon:'clip',g:'Hiring',min:2},
  {id:'cases',label:'Grievance & Disciplinary',icon:'warn',g:'Employee Relations',min:1},
  {id:'helpdesk',label:'Employee Helpdesk',icon:'help',g:'Employee Relations'},
  {id:'deductions',label:'Deductions',icon:'pound',g:'Employee Relations'},
  {id:'training',label:'Training & Development',icon:'award',g:'Learning'},
  {id:'policies',label:'Policies & SOPs',icon:'book',g:'Learning'},
  {id:'stream',label:'Video Portal',icon:'video',g:'Learning'},
  {id:'forms',label:'Forms',icon:'list',g:'Learning'},
  {id:'chat',label:'Chat with HR',icon:'msg',g:'Connect'},
  {id:'games',label:'Games Room',icon:'smile',g:'Connect'},
  {id:'social',label:'Social Channels',icon:'star',g:'Connect'},
  {id:'reports',label:'Reports & Analytics',icon:'chart',g:'Insights',min:1},
  {id:'copilot',label:'AI Copilot & Forecasts',icon:'help',g:'Insights'},
  {id:'payroll',label:'Payroll Preparation',icon:'pound',g:'Insights',min:2},
  {id:'activity',label:'Activity Log',icon:'act',g:'Insights',min:2},
  {id:'bulk',label:'Bulk Upload',icon:'up',g:'Admin',min:2},
  {id:'automation',label:'Email & Automation',icon:'mail',g:'Admin',min:2},
  {id:'settings',label:'Settings',icon:'grid',g:'Admin',min:3},
  {id:'brs',label:'BRS Coverage',icon:'file',g:'Admin',min:2}
];
const allowed = p => RANK[me().role] >= (p.min||0) && (!p.cond || p.cond());

/* ---------- auth ---------- */
const LOCK = { n:0, until:0 };
ACT.login = () => {
  const em = $('#lg-email').value.trim().toLowerCase(), pw = $('#lg-pw').value, er = $('#lg-err');
  const fail = m => { er.textContent = m; er.classList.add('show'); };
  if(Date.now() < LOCK.until) return fail('Too many attempts. Please wait 30 seconds, then try again.');
  if(!em || !pw) return fail('Enter your work email and password.');
  const u = DB.emps.find(e => loginEmails(e).includes(em));
  if(!u || !(u.pwHash ? pwHash(pw)===u.pwHash : (u.tempPw ? pw===u.tempPw : pw===DEMO_PW))){ LOCK.n++; if(LOCK.n>=5){ LOCK.until = Date.now()+30000; LOCK.n = 0; } SESSION.uid = null; return fail('Email or password is incorrect.'); }
  if(!accessActive(u)){ log('Sign in blocked','Account not active',u.id); saveDB(); return fail('Your account is not active. Please contact HR.'); }
  LOCK.n = 0; SESSION.uid = u.id;
  ($('#lg-rem').checked ? store : { set:(k,v)=>sessionStorage.setItem(k,v) }).set('pfg_hrms_uid', u.id);
  log('Sign in','Signed in to HR portal'); saveDB(); if(typeof autoOnce==='function') autoOnce();
  location.hash = (typeof SP==='function' && SP(u.id) && SP(u.id).status!=='Approved') ? '#/starter' : '#/dashboard'; render();
};
ACT.demo = el => { $('#lg-email').value = el.dataset.email; $('#lg-pw').value = DEMO_PW; ACT.login(); };
ACT.eye = el => { const i = $('#lg-pw'); i.type = i.type==='password'?'text':'password'; el.innerHTML = ico(i.type==='password'?'eye':'eyeoff'); };
ACT.sso = () => modal({title:'Sign in with Microsoft',body:`<p>Single sign-on with <b>Azure AD (MFA and conditional access)</b> is a Phase 1 integration in the BRS (section 7).</p><p class="muted">In this prototype, please use the demo accounts on the sign-in page.</p>`,actions:[{label:'Close',cls:'pri',act:'closeModal'}]});
ACT.forgot = () => modal({title:'Reset your password',body:`<p>Passwords are managed through your Microsoft 365 / Azure AD account. Contact <b>IT Support</b> or use the Microsoft self-service reset page.</p>`,actions:[{label:'Close',cls:'pri',act:'closeModal'}]});
ACT.logout = () => { log('Sign out',''); saveDB(); SESSION.uid = null; store.del('pfg_hrms_uid'); try{sessionStorage.removeItem('pfg_hrms_uid')}catch(e){} location.hash = ''; render(); };
ACT.resetDemo = () => confirmBox('Reset all prototype data back to the original sample records?', () => { resetDB(); toast('Sample data restored','ok'); render(); }, 'Reset');

function loginView(){
  const demos = [['e26','M Baqir','HR Admin'],['e1','Karl Russell','HR Manager'],['e5','Randy Bloggs','Line Manager'],['e6','Marie Bloggs','Employee'],['e27','Adnan Ali','Employee (test)']];
  return `<div class="login">
  <section class="login-hero">
    ${LOGO(false,true)}
    <div class="hero-copy">
      <h1>Great people make PFG great.</h1>
      <p>Your leave, learning, wellbeing and career – all in one place.</p>
      <div class="tq-wrap"><div class="tq-mark">“</div><blockquote class="tq" id="tq">${esc(quoteOfDay(ST.qoff||0))}</blockquote><div class="tq-by">Thought of the day · ${fmt(D.todayIso())}</div><button class="btn sm tq-btn" data-act="nextQuote">Another thought ›</button></div>
    </div>
    <div class="hero-foot">PFG Confidential · Global HR (GBS) · UK &amp; Pakistan</div>
  </section>
  <section class="login-panel"><div class="login-card">
    <div style="margin-bottom:22px;display:none" class="mlogo">${LOGO()}</div>
    <h2>Welcome back</h2><p class="sub">Sign in to the PFG HR portal with your work account.</p>
    <button class="btn ms block" data-act="sso">${ico('ms')} Sign in with Microsoft</button>
    <div class="sep">or use your email</div>
    <div id="lg-err" class="err" role="alert"></div>
    <form onsubmit="ACT.login();return false" autocomplete="on">
      <div class="field"><label for="lg-email">Work email</label><div class="inp">${ico('mail')}<input id="lg-email" type="email" placeholder="name@pentagonfoodgroup.co.uk" autocomplete="username"></div></div>
      <div class="field"><label for="lg-pw">Password</label><div class="inp">${ico('lock')}<input id="lg-pw" type="password" placeholder="Enter your password" autocomplete="current-password"><button type="button" class="eye" data-act="eye" aria-label="Show password">${ico('eye')}</button></div></div>
      <div class="row sp" style="margin-bottom:18px"><label class="row" style="gap:8px;font-size:13px;margin:0"><input id="lg-rem" type="checkbox" style="width:auto"> Keep me signed in</label><a href="#" data-act="forgot" onclick="return false">Forgot password?</a></div>
      <button class="btn pri block" type="submit">Sign in</button>
    </form>
    <div class="demo"><h4>Prototype – choose a demo role</h4><div class="demo-grid">${demos.map(([id,n,r])=>`<button class="demo-btn" data-act="demo" data-email="${emp(id).email}"><b>${n}</b><span>${r}</span></button>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">Sample data only. Demo password: <b>${DEMO_PW}</b></p></div>
    <p class="small muted" style="text-align:center;margin-top:20px">Unauthorised access is prohibited and activity is logged.</p>
  </div></section></div>`;
}

/* ---------- shell ---------- */
function shell(inner, pageId){
  const u = me(); const unread = DB.notes.filter(n => n.to===u.id && !n.read);
  const pend = isMgr() ? DB.leave.filter(l => l.status==='pending' && canApprove(l)).length : 0;
  const side = ['Main','People','Hiring','Employee Relations','Learning','Connect','Insights','Admin'].map(g => {
    const ps = PAGES.filter(p => p.g===g && allowed(p)); if(!ps.length) return '';
    return `<h5>${g}</h5>` + ps.map(p => `<a href="#/${p.id}" class="${p.id===pageId?'on':''}">${ico(p.icon)}<span>${p.label}</span>${p.id==='leave'&&pend?`<span class="ct">${pend}</span>`:''}</a>`).join('');
  }).join('');
  return `<header class="topbar">
    <button class="menu-btn" data-act="menu" aria-label="Menu">${ico('list')}</button>
    <a href="#/dashboard" style="color:#fff">${LOGO(true)}</a>
    <div class="tsearch">${ico('search')}<input id="gs" type="search" placeholder="Search people, policies, pages…" autocomplete="off"><div class="sresults" id="gsr"></div></div>
    <div class="tb-right">
      <div style="position:relative"><button class="iconbtn" data-act="pop" data-p="np" aria-label="Notifications">${ico('bell')}${unread.length?`<span class="dot">${unread.length}</span>`:''}</button>
        <div class="pop notif" id="np"><div class="row sp" style="padding:6px 10px"><b>Notifications</b><a href="#" data-act="readAll" onclick="return false" class="small">Mark all read</a></div>
        ${DB.notes.filter(n=>n.to===u.id).slice(0,12).map(n=>`<a class="n ${n.read?'':'u'}" href="#/${n.link||'dashboard'}">${esc(n.text)}<div class="small muted">${fmt(n.t)}</div></a>`).join('')||'<div class="empty">You are all caught up.</div>'}</div></div>
      <div style="position:relative"><button class="userbtn" data-act="pop" data-p="up">${av(u,34)}<span class="nm">${esc(u.name)}<br><span class="rl">${ROLES[u.role]}</span></span>${ico('chev')}</button>
        <div class="pop" id="up"><div style="padding:8px 10px"><b>${esc(u.name)}</b><div class="small muted">${esc(u.email)}</div></div><hr>
          <button data-act="myProfile">${ico('user')} My profile &amp; photo</button>
          <a href="#/leave">${ico('clock')} My leave</a>
          <button data-act="installHelp">${ico('down')} Use on my phone</button>
          ${isAdmin()?`<button data-act="resetDemo">${ico('trash')} Reset sample data</button>`:''}
          <hr><button data-act="logout">${ico('out')} Sign out</button></div></div>
    </div></header>
  <div class="layout"><nav class="side" id="side" aria-label="Main navigation">${side}</nav><main class="main" id="main">${inner}</main></div>
  <nav class="bnav" aria-label="Quick navigation">${[['dashboard','Home','home'],['calendar','Calendar','cal'],['leave','Leave','clock'],['noticeboard','News','flag']].map(([i,l,c])=>`<a href="#/${i}" class="${i===pageId?'on':''}">${ico(c)}${l}</a>`).join('')}<button data-act="menu">${ico('list')}Menu</button></nav>`;
}
ACT.menu = () => $('#side').classList.toggle('open');
document.addEventListener('click', e => { const s = $('#side'); if(s && s.classList.contains('open') && !e.target.closest('#side') && !e.target.closest('[data-act=menu]')) s.classList.remove('open'); if(e.target.closest('#side a')) s?.classList.remove('open'); });
ACT.pop = (el,e) => { e.stopPropagation(); const p = $('#'+el.dataset.p); const was = p.classList.contains('show'); $$('.pop').forEach(x=>x.classList.remove('show')); if(!was) p.classList.add('show'); };
ACT.readAll = () => { DB.notes.filter(n=>n.to===SESSION.uid).forEach(n=>n.read=true); saveDB(); render(); };
document.addEventListener('click', e => {
  if(!e.target.closest('.pop')) $$('.pop.show').forEach(x=>x.classList.remove('show'));
  if(!e.target.closest('.tsearch')) $('#gsr')?.classList.remove('show');
  if(!e.target.closest('.msel')) $$('.msel.open').forEach(x=>x.classList.remove('open'));
  const t = e.target.closest('[data-act]');
  if(t && ACT[t.dataset.act]){ if(t.tagName==='A') e.preventDefault(); ACT[t.dataset.act](t, e); }
});
document.addEventListener('change', e => { const t = e.target.closest('[data-chg]'); if(t && CHG[t.dataset.chg]) CHG[t.dataset.chg](t, e); });
document.addEventListener('input', e => { const t = e.target.closest('[data-inp]'); if(t && CHG[t.dataset.inp]) CHG[t.dataset.inp](t, e); if(e.target.id==='gs') globalSearch(e.target.value); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

function globalSearch(q){
  const box = $('#gsr'); q = q.trim().toLowerCase(); if(q.length<2){ box.classList.remove('show'); return; }
  const res = [];
  if(isMgr()) DB.emps.filter(e=>e.name.toLowerCase().includes(q)||e.title.toLowerCase().includes(q)).slice(0,5).forEach(e=>res.push(`<a href="#/employees/${e.id}">${av(e,26)}<span>${esc(e.name)}<div class="small muted">${esc(e.title)}</div></span></a>`));
  DB.policies.filter(p=>(p.title+p.body).toLowerCase().includes(q)).slice(0,4).forEach(p=>res.push(`<a href="#/policies/${p.id}">${ico('book')}<span>${esc(p.title)}<div class="small muted">${p.cat} v${p.ver}</div></span></a>`));
  PAGES.filter(p=>allowed(p)&&p.label.toLowerCase().includes(q)).slice(0,4).forEach(p=>res.push(`<a href="#/${p.id}">${ico(p.icon)}<span>${p.label}</span></a>`));
  box.innerHTML = res.join('') || '<div class="empty">No matches</div>'; box.classList.add('show');
}

/* ---------- router ---------- */
function route(){ const [,id='dashboard',param=''] = location.hash.split('/'); return {id: id||'dashboard', param}; }
function render(){
  const root = $('#app'); const keep = { y: window.scrollY };
  if(!SESSION.uid){ root.innerHTML = loginView(); document.title = 'Sign in · PFG HR Management System'; return; }
  if(!accessActive(me())){ SESSION.uid = null; store.del('pfg_hrms_uid'); try{ sessionStorage.removeItem('pfg_hrms_uid'); }catch(e){} root.innerHTML = loginView(); return; }
  let {id, param} = route(); let page = PAGES.find(p => p.id===id);
  if(!page || !allowed(page)){ page = PAGES[0]; id = page.id; }
  ST.param = param;
  const prevMain = $('#main'); const sideScroll = $('#side')?.scrollTop||0;
  let inner; try { inner = VIEWS[id](param); } catch(err){ console.error(err); inner = `<div class="banner">Something went wrong rendering this page: ${esc(err.message)}</div>`; }
  root.innerHTML = shell(inner, id);
  if(me().mustChange && !$('#modal')) setTimeout(forcePwModal, 50);
  $('#side').scrollTop = sideScroll;
  document.title = page.label + ' · PFG HR';
  try { AFTER[id] && AFTER[id](param); } catch(err){ console.error(err); }
  if(prevMain) window.scrollTo(0, keep.y);
}
window.addEventListener('hashchange', () => { closeModal(); render(); window.scrollTo(0,0); });

function boot(){
  loadDB();
  const u = store.get('pfg_hrms_uid') || sessionStorage.getItem('pfg_hrms_uid');
  if(u && emp(u) && accessActive(emp(u))) SESSION.uid = u;
  if(SESSION.uid && typeof autoOnce==='function') autoOnce();
  render();
}
document.addEventListener('DOMContentLoaded', boot);



ACT.installHelp = () => modal({title:'Use the portal on your phone',body:`<p>The portal is designed to work on phones and tablets.</p><ol><li><b>iPhone (Safari):</b> Share, then <i>Add to Home Screen</i>.</li><li><b>Android (Chrome / Edge):</b> menu, then <i>Add to Home screen</i> or <i>Install app</i>.</li></ol><p class="muted small">A native mobile app (HR-048) is a later phase; the installed web app gives the same screens.</p>`,actions:[{label:'Close',cls:'pri',act:'closeModal'}]});
