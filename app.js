import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, collection, getCountFromServer, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const VERSION='2.2.0';
const fbApp=initializeApp(firebaseConfig);
const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
const root=document.getElementById('app');
let deferredInstallPrompt=null;

const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalizeId=(v='')=>v.trim().toUpperCase().replace(/\s+/g,'-').replace(/[^A-Z0-9-]/g,'');
const teamAuthEmail=id=>`${normalizeId(id).toLowerCase()}@teams.crictrack.app`;
const tournamentAuthEmail=id=>`${normalizeId(id).toLowerCase()}@tournaments.crictrack.app`;
const scorerAuthEmail=id=>`${normalizeId(id).toLowerCase()}@scorers.crictrack.app`;

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=false);});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true);});
async function installPwa(){if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;document.querySelectorAll('[data-install]').forEach(b=>b.hidden=true);}

function header(sub='TRACK EVERY RUN. CELEBRATE EVERY WIN.'){
  return `<header class="hero premium-hero ct-home-hero"><div class="stadium-glow"></div><div class="brand-row premium-brand">
    <img class="brand-app-icon" src="./icon-192.png" alt="CricTrack" />
    <div><h1 class="brand-title"><span>Cric</span><em>Track</em></h1><p class="brand-subtitle">${esc(sub)}</p></div>
    <button class="install-mini" data-install hidden aria-label="Install CricTrack">⬇ Install</button>
  </div></header>`;
}
function shell(content,sub='TRACK EVERY RUN. CELEBRATE EVERY WIN.'){
  root.innerHTML=`<div class="app-shell ct-v210">${header(sub)}${content}<footer class="footer">© 2026 CricTrack • v${VERSION}</footer></div>`;
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
}

function home(){
  shell(`<main class="ct-home-dark">
    <section class="ct-live-home ct-home-panel">
      <div class="ct-home-heading"><div><span class="ct-live-dot"></span><strong>TODAY'S LIVE MATCHES</strong></div><button id="viewLive">View All →</button></div>
      <div id="publicLiveMatches" class="ct-live-carousel"><div class="ct-live-empty">Checking live matches…</div></div>
    </section>

    <section class="ct-home-panel ct-platform-panel">
      <div class="ct-home-heading"><div>📊 <strong>PLATFORM OVERVIEW</strong></div><span class="ct-trust">Secure • Real-time • Cricket-first</span></div>
      <div class="ct-platform-grid">
        <div><b id="publicTeams">0</b><span>Teams</span></div><div><b id="publicTournaments">0</b><span>Tournaments</span></div>
        <div><b id="publicMatches">0</b><span>Matches</span></div><div><b id="publicPlayers">0</b><span>Players</span></div>
      </div>
    </section>

    <section class="ct-access-grid" aria-label="CricTrack registration and login">
      <button class="ct-access-card ct-access-team-reg" data-register="team">
        <div class="ct-access-icon">👥</div><div class="ct-access-copy"><strong>TEAM<br>REGISTRATION</strong><span>Register your cricket team and create your Team ID.</span><i>GET STARTED →</i></div>
      </button>
      <button class="ct-access-card ct-access-tournament-reg" data-register="tournament">
        <div class="ct-access-icon">🏆</div><div class="ct-access-copy"><strong>TOURNAMENT<br>REGISTRATION</strong><span>Register your tournament and create your Tournament ID.</span><i>GET STARTED →</i></div>
      </button>
      <button class="ct-access-card ct-access-team-login" data-login="team">
        <div class="ct-access-icon">👥</div><div class="ct-access-copy"><strong>TEAM<br>LOGIN</strong><span>Login to your team account.</span><i>LOGIN →</i></div>
      </button>
      <button class="ct-access-card ct-access-tournament-login" data-login="tournament">
        <div class="ct-access-icon">🏆</div><div class="ct-access-copy"><strong>TOURNAMENT<br>LOGIN</strong><span>Login to your tournament account.</span><i>LOGIN →</i></div>
      </button>
      <button class="ct-access-card ct-access-scorer-login" data-login="scorer">
        <div class="ct-access-icon">🧑‍💻</div><div class="ct-access-copy"><strong>SCORER<br>LOGIN</strong><span>Login to score assigned matches.</span><i>LOGIN →</i></div>
      </button>
      <button class="ct-access-card ct-access-admin-login" data-login="superadmin">
        <div class="ct-access-icon">🛡️</div><div class="ct-access-copy"><strong>SUPER ADMIN<br>LOGIN</strong><span>Secure platform control centre.</span><i>LOGIN →</i></div>
      </button>
    </section>

    <div class="ct-home-secure">🛡️ <span><strong>Firebase secure connection active</strong><small>Secure • Fast • Reliable</small></span></div>
    <button class="install-wide" data-install hidden>⬇ Install CricTrack App</button>
  </main>`);
  document.querySelectorAll('[data-login]').forEach(b=>b.onclick=()=>loginPage(b.dataset.login));
  document.querySelectorAll('[data-register]').forEach(b=>b.onclick=()=>registrationPage(b.dataset.register));
  document.getElementById('viewLive').onclick=()=>publicLivePage();
  document.querySelectorAll('[data-install]').forEach(b=>b.onclick=installPwa);
  loadPublicHomeData();
}

