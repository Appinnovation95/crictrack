import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getCountFromServer } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const VERSION='1.2.0';
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
  shell(`<main class="content premium-home">
    <section class="home-card-stack" aria-label="CricTrack access options">
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
    <section class="platform-overview">
      <h3>PLATFORM OVERVIEW</h3>
      <div class="overview-grid">
        <div class="overview-card blue"><b>0</b><span>Cricket Teams</span><i>👥</i></div>
        <div class="overview-card red"><b>0</b><span>Tournaments</span><i>🏆</i></div>
        <div class="overview-card green"><b>0</b><span>Live Matches</span><i>📡</i></div>
        <div class="overview-card amber"><b>0</b><span>System Alerts</span><i>🔔</i></div>
      </div>
    </section>
    <div class="secure-strip"><span>🛡️</span><div><strong>Firebase secure connection active</strong><small>Secure • Fast • Reliable</small></div></div>
    <button class="install-wide" data-install hidden>⬇ Install CricTrack App</button>
  </main>
  <nav class="bottom-nav" aria-label="Main navigation"><button class="active">⌂<span>Home</span></button><button>◉<span>Live</span></button><button>♙<span>Teams</span></button><button>♜<span>Tournaments</span></button><button>•••<span>More</span></button></nav>`);
  document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>loginPage(b.dataset.login));
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
}
function loginPage(role){
  if(role!=='superadmin'){
    const isTeam=role==='team';
    const title=isTeam?'Team Login':'Tournament Login';
    const label=isTeam?'Team ID':'Tournament ID';
    const accent=isTeam?'login-blue':'login-red';
    shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button>
      <div class="login-card ${accent}">
        <div class="login-badge">${isTeam?'👥':'🏆'} &nbsp;${title.toUpperCase()}</div>
        <h2 class="login-title">${title}</h2>
        <div class="field"><label>${label}</label><input type="text" placeholder="Enter ${label}"></div>
        <div class="field"><label>Password</label><input type="password" placeholder="Enter Password"></div>
        <button class="login-btn" disabled>LOGIN</button>
        <div class="note">${isTeam?'Team':'Tournament'} account creation will be enabled from Super Admin in the next secure account-management phase.</div>
      </div></main>`,'Secure access portal');
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
    <div class="admin-grid"><button class="admin-action red-accent"><div>🛡️</div><strong>Cricket Teams</strong><small>Create and manage team accounts.</small></button><button class="admin-action red-accent"><div>🏆</div><strong>Tournaments</strong><small>Create and manage tournament accounts.</small></button><button class="admin-action"><div>🏏</div><strong>Matches Control</strong><small>Platform match control centre.</small></button><button class="admin-action"><div>📡</div><strong>Live Monitoring</strong><small>Monitor active scoring sessions.</small></button><button class="admin-action"><div>🧾</div><strong>Audit Logs</strong><small>Track protected admin actions.</small></button><button class="admin-action"><div>⚙️</div><strong>System Settings</strong><small>Security and platform controls.</small></button></div>
    <div class="status-row"><span class="dot"></span> Firebase secure connection active</div><button class="install-wide" data-install hidden>⬇ Install CricTrack App</button>
  </main>`,'SUPER ADMIN • SECURE CONTROL CENTRE');
  document.getElementById('logout').onclick=async()=>{await signOut(auth);home();};
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
  try{
    const [teams,tours]=await Promise.all([getCountFromServer(collection(db,'teams')),getCountFromServer(collection(db,'tournaments'))]);
    document.getElementById('teamCount').textContent=teams.data().count;
    document.getElementById('tournamentCount').textContent=tours.data().count;
  }catch{
    document.getElementById('teamCount').textContent='0';document.getElementById('tournamentCount').textContent='0';
  }
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
}

onAuthStateChanged(auth,async user=>{
  if(!user){home();return;}
  try{
    const s=await getDoc(doc(db,'admins',user.uid));
    if(s.exists()&&s.data().role==='superadmin'){adminDashboard(user);}else{await signOut(auth);home();}
  }catch{home();}
});
