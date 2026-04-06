'use strict';

// ── IN-MEMORY DATABASE ──────────────────────────────────────────
let DB = {
  users: [
    {id:1,username:'admin',password:'Admin@123',role:'admin',name:'Admin User',email:'admin@medlicense.gov'},
    {id:2,username:'dr.arjun',password:'Doctor@123',role:'applicant',name:'Dr. Arjun Mehta',degree:'MBBS, MD',specialization:'Cardiology',dob:'1985-03-14',hospital:'Apollo Hospitals, Chennai',email:'arjun.mehta@apollo.in'},
    {id:3,username:'dr.priya',password:'Doctor@123',role:'applicant',name:'Dr. Priya Sharma',degree:'MBBS',specialization:'General Practice',dob:'1990-07-22',hospital:'AIIMS Delhi',email:'priya.sharma@aiims.in'},
    {id:4,username:'dr.ravi',password:'Doctor@123',role:'applicant',name:'Dr. Ravi Kumar',degree:'MD, DM',specialization:'Neurology',dob:'1982-11-09',hospital:'NIMHANS Bangalore',email:'ravi.kumar@nimhans.in'},
  ],
  applications: [
    {id:1,applicant_id:2,license_type:'Full Medical License',specialization:'Cardiology',hospital:'Apollo Hospitals',status:'approved',applied_date:'2024-01-01',review_note:'All credentials verified. MBBS from AIIMS, MD confirmed. Approved with commendation.',license_id:'MLA-2024-00123'},
    {id:2,applicant_id:3,license_type:'Provisional License',specialization:'General Practice',hospital:'AIIMS Delhi',status:'pending',applied_date:'2024-03-03',review_note:'',license_id:null},
    {id:3,applicant_id:4,license_type:'Specialist License',specialization:'Neurology',hospital:'NIMHANS Bangalore',status:'pending',applied_date:'2024-03-05',review_note:'',license_id:null},
    {id:4,applicant_id:2,license_type:'Specialist License',specialization:'Interventional Cardiology',hospital:'Apollo Hospitals',status:'pending',applied_date:'2024-03-08',review_note:'',license_id:null},
  ],
  licenses: [
    {id:1,license_id:'MLA-2024-00123',applicant_id:2,license_type:'Full Medical License',specialization:'Cardiology',status:'active',issued_date:'2024-01-01',expiry_date:'2026-12-31',issued_by:'Medical Council of India',review_note:'All credentials verified. Approved with commendation.'},
  ],
  nextAppId: 5,
  nextLicId: 2,
};

let currentUser = null;
let charts = {};

// ── NOTIFICATIONS ─────────────────────────────────────────────
let notifications = [];
let notifIdCounter = 1;

function pushNotification(userId, type, title, message) {
  notifications.push({
    id: notifIdCounter++,
    userId,
    type,       // 'approved' | 'rejected' | 'suspended' | 'revoked' | 'info'
    title,
    message,
    time: new Date(),
    read: false
  });
  // if the current logged-in user is the target, refresh bell immediately
  if (currentUser && currentUser.id === userId) {
    renderNotifBell();
  }
}

function renderNotifBell() {
  const wrap  = document.getElementById('notifWrap');
  const badge = document.getElementById('notifBadge');
  const btn   = document.getElementById('notifBtn');
  if (!wrap || !currentUser) return;

  const mine   = notifications.filter(n => n.userId === currentUser.id);
  const unread = mine.filter(n => !n.read).length;

  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'flex';
    btn.classList.add('has-notif');
  } else {
    badge.style.display = 'none';
    btn.classList.remove('has-notif');
  }
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
  } else {
    renderNotifList();
    panel.classList.add('open');
    // mark all as read
    notifications.filter(n => n.userId === currentUser.id).forEach(n => n.read = true);
    renderNotifBell();
  }
}

function renderNotifList() {
  const list = document.getElementById('notifList');
  if (!list || !currentUser) return;
  const mine = notifications.filter(n => n.userId === currentUser.id).slice().reverse();
  if (!mine.length) {
    list.innerHTML = '<div class="notif-empty">No notifications yet</div>';
    return;
  }
  const iconMap = {
    approved:  { cls:'ni-approved',  label:'✓' },
    rejected:  { cls:'ni-rejected',  label:'✕' },
    suspended: { cls:'ni-suspended', label:'⏸' },
    revoked:   { cls:'ni-revoked',   label:'!' },
    info:      { cls:'ni-info',      label:'i' }
  };
  list.innerHTML = mine.map(n => {
    const ic = iconMap[n.type] || iconMap.info;
    const timeStr = formatNotifTime(n.time);
    return `<div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon ${ic.cls}">${ic.label}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeStr}</div>
      </div>
    </div>`;
  }).join('');
}

function clearAllNotifs() {
  if (!currentUser) return;
  notifications = notifications.filter(n => n.userId !== currentUser.id);
  renderNotifList();
  renderNotifBell();
}

function formatNotifTime(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)  return 'Just now';
  if (diff < 3600) return Math.floor(diff/60) + ' min ago';
  if (diff < 86400) return Math.floor(diff/3600) + ' hr ago';
  return date.toLocaleDateString();
}

// Close panel when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('notifWrap');
  if (wrap && !wrap.contains(e.target)) {
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('open');
  }
});

// ── VIEW MANAGER ──────────────────────────────────────────────
function showView(name) {
  const current = document.querySelector('.view.active');
  const next    = document.getElementById('view-' + name);
  if (!next) return;

  const isLogin = name === 'login';
  document.getElementById('bgGrid').style.display  = isLogin ? '' : 'none';
  document.getElementById('bgOrb1').style.display  = isLogin ? '' : 'none';
  document.getElementById('bgOrb2').style.display  = isLogin ? '' : 'none';

  if (current && current !== next) {
    // fade out current
    current.style.opacity = '0';
    setTimeout(() => {
      current.classList.remove('active');
      current.style.opacity = '';
      // show next
      next.classList.add('active');
      next.scrollTop = 0;
      // force reflow then fade in
      requestAnimationFrame(() => { next.style.opacity = '1'; });
    }, 300);
  } else {
    next.classList.add('active');
    next.scrollTop = 0;
  }
}

// ── LOGIN ────────────────────────────────────────────────────
const ROLE_INFO = {
  admin:    'Administrator — manage all license applications and approvals.',
  applicant:'Doctor portal — apply for licenses and manage your credentials.',
  public:   'Public portal — verify any doctor\'s license. No login required.'
};
const DEMO_HINTS = {
  admin:    'Demo: <strong>admin</strong> / <strong>Admin@123</strong>',
  applicant:'Demo: <strong>dr.arjun</strong> / <strong>Doctor@123</strong>'
};

function onRoleChange() {
  const role = document.getElementById('roleSelect').value;
  const info = document.getElementById('roleInfo');
  document.getElementById('loginFields').style.display = 'none';
  document.getElementById('publicFields').style.display = 'none';
  info.style.display = 'none';
  hideErr('loginErr');
  if (!role) return;
  info.innerHTML = ROLE_INFO[role]; info.style.display = 'block';
  if (role === 'public') {
    document.getElementById('publicFields').style.display = 'block';
    setTimeout(() => goPublic(), 300);
  } else {
    document.getElementById('loginFields').style.display = 'block';
    document.getElementById('demoHint').innerHTML = DEMO_HINTS[role] || '';
  }
}

function doLogin() {
  const role = document.getElementById('roleSelect').value;
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  if (!user || !pass) { showErr('loginErr','Please enter username and password.'); return; }
  const btn = document.getElementById('loginBtn');
  btn.innerHTML = '<span class="spin"></span> Signing in…'; btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Sign In Securely →'; btn.disabled = false;
    const found = DB.users.find(u => u.username === user && u.role === role);
    if (!found) { showErr('loginErr', '❌ Username not found or wrong role selected.'); return; }
    if (found.password !== pass) { showErr('loginErr', '❌ Incorrect password. Try again.'); return; }
    currentUser = found;
    launchApp();
  }, 700);
}

function goPublic() {
  showView('public');
}

function logout() {
  currentUser = null;
  Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch(e){} });
  charts = {};
  const notifWrap = document.getElementById('notifWrap');
  if (notifWrap) notifWrap.style.display = 'none';
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.remove('open');
  showView('login');
  document.getElementById('roleSelect').value = '';
  document.getElementById('loginFields').style.display = 'none';
  document.getElementById('publicFields').style.display = 'none';
  document.getElementById('roleInfo').style.display = 'none';
}

// ── APP LAUNCH ────────────────────────────────────────────────
function launchApp() {
  showView('app');
  document.getElementById('tbUname').textContent = currentUser.name;
  document.getElementById('tbUrole').textContent = currentUser.role.toUpperCase();
  const av = document.getElementById('tbAvatar');
  av.textContent = currentUser.role === 'admin' ? 'AD' : (currentUser.avatar || 'DR');
  av.className = 'tb-avatar ' + (currentUser.role === 'admin' ? 'av-admin' : 'av-doc');
  document.getElementById('tbSub').textContent = currentUser.role === 'admin' ? 'ADMIN PANEL' : 'DOCTOR PORTAL';
  // show bell only for applicants
  const notifWrap = document.getElementById('notifWrap');
  if (notifWrap) notifWrap.style.display = currentUser.role === 'applicant' ? 'block' : 'none';
  renderNotifBell();
  if (currentUser.role === 'admin') buildAdminShell();
  else buildApplicantShell();
}

// ══════════════════════════════════
// ADMIN SHELL
// ══════════════════════════════════
function buildAdminShell() {
  document.getElementById('tbNav').innerHTML = `
    <button class="nav-btn active" onclick="showPage('overview',this)">Overview</button>
    <button class="nav-btn" onclick="showPage('applications',this)">Applications</button>
    <button class="nav-btn" onclick="showPage('statistics',this)">Statistics</button>`;

  document.getElementById('appSidebar').innerHTML = `
    <div class="sb-sec">Main</div>
    <div class="sb-item active" onclick="showPage('overview',null,this)">Overview</div>
    <div class="sb-item" onclick="showPage('applications',null,this)">All Applications <span class="sb-badge" id="pendCount">${DB.applications.filter(a=>a.status==='pending').length}</span></div>
    <div class="sb-sec">By Status</div>
    <div class="sb-item" onclick="filterAndShow('pending',this)">Pending</div>
    <div class="sb-item" onclick="filterAndShow('approved',this)">Approved</div>
    <div class="sb-item" onclick="filterAndShow('rejected',this)">Rejected</div>
    <div class="sb-item" onclick="filterAndShow('suspended',this)">Suspended</div>
    <div class="sb-sec">Tools</div>
    <div class="sb-item" onclick="showPage('statistics',null,this)">Statistics</div>
    <div class="sb-footer"><button class="btn-logout" style="width:100%" onclick="logout()">Sign Out</button></div>`;

  renderAdminOverview();
}

