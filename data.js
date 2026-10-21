/* PFG HRMS prototype – reference data and SAMPLE seed data (all people are fictional). */
const DEMO_PW = 'Demo@2026'; // prototype only. Production uses Azure AD SSO + MFA (BRS s7).
const DB_KEY = 'pfg_hrms_db_v1';
const DEPTS = ['Leadership','Finance','Credit Control','Sales / KAM','Customer Services','Buying','Supply Chain','Transport','Warehouse','HR','IT','BI / Data','Marketing','MDM'];
const COMPANIES = ['PFG Group','Freshways','Daily Fresh','Pentagon Food Group','PFGWholesale','Khan Estates','Super Storage','One Bill'];
const REGIONS = ['UK','PK'];
const ROLES = { employee:'Employee', manager:'Line Manager / Team Lead', hr:'HR Officer', admin:'HR Admin' };
const LT = {
  HOL:{code:'HOL',name:'Annual Leave / Holiday',c:'#1e3fa8',fg:'#fff'},
  SICK_SSP:{code:'SSP',name:'Sickness – Statutory Sick Pay',c:'#16a34a',fg:'#fff',sick:1},
  SICK:{code:'SICK',name:'Sickness / Absence (Not SSP)',c:'#c8f4d8',fg:'#166534',sick:1},
  WFH:{code:'WFH',name:'Work From Home',c:'#8ee6d8',fg:'#0f5e55'},
  LATE:{code:'LATE',name:'Late – Approved Unpaid',c:'#f59e0b',fg:'#fff'},
  UNAUTH:{code:'UNAU',name:'Unauthorised Absence',c:'#dc2626',fg:'#fff'},
  PAT:{code:'PAT',name:'Paternity Leave',c:'#a78bfa',fg:'#fff'},
  MAT_PAID:{code:'MAT',name:'Maternity Leave – Paid',c:'#ec4899',fg:'#fff'},
  MAT_SSP:{code:'MSSP',name:'Maternity Leave – SSP',c:'#c026d3',fg:'#fff'},
  HALF:{code:'HALF',name:'Half Days Are Off (Not Working)',c:'#ffffff',fg:'#44546f'}
};
const LEGEND_LABEL = {HOL:'HOL',SICK_SSP:'SICKNESS – SSP',SICK:'SICKNESS / ABSENCE',WFH:'WFH',LATE:'LATE – APPROVED UNPAID',UNAUTH:'UNAUTHORISED ABSENCE',PAT:'Paternity Leave',MAT_PAID:'Maternity Leave – Paid',MAT_SSP:'Maternity Leave – SSP',HALF:'HALF DAYS ARE OFF'};

