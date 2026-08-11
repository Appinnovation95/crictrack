import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, collection, getCountFromServer, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const VERSION='2.0.0';
const fbApp=initializeApp(firebaseConfig);
const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
const root=document.getElementById('app');
let deferredInstallPrompt=null;

const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

window.addEventListener('beforeinstallprompt',(e)=>{
  e.preventDefault();
  deferredInstallPrompt=e;
  document.querySelectorAll('[data-install]').forEach(b=>b.hidden=false);
});
window.addEventListener('appinstalled',()=>{
  deferredInstallPrompt=null;
  document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true);
});

async function installPwa(){
  if(!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true);
}

function header(sub='LIVE SCORES. REAL PASSION.'){
  return `<header class="hero premium-hero">
    <div class="stadium-glow"></div>
    <div class="brand-row premium-brand">
      <img class="brand-app-icon" src="./icon-192.png" alt="CricTrack" />
      <div>
        <h1 class="brand-title"><span>Cric</span><em>Track</em></h1>
        <p class="brand-subtitle">${sub}</p>
      </div>
      <button class="install-mini" data-install hidden aria-label="Install CricTrack">⬇ Install</button>
    </div>
  </header>`;
}
function shell(content,sub){
  root.innerHTML=`<div class="app-shell">${header(sub)}${content}<footer class="footer">© 2026 CricTrack • v${VERSION}</footer></div>`;
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
}