function showPage(name, navBtn, sbBtn) {
  // Update nav
  if (navBtn) { document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active')); navBtn.classList.add('active'); }
  if (sbBtn) { document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active','active-t')); sbBtn.classList.add(currentUser.role==='admin'?'active':'active-t'); }
  const pc = document.getElementById('pageContent');
  // Destroy old charts
  Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch(e){} charts = {}; });
  if (currentUser.role === 'admin') {
    if (name === 'overview') renderAdminOverview();
    else if (name === 'applications') renderAdminApps('all');
    else if (name === 'statistics') renderAdminStats();
  } else {
    if (name === 'overview') renderApplicantDash();
    else if (name === 'history') renderApplicantHistory();
    else if (name === 'profile') renderApplicantProfile();
  }
}

function filterAndShow(status, btn) {
  document.querySelectorAll('.sb-item').forEach(b=>b.classList.remove('active','active-t'));
  if(btn) btn.classList.add('active');
  renderAdminApps(status);
}

function renderAdminOverview() {
  const total   = DB.applications.length;
  const active  = DB.licenses.filter(l=>l.status==='active').length;
  const pending = DB.applications.filter(a=>a.status==='pending').length;
  const susrev  = DB.licenses.filter(l=>l.status==='suspended'||l.status==='revoked').length;

  const recent = DB.applications.slice(-3).reverse();
  const actHTML = recent.map(a=>{
    const u = DB.users.find(x=>x.id===a.applicant_id);
    const icons = {pending:'',approved:'',rejected:'',suspended:'',revoked:''};
    return `<div class="act-item">
      <div class="act-dot">${icons[a.status]||'+'}</div>
      <div>
        <div class="act-txt"><strong>${u?u.name:'Doctor'}</strong> — ${a.license_type}</div>
        <div class="act-time">${a.applied_date} · <span class="badge b-${a.status}">${cap(a.status)}</span></div>
      </div></div>`;}).join('');

  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>Admin Dashboard</h2><p>Medical License Authority — Control Center</p></div><div style="display:flex;align-items:center;gap:8px"><span id="liveClock" style="font-size:11px;color:var(--grey)"></span></div></div>
    <div class="stats-grid">
      <div class="stat-card" style="border-top-color:var(--gold)"><div class="stat-top"><div class="si si-g">&#x23F5;</div><span class="tag tag-gold">Total</span></div><div class="stat-num" style="color:var(--gold)">${total}</div><div class="stat-lbl">Total Applications</div></div>
      <div class="stat-card" style="border-top-color:var(--success)"><div class="stat-top"><div class="si si-s">✅</div><span class="tag tag-green">Active</span></div><div class="stat-num" style="color:var(--success)">${active}</div><div class="stat-lbl">Active Licenses</div></div>
      <div class="stat-card" style="border-top-color:var(--danger)"><div class="stat-top"><div class="si si-d">!</div><span class="tag tag-red">${pending} new</span></div><div class="stat-num" style="color:var(--danger)">${pending}</div><div class="stat-lbl">Pending Review</div></div>
      <div class="stat-card" style="border-top-color:var(--purple)"><div class="stat-top"><div class="si si-p">&#x23F8;</div><span class="tag tag-purple">Watch</span></div><div class="stat-num" style="color:var(--purple)">${susrev}</div><div class="stat-lbl">Suspended / Revoked</div></div>
    </div>
    <div class="pad" style="padding-top:0">
      <div class="two-col">
        <div class="panel">
          <h3>Applications This Week</h3>
          <div class="chart-bars" id="weekBars"></div>
          <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--grey);margin-top:2px">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>
        <div class="panel"><h3>Recent Activity</h3>${actHTML||'<div class="empty"><div class="ei" style="font-size:36px;color:var(--grey)">—</div>No recent activity</div>'}</div>
      </div>
    </div>`;

  // Clock
  setInterval(()=>{ const el=document.getElementById('liveClock'); if(el) el.textContent=new Date().toLocaleTimeString(); },1000);
  // Bar chart
  const vals=[4,7,5,9,6,3,8], mx=Math.max(...vals);
  document.getElementById('weekBars').innerHTML = vals.map(v=>`<div class="bar-w"><div class="bar" style="height:${(v/mx)*85}px"></div></div>`).join('');
}

function renderAdminApps(statusFilter) {
  let apps = statusFilter==='all' ? DB.applications : DB.applications.filter(a=>a.status===statusFilter);
  const title = statusFilter==='all' ? 'All Applications' : cap(statusFilter)+' Applications';

  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>${title}</h2><p>Review, approve, reject or manage license applications</p></div></div>
    <div style="padding:20px 26px 0">
      <div class="tbl-card" style="margin:0">
        <div class="tbl-top">
          <div class="srch"><input type="text" placeholder="Search name or ID…" oninput="searchRows(this.value)"/></div>
        </div>
        <div id="appTblWrap">${buildAppTable(apps)}</div>
      </div>
    </div>`;
}

function buildAppTable(apps) {
  if (!apps.length) return '<div class="empty"><div class="ei" style="font-size:36px;color:var(--grey)">—</div>No applications found.</div>';
  return `<table><thead><tr>
    <th>Applicant</th><th>License Type</th><th>Specialization</th><th>Applied</th><th>Status</th><th>Actions</th>
  </tr></thead><tbody>
  ${apps.map(a => {
    const u = DB.users.find(x=>x.id===a.applicant_id);
    return `<tr data-search="${(u?u.name:'').toLowerCase()} ${a.id}">
      <td><div class="doc-info"><div class="doc-av">DR</div><div><div class="doc-name">${u?u.name:'Doctor'}</div><div class="doc-id">#${a.id} · ${u?u.degree||'':''}</div></div></div></td>
      <td><span class="lt">${a.license_type}</span></td>
      <td style="color:var(--grey)">${a.specialization}</td>
      <td style="color:var(--grey)">${a.applied_date}</td>
      <td>${(a.documents&&a.documents.length)?`<span style="cursor:pointer" onclick="viewDocs(${a.id})" title="View documents"><span style="background:rgba(0,180,216,.12);color:var(--teal);border:1px solid rgba(0,180,216,.25);padding:2px 8px;border-radius:18px;font-size:10px;font-weight:700">${a.documents.length} Docs</span></span>`:'<span style="color:var(--grey);font-size:11px">—</span>'}</td>
      <td><span class="badge b-${a.status}">${cap(a.status)}</span></td>
      <td>
        ${a.review_note?`<div style="font-size:10px;color:var(--grey);margin-bottom:4px;padding:4px 7px;background:rgba(255,255,255,.04);border-radius:5px;max-width:160px;white-space:normal">${a.review_note}</div>`:''}
        <div class="acts">
          ${a.status==='pending'?`<button class="abtn a-rv" onclick="openReview(${a.id},'approve')">✅ Approve</button><button class="abtn a-rj" onclick="openReview(${a.id},'reject')">❌ Reject</button>`:``}
          ${a.status==='approved'?`<button class="abtn a-su" onclick="openReview('${a.license_id}','suspend')">Suspend</button><button class="abtn a-rk" onclick="openReview('${a.license_id}','revoke')">Revoke</button>`:``}
          ${a.status==='suspended'?`<button class="abtn a-rk" onclick="openReview('${a.license_id}','revoke')">Revoke</button>`:``}
          ${(a.status==='rejected'||a.status==='revoked')?`<span style="font-size:10px;color:var(--grey)">No actions</span>`:``}
        </div>
      </td>
    </tr>`;}).join('')}
  </tbody></table>`;
}

function searchRows(q) {
  document.querySelectorAll('#appTblWrap tbody tr').forEach(r=>{
    r.style.display=(r.dataset.search||'').includes(q.toLowerCase())?'':'none';
  });
}