function seedDB(){
  const T = new Date(); T.setHours(12,0,0,0);
  const iso = d => D.iso(d);
  const off = n => iso(D.add(T,n));
  const monday = D.add(T, -((T.getDay()+6)%7));
  const mo = n => iso(D.add(monday,n));          // n days from this Monday
  const E = (id,name,role,depts,region,company,title,mgr,start,dob,extra={}) => Object.assign({
    id,name,role,depts,region,company,title,mgr,start,dob,status:'active',manages:[],
    email:name.toLowerCase().replace(/[^a-z ]/g,'').replace(/ +/g,'.')+'@pentagonfoodgroup.co.uk',
    phone:'07xxx xxx '+String(100+id.slice(1)*7).slice(-3),photo:null,carry:{},extraDays:0,
    shift:'Mon–Fri 09:00–17:30',emergency:{name:'Emergency contact (sample)',rel:'Next of kin',phone:'07xxx xxx xxx'},
    bank:'Sort •• •• 12 / Acc •••• 4821',tax:'Tax code 1257L (sample)',ni:'NI •• •• •• ••',contract:'Permanent',fte:1,grade:'G'+(3+id.slice(1)%4),
    docs:[],history:[],disc:[]
  },extra);
  const emps = [
    E('e1','Karl Russell','hr',['HR'],'UK','PFG Group','Group HR Manager',null,'2016-04-04','1982-10-16',{manages:['HR']}),
    E('e2','Natasha Willis','hr',['HR'],'UK','PFG Group','HR Officer','e1','2019-06-10','1990-03-22'),
    E('e3','Hira Shah','hr',['HR'],'PK','PFG Group','HR Officer (PK)','e1','2021-02-01','1993-10-20'),
    E('e4','James Carter','manager',['Leadership'],'UK','PFG Group','Chief Executive Officer',null,'2012-01-09','1974-05-30',{manages:['Leadership','Finance']}),
    E('e5','Randy Bloggs','manager',['Sales / KAM'],'UK','PFG Group','Head of Sales / KAM','e4','2017-09-18','1985-08-11',{manages:['Sales / KAM','Customer Services']}),
    E('e6','Marie Bloggs','employee',['Sales / KAM'],'UK','PFG Group','Key Account Manager','e5','2020-01-13','1991-12-02'),
    E('e7','Caroline Bridges','employee',['Finance'],'UK','PFG Group','Finance Analyst','e4','2018-11-05','1988-07-14'),
    E('e8','Charlyn Bridges','employee',['Customer Services'],'UK','PFG Group','Customer Services Advisor','e5','2022-03-21','1996-10-14'),
    E('e9','Charlotte Astley','employee',['Customer Services'],'UK','Freshways','Customer Services Advisor','e5','2023-05-08','1997-04-09'),
    E('e10','Gary Moses','manager',['Warehouse'],'UK','PFGWholesale','Warehouse Manager','e4','2015-07-20','1980-01-27',{manages:['Warehouse']}),
    E('e11','Lisa Attrill','employee',['Transport'],'UK','Freshways','Transport Planner','e12','2021-08-02','1989-06-18'),
    E('e12','Richard de Zwaan','manager',['Supply Chain','Transport'],'UK','PFG Group','Supply Chain & Transport Manager','e4','2016-10-03','1979-02-25',{manages:['Supply Chain','Transport']}),
    E('e13','Anita Eliaswood','employee',['Warehouse'],'UK','PFGWholesale','Warehouse Operative','e10','2019-09-09','1992-11-03'),
    E('e14','Julie Fiolka','employee',['Buying'],'UK','Daily Fresh','Buyer','e4','2020-10-12','1987-09-29'),
    E('e15','Kai Green','employee',['Transport'],'UK','Freshways','HGV Driver','e12','2024-02-26','1994-10-19'),
    E('e16','Tom Hughes','employee',['IT'],'UK','PFG Group','IT Support Analyst','e17','2022-01-17','1990-12-12'),
    E('e17','Usman Tariq','manager',['IT','MDM'],'PK','PFG Group','IT Manager (PK)','e4','2018-03-12','1986-03-05',{manages:['IT','MDM']}),
    E('e18','Bilal Ahmed','employee',['IT'],'PK','PFG Group','Systems Developer','e17','2023-07-03','1995-07-07'),
    E('e19','Ayesha Khan','employee',['Finance','Credit Control'],'PK','PFG Group','Finance & Credit Control Officer','e4','2021-11-15','1992-02-16'),
    E('e20','Sana Malik','employee',['BI / Data'],'PK','PFG Group','BI Analyst','e21','2024-06-03','1997-10-25'),
    E('e21','Hamza Raza','manager',['BI / Data'],'PK','PFG Group','Head of BI / Data','e4','2019-04-01','1987-09-01',{manages:['BI / Data']}),
    E('e22','Priya Patel','employee',['Marketing'],'UK','Daily Fresh','Marketing Executive','e5','2026-07-06','1998-10-30',{contract:'Permanent (probation)'}),
    E('e23','Daniel Cole','employee',['Warehouse','Transport'],'UK','Freshways','Operations Coordinator','e10','2025-12-01','1993-01-31'),
    E('e24','Olivia Reed','employee',['Sales / KAM'],'UK','Daily Fresh','Sales Executive','e5','2026-08-17','1999-05-12',{contract:'Permanent (probation)'}),
    E('e26','M Baqir','admin',['IT'],'PK','PFG Group','System Administrator (interim)',null,'2024-01-08','1990-01-01'),
    E('e25','Simon Ford','employee',['Credit Control'],'UK','PFG Group','Credit Controller','e4','2017-02-06','1984-06-09',{status:'leaver',leaveDate:off(-24)})
  ];
  emps.forEach(e=>{ e.history=[{t:e.start+' 09:00',by:'System',what:'Record created (migrated sample)'}]; });
  emps.find(e=>e.id==='e11').disc=[{date:'2025-11-12',level:'Verbal warning',reason:'Timekeeping (sample)'}];

  let lid=0;
  const L=(emp,type,s,e,status='approved',half=null,note='')=>({id:'l'+(++lid),emp,type,start:s,end:e,half,status,note,created:off(-14)});
  const leave=[
    L('e6','HOL',mo(2),mo(4)),L('e6','HOL',off(-60),off(-56)),
    L('e5','HOL',mo(15),mo(19),'pending'),
    L('e7','HOL',mo(1),mo(2)),L('e7','HOL',off(40),off(44),'pending'),
    L('e8','LATE',mo(3),mo(3)),L('e8','HOL',off(-90),off(-86)),
    L('e9','SICK',mo(0),mo(1)),
    L('e10','HOL',off(-3),off(-1)),L('e10','HOL',mo(21),mo(25)),
    L('e11','SICK_SSP',off(-1),off(2)),L('e11','SICK',off(-200),off(-199)),L('e11','SICK',off(-150),off(-150)),L('e11','SICK',off(-95),off(-93)),L('e11','SICK',off(-40),off(-39)),
    L('e12','WFH',mo(1),mo(1)),
    L('e13','UNAUTH',mo(0),mo(0)),L('e13','HOL',mo(8),mo(9),'pending'),
    L('e14','HALF',mo(4),mo(4),'approved','AM'),L('e14','HOL',off(70),off(80)),
    L('e15','HOL',off(-2),off(1)),L('e15','SICK',off(-130),off(-125)),L('e15','SICK',off(-30),off(-30)),
    L('e16','WFH',mo(2),mo(2)),L('e16','HOL',off(25),off(29)),
    L('e18','HOL',mo(3),mo(4)),
    L('e19','HOL',off(10),off(14),'pending'),
    L('e20','MAT_PAID',off(-120),off(150)),
    L('e21','HOL',mo(14),mo(18)),
    L('e23','PAT',off(-5),off(9)),
    L('e2','HOL',off(18),off(22)),L('e3','WFH',mo(0),mo(0)),
    L('e24','HOL',off(-12),off(-12),'approved','PM')
  ];
  // Bradford: one extra long spell
  leave.push(L('e9','SICK',off(-70),off(-68)));

  const now = D.iso(T);
  return {
    v:2, settings:{
      quota:{UK:28,PK:20}, leaveYearStart:1, bradford:[51,201,401], sickTriggerSpells:3, probationDays:[30,60,90],
      note:'ASSUMPTION: quotas and Bradford thresholds are placeholders – HR to confirm against policy.'
    },
    depts:DEPTS.slice(), emps, leave, holidays:[], log:[], notes:[], mood:[],
    rtw: leave.filter(l => LT[l.type].sick && l.end < off(0) && l.end >= off(-60)).map(l => {
      const recent = l.end >= off(-7), emp0 = emps.find(e => e.id === l.emp);
      return { id:'rtw'+l.id, emp:l.emp, absId:l.id, due:iso(D.add(D.parse(l.end), 1)), status: recent ? 'Due' : 'Complete',
        form: recent ? undefined : {date:iso(D.add(D.parse(l.end),1)),reason:'Illness',fit:'Yes',med:false,adj:'',notes:'Migrated sample record',by:emp0 ? 'Line manager' : ''} };
    }),
    reactions:{}, ack:{},
    requisitions:[
      {id:'RQ-1001',title:'Warehouse Operative',dept:'Warehouse',region:'UK',reason:'Backfill',headcount:2,budget:56000,salary:27500,by:'e10',created:off(-9),stage:1,status:'In progress',
        audit:[{t:off(-9),who:'Gary Moses',what:'Raised by Line Manager'},{t:off(-8),who:'Natasha Willis',what:'Received by HR; budget check passed (£55,000.00 ≤ £56,000.00)'}],comments:[]},
      {id:'RQ-1002',title:'Marketing Executive',dept:'Marketing',region:'UK',reason:'Growth',headcount:1,budget:30000,salary:34000,by:'e5',created:off(-5),stage:0,status:'Revision requested',
        audit:[{t:off(-5),who:'Randy Bloggs',what:'Raised by Line Manager'},{t:off(-3),who:'Karl Russell',what:'Returned: salary exceeds approved budget'}],comments:['Salary exceeds approved budget – please revise or provide business case.']},
      {id:'RQ-1003',title:'BI Analyst',dept:'BI / Data',region:'PK',reason:'Growth',headcount:1,budget:4200000,salary:3800000,by:'e21',created:off(-20),stage:3,status:'Approved',
        audit:[{t:off(-20),who:'Hamza Raza',what:'Raised by Line Manager'},{t:off(-18),who:'Hira Shah',what:'Received by HR'},{t:off(-17),who:'Karl Russell',what:'Submitted to CEO'},{t:off(-15),who:'James Carter',what:'Approved by CEO'}],comments:[]}
    ],
    jobs:[
      {id:'J1',title:'Warehouse Operative',dept:'Warehouse',type:'External',loc:'Grimsby (sample)',status:'Open',posted:off(-6),req:'RQ-1001'},
      {id:'J2',title:'Transport Planner',dept:'Transport',type:'Internal',loc:'Group',status:'Open',posted:off(-3),req:''},
      {id:'J3',title:'BI Analyst',dept:'BI / Data',type:'External',loc:'Lahore (sample)',status:'Open',posted:off(-12),req:'RQ-1003'}
    ],
    candidates:[
      {id:'c1',name:'Ahmed Rahman',job:'J1',stage:'Screening',source:'Job board',email:'a.rahman@example.com',cv:'Forklift licence, 3 years picking and packing, FLT, food hygiene level 2',scores:{}},
      {id:'c2',name:'Sophie Turner',job:'J1',stage:'Interview 1',source:'Referral',email:'s.turner@example.com',cv:'Warehouse supervisor, stock control, SAP, health and safety, team leadership',scores:{1:{Skills:4,Experience:3,Attitude:5,Fit:4}}},
      {id:'c3',name:'Mohammad Iqbal',job:'J3',stage:'Interview 2',source:'LinkedIn',email:'m.iqbal@example.com',cv:'Power BI, SQL, DAX, Fabric, data modelling, python, dashboards',scores:{1:{Skills:5,Experience:4,Attitude:4,Fit:4},2:{Skills:4,Experience:4,Attitude:5,Fit:5}}},
      {id:'c4',name:'Grace Okafor',job:'J2',stage:'Sourcing',source:'Internal',email:'g.okafor@example.com',cv:'Logistics, route planning, transport management systems, excel',scores:{}},
      {id:'c5',name:'Daniel Price',job:'J1',stage:'Offer',source:'Agency',email:'d.price@example.com',cv:'Warehouse operative 5 years, reach truck, counterbalance, manual handling',scores:{1:{Skills:4,Experience:5,Attitude:4,Fit:4},2:{Skills:4,Experience:4,Attitude:4,Fit:4}}},
      {id:'c6',name:'Fatima Zahra',job:'J3',stage:'Screening',source:'Job board',email:'f.zahra@example.com',cv:'Excel, SQL, tableau, reporting, finance data',scores:{}}
    ],
    onboarding:[
      {id:'ob1',emp:'e24',start:'2026-08-17',tasks:[{t:'Contract signed',d:1},{t:'Right-to-Work check (share code / PVN)',d:1},{t:'IT account & laptop issued',d:1},{t:'One Bill credentials emailed',d:1},{t:'Clocking card issued (Attendance Mgmt)',d:1},{t:'Policies acknowledged',d:0},{t:'Induction / orientation scheduled',d:0}]},
      {id:'ob2',emp:'e22',start:'2026-07-06',tasks:[{t:'Contract signed',d:1},{t:'Right-to-Work check (share code / PVN)',d:1},{t:'IT account & laptop issued',d:1},{t:'One Bill credentials emailed',d:1},{t:'Clocking card issued (Attendance Mgmt)',d:1},{t:'Policies acknowledged',d:1},{t:'Induction / orientation scheduled',d:1}]}
    ],
    exits:[
      {id:'ex1',emp:'e25',type:'Resignation',notice:off(-52),last:off(-24),reason:'Career progression',clear:{IT:1,Finance:1,'Line Manager':1},assets:'Laptop returned; phone returned',settlement:'Paid',interview:'Completed – left for a larger organisation (sample)',accrual:3.5}
    ],
    cases:[
      {id:'CS-201',type:'Disciplinary',emp:'e11',raised:off(-55),stage:'Verbal warning',owner:'e2',status:'Closed',summary:'Timekeeping – three late arrivals in a month (sample).',legal:['Invitation letter','Meeting notes','Outcome letter'],timeline:[{t:off(-55),w:'Case opened'},{t:off(-48),w:'Investigation meeting'},{t:off(-45),w:'Outcome: Verbal warning'}]},
      {id:'CS-202',type:'Grievance',emp:'e13',raised:off(-10),stage:'Investigation',owner:'e1',status:'Open',summary:'Rota change communicated at short notice (sample).',legal:['Grievance letter'],timeline:[{t:off(-10),w:'Formal grievance received'},{t:off(-7),w:'Investigator appointed'}]}
    ],
    tickets:[
      {id:'T-3001',cat:'Payslip Issues',emp:'e13',subject:'Overtime missing from last payslip',raised:off(-3),sla:3,status:'Open',pri:'High',owner:'e2',thread:[{w:'Anita Eliaswood',t:off(-3),m:'Overtime on 12th not paid.'}]},
      {id:'T-3002',cat:'Asset Requests',emp:'e16',subject:'Second monitor',raised:off(-6),sla:5,status:'Escalated',pri:'Low',owner:'e2',thread:[{w:'Tom Hughes',t:off(-6),m:'Request for second monitor.'}]},
      {id:'T-3003',cat:'Queries',emp:'e6',subject:'Carry-over of annual leave',raised:off(-1),sla:3,status:'Open',pri:'Medium',owner:'e2',thread:[{w:'Marie Bloggs',t:off(-1),m:'How many days can I carry over?'}]},
      {id:'T-3004',cat:'Salary Issues',emp:'e18',subject:'Allowance query',raised:off(-12),sla:3,status:'Resolved',pri:'Medium',owner:'e3',thread:[{w:'Bilal Ahmed',t:off(-12),m:'Query on allowance.'},{w:'Hira Shah',t:off(-10),m:'Resolved – updated.'}]}
    ],
    deductions:[
      {id:'D-01',emp:'e15',type:'Fuel card misuse',desc:'Personal fuel on company card (sample)',date:off(-9),amount:62.4,by:'e12',status:'Pending approval',ack:false},
      {id:'D-02',emp:'e13',type:'Uniform replacement',desc:'Lost hi-vis jacket (sample)',date:off(-30),amount:18.5,by:'e10',status:'Approved – sent to payroll',ack:true}
    ],
    competencies:[
      {id:'cp1',emp:'e6',by:'e5',date:off(-20),jd:'Key Account Manager',scores:{'Customer focus':4,'Commercial awareness':4,'Communication':5,'Planning':3},plan:'Negotiation skills course'},
      {id:'cp2',emp:'e14',by:'e4',date:off(-33),jd:'Buyer',scores:{'Customer focus':3,'Commercial awareness':5,'Communication':4,'Planning':4},plan:'Supplier management workshop'}
    ],
    courses:[
      {id:'tc1',name:'Food Safety Level 2',mandatory:true,months:36,link:'JD: Warehouse / Transport'},
      {id:'tc2',name:'Manual Handling',mandatory:true,months:36,link:'JD: Warehouse'},
      {id:'tc3',name:'Health & Safety Awareness',mandatory:true,months:12,link:'Policy: H&S'},
      {id:'tc4',name:'Data Protection (GDPR)',mandatory:true,months:12,link:'Policy: Data Protection'},
      {id:'tc5',name:'Fire Marshal',mandatory:false,months:24,link:'Optional'}
    ],
    certs:[
      {emp:'e13',course:'tc2',date:'2024-11-10'},{emp:'e13',course:'tc1',date:'2023-01-15'},{emp:'e15',course:'tc3',date:'2025-09-01'},{emp:'e10',course:'tc3',date:'2025-11-20'},{emp:'e6',course:'tc4',date:'2025-12-02'},{emp:'e16',course:'tc4',date:'2025-10-30'}
    ],
    sessions:[
      {id:'ts1',course:'tc3',date:off(12),time:'10:00',loc:'Head Office / Teams',invited:['e13','e15','e23'],trainer:'External provider',declared:{}},
      {id:'ts2',course:'tc4',date:off(20),time:'14:00',loc:'Teams',invited:['e6','e16','e19'],trainer:'HR',declared:{}}
    ],
    videos:[
      {id:'v1',title:'Welcome to PFG Group',cat:'Induction',len:'6:20',src:'',seen:{}},
      {id:'v2',title:'Manual Handling Refresher',cat:'Health & Safety',len:'9:45',src:'',seen:{}},
      {id:'v3',title:'Using the HR Portal',cat:'Portal',len:'4:10',src:'',seen:{}}
    ],
    policies:[
      {id:'p1',title:'Annual Leave Policy',cat:'Policy',ver:'3.1',date:'2026-01-05',status:'Published',owner:'HR',aud:'All',body:'Employees must request annual leave through the HR portal. Requests are approved by the line manager. Holiday entitlement is pro-rated for part-year starters and leavers. Carry-over is limited and must be approved by HR. Half-day leave is permitted. Requests for the following year can be planned in advance.'},
      {id:'p2',title:'Sickness & Absence Policy',cat:'Policy',ver:'4.0',date:'2026-02-12',status:'Published',owner:'HR',aud:'All',body:'Report sickness to your line manager before shift start. A return-to-work interview is held on return. Trigger points are monitored using spells and Bradford Factor. Self-certification applies for the first seven days; medical evidence is needed thereafter. Patterns such as repeated Fridays or Mondays are reviewed by the line manager.'},
      {id:'p3',title:'Right to Work Procedure',cat:'SOP',ver:'2.2',date:'2025-11-03',status:'Published',owner:'HR',aud:'HR',body:'Right-to-Work checks are completed before the first day of work using share code or Employer Checking Service. Copies of documents are retained securely. Expiry reminders are sent 60 and 30 days before expiry.'},
      {id:'p4',title:'Health & Safety Policy',cat:'Policy',ver:'5.0',date:'2026-03-01',status:'Published',owner:'H&S',aud:'All',body:'All employees must complete mandatory health and safety training. COSHH assessments apply to hazardous substances. Report accidents and near misses immediately.'},
      {id:'p5',title:'Probation Procedure',cat:'SOP',ver:'1.4',date:'2025-09-15',status:'Published',owner:'HR',aud:'Managers',body:'New starters have 30, 60 and 90 day reviews. Outcomes are confirm, extend or exit. Managers must record the outcome and HR confirms in writing.'},
      {id:'p6',title:'Social Media & Privacy Policy',cat:'Policy',ver:'2.0',date:'2025-07-01',status:'Published',owner:'HR',aud:'All',body:'Employees must not disclose confidential company, customer or supplier information on social media. Personal accounts must not imply official company views.'}
    ],
    news:[
      {id:'n1',kind:'News',title:'New HR portal – phased rollout begins',by:'Karl Russell',date:off(-4),body:'We are replacing the legacy HR system with one Hire-to-Retire platform. Leave calendar and self-service move first.'},
      {id:'n2',kind:'Promotion',title:'Congratulations to Caroline Bridges – Senior Finance Analyst',by:'HR',date:off(-8),body:'Caroline has been promoted in recognition of outstanding work on month-end close.',who:'e7'},
      {id:'n3',kind:'Event',title:'Annual Health & Safety Week',by:'HR',date:off(-2),body:'Sessions run all week at all UK sites. Sign up via Training.'}
    ],
    recognition:[
      {id:'r1',who:'e13',by:'e10',month:D.iso(T).slice(0,7),why:'Warehouse Employee of the Month – safest picking record (sample).',kind:'Employee'},
      {id:'r2',who:'Customer Services',by:'e5',month:D.iso(T).slice(0,7),why:'Team of the Month – 98% CSAT (sample).',kind:'Team'}
    ],
    gallery:[
      {id:'g1',title:'Company summer BBQ',year:'2025',note:'Official memory (sample)'},
      {id:'g2',title:'Opening of new depot',year:'2024',note:'Official memory (sample)'}
    ],
    rtwChecks:[ // right-to-work (immigration)
      {emp:'e9',type:'Share code',ref:'W•••••••',expiry:off(25),restriction:'20 hrs/week term-time',verified:off(-300)},
      {emp:'e15',type:'Visa (Skilled Worker)',ref:'VP•••••',expiry:off(52),restriction:'None',verified:off(-600)},
      {emp:'e23',type:'Share code',ref:'W•••••••',expiry:off(-6),restriction:'None',verified:off(-400)},
      {emp:'e13',type:'British passport',ref:'—',expiry:'',restriction:'None',verified:off(-1500)}
    ],
    forms:[
      {id:'f1',title:'Training feedback',desc:'Tell us how the session went.',by:'e1',fields:[{k:'rate',label:'Overall rating',type:'rating'},{k:'cmt',label:'Comments',type:'text'},{k:'again',label:'Would you recommend?',type:'choice',opts:'Yes,No,Maybe'}],responses:[{who:'e13',t:off(-5),a:{rate:'5',cmt:'Very useful',again:'Yes'}}]}
    ],
    chat:[
      {id:'m1',thread:'e13',from:'e13',t:off(-2)+' 09:12',text:'Hi HR, can I confirm my carry-over for this year?'},
      {id:'m2',thread:'e13',from:'e2',t:off(-2)+' 10:03',text:'Hi Anita, we will confirm today via the portal.'}
    ],
    probation:[
      {emp:'e22',start:'2026-07-06',reviews:{30:'Confirmed on track',60:'On track',90:''}},
      {emp:'e24',start:'2026-08-17',reviews:{30:'On track',60:'',90:''}}
    ],
    rota:{},
    savedReports:[]
  };
}