function home(){
  shell(`<main class="content premium-home compact-home">
    <section class="platform-overview overview-first">
      <h3>PLATFORM OVERVIEW</h3>
      <div class="overview-grid">
        <div class="overview-card blue"><b>0</b><span>Cricket Teams</span><i>👥</i></div>
        <div class="overview-card red"><b>0</b><span>Tournaments</span><i>🏆</i></div>
        <div class="overview-card green"><b>0</b><span>Live Matches</span><i>📡</i></div>
        <div class="overview-card amber"><b>0</b><span>System Alerts</span><i>🔔</i></div>
      </div>
    </section>
    <section class="home-card-stack compact-login-stack" aria-label="CricTrack access options">
      <button class="workspace-card team-card" data-login="team">
        <div class="workspace-icon premium-cricket-mark"><span class="batter">🏏</span><span class="mini-ball"></span></div>
        <div class="workspace-body"><h2>CRICKET TEAM</h2><p>Manage your team, players, matches and statistics</p><span class="workspace-login">LOGIN</span></div>
      </button>
      <button class="workspace-card tournament-card" data-login="tournament">
        <div class="workspace-icon trophy-mark">🏆</div>
        <div class="workspace-body"><h2>TOURNAMENTS</h2><p>Organize tournaments, fixtures, live scores and more</p><span class="workspace-login red-text">LOGIN</span></div>
      </button>
      <button class="workspace-card admin-card" data-login="superadmin">
        <div class="workspace-icon admin-shield">♛</div>
        <div class="workspace-body"><h2>SUPER ADMIN</h2><p>System control, manage teams, tournaments and users</p><span class="workspace-login">LOGIN</span></div>
      </button>
    </section>
    <div class="secure-strip"><span>🛡️</span><div><strong>Firebase secure connection active</strong><small>Secure • Fast • Reliable</small></div></div>
    <button class="install-wide" data-install hidden>⬇ Install CricTrack App</button>
  </main>
  <nav class="bottom-nav" aria-label="Main navigation"><button class="active">⌂<span>Home</span></button><button>◉<span>Live</span></button><button>♙<span>Teams</span></button><button>♜<span>Tournaments</span></button><button>•••<span>More</span></button></nav>`);
  document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>loginPage(b.dataset.login));
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
}
function loginPage(role){
  if(role==='team'){
    shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card login-blue" id="teamForm">
      <div class="login-badge">🏏 &nbsp;TEAM LOGIN</div><h2 class="login-title">Cricket Team Login</h2>
      <p class="login-copy">Use the Team ID and password created by CricTrack Super Admin.</p>
      <div class="field"><label>Team ID</label><input id="teamId" type="text" autocomplete="username" autocapitalize="characters" placeholder="Enter Team ID" required></div>
      <div class="field"><label>Password</label><input id="teamPassword" type="password" autocomplete="current-password" placeholder="Enter Password" required></div>
      <label class="remember"><input id="showTeamPw" type="checkbox"> Show password</label>
      <button class="login-btn" id="teamLoginBtn">LOGIN</button><div class="error" id="teamError"></div>
      <div class="note success-note">Secure Firebase Authentication • Team-isolated access</div>
    </form></main>`,'TEAM • SECURE ACCESS');
    document.getElementById('back').onclick=home;
    document.getElementById('showTeamPw').onchange=e=>document.getElementById('teamPassword').type=e.target.checked?'text':'password';
    document.getElementById('teamForm').onsubmit=teamLogin;
    return;
  }
  if(role==='tournament'){
    shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button>
      <div class="login-card login-red"><div class="login-badge">🏆 &nbsp;TOURNAMENT LOGIN</div><h2 class="login-title">Tournament Login</h2>
      <p class="login-copy">Tournament account creation is the next phase after Team accounts.</p>
      <div class="field"><label>Tournament ID</label><input type="text" placeholder="Enter Tournament ID" disabled></div>
      <div class="field"><label>Password</label><input type="password" placeholder="Enter Password" disabled></div>
      <button class="login-btn" disabled>COMING NEXT</button></div></main>`,'TOURNAMENT • SECURE ACCESS');
    document.getElementById('back').onclick=home;
    return;
  }
  shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card" id="adminForm">
    <div class="login-badge">🔐 &nbsp;SUPER ADMIN</div><h2 class="login-title">Super Admin Login</h2>
    <p class="login-copy">Secure Firebase Authentication access.</p>
    <div class="field"><label>Admin Email</label><input id="email" type="email" autocomplete="username" placeholder="Enter admin email" required></div>
    <div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password" placeholder="Enter password" required></div>
    <label class="remember"><input id="showPw" type="checkbox"> Show password</label>
    <button class="login-btn" id="loginBtn">Login Securely</button><div class="error" id="errorBox"></div>
    <div class="note success-note">Firebase Authentication + Firestore Super Admin authorization are enabled.</div>
  </form></main>`,'Super Admin • Secure Control Centre');
  document.getElementById('back').onclick=home;
  document.getElementById('showPw').onchange=e=>document.getElementById('password').type=e.target.checked?'text':'password';
  document.getElementById('adminForm').onsubmit=adminLogin;
}

function normalizeTeamId(v=''){
  return v.trim().toUpperCase().replace(/\s+/g,'-');
}
function teamAuthEmail(teamId){
  return `${normalizeTeamId(teamId).toLowerCase()}@teams.crictrack.app`;
}
async function teamLogin(e){
  e.preventDefault();
  const btn=document.getElementById('teamLoginBtn'),box=document.getElementById('teamError');
  const teamId=normalizeTeamId(document.getElementById('teamId').value);
  const password=document.getElementById('teamPassword').value;
  box.style.display='none';btn.disabled=true;btn.textContent='Checking team access…';
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(teamId)) throw new Error('Enter a valid Team ID.');
    const cred=await signInWithEmailAndPassword(auth,teamAuthEmail(teamId),password);
    const userSnap=await getDoc(doc(db,'users',cred.user.uid));
    if(!userSnap.exists()||userSnap.data().role!=='team'||userSnap.data().teamId!==teamId){
      await signOut(auth);throw new Error('This login is not linked to the selected CricTrack team.');
    }
    const teamSnap=await getDoc(doc(db,'teams',teamId));
    if(!teamSnap.exists()){await signOut(auth);throw new Error('Team record not found. Contact Super Admin.');}
    if((teamSnap.data().status||'active')!=='active'){await signOut(auth);throw new Error('This team account is not active. Contact Super Admin.');}
    teamDashboard(cred.user,teamSnap.data());
  }catch(err){box.textContent=friendlyError(err);box.style.display='block';btn.disabled=false;btn.textContent='LOGIN';}
}

async function adminLogin(e){
  e.preventDefault();
  const btn=document.getElementById('loginBtn'),box=document.getElementById('errorBox');
  box.style.display='none';btn.disabled=true;btn.textContent='Checking secure access…';
  try{
    const cred=await signInWithEmailAndPassword(auth,document.getElementById('email').value.trim(),document.getElementById('password').value);
    const adminSnap=await getDoc(doc(db,'admins',cred.user.uid));
    if(!adminSnap.exists()||adminSnap.data().role!=='superadmin'){
      await signOut(auth);throw new Error('This account is not authorized as CricTrack Super Admin.');
    }
    await adminDashboard(cred.user);
  }catch(err){box.textContent=friendlyError(err);box.style.display='block';btn.disabled=false;btn.textContent='Login Securely';}
}

function friendlyError(err){
  const c=err?.code||'';
  if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found'))return 'Email or password is incorrect.';
  if(c.includes('too-many-requests'))return 'Too many attempts. Please wait and try again.';
  if(c.includes('network-request-failed'))return 'Network problem. Check internet connection and try again.';
  return err?.message||'Login failed. Please try again.';
}

async function adminDashboard(user){
  shell(`<main class="dashboard premium-dashboard">
    <div class="topbar"><div><div class="admin-chip">🔐 SUPER ADMIN</div><h2 class="section-title" style="margin-top:10px">Control Centre</h2><p class="section-copy" style="margin-bottom:0">${esc(user.email||'Authorized admin')}</p></div><button class="logout" id="logout">Logout</button></div>
    <div class="stats"><div class="stat"><div class="num" id="teamCount">—</div><div class="label">Cricket Teams</div></div><div class="stat"><div class="num" id="tournamentCount">—</div><div class="label">Tournaments</div></div><div class="stat"><div class="num">0</div><div class="label">Live Matches</div></div><div class="stat"><div class="num">0</div><div class="label">System Alerts</div></div></div>
    <div class="admin-grid"><button class="admin-action red-accent" id="manageTeams"><div>🛡️</div><strong>Cricket Teams</strong><small>Create and manage secure team accounts.</small></button><button class="admin-action red-accent"><div>🏆</div><strong>Tournaments</strong><small>Create and manage tournament accounts.</small></button><button class="admin-action"><div>🏏</div><strong>Matches Control</strong><small>Platform match control centre.</small></button><button class="admin-action"><div>📡</div><strong>Live Monitoring</strong><small>Monitor active scoring sessions.</small></button><button class="admin-action"><div>🧾</div><strong>Audit Logs</strong><small>Track protected admin actions.</small></button><button class="admin-action"><div>⚙️</div><strong>System Settings</strong><small>Security and platform controls.</small></button></div>
    <div class="status-row"><span class="dot"></span> Firebase secure connection active</div><button class="install-wide" data-install hidden>⬇ Install CricTrack App</button>
  </main>`,'SUPER ADMIN • SECURE CONTROL CENTRE');
  document.getElementById('logout').onclick=async()=>{await signOut(auth);home();};
  document.getElementById('manageTeams').onclick=()=>teamManagement(user);
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
  try{
    const [teams,tours]=await Promise.all([getCountFromServer(collection(db,'teams')),getCountFromServer(collection(db,'tournaments'))]);
    document.getElementById('teamCount').textContent=teams.data().count;
    document.getElementById('tournamentCount').textContent=tours.data().count;
  }catch{
    document.getElementById('teamCount').textContent='0';document.getElementById('tournamentCount').textContent='0';
  }
}

async function teamManagement(user){
  shell(`<main class="dashboard premium-dashboard team-management">
    <div class="management-head"><button class="back" id="backAdmin">← Control Centre</button><button class="primary-small" id="createTeam">+ Create Team</button></div>
    <div class="admin-chip">🛡️ CRICKET TEAMS</div><h2 class="section-title management-title">Team Accounts</h2><p class="section-copy">Create secure Team ID + Password accounts and manage access.</p>
    <div id="teamList" class="team-list"><div class="loading-card">Loading teams…</div></div>
  </main>`,'SUPER ADMIN • TEAM MANAGEMENT');
  document.getElementById('backAdmin').onclick=()=>adminDashboard(user);
  document.getElementById('createTeam').onclick=()=>createTeamPage(user);
  await renderTeams();
}

async function renderTeams(){
  const list=document.getElementById('teamList');
  try{
    const snap=await getDocs(collection(db,'teams'));
    if(snap.empty){list.innerHTML='<div class="empty-state"><div>🏏</div><strong>No cricket teams yet</strong><span>Create the first secure team account.</span></div>';return;}
    const teams=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    list.innerHTML=teams.map(t=>`<article class="team-row"><div class="team-avatar">🏏</div><div class="team-info"><strong>${esc(t.name||t.id)}</strong><span>ID: ${esc(t.id)} • ${esc(t.city||'City not set')}</span><small>${esc(t.managerName||'Manager not set')}</small></div><span class="status-pill ${t.status==='active'?'active':'inactive'}">${esc((t.status||'active').toUpperCase())}</span></article>`).join('');
  }catch(err){list.innerHTML=`<div class="error visible">${esc(friendlyError(err))}</div>`;}
}

function createTeamPage(user){
  shell(`<main class="login-wrap create-team-wrap"><button class="back" id="backTeams">← Team Accounts</button><form class="login-card create-team-card" id="createTeamForm">
    <div class="login-badge">🏏 &nbsp;CREATE TEAM</div><h2 class="login-title">New Cricket Team</h2><p class="login-copy">The password is stored only in Firebase Authentication, never in Firestore.</p>
    <div class="form-grid"><div class="field full"><label>Team Name *</label><input id="newTeamName" type="text" maxlength="60" placeholder="Example: Warriors XI" required></div>
    <div class="field"><label>Team ID *</label><input id="newTeamId" type="text" maxlength="20" autocapitalize="characters" placeholder="WARRIORS01" required><small class="field-help">4–20 letters/numbers/hyphen. Permanent ID.</small></div>
    <div class="field"><label>City</label><input id="newTeamCity" type="text" maxlength="40" placeholder="Vijayawada"></div>
    <div class="field"><label>Manager Name</label><input id="newManager" type="text" maxlength="60" placeholder="Manager name"></div>
    <div class="field"><label>Mobile</label><input id="newMobile" type="tel" maxlength="15" inputmode="tel" placeholder="Mobile number"></div>
    <div class="field"><label>Password *</label><input id="newTeamPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Minimum 8 characters" required></div>
    <div class="field"><label>Confirm Password *</label><input id="confirmTeamPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Re-enter password" required></div></div>
    <button class="login-btn" id="createTeamBtn">CREATE TEAM ACCOUNT</button><div class="error" id="createTeamError"></div><div class="success-box" id="createTeamSuccess"></div>
  </form></main>`,'SUPER ADMIN • CREATE TEAM');
  document.getElementById('backTeams').onclick=()=>teamManagement(user);
  document.getElementById('newTeamId').oninput=e=>e.target.value=normalizeTeamId(e.target.value);
  document.getElementById('createTeamForm').onsubmit=e=>createTeamAccount(e,user);
}

async function createTeamAccount(e,user){
  e.preventDefault();
  const btn=document.getElementById('createTeamBtn'),errBox=document.getElementById('createTeamError'),okBox=document.getElementById('createTeamSuccess');
  errBox.style.display='none';okBox.style.display='none';
  const teamId=normalizeTeamId(document.getElementById('newTeamId').value);
  const name=document.getElementById('newTeamName').value.trim();
  const city=document.getElementById('newTeamCity').value.trim();
  const managerName=document.getElementById('newManager').value.trim();
  const mobile=document.getElementById('newMobile').value.trim();
  const password=document.getElementById('newTeamPassword').value;
  const confirm=document.getElementById('confirmTeamPassword').value;
  let newAuthUser=null;
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(teamId)) throw new Error('Team ID must be 4–20 letters, numbers or hyphens.');
    if(password.length<8) throw new Error('Password must contain at least 8 characters.');
    if(password!==confirm) throw new Error('Password and Confirm Password do not match.');
    const existing=await getDoc(doc(db,'teams',teamId));
    if(existing.exists()) throw new Error('This Team ID already exists. Choose another Team ID.');
    btn.disabled=true;btn.textContent='Creating secure account…';
    const secondaryApp=getApps().find(a=>a.name==='teamProvisioner')||initializeApp(firebaseConfig,'teamProvisioner');
    const secondaryAuth=getAuth(secondaryApp);
    const cred=await createUserWithEmailAndPassword(secondaryAuth,teamAuthEmail(teamId),password);
    newAuthUser=cred.user;
    const batch=writeBatch(db);
    batch.set(doc(db,'teams',teamId),{teamId,name,city,managerName,mobile,status:'active',authUid:newAuthUser.uid,schemaVersion:1,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    batch.set(doc(db,'users',newAuthUser.uid),{uid:newAuthUser.uid,role:'team',teamId,status:'active',schemaVersion:1,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    await batch.commit();
    await signOut(secondaryAuth);
    okBox.innerHTML=`<strong>✅ Team created successfully</strong><span>Team: ${esc(name)}</span><span>Team ID: <b>${esc(teamId)}</b></span><span>Password is not stored or displayed by CricTrack.</span>`;
    okBox.style.display='grid';
    e.target.reset();
  }catch(err){
    if(newAuthUser){try{await deleteUser(newAuthUser);}catch{}}
    errBox.textContent=friendlyError(err);errBox.style.display='block';
  }finally{btn.disabled=false;btn.textContent='CREATE TEAM ACCOUNT';}
}

function teamDashboard(user,team){
  shell(`<main class="dashboard team-dashboard">
    <div class="team-top"><div><div class="team-chip">🏏 TEAM ACCOUNT</div><h2>${esc(team.name||team.teamId)}</h2><p>ID: ${esc(team.teamId||'')}</p></div><button class="logout" id="teamLogout">Logout</button></div>
    <div class="team-welcome"><strong>WELCOME BACK,</strong><h3>${esc((team.name||'TEAM').toUpperCase())}</h3><span>${esc(team.city||'CricTrack Team')}</span></div>
    <div class="team-dashboard-grid"><button>👤<strong>Team Profile</strong></button><button>👥<strong>Players & Squad</strong></button><button>🗓️<strong>Create Match</strong></button><button>📡<strong>Live Scoring</strong></button><button>📋<strong>Matches</strong></button><button>📊<strong>Statistics</strong></button><button>🤝<strong>Opponents</strong></button><button>📄<strong>Reports</strong></button><button>⚙️<strong>Settings</strong></button></div>
    <div class="phase-note">Team login is now active. Players & Squad is the next development phase.</div>
  </main>`,'TEAM DASHBOARD • SECURE');
  document.getElementById('teamLogout').onclick=async()=>{await signOut(auth);home();};
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

onAuthStateChanged(auth,async user=>{
  if(!user){home();return;}
  try{
    const adminSnap=await getDoc(doc(db,'admins',user.uid));
    if(adminSnap.exists()&&adminSnap.data().role==='superadmin'){adminDashboard(user);return;}
  }catch{}
  try{
    const userSnap=await getDoc(doc(db,'users',user.uid));
    if(userSnap.exists()&&userSnap.data().role==='team'){
      const teamId=userSnap.data().teamId;
      const teamSnap=await getDoc(doc(db,'teams',teamId));
      if(teamSnap.exists()&&(teamSnap.data().status||'active')==='active'){teamDashboard(user,teamSnap.data());return;}
    }
  }catch{}
  await signOut(auth).catch(()=>{});home();
});