function renderAdminStats() {
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>Statistics & Analytics</h2><p>License management overview</p></div></div>
    <div class="pad">
      <div class="two-col" style="margin-bottom:18px">
        <div class="panel"><h3>Applications by Status</h3><div class="ch"><canvas id="chartStatus"></canvas></div></div>
        <div class="panel"><h3>License Types Issued</h3><div class="ch"><canvas id="chartTypes"></canvas></div></div>
      </div>
      <div class="panel"><h3>Monthly Application Trend</h3><div class="ch-tall"><canvas id="chartTrend"></canvas></div></div>
    </div>`;

  const statusCounts = ['pending','approved','rejected','suspended','revoked'].map(s=>DB.applications.filter(a=>a.status===s).length);
  charts.status = new Chart(document.getElementById('chartStatus'),{type:'doughnut',data:{labels:['Pending','Approved','Rejected','Suspended','Revoked'],datasets:[{data:statusCounts,backgroundColor:['rgba(244,162,97,.8)','rgba(45,198,83,.8)','rgba(230,57,70,.8)','rgba(123,97,255,.8)','rgba(255,107,107,.8)'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8892A4',font:{size:10},boxWidth:10}}}}});

  const types=['Provisional','Full Medical','Specialist','Temporary'];
  charts.types = new Chart(document.getElementById('chartTypes'),{type:'bar',data:{labels:types,datasets:[{data:[1,2,1,0],backgroundColor:'rgba(201,168,76,.7)',borderRadius:5,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8892A4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#8892A4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}}}}});

  charts.trend = new Chart(document.getElementById('chartTrend'),{type:'line',data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'],datasets:[{label:'Applications',data:[2,3,5,4,7,6,9,8],borderColor:'var(--gold)',backgroundColor:'rgba(201,168,76,.1)',fill:true,borderWidth:2.5,tension:.45,pointRadius:4,pointBackgroundColor:'var(--gold)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8892A4',font:{size:10},boxWidth:10}}},scales:{x:{ticks:{color:'#8892A4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}},y:{ticks:{color:'#8892A4',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'}}}}});
}

// ── current context for the review modal ──
let currentReviewId   = null;
let currentReviewMode = 'approve'; // approve | reject | suspend | revoke

function closeReview() {
  document.getElementById('reviewOverlay').classList.remove('show');
  currentReviewId = null;
}

// ── open the unified action modal ──
// mode: 'approve' | 'reject' | 'suspend' | 'revoke'
// idOrLicId: application id for approve/reject, license_id string for suspend/revoke
function openReview(idOrLicId, mode) {
  mode = mode || 'approve';
  currentReviewId   = idOrLicId;
  currentReviewMode = mode;

  // ── look up context info ──
  let appObj=null, licObj=null, uObj=null;
  if (mode==='approve'||mode==='reject') {
    appObj = DB.applications.find(a=>a.id===idOrLicId);
    if (appObj) { uObj=DB.users.find(x=>x.id===appObj.applicant_id); }
  } else {
    licObj = DB.licenses.find(l=>l.license_id===idOrLicId);
    if (licObj) {
      appObj = DB.applications.find(a=>a.license_id===idOrLicId);
      uObj   = DB.users.find(x=>x.id===licObj.applicant_id);
    }
  }

  // ── modal text ──
  const cfg = {
    approve: { icon:'', title:'Approve Application',   sub:'Grant this license. The doctor will be notified.',  btnLabel:'Approve & Issue License', btnStyle:'background:linear-gradient(135deg,var(--success),#20A840);color:#fff;border:none;', chips:['Documents verified','Credentials confirmed','All clear — approved','Medical Council cleared'] },
    reject:  { icon:'', title:'Reject Application',    sub:'Decline this application. Reason will be shown to the doctor.', btnLabel:'Reject Application', btnStyle:'background:rgba(230,57,70,.15);color:var(--danger);border:1px solid rgba(230,57,70,.35);', chips:['Documents not verified','Incomplete credentials','Degree certificate missing','Further verification needed','Duplicate application'] },
    suspend: { icon:'', title:'Suspend License',        sub:'Temporarily suspend this active license.',          btnLabel:'Suspend License',           btnStyle:'background:rgba(244,162,97,.15);color:var(--warn);border:1px solid rgba(244,162,97,.35);',  chips:['Under investigation','Complaint received','Administrative hold','Pending renewal review'] },
    revoke:  { icon:'', title:'Revoke License',        sub:'Permanently revoke. This cannot be undone.',        btnLabel:'Permanently Revoke',        btnStyle:'background:rgba(230,57,70,.15);color:var(--danger);border:1px solid rgba(230,57,70,.35);', chips:['Fraudulent credentials','Criminal conviction','Misconduct proven','License misused'] },
  }[mode];

  document.getElementById('revModalIcon').textContent   = cfg.icon;
  document.getElementById('revModalTitle').textContent  = cfg.title;
  document.getElementById('revModalSub').textContent    = cfg.sub;
  document.getElementById('revNote').value              = '';
  document.getElementById('revNoteErr').style.display   = 'none';

  // ── applicant strip ──
  const strip = document.getElementById('revApplicantStrip');
  const info  = document.getElementById('revApplicantInfo');
  if (uObj) {
    strip.style.display='block';
    const licId = (mode==='approve'||mode==='reject') ? (appObj?'Pending':'—') : (licObj?licObj.license_id:'—');
    info.innerHTML = `<strong>${uObj.name}</strong> &nbsp;·&nbsp; ${uObj.degree||''} ${uObj.specialization?'| '+uObj.specialization:''}<br>
      <span style="color:var(--grey)">License ID: <strong style="color:var(--gold)">${licId==='Pending'?'Will be generated on approval':licId}</strong></span>`;
  } else { strip.style.display='none'; }

  // ── quick-fill chips ──
  document.getElementById('revChips').innerHTML = cfg.chips.map(ch=>
    `<span class="fbtn" style="cursor:pointer;font-size:11px" onclick="document.getElementById('revNote').value='${ch}';document.getElementById('revNoteErr').style.display='none'">${ch}</span>`
  ).join('');

  // ── action button ──
  document.getElementById('revActionBtns').innerHTML = `
    <button style="flex:1;padding:12px;border-radius:9px;font-family:var(--font-body);font-size:13px;font-weight:700;cursor:pointer;${cfg.btnStyle}" onclick="submitReview()">
      ${cfg.btnLabel}
    </button>
    <button style="padding:12px 18px;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:9px;font-family:var(--font-body);font-size:13px;color:var(--grey);cursor:pointer" onclick="closeReview()">Cancel</button>`;

  document.getElementById('reviewOverlay').classList.add('show');
}

function submitReview() {
  const note = document.getElementById('revNote').value.trim();
  if (!note) {
    document.getElementById('revNoteErr').style.display='block';
    document.getElementById('revNote').focus();
    return;
  }
  const id = currentReviewId;
  const mode = currentReviewMode;
  closeReview();

  if (mode==='approve')  { approveApp(id, note); }
  else if (mode==='reject')  { rejectApp(id, note); }
  else if (mode==='suspend') { doSuspendWithNote(id, note); }
  else if (mode==='revoke')  { doRevokeWithNote(id, note); }
}

function approveApp(id, note) {
  const app = DB.applications.find(a=>a.id===id);
  if (!app) { toast('Application not found.','err'); return; }
  const licId  = genLicId();
  const today  = new Date().toISOString().split('T')[0];
  const expiry = new Date(Date.now()+730*24*60*60*1000).toISOString().split('T')[0];
  DB.licenses.push({
    id:DB.nextLicId++, license_id:licId, applicant_id:app.applicant_id,
    license_type:app.license_type, specialization:app.specialization,
    status:'active', issued_date:today, expiry_date:expiry,
    issued_by:'Medical Council of India', review_note:note
  });
  app.status='approved'; app.review_note=note; app.license_id=licId;
  // notify applicant
  pushNotification(app.applicant_id, 'approved',
    'License Approved!',
    `Your ${app.license_type} (${app.specialization}) has been approved. License ID: ${licId}`
  );
  toast('Approved! License issued: '+licId,'ok');
  updatePendBadge(); renderAdminApps('all');
}

function rejectApp(id, note) {
  const app = DB.applications.find(a=>a.id===id);
  if (!app) { toast('Application not found.','err'); return; }
  app.status='rejected'; app.review_note=note;
  // notify applicant
  pushNotification(app.applicant_id, 'rejected',
    'Application Rejected',
    `Your ${app.license_type} application was rejected. Reason: ${note}`
  );
  toast('❌ Application rejected.','err');
  updatePendBadge(); renderAdminApps('all');
}

// quick-action buttons (no note modal — use default notes)
function quickApprove(id) { approveApp(id,'Documents verified — application approved.'); }
function quickReject(id)  { rejectApp(id,'Application rejected by admin.'); }

// suspend/revoke now go through the modal for a mandatory note
function doSuspend(licId)  { openReview(licId,'suspend'); }
function doRevoke(licId)   { openReview(licId,'revoke'); }

function doSuspendWithNote(licId, note) {
  const lic=DB.licenses.find(l=>l.license_id===licId);
  const app=DB.applications.find(a=>a.license_id===licId);
  if (!lic) { toast('License not found.','err'); return; }
  lic.status='suspended'; lic.review_note=note;
  if (app) { app.status='suspended'; app.review_note=note; }
  // notify applicant
  pushNotification(lic.applicant_id, 'suspended',
    'License Suspended',
    `Your license ${licId} has been temporarily suspended. Reason: ${note}`
  );
  toast('⏸ License suspended.','info');
  renderAdminApps('all');
}

function doRevokeWithNote(licId, note) {
  const lic=DB.licenses.find(l=>l.license_id===licId);
  const app=DB.applications.find(a=>a.license_id===licId);
  if (!lic) { toast('License not found.','err'); return; }
  lic.status='revoked'; lic.review_note=note;
  if (app) { app.status='revoked'; app.review_note=note; }
  // notify applicant
  pushNotification(lic.applicant_id, 'revoked',
    'License Revoked',
    `Your license ${licId} has been permanently revoked. Reason: ${note}`
  );
  toast('License permanently revoked.','err');
  renderAdminApps('all');
}

function updatePendBadge() {
  const el=document.getElementById('pendCount');
  if(el) el.textContent=DB.applications.filter(a=>a.status==='pending').length;
}

// ══════════════════════════════════
// APPLICANT SHELL
// ══════════════════════════════════
function buildApplicantShell() {
  document.getElementById('tbNav').innerHTML = `
    <button class="nav-btn active" onclick="showPage('overview',this)">Dashboard</button>
    <button class="nav-btn" onclick="showPage('history',this)">History</button>
    <button class="nav-btn" onclick="showPage('profile',this)">Profile</button>`;

  document.getElementById('appSidebar').innerHTML = `
    <div class="sb-sec">Portal</div>
    <div class="sb-item active-t" onclick="showPage('overview',null,this)">Dashboard</div>
    <div class="sb-item" onclick="openApply('new')">Apply New License</div>
    <div class="sb-item" onclick="openApply('renewal')">Apply Renewal</div>
    <div class="sb-sec">My Info</div>
    <div class="sb-item" onclick="showPage('history',null,this)">License History</div>
    <div class="sb-item" onclick="showPage('profile',null,this)">My Profile</div>
    <div class="sb-footer"><button class="btn-logout" style="width:100%" onclick="logout()">Sign Out</button></div>`;

  renderApplicantDash();
}

function renderApplicantDash() {
  const u = currentUser;
  const myLics = DB.licenses.filter(l=>l.applicant_id===u.id);
  const activeLic = myLics.find(l=>l.status==='active') || myLics[0];
  const myApps = DB.applications.filter(a=>a.applicant_id===u.id);

  const licHTML = activeLic ? `
    <div class="lic-card">
      <div class="lc-top">
        <div><div style="font-size:9px;color:var(--teal);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:5px">Active License</div><div class="lc-title">${activeLic.license_type} — ${activeLic.specialization}</div></div>
        <span class="tag tag-green">✅ Active</span>
      </div>
      <div class="lc-num">${activeLic.license_id}</div>
      <div class="lc-meta">
        <div><div class="lm-l">Issued</div><div class="lm-v">${activeLic.issued_date}</div></div>
        <div><div class="lm-l">Expires</div><div class="lm-v">${activeLic.expiry_date}</div></div>
        <div><div class="lm-l">Issued By</div><div class="lm-v">${activeLic.issued_by}</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
        <button class="btn-dl" style="flex:1;min-width:140px" onclick="downloadLicense('${activeLic.license_id}','cert')">Certificate PDF</button>
        <button class="btn-dl" style="flex:1;min-width:140px;background:linear-gradient(135deg,var(--teal),var(--teal2));color:#fff" onclick="downloadLicense('${activeLic.license_id}','note')">Note Format</button>
      </div>
    </div>` : `
    <div style="background:rgba(0,180,216,.06);border:1px solid rgba(0,180,216,.15);border-radius:13px;padding:22px;text-align:center;margin-bottom:18px">
      <h3 style="color:var(--teal);font-size:15px;margin-bottom:7px">No Active License</h3>
      <p style="font-size:12px;color:var(--grey)">You don't have an active license yet. Use the buttons below to apply.</p>
    </div>`;

  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>Doctor Dashboard</h2><p>Manage your medical licenses and applications</p></div><span style="font-size:11px;color:var(--grey)">${new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</span></div>
    <div class="pad">
      <div class="profile-banner">
        <div class="p-av-wrap"><div class="p-av">${u.avatar||'DR'}</div><div class="p-vbadge" style="font-size:10px;color:#fff">&#x2713;</div></div>
        <div class="p-info">
          <h2>${u.name}</h2>
          <div class="p-tags">
            ${u.degree?`<span class="tag tag-gold">${u.degree}</span>`:''}
            ${u.specialization?`<span class="tag tag-teal">${u.specialization}</span>`:''}
            ${u.hospital?`<span class="tag" style="background:#F0F4FA;border:1px solid #D8E2EF;color:var(--grey)">${u.hospital}</span>`:''}
          </div>
          <div class="p-meta">
            <div><div class="pm-l">Date of Birth</div><div class="pm-v">${u.dob||'—'}</div></div>
            <div><div class="pm-l">Email</div><div class="pm-v" style="font-size:11px">${u.email||'—'}</div></div>
            <div><div class="pm-l">User ID</div><div class="pm-v">#${u.id}</div></div>
          </div>
        </div>
      </div>
      ${licHTML}
      <div class="qa-grid">
        <div class="qa" onclick="openApply('new')"><div class="qa-icon" style="font-size:18px;color:var(--gold)">&#x2295;</div><div class="qa-lbl">Apply New License</div><div class="qa-sub">Provisional, Full, Specialist, Temporary</div></div>
        <div class="qa" onclick="openApply('renewal')"><div class="qa-icon" style="font-size:18px;color:var(--teal)">&#x21bb;</div><div class="qa-lbl">Renew License</div><div class="qa-sub">Extend before expiry date</div></div>
        <div class="qa" onclick="${activeLic?`downloadLicense('${activeLic.license_id}')`:'openApply(\'new\')'}"><div class="qa-icon" style="font-size:18px;color:var(--teal)">&#x2193;</div><div class="qa-lbl">Download License</div><div class="qa-sub">Get digitally signed PDF</div></div>
      </div>
      <div style="font-family:var(--font-head);font-size:16px;margin-bottom:16px">Recent Applications</div>
      <div class="tbl-card" style="margin:0">
        ${myApps.length ? `<table><thead><tr><th>App ID</th><th>License Type</th><th>Applied</th><th>Status</th><th>Review</th></tr></thead><tbody>
        ${myApps.map(a=>`<tr>
          <td style="font-weight:700;color:var(--gold)">#${a.id}</td>
          <td><span class="lt">${a.license_type}</span></td>
          <td style="color:var(--grey)">${a.applied_date}</td>
          <td><span class="badge b-${a.status}">${cap(a.status)}</span></td>
          <td>${a.review_note?`<div class="rev-note"><strong>${a.status==='approved'?'Approved':a.status==='rejected'?'Rejected':'Note'}:</strong> ${a.review_note}</div>`:'<span style="color:var(--grey);font-size:11px">Awaiting review…</span>'}
            ${(a.documents&&a.documents.length)?`<div style="margin-top:5px"><button class="abtn a-rv" onclick="viewDocs(${a.id})">${a.documents.length} Doc${a.documents.length>1?"s":""}</button></div>`:''}</td>
        </tr>`).join('')}
        </tbody></table>` : '<div class="empty"><div class="ei" style="font-size:36px;color:var(--grey)">—</div>No applications yet. Apply for a license to get started.</div>'}
      </div>
    </div>`;
}