async function loadPublicHomeData(){
  try{
    const s=await getDoc(doc(db,'publicStats','overview'));
    if(s.exists()){
      const d=s.data();
      document.getElementById('publicTeams').textContent=d.teams||0;document.getElementById('publicTournaments').textContent=d.tournaments||0;
      document.getElementById('publicMatches').textContent=d.matches||0;document.getElementById('publicPlayers').textContent=d.players||0;
    }
  }catch{}
  const box=document.getElementById('publicLiveMatches');if(!box)return;
  try{
    const snap=await getDocs(collection(db,'publicMatches'));
    const live=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>(m.status||'').toLowerCase()==='live').slice(0,8);
    if(!live.length){box.innerHTML='<div class="ct-live-empty"><strong>No live matches right now</strong><span>Upcoming and live tournament scores will appear here automatically.</span></div>';return;}
    box.innerHTML=live.map(m=>`<button class="ct-live-match" data-public-match="${esc(m.id)}"><div class="ct-live-top"><span>${esc(m.groundName||m.tournamentName||'LIVE MATCH')}</span><b>LIVE</b></div><div class="ct-live-score"><strong>${esc(m.teamAName||'Team A')}</strong><em>${esc(m.score||m.teamAScore||'—')}</em><span>${esc(m.overs||'')}</span></div><div class="ct-live-vs">vs ${esc(m.teamBName||'Team B')}</div><small>${esc(m.summary||m.chaseText||'Tap to view live score')}</small></button>`).join('');
    document.querySelectorAll('[data-public-match]').forEach(b=>b.onclick=()=>publicMatchPage(b.dataset.publicMatch));
  }catch{box.innerHTML='<div class="ct-live-empty"><strong>No public live feed yet</strong><span>Live scores will appear here when tournament scoring goes live.</span></div>';}
}

async function publicLivePage(){
  shell(`<main class="dashboard premium-dashboard"><button class="back" id="backHome">← Home</button><div class="admin-chip">📡 PUBLIC LIVE SCORES</div><h2 class="section-title management-title">Live Matches</h2><p class="section-copy">Read-only public scores. Login is not required.</p><div id="allLiveList" class="team-list"><div class="loading-card">Loading live matches…</div></div></main>`,'PUBLIC • LIVE SCORES');
  document.getElementById('backHome').onclick=home;
  const list=document.getElementById('allLiveList');
  try{const snap=await getDocs(collection(db,'publicMatches'));const live=snap.docs.map(d=>({id:d.id,...d.data()})).filter(m=>(m.status||'').toLowerCase()==='live');
    list.innerHTML=live.length?live.map(m=>`<button class="team-row public-row" data-public-match="${esc(m.id)}"><div class="team-avatar">📡</div><div class="team-info"><strong>${esc(m.teamAName||'Team A')} vs ${esc(m.teamBName||'Team B')}</strong><span>${esc(m.score||m.teamAScore||'—')} • ${esc(m.overs||'')}</span><small>${esc(m.tournamentName||m.groundName||'Live match')}</small></div><span class="status-pill inactive">LIVE</span></button>`).join(''):'<div class="empty-state"><div>🏏</div><strong>No live matches right now</strong><span>Check again when matches begin.</span></div>';
    document.querySelectorAll('[data-public-match]').forEach(b=>b.onclick=()=>publicMatchPage(b.dataset.publicMatch));
  }catch{list.innerHTML='<div class="empty-state"><div>📡</div><strong>Public live feed is being prepared</strong><span>Scores will appear here when live-match publishing is enabled.</span></div>';}
}
async function publicMatchPage(id){
  shell(`<main class="dashboard premium-dashboard"><button class="back" id="backLive">← Live Matches</button><div id="publicMatchDetail" class="loading-card">Loading live score…</div></main>`,'PUBLIC • LIVE MATCH');
  document.getElementById('backLive').onclick=publicLivePage;
  try{const s=await getDoc(doc(db,'publicMatches',id));const d=s.exists()?s.data():{};document.getElementById('publicMatchDetail').innerHTML=`<div class="ct-public-score"><span class="ct-badge ct-badge-live">● LIVE</span><h2>${esc(d.teamAName||'Team A')} vs ${esc(d.teamBName||'Team B')}</h2><div class="ct-public-score-big">${esc(d.score||d.teamAScore||'—')}</div><p>${esc(d.overs||'')} ${d.target?`• Target ${esc(d.target)}`:''}</p><div class="note success-note">Read-only public live score. Authorized scorers control official scoring.</div></div>`;}catch{document.getElementById('publicMatchDetail').textContent='Live score is temporarily unavailable.';}
}