function renderApplicantHistory() {
  const myApps = DB.applications.filter(a=>a.applicant_id===currentUser.id);
  const myLics = DB.licenses.filter(l=>l.applicant_id===currentUser.id);
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>License History & Reviews</h2><p>All your applications and license records</p></div></div>
    <div class="pad">
      <div style="font-family:var(--font-head);font-size:16px;margin-bottom:14px">My Licenses</div>
      <div class="tbl-card" style="margin:0 0 22px">
        ${myLics.length?`<table><thead><tr><th>License ID</th><th>Type</th><th>Issued</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${myLics.map(l=>`<tr>
          <td style="font-weight:700;color:var(--gold);letter-spacing:1px">${l.license_id}</td>
          <td><span class="lt">${l.license_type}</span></td>
          <td style="color:var(--grey)">${l.issued_date}</td>
          <td style="color:${l.status==='active'?'var(--success)':'var(--grey)'}">${l.expiry_date}</td>
          <td><span class="badge b-${l.status}">${cap(l.status)}</span></td>
          <td style="white-space:nowrap"><button class="abtn a-rv" onclick="downloadLicense('${l.license_id}','cert')" title="Certificate PDF">PDF</button> <button class="abtn" style="background:rgba(42,123,155,.12);color:#2a7b9b;border-color:rgba(42,123,155,.25)" onclick="downloadLicense('${l.license_id}','note')" title="Note Format">Note</button></td>
        </tr>`).join('')}
        </tbody></table>`:'<div class="empty"><div class="ei">&#x2014;</div>No licenses issued yet.</div>'}
      </div>
      <div style="font-family:var(--font-head);font-size:16px;margin-bottom:14px">Application History</div>
      <div class="tbl-card" style="margin:0">
        ${myApps.length?`<table><thead><tr><th>ID</th><th>License Type</th><th>Specialization</th><th>Applied</th><th>Status</th><th>Admin Review</th></tr></thead><tbody>
        ${myApps.map(a=>`<tr>
          <td style="color:var(--gold);font-weight:700">#${a.id}</td>
          <td><span class="lt">${a.license_type}</span></td>
          <td style="color:var(--grey)">${a.specialization}</td>
          <td style="color:var(--grey)">${a.applied_date}</td>
          <td><span class="badge b-${a.status}">${cap(a.status)}</span></td>
          <td>${a.review_note?`<div class="rev-note"><strong>${a.status==='approved'?'&#x2713;':a.status==='rejected'?'&#x2717;':''} ${cap(a.status)}:</strong> ${a.review_note}</div>`:'<span style="color:var(--grey);font-size:11px">Awaiting…</span>'}</td>
        </tr>`).join('')}
        </tbody></table>`:'<div class="empty"><div class="ei" style="font-size:36px;color:var(--grey)">—</div>No applications yet.</div>'}
      </div>
    </div>`;
}

function renderApplicantProfile() {
  const u = currentUser;
  document.getElementById('pageContent').innerHTML = `
    <div class="sec-hdr"><div><h2>My Profile</h2><p>Your registered doctor information</p></div></div>
    <div class="pad">
      <div class="profile-banner" style="margin-bottom:20px">
        <div class="p-av-wrap"><div class="p-av">${u.avatar||'DR'}</div><div class="p-vbadge" style="font-size:10px;color:#fff">&#x2713;</div></div>
        <div class="p-info">
          <h2>${u.name}</h2>
          <div class="p-tags">
            ${u.degree?`<span class="tag tag-gold">${u.degree}</span>`:''}
            ${u.specialization?`<span class="tag tag-teal">${u.specialization}</span>`:''}
          </div>
        </div>
      </div>
      <div class="two-col">
        <div class="panel">
          <h3>Personal Information</h3>
          ${profileRow('Full Name',u.name)}
          ${profileRow('Date of Birth',u.dob||'—')}
          ${profileRow('Email',u.email||'—')}
          ${profileRow('User ID','#'+u.id)}
        </div>
        <div class="panel">
          <h3>Professional Details</h3>
          ${profileRow('Degree',u.degree||'—')}
          ${profileRow('Specialization',u.specialization||'—')}
          ${profileRow('Hospital',u.hospital||'—')}
          ${profileRow('Username',u.username)}
        </div>
      </div>
    </div>`;
}

function profileRow(label, value) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
    <span style="font-size:11px;color:var(--grey)">${label}</span>
    <span style="font-size:13px;font-weight:600">${value}</span>
  </div>`;
}

// Apply modal
function openApply(type) {
  document.getElementById('applyTitle').textContent = type==='renewal' ? 'Apply for License Renewal' : 'Apply for New License';
  document.getElementById('applySub').textContent   = type==='renewal' ? 'Submit a renewal before your license expires.' : 'Submit a new application. Reviewed within 7 business days.';
  document.getElementById('applyErr').style.display='none';
  document.getElementById('applyOk').style.display='none';
  resetFileUpload();
  document.getElementById('apLicType').value='';
  document.getElementById('apSpec').value='';
  document.getElementById('apHosp').value=currentUser.hospital||'';
  document.getElementById('apNotes').value='';
  document.getElementById('applyOverlay').classList.add('show');
}
function closeApply() {
  document.getElementById('applyOverlay').classList.remove('show');
  resetFileUpload();
}

// ── FILE UPLOAD STATE ──────────────────────────────────────
let uploadedFiles = []; // [{name, size, type, dataUrl}]

function onDragOver(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.add('dragover');
}
function onDragLeave(e) {
  document.getElementById('uploadZone').classList.remove('dragover');
}
function onDrop(e) {
  e.preventDefault();
  document.getElementById('uploadZone').classList.remove('dragover');
  handleFiles(e.dataTransfer.files);
}
function onFileSelected(e) {
  handleFiles(e.target.files);
  e.target.value = ''; // allow re-selecting same file
}

function handleFiles(fileList) {
  const MAX = 10 * 1024 * 1024; // 10MB
  const ALLOWED = ['application/pdf','image/jpeg','image/png','image/jpg',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  Array.from(fileList).forEach(file => {
    if (uploadedFiles.find(f=>f.name===file.name)) {
      toast('"'+file.name+'" already added.','info'); return;
    }
    if (file.size > MAX) {
      toast('❌ "'+file.name+'" exceeds 10MB limit.','err'); return;
    }
    if (!ALLOWED.includes(file.type) && !file.name.match(/\.(pdf|jpg|jpeg|png|doc|docx)$/i)) {
      toast('❌ File type not allowed: '+file.name,'err'); return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
      uploadedFiles.push({ name:file.name, size:file.size, type:file.type, dataUrl:ev.target.result });
      renderFileList();
    };
    reader.readAsDataURL(file);
  });
}

function getFileIcon(type, name) {
  if (type==='application/pdf'||name.endsWith('.pdf')) return 'PDF';
  if (type.startsWith('image/')) return 'IMG';
  if (type.includes('word')||name.endsWith('.doc')||name.endsWith('.docx')) return 'DOC';
  return 'FILE';
}
function fmtSize(bytes) {
  if (bytes<1024) return bytes+'B';
  if (bytes<1024*1024) return (bytes/1024).toFixed(1)+'KB';
  return (bytes/(1024*1024)).toFixed(1)+'MB';
}

function renderFileList() {
  const list = document.getElementById('fileList');
  if (!list) return;
  if (!uploadedFiles.length) { list.innerHTML=''; return; }
  list.innerHTML = uploadedFiles.map((f,i)=>`
    <div class="file-item" id="fi-${i}">
      <span class="fi-icon">${getFileIcon(f.type,f.name)}</span>
      <div style="flex:1;min-width:0">
        <div class="fi-name" title="${f.name}">${f.name}</div>
        <div class="fi-size">${fmtSize(f.size)} · ${f.type.split('/')[1]?.toUpperCase()||'FILE'}</div>
        <div class="fi-prog"><div class="fi-prog-fill" style="width:100%"></div></div>
      </div>
      <button class="fi-del" onclick="removeFile(${i})">&#x2715;</button>
    </div>`).join('');
  // Update zone label
  const zone = document.getElementById('uploadZone');
  const cnt  = document.createElement('div');
  cnt.className='upload-count';
  cnt.innerHTML='✅ '+uploadedFiles.length+' file'+(uploadedFiles.length>1?'s':'')+' ready';
  const existing=zone.querySelector('.upload-count');
  if(existing) existing.remove();
  zone.after(cnt);
}

function removeFile(idx) {
  uploadedFiles.splice(idx,1);
  renderFileList();
  // Remove count badge if no files
  const zone=document.getElementById('uploadZone');
  const cnt=zone.nextElementSibling;
  if(cnt&&cnt.classList.contains('upload-count')&&!uploadedFiles.length) cnt.remove();
}

function resetFileUpload() {
  uploadedFiles=[];
  const list=document.getElementById('fileList');
  if(list) list.innerHTML='';
  const zone=document.getElementById('uploadZone');
  if(zone){
    const cnt=zone.nextElementSibling;
    if(cnt&&cnt.classList.contains('upload-count')) cnt.remove();
  }
}

function submitApply() {
  const lt   = document.getElementById('apLicType').value;
  const spec = document.getElementById('apSpec').value;
  if (!lt||!spec) { showErr('applyErr','Please select license type and specialization.'); return; }
  const btn = document.querySelector('#applyOverlay .btn-teal');
  if(btn){btn.innerHTML='<span class="spin"></span> Submitting…';btn.disabled=true;}
  // Simulate upload progress then save
  setTimeout(()=>{
    if(btn){btn.textContent='Submit Application →';btn.disabled=false;}
    const today = new Date().toISOString().split('T')[0];
    const docs = uploadedFiles.map(f=>({name:f.name,size:f.size,type:f.type,dataUrl:f.dataUrl}));
    DB.applications.push({
      id:DB.nextAppId++,
      applicant_id:currentUser.id,
      license_type:lt,
      specialization:spec,
      hospital:document.getElementById('apHosp').value,
      notes:document.getElementById('apNotes').value,
      status:'pending',
      applied_date:today,
      review_note:'',
      license_id:null,
      documents:docs
    });
    document.getElementById('applyErr').style.display='none';
    const ok=document.getElementById('applyOk');
    ok.innerHTML='✅ Application submitted! '+(docs.length?'<strong>'+docs.length+' document'+(docs.length>1?'s':'')+' uploaded.</strong>':'No documents attached.');
    ok.style.display='block';
    toast('✅ Application submitted'+(docs.length?' with '+docs.length+' document'+(docs.length>1?'s':''):'')+'!','ok');
    resetFileUpload();
    setTimeout(()=>{ closeApply(); renderApplicantDash(); },2000);
  }, uploadedFiles.length ? 1200 : 400);
}


// ══════════════════════════════════
// DOWNLOAD DIGITAL LICENSE
// Canvas-based — works fully offline
// ══════════════════════════════════
function downloadLicense(licId, format) {
  format = format || 'cert';
  const lic = DB.licenses.find(l => l.license_id === licId);
  const u   = DB.users.find(x => x.id === (lic ? lic.applicant_id : 0));
  if (!lic) { toast('License not found.', 'err'); return; }

  const docName  = u ? u.name          : 'Doctor';
  const degree   = u ? (u.degree  ||'') : '';
  const spec     = lic.specialization  || (u ? u.specialization||'' : '');
  const hospital = u ? (u.hospital||'') : '';
  const email    = u ? (u.email   ||'') : '';
  const dob      = u ? (u.dob     ||'') : '';
  const phone    = u ? (u.phone   ||'') : '';
  const regNo    = u ? (u.reg_no  ||'') : '';
  const exp      = u ? (u.experience||'') : '';
  const gender   = u ? (u.gender  ||'') : '';
  const state    = u ? (u.state   ||'') : '';
  const avatar   = u ? (u.avatar || 'DR') : 'DR';
  const isActive = lic.status === 'active';
  const today    = new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'});
  const refNo    = lic.license_id + '-' + Date.now().toString(36).toUpperCase();

  // ── colour palette ──
  const NAVY  = '#0A1628', NAVY2 = '#112240', TEAL = '#00B4D8';
  const GOLD  = '#C9A84C', GOLD2 = '#E8C97A';
  const WHITE = '#FFFFFF', GREY  = '#8892A4';
  const GREEN = '#2DC653', RED   = '#E63946';
  const BG    = '#F8FAFC', BORDER= '#E8EDF2', DARK = '#0A1628';

  // ── helper: draw rounded rect ──
  function rr(ctx, x,y,w,h,r,fill,stroke){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=stroke==='#C9A84C'?2:1;ctx.stroke();}
  }

  // ── helper: gradient fill rect ──
  function grad(ctx,x,y,w,h,c1,c2,horiz){
    const g = horiz
      ? ctx.createLinearGradient(x,0,x+w,0)
      : ctx.createLinearGradient(0,y,0,y+h);
    g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle=g; ctx.fillRect(x,y,w,h);
  }

  // ── helper: truncate text ──
  function trunc(ctx,text,maxW){
    if(!text) return '—';
    if(ctx.measureText(text).width <= maxW) return text;
    while(text.length>1 && ctx.measureText(text+'…').width > maxW) text=text.slice(0,-1);
    return text+'…';
  }

  // ════════════════════════════════
  // CERTIFICATE FORMAT  (1200×800)
  // ════════════════════════════════
  if(format === 'cert'){
    const W=1200, H=800;
    const cv = document.createElement('canvas');
    cv.width=W; cv.height=H;
    const ctx = cv.getContext('2d');

    // ── 1. White background ──
    ctx.fillStyle=WHITE; ctx.fillRect(0,0,W,H);

    // ── 2. Header band (navy gradient) ──
    grad(ctx,0,0,W,160,NAVY,NAVY2,false);

    // Gold left accent stripe
    ctx.fillStyle=GOLD; ctx.fillRect(0,0,8,160);

    // Logo box (gold rounded rect)
    rr(ctx,30,30,90,90,14,GOLD,null);
    ctx.font='bold 48px serif'; ctx.fillStyle=NAVY; ctx.textAlign='center';
    ctx.fillText('⚕',75,93);

    // Org title
    ctx.textAlign='left';
    ctx.font='bold 32px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=WHITE;
    ctx.fillText('MedLicense Pro',140,72);
    ctx.font='13px "Segoe UI",Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.45)';
    ctx.fillText('MEDICAL LICENSE AUTHORITY  ·  OFFICIAL CERTIFICATE',140,98);

    // Status badge (right)
    const statusTxt = isActive ? '● ACTIVE & VALID' : '● '+lic.status.toUpperCase();
    const statusCol = isActive ? GREEN : RED;
    const stW = ctx.measureText(statusTxt).width + 40;
    rr(ctx, W-stW-30, 30, stW, 38, 19,
       isActive ? 'rgba(45,198,83,0.18)':'rgba(230,57,70,0.18)',
       isActive ? 'rgba(45,198,83,0.5)' :'rgba(230,57,70,0.5)');
    ctx.font='bold 16px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=statusCol;
    ctx.textAlign='center'; ctx.fillText(statusTxt, W-stW/2-30, 55);

    // License ID (right, gold big)
    ctx.font='bold 28px "Courier New",monospace'; ctx.fillStyle=GOLD; ctx.textAlign='right';
    ctx.fillText(lic.license_id, W-30, 120);
    ctx.textAlign='left';

    // ── 3. Gold divider strip ──
    grad(ctx,0,160,W,5,GOLD,GOLD2,true);

    // ── 4. Doctor profile row ──
    // Avatar circle
    ctx.save();
    ctx.beginPath(); ctx.arc(95,240,55,0,Math.PI*2); ctx.clip();
    rr(ctx,40,185,110,110,0,'#0096C7',null);
    ctx.restore();
    ctx.font='56px serif'; ctx.textAlign='center'; ctx.fillText(avatar,95,258);

    // Doctor name & tags
    ctx.textAlign='left';
    ctx.font='bold 28px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
    ctx.fillText(trunc(ctx,docName,520), 175, 215);

    let tagX=175;
    const tagData=[
      degree   ? {t:degree,   bg:'#fef9ec',tc:'#9a7520',bc:'#f0d980'} : null,
      spec     ? {t:spec, bg:'#e8f8fb',tc:'#0086a0',bc:'#b2e4ef'} : null,
      hospital ? {t:hospital, bg:'#f4f6f8',tc:'#5a6a7a',bc:'#dde3e9'} : null,
    ].filter(Boolean);
    tagData.forEach(tag => {
      ctx.font='13px "Segoe UI",Arial,sans-serif';
      const tw=ctx.measureText(tag.t).width+24;
      if(tagX+tw > 700){return;}
      rr(ctx,tagX,228,tw,26,13,tag.bg,tag.bc);
      ctx.fillStyle=tag.tc; ctx.fillText(tag.t,tagX+12,246);
      tagX+=tw+8;
    });

    if(email||phone){
      ctx.font='13px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
      ctx.fillText((email?'✉ '+email:'')+(email&&phone?'   ':'')+(phone?'Tel: '+phone:''),175,275);
    }

    // Dashed divider
    ctx.setLineDash([6,4]); ctx.strokeStyle=BORDER; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(30,305); ctx.lineTo(W-30,305); ctx.stroke();
    ctx.setLineDash([]);

    // ── 5. License highlight box (dark navy card) ──
    rr(ctx,30,320,580,90,14,NAVY,null);
    ctx.font='11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillText(lic.license_type.toUpperCase(),52,348);
    ctx.font='bold 36px "Courier New",monospace'; ctx.fillStyle=GOLD;
    ctx.fillText(lic.license_id,52,388);
    // Valid until (right side of box)
    ctx.textAlign='right';
    ctx.font='11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)';
    ctx.fillText('VALID UNTIL',580,348);
    ctx.font='bold 22px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=WHITE;
    ctx.fillText(lic.expiry_date,580,388);
    ctx.textAlign='left';

    // ── 6. Info grid (6 cells) ──
    const cells=[
      {l:'STATUS',    v:lic.status.toUpperCase(), vc:isActive?GREEN:RED},
      {l:'ISSUE DATE', v:lic.issued_date},
      {l:'EXPIRY DATE',v:lic.expiry_date},
      {l:'SPECIALIZATION',v:spec||'—'},
      {l:'ISSUED BY', v:lic.issued_by||'Medical Council'},
      {l:'DATE OF BIRTH',v:dob||'—'},
    ];
    const cW=183, cH=70, gapX=14, startX=30, startY=425;
    cells.forEach((cell,i)=>{
      const cx=startX+(cW+gapX)*(i%3);
      const cy=startY+Math.floor(i/3)*(cH+10);
      rr(ctx,cx,cy,cW,cH,9,BG,BORDER);
      ctx.font='10px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
      ctx.fillText(cell.l,cx+10,cy+20);
      ctx.font='bold 16px "Segoe UI",Arial,sans-serif';
      ctx.fillStyle=cell.vc||DARK;
      ctx.fillText(trunc(ctx,cell.v,cW-20),cx+10,cy+48);
    });

    // ── 7. Footer: Signature | Seal | QR ──
    const fy=595;
    // Divider
    ctx.strokeStyle=BORDER; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(30,fy); ctx.lineTo(W-30,fy); ctx.stroke();

    // Signature block
    grad(ctx,30,fy+15,220,3,GOLD,'rgba(201,168,76,0)',true);
    ctx.font='bold 18px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
    ctx.fillText('Registrar, Medical Council',30,fy+40);
    ctx.font='13px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
    ctx.fillText('Medical License Authority of India',30,fy+60);
    ctx.font='12px "Segoe UI",Arial,sans-serif'; ctx.fillStyle='#aab4be';
    ctx.fillText('Official Digital Certificate',30,fy+82);
    ctx.fillText('Verify: medlicense.gov.in/verify',30,fy+100);

    // Official seal (circle)
    const sx=W/2-40, sy=fy+55;
    ctx.beginPath(); ctx.arc(sx,sy,52,0,Math.PI*2);
    ctx.strokeStyle=GOLD; ctx.lineWidth=3; ctx.stroke();
    ctx.beginPath(); ctx.arc(sx,sy,44,0,Math.PI*2);
    ctx.strokeStyle=GOLD; ctx.lineWidth=1; ctx.stroke();
    ctx.font='38px serif'; ctx.textAlign='center'; ctx.fillText('+',sx,sy+13);
    ctx.font='bold 9px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GOLD;
    ctx.fillText('OFFICIAL SEAL',sx,sy+36);
    ctx.textAlign='left';

    // QR placeholder (right)
    rr(ctx,W-150,fy+15,120,120,8,BG,BORDER);
    ctx.font='14px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY; ctx.textAlign='center';
    ctx.fillText('[ QR CODE ]',W-90,fy+72);
    ctx.fillText('Scan to verify',W-90,fy+92);
    ctx.font='11px monospace'; ctx.fillStyle='#ccc';
    ctx.fillText(lic.license_id,W-90,fy+110);
    ctx.textAlign='left';

    // ── 8. Meta footer strip ──
    rr(ctx,0,740,W,60,0,BG,null);
    ctx.strokeStyle=BORDER; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,740); ctx.lineTo(W,740); ctx.stroke();
    ctx.font='13px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
    ctx.fillText('Ref: '+refNo+'  ·  Generated: '+today, 30, 775);
    ctx.textAlign='right';
    ctx.fillText('medlicense.gov.in  ·  registry@medlicense.gov.in', W-30, 775);
    ctx.textAlign='left';

    // ── 9. Download ──
    const link=document.createElement('a');
    link.download='MedLicense_Certificate_'+licId+'.png';
    link.href=cv.toDataURL('image/png');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast('Certificate downloaded!','ok');
    return;
  }

  // ════════════════════════════════
  // NOTE FORMAT  (860×1120  — A4 portrait)
  // ════════════════════════════════
  const W=860, H=1120;
  const cv = document.createElement('canvas');
  cv.width=W; cv.height=H;
  const ctx = cv.getContext('2d');

  // ── Background ──
  ctx.fillStyle=WHITE; ctx.fillRect(0,0,W,H);

  // ── Top letterhead bar ──
  ctx.fillStyle=NAVY; ctx.fillRect(0,0,W,72);
  ctx.fillStyle=GOLD; ctx.fillRect(0,72,W,5);

  // Logo box in bar
  rr(ctx,28,12,48,48,8,GOLD,null);
  ctx.font='bold 26px serif'; ctx.fillStyle=NAVY; ctx.textAlign='center';
  ctx.fillText('⚕',52,45);

  // Org name
  ctx.textAlign='left';
  ctx.font='bold 22px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=WHITE;
  ctx.fillText('MedLicense Pro',90,34);
  ctx.font='10px "Segoe UI",Arial,sans-serif'; ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.fillText('MEDICAL LICENSE AUTHORITY  ·  OFFICIAL NOTICE',90,54);

  // Status pill (right)
  const sCol=isActive?GREEN:RED;
  const sLabel=isActive?'● ACTIVE':'● '+lic.status.toUpperCase();
  ctx.font='bold 13px "Segoe UI",Arial,sans-serif';
  const sw=ctx.measureText(sLabel).width+28;
  rr(ctx,W-sw-24,18,sw,36,18,
     isActive?'rgba(45,198,83,.2)':'rgba(230,57,70,.2)',
     isActive?'rgba(45,198,83,.6)':'rgba(230,57,70,.6)');
  ctx.fillStyle=sCol; ctx.textAlign='center';
  ctx.fillText(sLabel, W-sw/2-24, 41);
  ctx.textAlign='left';

  // ── Document title ──
  let y=110;
  ctx.font='bold 26px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
  ctx.fillText('MEDICAL LICENSE CERTIFICATE', 40, y); y+=28;
  ctx.font='14px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
  ctx.fillText('Official Copy — Issued by Medical License Authority of India', 40, y); y+=8;
  ctx.strokeStyle=GOLD; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(40,y+5); ctx.lineTo(W-40,y+5); ctx.stroke(); y+=22;

  // ── Section helper ──
  function sectionHdr(label, yy){
    ctx.font='bold 11px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
    ctx.fillText(label.toUpperCase(), 40, yy);
    ctx.strokeStyle=BORDER; ctx.lineWidth=1;
    const tw=ctx.measureText(label.toUpperCase()).width;
    ctx.beginPath(); ctx.moveTo(40+tw+10,yy-4); ctx.lineTo(W-40,yy-4); ctx.stroke();
    return yy+16;
  }

  // ── Field helper (2-column) ──
  function fieldCell(lbl,val,x,yy,w){
    rr(ctx,x,yy,w,54,6,BG,BORDER);
    ctx.font='10px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
    ctx.fillText(lbl.toUpperCase(), x+10, yy+18);
    ctx.font='bold 15px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
    ctx.fillText(trunc(ctx,val||'—',w-22), x+10, yy+40);
  }

  // ── SECTION 1: Doctor Info ──
  y=sectionHdr('Doctor Information', y);
  const cw=(W-96)/2;
  fieldCell('Full Name',    docName,    40,     y, cw);
  fieldCell('Degree',       degree,     40+cw+16,y, cw); y+=66;
  fieldCell('Specialization',spec,      40,     y, cw);
  fieldCell('Hospital',     hospital,   40+cw+16,y, cw); y+=66;
  fieldCell('Email',        email,      40,     y, cw);
  fieldCell('Phone',        phone,      40+cw+16,y, cw); y+=66;
  fieldCell('Date of Birth',dob,        40,     y, cw);
  fieldCell('Gender',       gender,     40+cw+16,y, cw); y+=66;
  fieldCell('State',        state,      40,     y, cw);
  fieldCell('Experience',   exp?(exp+' years'):'', 40+cw+16,y, cw); y+=74;

  // ── Divider ──
  ctx.strokeStyle=BORDER; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-40,y); ctx.stroke(); y+=16;

  // ── SECTION 2: License Info ──
  y=sectionHdr('License Information', y);
  fieldCell('License ID',   lic.license_id, 40,     y, cw);
  fieldCell('License Type', lic.license_type,40+cw+16,y, cw); y+=66;
  fieldCell('Status',       lic.status.toUpperCase(), 40, y, cw);
  fieldCell('Specialization',spec,      40+cw+16,y, cw); y+=66;
  fieldCell('Issue Date',   lic.issued_date,40,     y, cw);
  fieldCell('Expiry Date',  lic.expiry_date,40+cw+16,y, cw); y+=66;
  fieldCell('Issued By',    lic.issued_by||'Medical Council',40,y,cw);
  fieldCell('Reg. Number',  regNo||'—', 40+cw+16,y, cw); y+=74;

  // ── Notice box ──
  rr(ctx,40,y,W-80,60,8,BG,BORDER);
  ctx.font='bold 12px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
  ctx.fillText('IMPORTANT NOTICE', 56, y+22);
  ctx.font='12px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
  ctx.fillText('This certificate is valid only when status is ACTIVE. Any alteration or misuse is an offence', 56, y+40);
  ctx.fillText('under the Medical Practitioners Act.', 56, y+56);
  y+=76;

  // ── Signature + Seal ──
  ctx.strokeStyle=BORDER; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-40,y); ctx.stroke(); y+=16;

  grad(ctx,40,y,200,3,GOLD,'rgba(201,168,76,0)',true);
  y+=8;
  ctx.font='bold 18px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=DARK;
  ctx.fillText('Registrar, Medical Council', 40, y+14);
  ctx.font='12px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
  ctx.fillText('Medical License Authority of India', 40, y+34);

  // Seal circle
  const sealy=y+10, sealx=W/2;
  ctx.beginPath(); ctx.arc(sealx,sealy+28,44,0,Math.PI*2);
  ctx.strokeStyle=GOLD; ctx.lineWidth=2.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(sealx,sealy+28,36,0,Math.PI*2);
  ctx.lineWidth=1; ctx.stroke();
  ctx.font='30px serif'; ctx.textAlign='center'; ctx.fillText('+',sealx,sealy+40);
  ctx.font='bold 8px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GOLD;
  ctx.fillText('OFFICIAL SEAL',sealx,sealy+63);
  ctx.textAlign='left';

  // ── Bottom meta strip ──
  ctx.fillStyle=BG; ctx.fillRect(0,H-56,W,56);
  ctx.strokeStyle=BORDER; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,H-56); ctx.lineTo(W,H-56); ctx.stroke();
  ctx.font='12px "Segoe UI",Arial,sans-serif'; ctx.fillStyle=GREY;
  ctx.fillText('Generated: '+today+'  ·  Ref: '+refNo, 40, H-24);
  ctx.textAlign='right';
  ctx.fillText('medlicense.gov.in  ·  registry@medlicense.gov.in', W-40, H-24);
  ctx.textAlign='left';

  // ── Download ──
  const link=document.createElement('a');
  link.download='MedLicense_Note_'+licId+'.png';
  link.href=cv.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  toast('Note format downloaded!','ok');
}