function registrationPage(role){
  if(role==='team') return teamRegistrationPage();
  return tournamentRegistrationPage();
}
function teamRegistrationPage(){
  shell(`<main class="login-wrap ct-register-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card ct-self-register" id="teamRegisterForm">
    <div class="login-badge">🏏 &nbsp;TEAM REGISTRATION</div><h2 class="login-title">Register Your Cricket Team</h2><p class="login-copy">Create your own Team ID and password. Login works immediately after successful registration.</p>
    <div class="form-grid"><div class="field full"><label>Team Name *</label><input id="regTeamName" maxlength="60" placeholder="Example: Warriors XI" required></div>
      <div class="field"><label>Team ID *</label><input id="regTeamId" maxlength="20" placeholder="WARRIORS01" required><small class="field-help">4–20 letters/numbers/hyphen. Permanent login ID.</small></div>
      <div class="field"><label>City *</label><input id="regTeamCity" maxlength="40" placeholder="Vijayawada" required></div>
      <div class="field"><label>Manager Name *</label><input id="regTeamManager" maxlength="60" required></div>
      <div class="field"><label>Mobile *</label><input id="regTeamMobile" type="tel" inputmode="tel" maxlength="15" required></div>
      <div class="field"><label>Email (optional)</label><input id="regTeamEmail" type="email" maxlength="100"></div>
      <div class="field"><label>Password *</label><input id="regTeamPassword" type="password" minlength="8" autocomplete="new-password" required></div>
      <div class="field"><label>Confirm Password *</label><input id="regTeamConfirm" type="password" minlength="8" autocomplete="new-password" required></div></div>
    <button class="login-btn" id="regTeamBtn">REGISTER TEAM</button><div class="error" id="regTeamError"></div><div class="success-box" id="regTeamSuccess"></div>
  </form></main>`,'TEAM • SELF REGISTRATION');
  document.getElementById('back').onclick=home;document.getElementById('regTeamId').oninput=e=>e.target.value=normalizeId(e.target.value);document.getElementById('teamRegisterForm').onsubmit=registerTeam;
}
async function registerTeam(e){
  e.preventDefault();const btn=document.getElementById('regTeamBtn'),err=document.getElementById('regTeamError'),ok=document.getElementById('regTeamSuccess');err.style.display='none';ok.style.display='none';
  const teamId=normalizeId(document.getElementById('regTeamId').value),password=document.getElementById('regTeamPassword').value,confirm=document.getElementById('regTeamConfirm').value;
  let created=null;
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(teamId))throw new Error('Team ID must be 4–20 letters, numbers or hyphens.');if(password.length<8)throw new Error('Password must contain at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');
    btn.disabled=true;btn.textContent='Creating secure team account…';created=(await createUserWithEmailAndPassword(auth,teamAuthEmail(teamId),password)).user;
    const data={teamId,name:document.getElementById('regTeamName').value.trim(),city:document.getElementById('regTeamCity').value.trim(),managerName:document.getElementById('regTeamManager').value.trim(),mobile:document.getElementById('regTeamMobile').value.trim(),contactEmail:document.getElementById('regTeamEmail').value.trim(),status:'active',authUid:created.uid,registrationSource:'self-service',trialMatchesAllowed:1,trialMatchesUsed:0,subscriptionStatus:'trial',planId:'team-free-trial',schemaVersion:2,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const batch=writeBatch(db);batch.set(doc(db,'teams',teamId),data);batch.set(doc(db,'users',created.uid),{uid:created.uid,role:'team',teamId,status:'active',schemaVersion:2,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await batch.commit();
    ok.innerHTML=`<strong>✅ Team registered successfully</strong><span>Team ID: <b>${esc(teamId)}</b></span><span>Your Team workspace is ready.</span><div class="ct-success-actions"><button type="button" id="saveTeamPdf">Save Registration PDF</button><button type="button" id="openTeamNow">Open Team Dashboard</button></div>`;ok.style.display='grid';
    document.getElementById('saveTeamPdf').onclick=()=>printRegistrationSummary('Team Registration',{Name:data.name,'Team ID':teamId,City:data.city,Manager:data.managerName,Mobile:data.mobile});
    document.getElementById('openTeamNow').onclick=()=>teamDashboard(created,data);
  }catch(ex){if(created){try{await deleteUser(created);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='REGISTER TEAM';}
}

function tournamentRegistrationPage(){
  shell(`<main class="login-wrap ct-register-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card ct-self-register" id="tourRegisterForm">
    <div class="login-badge">🏆 &nbsp;TOURNAMENT REGISTRATION</div><h2 class="login-title">Register Your Tournament</h2><p class="login-copy">Create your Tournament ID and password. Login works immediately after successful registration.</p>
    <div class="form-grid"><div class="field full"><label>Tournament Name *</label><input id="regTourName" maxlength="80" placeholder="Example: Summer Premier League" required></div>
      <div class="field"><label>Tournament ID *</label><input id="regTourId" maxlength="20" placeholder="SPL2026" required></div><div class="field"><label>City *</label><input id="regTourCity" maxlength="40" required></div>
      <div class="field"><label>Organizer Name *</label><input id="regOrganizer" maxlength="60" required></div><div class="field"><label>Mobile *</label><input id="regTourMobile" type="tel" inputmode="tel" maxlength="15" required></div>
      <div class="field"><label>Email (optional)</label><input id="regTourEmail" type="email" maxlength="100"></div><div class="field"><label>Start Date (optional)</label><input id="regTourStart" type="date"></div>
      <div class="field"><label>Password *</label><input id="regTourPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label>Confirm Password *</label><input id="regTourConfirm" type="password" minlength="8" autocomplete="new-password" required></div></div>
    <button class="login-btn" id="regTourBtn">REGISTER TOURNAMENT</button><div class="error" id="regTourError"></div><div class="success-box" id="regTourSuccess"></div>
  </form></main>`,'TOURNAMENT • SELF REGISTRATION');
  document.getElementById('back').onclick=home;document.getElementById('regTourId').oninput=e=>e.target.value=normalizeId(e.target.value);document.getElementById('tourRegisterForm').onsubmit=registerTournament;
}
async function registerTournament(e){
  e.preventDefault();const btn=document.getElementById('regTourBtn'),err=document.getElementById('regTourError'),ok=document.getElementById('regTourSuccess');err.style.display='none';ok.style.display='none';
  const tournamentId=normalizeId(document.getElementById('regTourId').value),password=document.getElementById('regTourPassword').value,confirm=document.getElementById('regTourConfirm').value;let created=null;
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(tournamentId))throw new Error('Tournament ID must be 4–20 letters, numbers or hyphens.');if(password.length<8)throw new Error('Password must contain at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');
    btn.disabled=true;btn.textContent='Creating tournament workspace…';created=(await createUserWithEmailAndPassword(auth,tournamentAuthEmail(tournamentId),password)).user;
    const data={tournamentId,name:document.getElementById('regTourName').value.trim(),city:document.getElementById('regTourCity').value.trim(),organizerName:document.getElementById('regOrganizer').value.trim(),mobile:document.getElementById('regTourMobile').value.trim(),contactEmail:document.getElementById('regTourEmail').value.trim(),startDate:document.getElementById('regTourStart').value||'',status:'setup',authUid:created.uid,registrationSource:'self-service',subscriptionStatus:'inactive',paymentStatus:'not_paid',canSetup:true,canStartMatch:false,planId:null,schemaVersion:2,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const batch=writeBatch(db);batch.set(doc(db,'tournaments',tournamentId),data);batch.set(doc(db,'users',created.uid),{uid:created.uid,role:'tournament',tournamentId,status:'active',schemaVersion:2,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await batch.commit();
    ok.innerHTML=`<strong>✅ Tournament registered successfully</strong><span>Tournament ID: <b>${esc(tournamentId)}</b></span><span>Your Tournament workspace is ready.</span><div class="ct-success-actions"><button type="button" id="saveTourPdf">Save Registration PDF</button><button type="button" id="openTourNow">Open Tournament Dashboard</button></div>`;ok.style.display='grid';
    document.getElementById('saveTourPdf').onclick=()=>printRegistrationSummary('Tournament Registration',{Name:data.name,'Tournament ID':tournamentId,City:data.city,Organizer:data.organizerName,Mobile:data.mobile});
    document.getElementById('openTourNow').onclick=()=>tournamentDashboard(created,data);
  }catch(ex){if(created){try{await deleteUser(created);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='REGISTER TOURNAMENT';}
}
function printRegistrationSummary(title,details){
  const rows=Object.entries(details).map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');const w=window.open('','_blank');if(!w)return;
  w.document.write(`<!doctype html><html><head><title>${esc(title)} - CricTrack</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#10233f}h1{color:#0d47a1}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #dce5ef;padding:10px;text-align:left}th{width:36%;background:#f3f7fc}.note{margin-top:20px;padding:12px;background:#eef6ff;border-left:4px solid #0d47a1}small{color:#68778d}</style></head><body><h1>CricTrack</h1><h2>${esc(title)}</h2><table>${rows}</table><div class="note">Keep your ID safely. Passwords are never printed or stored in this PDF.</div><p><small>Generated from CricTrack v${VERSION}</small></p><script>window.onload=()=>window.print();<\/script></body></html>`);w.document.close();
}

function loginPage(role){
  if(role==='team')return idPasswordLoginPage('team','🏏','Cricket Team Login','Team ID','Team ID','TEAM • SECURE ACCESS');
  if(role==='tournament')return idPasswordLoginPage('tournament','🏆','Tournament Login','Tournament ID','Tournament ID','TOURNAMENT • SECURE ACCESS');
  if(role==='scorer')return idPasswordLoginPage('scorer','🧑‍💻','Scorer Login','Scorer ID','Scorer ID','SCORER • ASSIGNED MATCH ACCESS');
  shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card" id="adminForm"><div class="login-badge">🔐 &nbsp;SUPER ADMIN</div><h2 class="login-title">Super Admin Login</h2><p class="login-copy">Secure Firebase Authentication access.</p><div class="field"><label>Admin Email</label><input id="email" type="email" autocomplete="username" required></div><div class="field"><label>Password</label><input id="password" type="password" autocomplete="current-password" required></div><label class="remember"><input id="showPw" type="checkbox"> Show password</label><button class="login-btn" id="loginBtn">Login Securely</button><div class="error" id="errorBox"></div><div class="note success-note">Firebase Authentication + Firestore Super Admin authorization.</div></form></main>`,'SUPER ADMIN • SECURE CONTROL CENTRE');
  document.getElementById('back').onclick=home;document.getElementById('showPw').onchange=e=>document.getElementById('password').type=e.target.checked?'text':'password';document.getElementById('adminForm').onsubmit=adminLogin;
}
function idPasswordLoginPage(role,icon,title,label,placeholder,sub){
  shell(`<main class="login-wrap"><button class="back" id="back">← Back to Home</button><form class="login-card ${role==='tournament'?'login-red':'login-blue'}" id="idLoginForm"><div class="login-badge">${icon} &nbsp;${esc(title.toUpperCase())}</div><h2 class="login-title">${esc(title)}</h2><p class="login-copy">Use the ${esc(label)} and password created during registration or by an authorized admin.</p><div class="field"><label>${esc(label)}</label><input id="loginId" type="text" autocapitalize="characters" placeholder="Enter ${esc(placeholder)}" required></div><div class="field"><label>Password</label><input id="idPassword" type="password" autocomplete="current-password" required></div><label class="remember"><input id="showIdPw" type="checkbox"> Show password</label><button class="login-btn" id="idLoginBtn">LOGIN</button><div class="error" id="idLoginError"></div></form></main>`,sub);
  document.getElementById('back').onclick=home;document.getElementById('loginId').oninput=e=>e.target.value=normalizeId(e.target.value);document.getElementById('showIdPw').onchange=e=>document.getElementById('idPassword').type=e.target.checked?'text':'password';document.getElementById('idLoginForm').onsubmit=e=>roleLogin(e,role);
}
async function roleLogin(e,role){
  e.preventDefault();const btn=document.getElementById('idLoginBtn'),box=document.getElementById('idLoginError'),id=normalizeId(document.getElementById('loginId').value),password=document.getElementById('idPassword').value;box.style.display='none';btn.disabled=true;btn.textContent='Checking secure access…';
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(id))throw new Error('Enter a valid ID.');const email=role==='team'?teamAuthEmail(id):role==='tournament'?tournamentAuthEmail(id):scorerAuthEmail(id);const cred=await signInWithEmailAndPassword(auth,email,password);const u=await getDoc(doc(db,'users',cred.user.uid));
    if(!u.exists()||u.data().role!==role){await signOut(auth);throw new Error(`This account is not authorized as ${role}.`);}
    if(role==='team'){const s=await getDoc(doc(db,'teams',u.data().teamId||id));if(!s.exists())throw new Error('Team record not found.');return teamDashboard(cred.user,s.data());}
    if(role==='tournament'){const s=await getDoc(doc(db,'tournaments',u.data().tournamentId||id));if(!s.exists())throw new Error('Tournament record not found.');return tournamentDashboard(cred.user,s.data());}
    return scorerDashboard(cred.user,u.data());
  }catch(ex){box.textContent=friendlyError(ex);box.style.display='block';btn.disabled=false;btn.textContent='LOGIN';}
}
async function adminLogin(e){
  e.preventDefault();const btn=document.getElementById('loginBtn'),box=document.getElementById('errorBox');box.style.display='none';btn.disabled=true;btn.textContent='Checking secure access…';
  try{const cred=await signInWithEmailAndPassword(auth,document.getElementById('email').value.trim(),document.getElementById('password').value);const a=await getDoc(doc(db,'admins',cred.user.uid));if(!a.exists()||a.data().role!=='superadmin'){await signOut(auth);throw new Error('This account is not authorized as CricTrack Super Admin.');}await adminDashboard(cred.user);}catch(ex){box.textContent=friendlyError(ex);box.style.display='block';btn.disabled=false;btn.textContent='Login Securely';}
}
function friendlyError(err){const c=err?.code||'';if(c.includes('email-already-in-use'))return 'This ID is already registered. Please choose another ID or use Login.';if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found'))return 'ID / email or password is incorrect.';if(c.includes('permission-denied'))return 'Firebase security rules need the CricTrack v2.1 registration permissions update.';if(c.includes('too-many-requests'))return 'Too many attempts. Please wait and try again.';if(c.includes('network-request-failed'))return 'Network problem. Check internet connection and try again.';return err?.message||'Operation failed. Please try again.';}

async function adminDashboard(user){
  shell(`<main class="dashboard premium-dashboard"><div class="topbar"><div><div class="admin-chip">🔐 SUPER ADMIN</div><h2 class="section-title" style="margin-top:10px">Control Centre</h2><p class="section-copy">${esc(user.email||'Authorized admin')}</p></div><button class="logout" id="logout">Logout</button></div><div class="stats"><div class="stat"><div class="num" id="teamCount">—</div><div class="label">Registered Teams</div></div><div class="stat"><div class="num" id="tournamentCount">—</div><div class="label">Registered Tournaments</div></div><div class="stat"><div class="num">0</div><div class="label">Live Matches</div></div><div class="stat"><div class="num">0</div><div class="label">System Alerts</div></div></div><div class="admin-grid"><button class="admin-action red-accent" id="manageTeams"><div>🛡️</div><strong>Cricket Teams</strong><small>View self-registrations, trial and subscription status.</small></button><button class="admin-action red-accent" id="manageTours"><div>🏆</div><strong>Tournaments</strong><small>View registrations and activation status.</small></button><button class="admin-action"><div>🏏</div><strong>Matches Control</strong><small>Platform match control centre.</small></button><button class="admin-action"><div>📡</div><strong>Live Monitoring</strong><small>Monitor active scoring sessions.</small></button><button class="admin-action"><div>🧾</div><strong>Audit Logs</strong><small>Track protected admin actions.</small></button><button class="admin-action"><div>⚙️</div><strong>System Settings</strong><small>Security and platform controls.</small></button></div><div class="status-row"><span class="dot"></span> Firebase secure connection active</div></main>`,'SUPER ADMIN • SECURE CONTROL CENTRE');
  document.getElementById('logout').onclick=async()=>{await signOut(auth);home();};document.getElementById('manageTeams').onclick=()=>teamManagement(user);document.getElementById('manageTours').onclick=()=>tournamentManagement(user);
  try{const [t,tr]=await Promise.all([getCountFromServer(collection(db,'teams')),getCountFromServer(collection(db,'tournaments'))]);document.getElementById('teamCount').textContent=t.data().count;document.getElementById('tournamentCount').textContent=tr.data().count;}catch{document.getElementById('teamCount').textContent='0';document.getElementById('tournamentCount').textContent='0';}
}
async function teamManagement(user){shell(`<main class="dashboard premium-dashboard team-management"><div class="management-head"><button class="back" id="backAdmin">← Control Centre</button><button class="primary-small" id="createTeam">+ Create Team</button></div><div class="admin-chip">🛡️ CRICKET TEAMS</div><h2 class="section-title management-title">Registered Teams</h2><p class="section-copy">Self-registered and admin-created teams appear here automatically.</p><div id="teamList" class="team-list"><div class="loading-card">Loading teams…</div></div></main>`,'SUPER ADMIN • TEAM MANAGEMENT');document.getElementById('backAdmin').onclick=()=>adminDashboard(user);document.getElementById('createTeam').onclick=()=>createTeamPage(user);await renderTeams();}
async function renderTeams(){const list=document.getElementById('teamList');try{const s=await getDocs(collection(db,'teams'));const arr=s.docs.map(d=>({id:d.id,...d.data()}));list.innerHTML=arr.length?arr.map(t=>`<article class="team-row"><div class="team-avatar">🏏</div><div class="team-info"><strong>${esc(t.name||t.id)}</strong><span>ID: ${esc(t.id)} • ${esc(t.city||'City not set')}</span><small>${esc(t.managerName||'Manager not set')} • Trial ${Number(t.trialMatchesUsed||0)}/${Number(t.trialMatchesAllowed||1)} • ${esc(t.subscriptionStatus||'trial')}</small></div><span class="status-pill ${t.status==='active'?'active':'inactive'}">${esc((t.status||'active').toUpperCase())}</span></article>`).join(''):'<div class="empty-state"><div>🏏</div><strong>No cricket teams yet</strong><span>Registrations will appear here automatically.</span></div>';}catch(ex){list.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}}
async function tournamentManagement(user){shell(`<main class="dashboard premium-dashboard team-management"><div class="management-head"><button class="back" id="backAdmin">← Control Centre</button></div><div class="admin-chip">🏆 TOURNAMENTS</div><h2 class="section-title management-title">Registered Tournaments</h2><p class="section-copy">Setup access is immediate; Match Start requires subscription activation.</p><div id="tourList" class="team-list"><div class="loading-card">Loading tournaments…</div></div></main>`,'SUPER ADMIN • TOURNAMENT MANAGEMENT');document.getElementById('backAdmin').onclick=()=>adminDashboard(user);const list=document.getElementById('tourList');try{const s=await getDocs(collection(db,'tournaments'));const arr=s.docs.map(d=>({id:d.id,...d.data()}));list.innerHTML=arr.length?arr.map(t=>`<article class="team-row"><div class="team-avatar">🏆</div><div class="team-info"><strong>${esc(t.name||t.id)}</strong><span>ID: ${esc(t.id)} • ${esc(t.city||'City not set')}</span><small>${esc(t.organizerName||'Organizer not set')} • Subscription: ${esc(t.subscriptionStatus||'inactive')}</small></div><span class="status-pill ${t.canStartMatch?'active':'inactive'}">${t.canStartMatch?'ACTIVE':'SETUP'}</span></article>`).join(''):'<div class="empty-state"><div>🏆</div><strong>No tournaments yet</strong><span>Self-registrations will appear here automatically.</span></div>';}catch(ex){list.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}}

function createTeamPage(user){shell(`<main class="login-wrap create-team-wrap"><button class="back" id="backTeams">← Team Accounts</button><form class="login-card create-team-card" id="createTeamForm"><div class="login-badge">🏏 &nbsp;CREATE TEAM</div><h2 class="login-title">New Cricket Team</h2><p class="login-copy">Admin-created teams also receive the 1-match trial by default.</p><div class="form-grid"><div class="field full"><label>Team Name *</label><input id="newTeamName" required></div><div class="field"><label>Team ID *</label><input id="newTeamId" maxlength="20" required></div><div class="field"><label>City</label><input id="newTeamCity"></div><div class="field"><label>Manager Name</label><input id="newManager"></div><div class="field"><label>Mobile</label><input id="newMobile" type="tel"></div><div class="field"><label>Password *</label><input id="newTeamPassword" type="password" minlength="8" required></div><div class="field"><label>Confirm Password *</label><input id="confirmTeamPassword" type="password" minlength="8" required></div></div><button class="login-btn" id="createTeamBtn">CREATE TEAM ACCOUNT</button><div class="error" id="createTeamError"></div><div class="success-box" id="createTeamSuccess"></div></form></main>`,'SUPER ADMIN • CREATE TEAM');document.getElementById('backTeams').onclick=()=>teamManagement(user);document.getElementById('newTeamId').oninput=e=>e.target.value=normalizeId(e.target.value);document.getElementById('createTeamForm').onsubmit=e=>createTeamAccount(e,user);}
async function createTeamAccount(e,user){e.preventDefault();const btn=document.getElementById('createTeamBtn'),err=document.getElementById('createTeamError'),ok=document.getElementById('createTeamSuccess');err.style.display='none';ok.style.display='none';const id=normalizeId(document.getElementById('newTeamId').value),password=document.getElementById('newTeamPassword').value,confirm=document.getElementById('confirmTeamPassword').value;let newUser=null;try{if(!/^[A-Z0-9-]{4,20}$/.test(id))throw new Error('Team ID must be 4–20 letters, numbers or hyphens.');if(password!==confirm)throw new Error('Passwords do not match.');btn.disabled=true;btn.textContent='Creating secure account…';const secondaryApp=getApps().find(a=>a.name==='teamProvisioner')||initializeApp(firebaseConfig,'teamProvisioner');const secondaryAuth=getAuth(secondaryApp);newUser=(await createUserWithEmailAndPassword(secondaryAuth,teamAuthEmail(id),password)).user;const data={teamId:id,name:document.getElementById('newTeamName').value.trim(),city:document.getElementById('newTeamCity').value.trim(),managerName:document.getElementById('newManager').value.trim(),mobile:document.getElementById('newMobile').value.trim(),status:'active',authUid:newUser.uid,registrationSource:'superadmin',trialMatchesAllowed:1,trialMatchesUsed:0,subscriptionStatus:'trial',planId:'team-free-trial',schemaVersion:2,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};const batch=writeBatch(db);batch.set(doc(db,'teams',id),data);batch.set(doc(db,'users',newUser.uid),{uid:newUser.uid,role:'team',teamId:id,status:'active',schemaVersion:2,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await batch.commit();await signOut(secondaryAuth);ok.innerHTML=`<strong>✅ Team created</strong><span>Team ID: ${esc(id)}</span>`;ok.style.display='grid';e.target.reset();}catch(ex){if(newUser){try{await deleteUser(newUser);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='CREATE TEAM ACCOUNT';}}

function teamDashboard(user,team){const used=Number(team.trialMatchesUsed||0),allowed=Number(team.trialMatchesAllowed??1),trialAvailable=used<allowed;const sub=team.subscriptionStatus||'trial';shell(`<main class="dashboard team-dashboard"><div class="team-top"><div><div class="team-chip">🏏 TEAM ACCOUNT</div><h2>${esc(team.name||team.teamId)}</h2><p>ID: ${esc(team.teamId||'')}</p></div><button class="logout" id="teamLogout">Logout</button></div><div class="team-welcome"><strong>WELCOME BACK</strong><h3>${esc((team.name||'TEAM').toUpperCase())}</h3><span>Team workspace • Secure access</span></div><div class="team-dashboard-grid"><button>👤<strong>Team Profile</strong></button><button>👥<strong>Players & Squad</strong></button><button id="teamCreateMatch">🗓️<strong>Create Match</strong></button><button>📡<strong>Live Scoring</strong></button><button>📋<strong>Matches</strong></button><button>📊<strong>Statistics</strong></button><button>🤝<strong>Opponents</strong></button><button>📄<strong>Reports</strong></button><button>⚙️<strong>Settings</strong></button></div><div class="phase-note">Team setup, players and match controls are available from this workspace.</div></main>`,'TEAM DASHBOARD • SECURE');document.getElementById('teamLogout').onclick=async()=>{await signOut(auth);home();};document.getElementById('teamCreateMatch').onclick=()=>alert(trialAvailable?'Free-match entitlement confirmed. Create Match module is the next coding phase.':'Trial match already used. Subscription will be required to start another match.');}
function tournamentDashboard(user,t){shell(`<main class="dashboard ct-tournament-dashboard"><div class="team-top"><div><div class="team-chip">🏆 TOURNAMENT WORKSPACE</div><h2>${esc(t.name||t.tournamentId)}</h2><p>ID: ${esc(t.tournamentId||'')}</p></div><button class="logout" id="tourLogout">Logout</button></div><div class="admin-grid ct-tour-grid"><button class="admin-action"><div>👥</div><strong>Teams</strong><small>Add / invite tournament teams.</small></button><button class="admin-action"><div>🧍</div><strong>Players</strong><small>Registration and approvals.</small></button><button class="admin-action"><div>📅</div><strong>Fixtures</strong><small>Create draft fixtures.</small></button><button class="admin-action" id="tourStartMatch"><div>📡</div><strong>Start Match</strong><small>Create or continue a tournament match.</small></button><button class="admin-action"><div>🏟️</div><strong>Venues</strong><small>Grounds and availability.</small></button><button class="admin-action"><div>⚙️</div><strong>Settings</strong><small>Rules, branding and security.</small></button></div></main>`,'TOURNAMENT • SETUP WORKSPACE');document.getElementById('tourLogout').onclick=async()=>{await signOut(auth);home();};document.getElementById('tourStartMatch').onclick=()=>alert(t.canStartMatch?'Start Match flow will be enabled in the Tournament Match phase.':'Subscription required to start tournament matches. Your setup data remains safe.');}
function scorerDashboard(user,u){shell(`<main class="dashboard premium-dashboard"><div class="topbar"><div><div class="admin-chip">🧑‍💻 SCORER</div><h2 class="section-title">My Matches</h2><p class="section-copy">Only matches assigned to this scorer will appear here.</p></div><button class="logout" id="scorerLogout">Logout</button></div><div class="empty-state"><div>🏏</div><strong>No assigned matches yet</strong><span>Tournament Admin can assign multiple scorers to different simultaneous matches.</span></div></main>`,'SCORER • ASSIGNED MATCHES');document.getElementById('scorerLogout').onclick=async()=>{await signOut(auth);home();};}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
onAuthStateChanged(auth,async user=>{if(!user){home();return;}try{const a=await getDoc(doc(db,'admins',user.uid));if(a.exists()&&a.data().role==='superadmin')return adminDashboard(user);}catch{}try{const u=await getDoc(doc(db,'users',user.uid));if(u.exists()){const d=u.data();if(d.role==='team'){const s=await getDoc(doc(db,'teams',d.teamId));if(s.exists())return teamDashboard(user,s.data());}if(d.role==='tournament'){const s=await getDoc(doc(db,'tournaments',d.tournamentId));if(s.exists())return tournamentDashboard(user,s.data());}if(d.role==='scorer')return scorerDashboard(user,d);}}catch{}await signOut(auth).catch(()=>{});home();});