// ══════════════════════════════════
// PUBLIC VERIFICATION
// ══════════════════════════════════
function switchPubTab(tab, btn) {
  document.querySelectorAll('.s-tab').forEach(t=>t.classList.remove('on'));
  if(btn) btn.classList.add('on');
  ['num','name','qr'].forEach(t=>{ const el=document.getElementById('pub-panel-'+t); if(el) el.style.display=t===tab?'block':'none'; });
}

function doVerify() {
  const lic = document.getElementById('pubVerifyInput').value.trim();
  if (!lic) { toast('Please enter a license number.','err'); return; }
  const btn=document.getElementById('verifyBtn');
  btn.innerHTML='<span class="spin"></span>'; btn.disabled=true;
  setTimeout(()=>{
    btn.textContent='Verify →'; btn.disabled=false;
    const found = DB.licenses.find(l=>l.license_id===lic);
    const ra=document.getElementById('verifyResult'); ra.classList.add('show');
    if (!found) {
      ra.innerHTML=`<div class="res-banner rb-fail"><div class="rb-icon rbi-fail">❌</div><div class="rb-text"><h3>License Not Found</h3><p>This license number does not exist in the registry or may have been revoked.</p></div><div class="rb-id" style="color:var(--danger)">${lic}</div></div>`;
      ra.scrollIntoView({behavior:'smooth'}); return;
    }
    const u=DB.users.find(x=>x.id===found.applicant_id)||{};
    const ok=found.status==='active';
    const sc=ok?'var(--success)':found.status==='suspended'?'var(--warn)':'var(--danger)';
    ra.innerHTML=`
      <div class="res-banner ${ok?'rb-ok':'rb-fail'}">
        <div class="rb-icon ${ok?'rbi-ok':'rbi-fail'}">${ok?'✅':''}</div>
        <div class="rb-text"><h3>License ${ok?'Verified — Valid & Active':'Status: '+cap(found.status)}</h3><p>${ok?'This medical license is authentic and currently active in the national registry.':'This license is not currently active. Please contact the issuing authority.'}</p></div>
        <div class="rb-id">${found.license_id}</div>
      </div>
      <div class="doc-result-card">
        <div class="dr-av">DR</div>
        <div class="dr-info">
          <h2>${u.name||'Licensed Practitioner'}</h2>
          <div class="p-tags">
            ${u.degree?`<span class="tag tag-gold">${u.degree}</span>`:''}
            ${u.specialization?`<span class="tag tag-teal">${u.specialization}</span>`:''}
            ${u.hospital?`<span class="tag" style="background:#F0F4FA;border:1px solid #D8E2EF;color:var(--grey)">${u.hospital}</span>`:''}
          </div>
          <p style="font-size:11px;color:var(--grey)">Registered practitioner · License issued by ${found.issued_by}</p>
        </div>
      </div>
      <div class="info-grid-2">
        <div class="ic"><div class="ic-l">License Number</div><div class="ic-v" style="color:var(--gold);letter-spacing:2px">${found.license_id}</div></div>
        <div class="ic"><div class="ic-l">License Type</div><div class="ic-v">${found.license_type}</div></div>
        <div class="ic"><div class="ic-l">Issue Date</div><div class="ic-v">${found.issued_date}</div></div>
        <div class="ic"><div class="ic-l">Expiry Date</div><div class="ic-v ${ok?'ok':''}">${found.expiry_date}</div></div>
        <div class="ic"><div class="ic-l">Specialization</div><div class="ic-v">${found.specialization||'—'}</div></div>
        <div class="ic"><div class="ic-l">Status</div><div class="ic-v" style="color:${sc}">${cap(found.status)}</div></div>
        ${u.dob?`<div class="ic"><div class="ic-l">Date of Birth</div><div class="ic-v">${u.dob}</div></div>`:''}
        ${u.email?`<div class="ic"><div class="ic-l">Official Email</div><div class="ic-v" style="font-size:11px">${u.email}</div></div>`:''}
      </div>
      <div class="qr-result">
        <div class="qr-result-info"><h4>QR Verification Code</h4><p>Scan this QR code to instantly re-verify this doctor's license. Links directly to this verification system.</p></div>
        <div class="qr-box" id="qrBox"></div>
      </div>`;
    ra.scrollIntoView({behavior:'smooth'});
    setTimeout(()=>{
      try {
        new QRCode(document.getElementById('qrBox'),{text:'MedLicense:'+found.license_id+'|'+found.status+'|'+u.name,width:92,height:92,colorDark:'#0A1628',colorLight:'#ffffff'});
      } catch(e){ document.getElementById('qrBox').innerHTML='<span style="font-size:16px;font-weight:700;color:var(--teal)">QR</span>'; }
    },100);
  },600);
}

function doVerifyByName() {
  const name = document.getElementById('pubNameInput').value.trim().toLowerCase();
  if (!name) { toast('Please enter a doctor name.','err'); return; }
  const found = DB.users.find(u=>u.name&&u.name.toLowerCase().includes(name)&&u.role==='applicant');
  if (!found) { toast('No doctor found with that name.','err'); return; }
  const lic = DB.licenses.find(l=>l.applicant_id===found.id);
  if (!lic) { toast('No license found for this doctor.','err'); return; }
  document.getElementById('pubVerifyInput').value=lic.license_id;
  switchPubTab('num',document.querySelector('.s-tab'));
  doVerify();
}

// ══════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════
function openForgot() { document.getElementById('forgotOverlay').classList.add('show'); }
function closeForgot() {
  document.getElementById('forgotOverlay').classList.remove('show');
  document.getElementById('resetForm').style.display='block';
  document.getElementById('resetOk').style.display='none';
  document.getElementById('rUser').value='';
  document.getElementById('rPw').value='';
  document.getElementById('rPw2').value='';
  document.getElementById('resetErr').style.display='none';
}
function checkStr(val) {
  let s=0;
  if(val.length>=8)s++;if(/[A-Z]/.test(val))s++;if(/[0-9]/.test(val))s++;if(/[^A-Za-z0-9]/.test(val))s++;
  const lvls=[{w:'0%',c:'transparent',t:'Enter a password'},{w:'25%',c:'#E63946',t:'Weak'},{w:'50%',c:'#F4A261',t:'Fair'},{w:'75%',c:'#E8C97A',t:'Good'},{w:'100%',c:'#2DC653',t:'Strong ✓'}];
  const l=val.length===0?lvls[0]:lvls[s];
  document.getElementById('strFill').style.cssText='width:'+l.w+';background:'+l.c;
  document.getElementById('strTxt').textContent=l.t;
}
function doReset() {
  const user=document.getElementById('rUser').value.trim();
  const np=document.getElementById('rPw').value;
  const cp=document.getElementById('rPw2').value;
  if(!user||!np||!cp){showErr('resetErr','All fields are required.');return;}
  if(np!==cp){showErr('resetErr','Passwords do not match.');return;}
  if(np.length<8){showErr('resetErr','Password must be at least 8 characters.');return;}
  const u=DB.users.find(x=>x.username===user);
  if(!u){showErr('resetErr','User not found.');return;}
  u.password=np;
  document.getElementById('resetForm').style.display='none';
  document.getElementById('resetOk').style.display='block';
  setTimeout(closeForgot,2500);
}

// ══════════════════════════════════
// UTILITIES
// ══════════════════════════════════
function togglePw(id,btn) {
  const inp=document.getElementById(id);
  inp.type=inp.type==='password'?'text':'password';
  btn.innerHTML=inp.type==='password'?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>':'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
}
function showErr(id,msg){const el=document.getElementById(id);el.innerHTML=msg;el.style.display='block';}
function hideErr(id){const el=document.getElementById(id);if(el)el.style.display='none';}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):'';}
function genLicId(){const y=new Date().getFullYear();const n=String(DB.nextLicId).padStart(5,'0');return `MLA-${y}-${n}`;}

let toastTimer;
function toast(msg,type='ok'){
  clearTimeout(toastTimer);
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast show t-${type}`;
  toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// Close overlays on backdrop click — registered after DOM ready
function registerOverlayListeners(){
  ['forgotOverlay','reviewOverlay','applyOverlay','docsOverlay'].forEach(function(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('click',function(e){
      if(e.target===this){
        if(id==='forgotOverlay') closeForgot();
        else if(id==='reviewOverlay') closeReview();
        else if(id==='applyOverlay') closeApply();
        else if(id==='docsOverlay') el.classList.remove('show');
      }
    });
  });
}


// ══════════════════════════════════
// SIGNUP FLOW
// ══════════════════════════════════
let suStep = 1;
let pickedAvatar = 'DR';

function showSignup() {
  suStep = 1;
  pickedAvatar = 'DR';
  ['su_name','su_username','su_email','su_pw','su_pw2',
   'su_dob','su_phone','su_address','su_reg','su_hospital'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  ['su_gender','su_state','su_degree','su_spec','su_exp'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  ['su_err1','su_err2','su_err3','su_err4'].forEach(function(id){hideErr(id);});
  document.getElementById('su_uname_msg').textContent='';
  document.getElementById('strFill2').style.cssText='width:0;background:transparent';
  document.getElementById('strTxt2').textContent='Enter a password to check strength';
  document.querySelectorAll('.av-opt').forEach(function(o){o.classList.remove('picked');});
  var first=document.querySelector('.av-opt'); if(first) first.classList.add('picked');
  goToStep(1);
  document.getElementById('loginCard').style.display='none';
  document.getElementById('signupCard').classList.add('show');
}

function showLoginCard() {
  document.getElementById('signupCard').classList.remove('show');
  document.getElementById('loginCard').style.display='block';
}

function goToStep(n) {
  suStep=n;
  for(var i=1;i<=5;i++){
    var s=document.getElementById('su-step-'+i);
    if(s) s.className='su-step'+(i===n?' active':'');
  }
  for(var i=1;i<=4;i++){
    var dot=document.getElementById('sd'+i);
    var lbl=document.getElementById('sl-lbl'+i);
    if(!dot) continue;
    dot.className='step-dot'+(i<n?' done':i===n?' active':'');
    if(lbl) lbl.className='step-lbl'+(i<n?' done':i===n?' active':'');
    var line=document.getElementById('sl'+i);
    if(line) line.className='step-line'+(i<n?' done':'');
  }
  if(n===4) buildPreview();
}

function suNext(step) {
  if(step===1){
    var name=document.getElementById('su_name').value.trim();
    var uname=document.getElementById('su_username').value.trim();
    var email=document.getElementById('su_email').value.trim();
    var pw=document.getElementById('su_pw').value;
    var pw2=document.getElementById('su_pw2').value;
    if(!name||!uname||!email||!pw||!pw2){showErr('su_err1','All fields marked * are required.');return;}
    if(!/^[a-zA-Z0-9._-]+$/.test(uname)){showErr('su_err1','Username: only letters, numbers, dots, hyphens allowed.');return;}
    if(DB.users.find(function(u){return u.username===uname;})){showErr('su_err1','❌ That username is already taken. Choose another.');return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('su_err1','Please enter a valid email address.');return;}
    if(pw.length<8){showErr('su_err1','Password must be at least 8 characters.');return;}
    if(pw!==pw2){showErr('su_err1','Passwords do not match.');return;}
    hideErr('su_err1'); goToStep(2);
  } else if(step===2){
    var dob=document.getElementById('su_dob').value;
    var gender=document.getElementById('su_gender').value;
    var phone=document.getElementById('su_phone').value.trim();
    var addr=document.getElementById('su_address').value.trim();
    if(!dob||!gender||!phone||!addr){showErr('su_err2','Please fill in all required fields.');return;}
    if(!/^[\d\s\+\-\(\)]{7,15}$/.test(phone)){showErr('su_err2','Enter a valid phone number (digits only).');return;}
    var age=(new Date()-new Date(dob))/(365.25*24*60*60*1000);
    if(age<18){showErr('su_err2','You must be at least 18 years old to register.');return;}
    hideErr('su_err2'); goToStep(3);
  } else if(step===3){
    var deg=document.getElementById('su_degree').value;
    var spec=document.getElementById('su_spec').value;
    var hosp=document.getElementById('su_hospital').value.trim();
    if(!deg||!spec||!hosp){showErr('su_err3','Degree, specialization and hospital are required.');return;}
    hideErr('su_err3'); goToStep(4);
  }
}

function suBack(step){goToStep(step-1);}

function checkUsernameAvail(val){
  var msg=document.getElementById('su_uname_msg');
  if(!val){msg.textContent='';return;}
  if(!/^[a-zA-Z0-9._-]{3,}$/.test(val)){
    msg.innerHTML='<span style="color:var(--warn)">Min 3 chars; letters, numbers, dots, hyphens only</span>';return;
  }
  var taken=DB.users.find(function(u){return u.username===val;});
  msg.innerHTML=taken
    ?'<span style="color:var(--danger)">❌ Username taken</span>'
    :'<span style="color:var(--success)">✅ Username available</span>';
}

function checkStr2(val){
  var s=0;
  if(val.length>=8)s++;if(/[A-Z]/.test(val))s++;if(/[0-9]/.test(val))s++;if(/[^A-Za-z0-9]/.test(val))s++;
  var lvls=[{w:'0%',c:'transparent',t:'Enter a password'},{w:'25%',c:'#E63946',t:'Weak'},{w:'50%',c:'#F4A261',t:'Fair'},{w:'75%',c:'#E8C97A',t:'Good'},{w:'100%',c:'#2DC653',t:'Strong'}];
  var l=val.length===0?lvls[0]:lvls[s];
  document.getElementById('strFill2').style.cssText='width:'+l.w+';background:'+l.c;
  document.getElementById('strTxt2').textContent=l.t;
}

function pickAvatar(el){
  document.querySelectorAll('.av-opt').forEach(function(o){o.classList.remove('picked');});
  el.classList.add('picked');
  pickedAvatar=el.dataset.av;
}

function buildPreview(){
  var name=document.getElementById('su_name').value.trim();
  var uname=document.getElementById('su_username').value.trim();
  var email=document.getElementById('su_email').value.trim();
  var dob=document.getElementById('su_dob').value;
  var gender=document.getElementById('su_gender').value;
  var phone=document.getElementById('su_phone').value.trim();
  var state=document.getElementById('su_state').value;
  var deg=document.getElementById('su_degree').value;
  var spec=document.getElementById('su_spec').value;
  var hosp=document.getElementById('su_hospital').value.trim();
  var exp=document.getElementById('su_exp').value;
  var reg=document.getElementById('su_reg').value.trim();

  document.getElementById('previewCard').innerHTML=
    '<div class="preview-av">'+pickedAvatar+'</div>'+
    '<div class="preview-name">'+name+'</div>'+
    '<div class="preview-meta">@'+uname+' &nbsp;&middot;&nbsp; '+email+'</div>'+
    '<div class="preview-tags" style="margin-top:10px">'+
      '<span class="tag tag-gold">'+deg+'</span>'+
      '<span class="tag tag-teal">'+spec+'</span>'+
      '<span class="tag" style="background:rgba(240,244,250,1);border:1px solid #D8E2EF;color:var(--grey)">'+hosp+'</span>'+
    '</div>';

  document.getElementById('previewDetails').innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 22px">'+
    '<div><strong style="color:#1A2340">DOB:</strong> '+dob+'</div>'+
    '<div><strong style="color:#1A2340">Gender:</strong> '+gender+'</div>'+
    '<div><strong style="color:#1A2340">Phone:</strong> '+phone+'</div>'+
    '<div><strong style="color:#1A2340">State:</strong> '+(state||'—')+'</div>'+
    '<div><strong style="color:#1A2340">Experience:</strong> '+(exp||'—')+'</div>'+
    '<div><strong style="color:#1A2340">Reg No.:</strong> '+(reg||'Not yet registered')+'</div>'+
    '</div>';
}

function submitSignup(){
  var btn=document.getElementById('su_submit_btn');
  btn.innerHTML='<span class="spin"></span> Creating account…'; btn.disabled=true;
  setTimeout(function(){
    btn.textContent='Create My Account'; btn.disabled=false;
    var newId=Math.max.apply(null,DB.users.map(function(u){return u.id;}))+1;
    var newUser={
      id:newId,
      username:document.getElementById('su_username').value.trim(),
      password:document.getElementById('su_pw').value,
      role:'applicant',
      name:document.getElementById('su_name').value.trim(),
      email:document.getElementById('su_email').value.trim(),
      degree:document.getElementById('su_degree').value,
      specialization:document.getElementById('su_spec').value,
      dob:document.getElementById('su_dob').value,
      gender:document.getElementById('su_gender').value,
      phone:document.getElementById('su_phone').value.trim(),
      address:document.getElementById('su_address').value.trim(),
      state:document.getElementById('su_state').value,
      hospital:document.getElementById('su_hospital').value.trim(),
      experience:document.getElementById('su_exp').value,
      reg_no:document.getElementById('su_reg').value.trim(),
      avatar:pickedAvatar,
      joined:new Date().toISOString().split('T')[0]
    };
    DB.users.push(newUser);
    document.getElementById('su_created_preview').innerHTML=
      '<div style="font-size:28px;margin-bottom:8px">'+pickedAvatar+'</div>'+
      '<strong style="color:#1A2340;font-size:14px">'+newUser.name+'</strong><br>'+
      'Username: <strong style="color:var(--teal)">@'+newUser.username+'</strong><br>'+
      'Specialization: '+newUser.specialization+' &middot; Joined: '+newUser.joined;
    goToStep(5);
  },900);
}

function afterSignup(){
  var uname=document.getElementById('su_username').value.trim();
  showLoginCard();
  document.getElementById('roleSelect').value='applicant';
  onRoleChange();
  document.getElementById('username').value=uname;
  document.getElementById('password').value='';
  document.getElementById('password').focus();
  toast('Account created! Please enter your password to sign in.','ok');
}


// ── VIEW SUBMITTED DOCUMENTS (Admin) ──────────────────────
function viewDocs(appId) {
  const app = DB.applications.find(a=>a.id===appId);
  if (!app) return;
  const docs = app.documents||[];
  const u = DB.users.find(x=>x.id===app.applicant_id);

  document.getElementById('docsModalTitle').textContent = 'Submitted Documents';
  document.getElementById('docsModalSub').textContent =
    (u?u.name:'Applicant')+' · '+app.license_type+' · '+app.applied_date;

  if (!docs.length) {
    document.getElementById('docsModalBody').innerHTML =
      '<div class="empty"><div class="ei" style="font-size:36px;color:var(--grey)">—</div>No documents were attached to this application.</div>';
  } else {
    document.getElementById('docsModalBody').innerHTML = docs.map((d,i)=>{
      const isImg = d.type&&d.type.startsWith('image/');
      const isPdf = d.type==='application/pdf'||d.name.endsWith('.pdf');
      const icon  = isPdf?'PDF':isImg?'IMG':'FILE';
      const preview = isImg
        ? `<img src="${d.dataUrl}" style="width:100%;max-height:220px;object-fit:contain;border-radius:8px;margin-top:10px;border:1px solid var(--border)" alt="${d.name}"/>`
        : isPdf
          ? `<div style="margin-top:10px;padding:14px;background:rgba(0,119,168,.05);border:1px solid rgba(0,119,168,.15);border-radius:8px;text-align:center">
               <div style="font-size:13px;font-weight:700;color:var(--teal);margin-bottom:8px">PDF</div>
               <p style="font-size:12px;color:var(--grey);margin-bottom:10px">PDF Document</p>
               <a href="${d.dataUrl}" download="${d.name}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:linear-gradient(135deg,var(--teal),var(--teal2));border-radius:8px;color:#fff;font-size:12px;font-weight:700;text-decoration:none">Download PDF</a>
             </div>`
          : `<div style="margin-top:10px;padding:12px;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:8px;text-align:center">
               <div style="font-size:13px;font-weight:700;color:var(--gold);margin-bottom:7px">FILE</div>
               <a href="${d.dataUrl}" download="${d.name}" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(201,168,76,.15);border:1px solid rgba(201,168,76,.3);border-radius:8px;color:var(--gold);font-size:12px;font-weight:700;text-decoration:none">Download File</a>
             </div>`;
      return `<div style="background:#F0F4FA;border:1px solid var(--border);border-radius:11px;padding:14px;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px">
          <span style="font-size:20px">${icon}</span>
          <div>
            <div style="font-size:13px;font-weight:700">${d.name}</div>
            <div style="font-size:10px;color:var(--grey)">${(d.size/1024).toFixed(1)} KB · ${(d.type||'').split('/')[1]?.toUpperCase()||'FILE'}</div>
          </div>
          <a href="${d.dataUrl}" download="${d.name}" style="margin-left:auto;padding:5px 11px;background:rgba(0,180,216,.12);border:1px solid rgba(0,180,216,.25);border-radius:7px;color:var(--teal);font-size:11px;font-weight:700;text-decoration:none">Save</a>
        </div>
        ${preview}
      </div>`;
    }).join('');
  }
  document.getElementById('docsOverlay').classList.add('show');
}

// ── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function(){
  registerOverlayListeners();
  showView('login');
});