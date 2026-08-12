import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocs, collection, getCountFromServer, writeBatch, serverTimestamp, updateDoc, addDoc } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const VERSION='4.0.2';
const fbApp=initializeApp(firebaseConfig);
const auth=getAuth(fbApp);
const db=getFirestore(fbApp);
const root=document.getElementById('app');
let deferredInstallPrompt=null;
let authRoutingPaused=false;

const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const normalizeId=(v='')=>v.trim().toUpperCase().replace(/\s+/g,'-').replace(/[^A-Z0-9-]/g,'');
const teamAuthEmail=id=>`${normalizeId(id).toLowerCase()}@teams.crictrack.app`;
const tournamentAuthEmail=id=>`${normalizeId(id).toLowerCase()}@tournaments.crictrack.app`;
const scorerAuthEmail=id=>`${normalizeId(id).toLowerCase()}@scorers.crictrack.app`;


function showCricTrackIntro(){
  if(document.getElementById('ctSimpleIntro')) return;
  const intro=document.createElement('div');
  intro.id='ctSimpleIntro';
  intro.className='ct-simple-intro';
  intro.innerHTML=`
    <div class="ct-simple-logo-stage is-visible">
      <div class="ct-simple-logo-glow"></div>
      <img src="./icon-192.png?v=402" class="ct-simple-logo" alt="CricTrack">
    </div>
    <div class="ct-simple-poster-stage">
      <img src="./crictrack-quote-intro.png?v=402" class="ct-simple-poster" alt="Every run has a story. CricTrack remembers it.">
    </div>`;
  document.body.appendChild(intro);
  const logoStage=intro.querySelector('.ct-simple-logo-stage');
  const posterStage=intro.querySelector('.ct-simple-poster-stage');
  const poster=intro.querySelector('.ct-simple-poster');
  let started=false, finished=false;
  const finish=()=>{
    if(finished) return; finished=true;
    intro.classList.add('is-closing');
    setTimeout(()=>intro.remove(),700);
  };
  const revealPoster=()=>{
    if(started) return; started=true;
    logoStage.classList.remove('is-visible');
    posterStage.classList.add('is-visible');
    setTimeout(finish,3900);
  };
  // Decode/preload the approved poster first, so there is never a black gap.
  const ready=poster.decode ? poster.decode() : new Promise((resolve)=>{
    if(poster.complete) resolve(); else { poster.onload=resolve; poster.onerror=resolve; }
  });
  Promise.resolve(ready).catch(()=>{}).finally(()=>setTimeout(revealPoster,1450));
  // Safety fallback for slow/offline devices; service worker also precaches this asset.
  setTimeout(revealPoster,2600);
}
showCricTrackIntro();

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

    <section class="ct-access-grid" aria-label="CricTrack access">
      <button class="ct-access-card team" data-register="team"><div class="ct-access-icon">👥</div><div class="ct-access-copy"><h2>TEAM<br>REGISTRATION</h2><p>Register your cricket team and create your Team ID.</p></div><strong>GET STARTED →</strong></button>
      <button class="ct-access-card team" data-login="team"><div class="ct-access-icon">👤</div><div class="ct-access-copy"><h2>TEAM<br>LOGIN</h2><p>Login to your team account.</p></div><strong>LOGIN →</strong></button>
      <button class="ct-access-card tournament" data-register="tournament"><div class="ct-access-icon">🏆</div><div class="ct-access-copy"><h2>TOURNAMENT<br>REGISTRATION</h2><p>Register your tournament and create your Tournament ID.</p></div><strong>GET STARTED →</strong></button>
      <button class="ct-access-card tournament" data-login="tournament"><div class="ct-access-icon">🏆</div><div class="ct-access-copy"><h2>TOURNAMENT<br>LOGIN</h2><p>Login to your tournament account.</p></div><strong>LOGIN →</strong></button>
      <button class="ct-access-card staff" data-login="scorer"><div class="ct-access-icon">🧑‍💻</div><div class="ct-access-copy"><h2>SCORER<br>LOGIN</h2><p>Login to score assigned matches.</p></div><strong>LOGIN →</strong></button>
      <button class="ct-access-card staff" data-login="superadmin"><div class="ct-access-icon">🛡️</div><div class="ct-access-copy"><h2>SUPER ADMIN<br>LOGIN</h2><p>Secure platform control centre.</p></div><strong>LOGIN →</strong></button>
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
  let created=null;authRoutingPaused=true;
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(teamId))throw new Error('Team ID must be 4–20 letters, numbers or hyphens.');if(password.length<8)throw new Error('Password must contain at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');
    const existing=await getDoc(doc(db,'teams',teamId));if(existing.exists())throw new Error('This Team ID is already registered. Please choose another ID or use Team Login.');
    btn.disabled=true;btn.textContent='Creating secure team account…';created=(await createUserWithEmailAndPassword(auth,teamAuthEmail(teamId),password)).user;
    const data={teamId,name:document.getElementById('regTeamName').value.trim(),city:document.getElementById('regTeamCity').value.trim(),managerName:document.getElementById('regTeamManager').value.trim(),mobile:document.getElementById('regTeamMobile').value.trim(),contactEmail:document.getElementById('regTeamEmail').value.trim(),status:'active',authUid:created.uid,registrationSource:'self-service',trialMatchesAllowed:1,trialMatchesUsed:0,subscriptionStatus:'trial',planId:'team-free-trial',schemaVersion:3,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const userMap={uid:created.uid,role:'team',teamId,status:'active',schemaVersion:3,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const batch=writeBatch(db);batch.set(doc(db,'teams',teamId),data);batch.set(doc(db,'users',created.uid),userMap);await batch.commit();
    ok.innerHTML=`<strong>✅ Team registered successfully</strong><span>Team ID: <b>${esc(teamId)}</b></span><span>Your secure login is ready now.</span><div class="ct-success-actions"><button type="button" id="saveTeamPdf">Save Registration PDF</button><button type="button" id="openTeamNow">Open Team Dashboard</button></div>`;ok.style.display='grid';
    document.getElementById('saveTeamPdf').onclick=()=>printRegistrationSummary('Team Registration',{Name:data.name,'Team ID':teamId,City:data.city,Manager:data.managerName,Mobile:data.mobile});
    document.getElementById('openTeamNow').onclick=()=>teamDashboard(created,data);
  }catch(ex){if(created){try{await deleteUser(created);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}
  finally{authRoutingPaused=false;btn.disabled=false;btn.textContent='REGISTER TEAM';}
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
  const tournamentId=normalizeId(document.getElementById('regTourId').value),password=document.getElementById('regTourPassword').value,confirm=document.getElementById('regTourConfirm').value;let created=null;authRoutingPaused=true;
  try{
    if(!/^[A-Z0-9-]{4,20}$/.test(tournamentId))throw new Error('Tournament ID must be 4–20 letters, numbers or hyphens.');if(password.length<8)throw new Error('Password must contain at least 8 characters.');if(password!==confirm)throw new Error('Passwords do not match.');
    const existing=await getDoc(doc(db,'tournaments',tournamentId));if(existing.exists())throw new Error('This Tournament ID is already registered. Please choose another ID or use Tournament Login.');
    btn.disabled=true;btn.textContent='Creating tournament workspace…';created=(await createUserWithEmailAndPassword(auth,tournamentAuthEmail(tournamentId),password)).user;
    const data={tournamentId,name:document.getElementById('regTourName').value.trim(),city:document.getElementById('regTourCity').value.trim(),organizerName:document.getElementById('regOrganizer').value.trim(),mobile:document.getElementById('regTourMobile').value.trim(),contactEmail:document.getElementById('regTourEmail').value.trim(),startDate:document.getElementById('regTourStart').value||'',status:'setup',authUid:created.uid,registrationSource:'self-service',subscriptionStatus:'inactive',paymentStatus:'not_paid',canSetup:true,canStartMatch:false,planId:null,schemaVersion:3,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const userMap={uid:created.uid,role:'tournament',tournamentId,status:'active',schemaVersion:3,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const batch=writeBatch(db);batch.set(doc(db,'tournaments',tournamentId),data);batch.set(doc(db,'users',created.uid),userMap);await batch.commit();
    ok.innerHTML=`<strong>✅ Tournament registered successfully</strong><span>Tournament ID: <b>${esc(tournamentId)}</b></span><span>Your secure login is ready now.</span><div class="ct-success-actions"><button type="button" id="saveTourPdf">Save Registration PDF</button><button type="button" id="openTourNow">Open Tournament Dashboard</button></div>`;ok.style.display='grid';
    document.getElementById('saveTourPdf').onclick=()=>printRegistrationSummary('Tournament Registration',{Name:data.name,'Tournament ID':tournamentId,City:data.city,Organizer:data.organizerName,Mobile:data.mobile});
    document.getElementById('openTourNow').onclick=()=>tournamentDashboard(created,data);
  }catch(ex){if(created){try{await deleteUser(created);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}
  finally{authRoutingPaused=false;btn.disabled=false;btn.textContent='REGISTER TOURNAMENT';}
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
function friendlyError(err){const c=err?.code||'';if(c.includes('email-already-in-use'))return 'This ID is already registered. Please choose another ID or use Login.';if(c.includes('invalid-credential')||c.includes('wrong-password')||c.includes('user-not-found'))return 'ID / email or password is incorrect.';if(c.includes('permission-denied'))return 'Firebase permission denied. Please confirm the latest CricTrack Firestore Rules are published, then try again.';if(c.includes('too-many-requests'))return 'Too many attempts. Please wait and try again.';if(c.includes('network-request-failed'))return 'Network problem. Check internet connection and try again.';return err?.message||'Operation failed. Please try again.';}

async function adminDashboard(user){
  shell(`<main class="dashboard ct-dashboard-shell ct-admin-dashboard-v240"><div class="ct-dash-hero admin"><div><div class="ct-dash-role">🛡️ SUPER ADMIN</div><h2>Control Centre</h2><p>${esc(user.email||'Authorized admin')}</p></div><button class="ct-dash-logout" id="logout">Logout</button></div><div class="ct-dash-stats"><div><b id="teamCount">—</b><span>Teams</span></div><div><b id="tournamentCount">—</b><span>Tournaments</span></div><div><b>0</b><span>Live Matches</span></div><div><b>0</b><span>Alerts</span></div></div><div class="ct-dash-title"><strong>PLATFORM CONTROLS</strong><span>Secure • Real-time • Cricket-first</span></div><div class="ct-dash-grid admin-grid-v240"><button class="ct-dash-card green" id="manageTeams"><div>👥</div><strong>CRICKET TEAMS</strong><small>Registrations, accounts & status</small></button><button class="ct-dash-card purple" id="manageTours"><div>🏆</div><strong>TOURNAMENTS</strong><small>Registrations, setup & activation</small></button><button class="ct-dash-card blue"><div>🏏</div><strong>MATCHES CONTROL</strong><small>Platform match control centre</small></button><button class="ct-dash-card blue"><div>📡</div><strong>LIVE MONITORING</strong><small>Monitor active scoring sessions</small></button><button class="ct-dash-card orange"><div>🧾</div><strong>AUDIT LOGS</strong><small>Protected admin action history</small></button><button class="ct-dash-card red"><div>⚙️</div><strong>SYSTEM SETTINGS</strong><small>Security & platform controls</small></button></div><div class="ct-dash-secure">🛡️ <span><strong>Firebase secure connection active</strong><small>Secure • Fast • Reliable</small></span></div></main>`,'SUPER ADMIN • SECURE CONTROL CENTRE');
  document.getElementById('logout').onclick=async()=>{await signOut(auth);home();};document.getElementById('manageTeams').onclick=()=>teamManagement(user);document.getElementById('manageTours').onclick=()=>tournamentManagement(user);
  try{const [t,tr]=await Promise.all([getCountFromServer(collection(db,'teams')),getCountFromServer(collection(db,'tournaments'))]);document.getElementById('teamCount').textContent=t.data().count;document.getElementById('tournamentCount').textContent=tr.data().count;}catch{document.getElementById('teamCount').textContent='0';document.getElementById('tournamentCount').textContent='0';}
}
async function teamManagement(user){shell(`<main class="dashboard premium-dashboard team-management"><div class="management-head"><button class="back" id="backAdmin">← Control Centre</button><button class="primary-small" id="createTeam">+ Create Team</button></div><div class="admin-chip">🛡️ CRICKET TEAMS</div><h2 class="section-title management-title">Registered Teams</h2><p class="section-copy">Self-registered and admin-created teams appear here automatically.</p><div id="teamList" class="team-list"><div class="loading-card">Loading teams…</div></div></main>`,'SUPER ADMIN • TEAM MANAGEMENT');document.getElementById('backAdmin').onclick=()=>adminDashboard(user);document.getElementById('createTeam').onclick=()=>createTeamPage(user);await renderTeams();}
async function renderTeams(){const list=document.getElementById('teamList');try{const s=await getDocs(collection(db,'teams'));const arr=s.docs.map(d=>({id:d.id,...d.data()}));list.innerHTML=arr.length?arr.map(t=>`<article class="team-row"><div class="team-avatar">🏏</div><div class="team-info"><strong>${esc(t.name||t.id)}</strong><span>ID: ${esc(t.id)} • ${esc(t.city||'City not set')}</span><small>${esc(t.managerName||'Manager not set')} • Trial ${Number(t.trialMatchesUsed||0)}/${Number(t.trialMatchesAllowed||1)} • ${esc(t.subscriptionStatus||'trial')}</small></div><span class="status-pill ${t.status==='active'?'active':'inactive'}">${esc((t.status||'active').toUpperCase())}</span></article>`).join(''):'<div class="empty-state"><div>🏏</div><strong>No cricket teams yet</strong><span>Registrations will appear here automatically.</span></div>';}catch(ex){list.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}}
async function tournamentManagement(user){shell(`<main class="dashboard premium-dashboard team-management"><div class="management-head"><button class="back" id="backAdmin">← Control Centre</button></div><div class="admin-chip">🏆 TOURNAMENTS</div><h2 class="section-title management-title">Registered Tournaments</h2><p class="section-copy">Setup access is immediate; Match Start requires subscription activation.</p><div id="tourList" class="team-list"><div class="loading-card">Loading tournaments…</div></div></main>`,'SUPER ADMIN • TOURNAMENT MANAGEMENT');document.getElementById('backAdmin').onclick=()=>adminDashboard(user);const list=document.getElementById('tourList');try{const s=await getDocs(collection(db,'tournaments'));const arr=s.docs.map(d=>({id:d.id,...d.data()}));list.innerHTML=arr.length?arr.map(t=>`<article class="team-row"><div class="team-avatar">🏆</div><div class="team-info"><strong>${esc(t.name||t.id)}</strong><span>ID: ${esc(t.id)} • ${esc(t.city||'City not set')}</span><small>${esc(t.organizerName||'Organizer not set')} • Subscription: ${esc(t.subscriptionStatus||'inactive')}</small></div><span class="status-pill ${t.canStartMatch?'active':'inactive'}">${t.canStartMatch?'ACTIVE':'SETUP'}</span></article>`).join(''):'<div class="empty-state"><div>🏆</div><strong>No tournaments yet</strong><span>Self-registrations will appear here automatically.</span></div>';}catch(ex){list.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}}

function createTeamPage(user){shell(`<main class="login-wrap create-team-wrap"><button class="back" id="backTeams">← Team Accounts</button><form class="login-card create-team-card" id="createTeamForm"><div class="login-badge">🏏 &nbsp;CREATE TEAM</div><h2 class="login-title">New Cricket Team</h2><p class="login-copy">Admin-created teams also receive the 1-match trial by default.</p><div class="form-grid"><div class="field full"><label>Team Name *</label><input id="newTeamName" required></div><div class="field"><label>Team ID *</label><input id="newTeamId" maxlength="20" required></div><div class="field"><label>City</label><input id="newTeamCity"></div><div class="field"><label>Manager Name</label><input id="newManager"></div><div class="field"><label>Mobile</label><input id="newMobile" type="tel"></div><div class="field"><label>Password *</label><input id="newTeamPassword" type="password" minlength="8" required></div><div class="field"><label>Confirm Password *</label><input id="confirmTeamPassword" type="password" minlength="8" required></div></div><button class="login-btn" id="createTeamBtn">CREATE TEAM ACCOUNT</button><div class="error" id="createTeamError"></div><div class="success-box" id="createTeamSuccess"></div></form></main>`,'SUPER ADMIN • CREATE TEAM');document.getElementById('backTeams').onclick=()=>teamManagement(user);document.getElementById('newTeamId').oninput=e=>e.target.value=normalizeId(e.target.value);document.getElementById('createTeamForm').onsubmit=e=>createTeamAccount(e,user);}
async function createTeamAccount(e,user){e.preventDefault();const btn=document.getElementById('createTeamBtn'),err=document.getElementById('createTeamError'),ok=document.getElementById('createTeamSuccess');err.style.display='none';ok.style.display='none';const id=normalizeId(document.getElementById('newTeamId').value),password=document.getElementById('newTeamPassword').value,confirm=document.getElementById('confirmTeamPassword').value;let newUser=null;try{if(!/^[A-Z0-9-]{4,20}$/.test(id))throw new Error('Team ID must be 4–20 letters, numbers or hyphens.');if(password!==confirm)throw new Error('Passwords do not match.');btn.disabled=true;btn.textContent='Creating secure account…';const secondaryApp=getApps().find(a=>a.name==='teamProvisioner')||initializeApp(firebaseConfig,'teamProvisioner');const secondaryAuth=getAuth(secondaryApp);newUser=(await createUserWithEmailAndPassword(secondaryAuth,teamAuthEmail(id),password)).user;const data={teamId:id,name:document.getElementById('newTeamName').value.trim(),city:document.getElementById('newTeamCity').value.trim(),managerName:document.getElementById('newManager').value.trim(),mobile:document.getElementById('newMobile').value.trim(),status:'active',authUid:newUser.uid,registrationSource:'superadmin',trialMatchesAllowed:1,trialMatchesUsed:0,subscriptionStatus:'trial',planId:'team-free-trial',schemaVersion:2,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};const batch=writeBatch(db);batch.set(doc(db,'teams',id),data);batch.set(doc(db,'users',newUser.uid),{uid:newUser.uid,role:'team',teamId:id,status:'active',schemaVersion:2,createdBy:user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});await batch.commit();await signOut(secondaryAuth);ok.innerHTML=`<strong>✅ Team created</strong><span>Team ID: ${esc(id)}</span>`;ok.style.display='grid';e.target.reset();}catch(ex){if(newUser){try{await deleteUser(newUser);}catch{}}err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='CREATE TEAM ACCOUNT';}}

function teamDashboard(user,team){
  const used=Number(team.trialMatchesUsed||0),allowed=Number(team.trialMatchesAllowed??1),trialAvailable=used<allowed;
  const teamName=team.name||team.teamId||'TEAM';
  root.innerHTML=`<div class="app-shell ct-v250 ct-team-app">
    <header class="hero premium-hero ct-team-name-hero"><div class="stadium-glow"></div><div class="brand-row premium-brand">
      <img class="brand-app-icon" src="./icon-192.png" alt="${esc(teamName)}" />
      <div><h1 class="brand-title ct-team-brand-title"><span>${esc(teamName)}</span></h1><p class="brand-subtitle">TEAM DASHBOARD • SECURE</p><small class="ct-team-id-head">Team ID: ${esc(team.teamId||'')}</small></div>
      <button class="ct-dash-logout ct-team-head-logout" id="teamLogout">Logout</button>
    </div></header>
    <main class="dashboard ct-dashboard-shell ct-team-dashboard-v250">
      <div class="ct-dash-stats team-stats ct-clean-stats"><div><b>ACTIVE</b><span>Account</span></div><div><b>SYNCED</b><span>Cloud</span></div><div><b>READY</b><span>Match</span></div><div><b>SECURE</b><span>Protected</span></div></div>
      <div class="ct-dash-title"><strong>${esc(teamName).toUpperCase()} DASHBOARD</strong><span>Manage • Score • Analyze</span></div>
      <div class="ct-dash-grid team-grid-v250">
        <button class="ct-dash-card blue" id="teamProfile"><strong>TEAM PROFILE</strong><small>Identity, logo & team details</small></button>
        <button class="ct-dash-card blue" id="teamSquad"><strong>PLAYERS & SQUAD</strong><small>Players, roles & Playing XI</small></button>
        <button class="ct-dash-card blue" id="teamCreateMatch"><strong>CREATE MATCH</strong><small>Opponent, venue & match rules</small></button>
        <button class="ct-dash-card blue" id="teamLiveScoring"><strong>LIVE SCORING</strong><small>Fast ball-by-ball scoring</small></button>
        <button class="ct-dash-card blue" id="teamMatches"><strong>MATCHES</strong><small>Upcoming, live & completed</small></button>
        <button class="ct-dash-card blue" id="teamStatistics"><strong>STATISTICS</strong><small>Team & player performance</small></button>
        <button class="ct-dash-card blue" id="teamOpponents"><strong>OPPONENTS</strong><small>Head-to-head & history</small></button>
        <button class="ct-dash-card blue" id="teamReports"><strong>REPORTS</strong><small>PDF, Excel & share reports</small></button>
        <button class="ct-dash-card blue wide" id="teamSettings"><strong>TEAM SETTINGS</strong><small>Profile, security & preferences</small></button>
      </div>
      <div class="ct-dash-secure ct-clean-secure"><span><strong>Team workspace securely connected</strong><small>Real-time • Cloud synchronized</small></span></div>
    </main><footer class="footer">© 2026 CricTrack • v${VERSION}</footer></div>`;
  document.getElementById('teamLogout').onclick=async()=>{await signOut(auth);home();};
  document.getElementById('teamCreateMatch').onclick=()=>teamCreateMatchPage(user,team);
  document.getElementById('teamProfile').onclick=()=>teamProfilePage(user,team);
  document.getElementById('teamSquad').onclick=()=>teamSquadPage(user,team);
  document.getElementById('teamLiveScoring').onclick=()=>teamLiveScoringPage(user,team);
  document.getElementById('teamMatches').onclick=()=>teamMatchesPage(user,team);
  document.getElementById('teamStatistics').onclick=()=>teamStatisticsPage(user,team);
  document.getElementById('teamOpponents').onclick=()=>teamOpponentsPage(user,team);
  document.getElementById('teamReports').onclick=()=>teamReportsPage(user,team);
  document.getElementById('teamSettings').onclick=()=>alert('TEAM SETTINGS module is next.');
}


function teamModuleShell(team,title,subtitle,body){
  const teamName=team.name||team.teamId||'TEAM';
  root.innerHTML=`<div class="app-shell ct-team-module-app">
    <header class="ct-team-module-head">
      <button class="ct-module-back" id="moduleBack">← Dashboard</button>
      <div class="ct-module-team"><img src="${esc(team.logoDataUrl||'./icon-192.png')}" alt="${esc(teamName)}"><div><strong>${esc(teamName)}</strong><span>Team ID: ${esc(team.teamId||'')}</span></div></div>
    </header>
    <main class="ct-team-module"><div class="ct-module-title"><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div>${body}</main>
    <footer class="footer">© 2026 CricTrack • v${VERSION}</footer>
  </div>`;
  document.getElementById('moduleBack').onclick=()=>teamDashboard(auth.currentUser,team);
}

function fileToCompressedDataUrl(file){
  return new Promise((resolve,reject)=>{
    if(!file){resolve('');return;}
    if(!file.type.startsWith('image/')){reject(new Error('Please select an image file.'));return;}
    if(file.size>5*1024*1024){reject(new Error('Image must be below 5 MB.'));return;}
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Could not read image.'));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('Invalid image file.'));
      img.onload=()=>{
        const max=420,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);
        let q=.82,data=canvas.toDataURL('image/jpeg',q);
        while(data.length>170000&&q>.45){q-=.08;data=canvas.toDataURL('image/jpeg',q);}
        if(data.length>220000){reject(new Error('Image is still too large. Please choose a smaller image.'));return;}
        resolve(data);
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function teamProfilePage(user,team){
  const logo=team.logoDataUrl||'./icon-192.png';
  teamModuleShell(team,'TEAM PROFILE','Identity, branding and team contact details',`
    <section class="ct-profile-hero-card"><img id="teamLogoPreview" src="${esc(logo)}" alt="Team logo"><div><h3>${esc(team.name||team.teamId)}</h3><p>${esc(team.city||'City not set')} • ${esc(team.homeGround||'Home ground not set')}</p><span>Permanent Team ID: ${esc(team.teamId||'')}</span></div></section>
    <form id="teamProfileForm" class="ct-premium-form">
      <div class="ct-form-section"><h3>TEAM IDENTITY</h3><div class="ct-form-grid">
        <label class="wide">Team Logo<input id="profileLogo" type="file" accept="image/*"><small>JPG/PNG • automatically optimized</small></label>
        <label>Team Name *<input id="profileName" required value="${esc(team.name||'')}"></label>
        <label>Short Name<input id="profileShortName" maxlength="8" value="${esc(team.shortName||'')}"></label>
        <label>City<input id="profileCity" value="${esc(team.city||'')}"></label>
        <label>Established Year<input id="profileYear" inputmode="numeric" maxlength="4" value="${esc(team.establishedYear||'')}"></label>
        <label class="wide">Team Tagline<input id="profileTagline" maxlength="60" value="${esc(team.tagline||'')}"></label>
      </div></div>
      <div class="ct-form-section"><h3>TEAM MANAGEMENT</h3><div class="ct-form-grid">
        <label>Manager Name<input id="profileManager" value="${esc(team.managerName||'')}"></label>
        <label>Mobile<input id="profileMobile" type="tel" value="${esc(team.mobile||'')}"></label>
        <label>Captain<input id="profileCaptain" value="${esc(team.captainName||'')}"></label>
        <label>Vice Captain<input id="profileViceCaptain" value="${esc(team.viceCaptainName||'')}"></label>
        <label class="wide">Home Ground<input id="profileGround" value="${esc(team.homeGround||'')}"></label>
      </div></div>
      <div class="ct-form-section"><h3>BRANDING</h3><div class="ct-form-grid">
        <label>Primary Colour<input id="profilePrimary" type="color" value="${esc(team.primaryColor||'#0d47a1')}"></label>
        <label>Secondary Colour<input id="profileSecondary" type="color" value="${esc(team.secondaryColor||'#ffffff')}"></label>
      </div></div>
      <button class="ct-save-primary" id="profileSave">SAVE TEAM PROFILE</button>
      <div class="error" id="profileError"></div><div class="success-box" id="profileSuccess"></div>
    </form>`);
  document.getElementById('profileLogo').onchange=async e=>{try{const d=await fileToCompressedDataUrl(e.target.files?.[0]);if(d)document.getElementById('teamLogoPreview').src=d;}catch(ex){alert(ex.message);e.target.value='';}};
  document.getElementById('teamProfileForm').onsubmit=async e=>{
    e.preventDefault();const btn=document.getElementById('profileSave'),err=document.getElementById('profileError'),ok=document.getElementById('profileSuccess');err.style.display='none';ok.style.display='none';
    try{btn.disabled=true;btn.textContent='SAVING…';let logoDataUrl=team.logoDataUrl||'';const f=document.getElementById('profileLogo').files?.[0];if(f)logoDataUrl=await fileToCompressedDataUrl(f);
      const updates={name:document.getElementById('profileName').value.trim(),shortName:document.getElementById('profileShortName').value.trim().toUpperCase(),city:document.getElementById('profileCity').value.trim(),establishedYear:document.getElementById('profileYear').value.trim(),tagline:document.getElementById('profileTagline').value.trim(),managerName:document.getElementById('profileManager').value.trim(),mobile:document.getElementById('profileMobile').value.trim(),captainName:document.getElementById('profileCaptain').value.trim(),viceCaptainName:document.getElementById('profileViceCaptain').value.trim(),homeGround:document.getElementById('profileGround').value.trim(),primaryColor:document.getElementById('profilePrimary').value,secondaryColor:document.getElementById('profileSecondary').value,logoDataUrl,updatedAt:serverTimestamp()};
      if(!updates.name)throw new Error('Team Name is required.');await updateDoc(doc(db,'teams',team.teamId),updates);Object.assign(team,updates);ok.innerHTML='<strong>Team profile saved successfully</strong><span>Your dashboard will use the updated team identity.</span>';ok.style.display='grid';
    }catch(ex){err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='SAVE TEAM PROFILE';}
  };
}

async function teamSquadPage(user,team){
  teamModuleShell(team,'PLAYERS & SQUAD','Manage players, roles and your Playing XI',`
    <section class="ct-squad-summary"><div><b id="squadTotal">0</b><span>Total Players</span></div><div><b id="squadActive">0</b><span>Active</span></div><div><b id="squadXI">0</b><span>Playing XI</span></div><div><b id="squadBench">0</b><span>Bench</span></div></section>
    <div class="ct-squad-actions"><div class="ct-squad-primary-actions"><button class="ct-save-primary" id="addPlayerBtn">+ ADD PLAYER</button><button class="ct-save-primary alt" id="quickAddBtn">QUICK ADD SQUAD</button><button class="ct-save-primary alt" id="importPlayerBtn">IMPORT PLAYER ID</button></div><div class="ct-squad-filter"><button data-squad-filter="all" class="active">ALL</button><button data-squad-filter="xi">PLAYING XI</button><button data-squad-filter="active">ACTIVE</button><button data-squad-filter="inactive">INACTIVE</button></div></div>
    <div id="quickAddWrap" class="ct-player-form-wrap" hidden>
      <form id="quickAddForm" class="ct-premium-form compact">
        <h3 class="ct-quick-title">QUICK ADD SQUAD</h3><p class="ct-quick-copy">Paste player names in any simple format. Names only are enough. Line breaks, commas, or Name (Role) are supported.</p>
        <textarea id="quickAddText" class="ct-quick-text" rows="11" placeholder="Rohit Sharma\nVirat Kohli\nHardik Pandya (All-rounder)\nJasprit Bumrah (Bowler)"></textarea>
        <label class="ct-check-label ct-quick-xi"><input id="quickSelectXI" type="checkbox" checked> Select first 11 active players as Playing XI</label>
        <div class="ct-form-buttons"><button type="button" class="ct-secondary-btn" id="cancelQuickAdd">CANCEL</button><button class="ct-save-primary" id="saveQuickAdd">ADD SQUAD</button></div><div class="error" id="quickAddError"></div>
      </form>
    </div>
    <div id="importPlayerWrap" class="ct-player-form-wrap" hidden>
      <form id="importPlayerForm" class="ct-premium-form compact"><h3 class="ct-quick-title">IMPORT CRICTRACK PLAYER ID</h3><p class="ct-quick-copy">Paste a shared Player ID. Name, jersey, role, styles and photo will be copied automatically.</p><label>Player ID<input id="importPlayerCode" placeholder="TEAMID:PLAYER_DOCUMENT_ID" required></label><div class="ct-form-buttons"><button type="button" class="ct-secondary-btn" id="cancelImportPlayer">CANCEL</button><button class="ct-save-primary" id="saveImportPlayer">IMPORT PLAYER</button></div><div class="error" id="importPlayerError"></div></form>
    </div>
    <div id="playerFormWrap" class="ct-player-form-wrap" hidden>
      <form id="playerForm" class="ct-premium-form compact"><div class="ct-form-grid">
        <label>Player Name *<input id="playerName" required></label><label>Jersey No.<input id="playerJersey" inputmode="numeric" maxlength="3"></label><label class="wide">Player Photo<input id="playerPhoto" type="file" accept="image/*"><small>Optional • used in Player Cards, Certificates and PDFs</small></label>
        <label>Role<select id="playerRole"><option>Batter</option><option>Bowler</option><option>All-rounder</option><option>Wicketkeeper</option><option>WK-Batter</option></select></label>
        <label>Batting Style<select id="playerBat"><option>Right Hand</option><option>Left Hand</option></select></label>
        <label>Bowling Style<select id="playerBowl"><option>None</option><option>Right Arm Fast</option><option>Right Arm Medium</option><option>Left Arm Fast</option><option>Left Arm Medium</option><option>Right Arm Off Spin</option><option>Right Arm Leg Spin</option><option>Left Arm Orthodox</option><option>Left Arm Wrist Spin</option></select></label>
        <label class="ct-check-label"><input id="playerCaptain" type="checkbox"> Captain</label><label class="ct-check-label"><input id="playerVC" type="checkbox"> Vice Captain</label><label class="ct-check-label"><input id="playerWK" type="checkbox"> Wicketkeeper</label>
      </div><div class="ct-form-buttons"><button type="button" class="ct-secondary-btn" id="cancelPlayer">CANCEL</button><button class="ct-save-primary" id="savePlayer">SAVE PLAYER</button></div><div class="error" id="playerError"></div></form>
    </div>
    <div id="squadList" class="ct-squad-list"><div class="loading-card">Loading squad…</div></div>`);
  let players=[],filter='all',editingPlayerId='';
  const render=()=>{
    const visible=players.filter(p=>filter==='all'||(filter==='xi'&&p.playingXI)||(filter==='active'&&p.active!==false)||(filter==='inactive'&&p.active===false));
    document.getElementById('squadTotal').textContent=players.length;document.getElementById('squadActive').textContent=players.filter(p=>p.active!==false).length;document.getElementById('squadXI').textContent=players.filter(p=>p.playingXI).length;document.getElementById('squadBench').textContent=players.filter(p=>p.active!==false&&!p.playingXI).length;
    document.getElementById('squadList').innerHTML=visible.length?visible.map(p=>`<article class="ct-player-row" data-player="${esc(p.id)}"><div class="ct-player-avatar">${p.photoDataUrl?`<img src="${esc(p.photoDataUrl)}" alt="${esc(p.name)}">`:`<b>${esc((p.name||'P').slice(0,1).toUpperCase())}</b>`}</div><div class="ct-player-number">${esc(p.jerseyNo||'—')}</div><div class="ct-player-main"><strong>${esc(p.name)}</strong><span>${esc(p.role||'Player')} • ${esc(p.battingStyle||'')}</span><small>${p.isCaptain?'CAPTAIN • ':''}${p.isViceCaptain?'VICE CAPTAIN • ':''}${p.isWicketKeeper?'WICKETKEEPER • ':''}${p.active===false?'INACTIVE':'ACTIVE'}</small><small class="ct-player-share-id">PLAYER ID: ${esc(team.teamId)}:${esc(p.id)}</small></div><div class="ct-player-controls"><button data-edit="${esc(p.id)}">EDIT</button><button data-copy-id="${esc(p.id)}">COPY ID</button><button data-photo="${esc(p.id)}">PHOTO</button><button data-xi="${esc(p.id)}" class="${p.playingXI?'on':''}">${p.playingXI?'XI ✓':'ADD XI'}</button><button data-active="${esc(p.id)}">${p.active===false?'ACTIVATE':'INACTIVATE'}</button></div></article>`).join(''):'<div class="empty-state"><strong>No players in this view</strong><span>Add your first player to build the squad.</span></div>';
    document.querySelectorAll('[data-copy-id]').forEach(b=>b.onclick=async()=>{const code=`${team.teamId}:${b.dataset.copyId}`;try{await navigator.clipboard.writeText(code);alert(`Player ID copied: ${code}`);}catch{prompt('Copy Player ID',code);}});
    document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const p=players.find(x=>x.id===b.dataset.edit);if(!p)return;editingPlayerId=p.id;document.getElementById('playerFormWrap').hidden=false;document.getElementById('playerName').value=p.name||'';document.getElementById('playerJersey').value=p.jerseyNo||'';document.getElementById('playerRole').value=p.role||'Batter';document.getElementById('playerBat').value=p.battingStyle||'Right Hand';document.getElementById('playerBowl').value=p.bowlingStyle||'None';document.getElementById('playerCaptain').checked=!!p.isCaptain;document.getElementById('playerVC').checked=!!p.isViceCaptain;document.getElementById('playerWK').checked=!!p.isWicketKeeper;document.getElementById('savePlayer').textContent='UPDATE PLAYER';document.getElementById('playerName').focus();});
    document.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>{const id=b.dataset.photo,p=players.find(x=>x.id===id);if(!p)return;const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return;const data=await fileToCompressedDataUrl(file);await updateDoc(doc(db,'teams',team.teamId,'players',id),{photoDataUrl:data,updatedAt:serverTimestamp()});p.photoDataUrl=data;render();alert('Player photo saved. It will be used in premium PDFs.');}catch(ex){alert(friendlyError(ex));}};input.click();});
    document.querySelectorAll('[data-xi]').forEach(b=>b.onclick=async()=>{const id=b.dataset.xi,p=players.find(x=>x.id===id);if(!p)return;if(!p.playingXI&&players.filter(x=>x.playingXI).length>=11){alert('Playing XI already has 11 players. Remove one player first.');return;}try{await updateDoc(doc(db,'teams',team.teamId,'players',id),{playingXI:!p.playingXI,updatedAt:serverTimestamp()});p.playingXI=!p.playingXI;render();}catch(ex){alert(friendlyError(ex));}});
    document.querySelectorAll('[data-active]').forEach(b=>b.onclick=async()=>{const id=b.dataset.active,p=players.find(x=>x.id===id);if(!p)return;try{const active=p.active===false;await updateDoc(doc(db,'teams',team.teamId,'players',id),{active,playingXI:active?p.playingXI:false,updatedAt:serverTimestamp()});p.active=active;if(!active)p.playingXI=false;render();}catch(ex){alert(friendlyError(ex));}});
  };
  async function load(){try{const snap=await getDocs(collection(db,'teams',team.teamId,'players'));players=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(a.jerseyNo)||999)-(Number(b.jerseyNo)||999)||String(a.name).localeCompare(String(b.name)));render();}catch(ex){document.getElementById('squadList').innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}}
  document.getElementById('addPlayerBtn').onclick=()=>{editingPlayerId='';document.getElementById('playerForm').reset();document.getElementById('savePlayer').textContent='SAVE PLAYER';document.getElementById('playerFormWrap').hidden=false;document.getElementById('playerName').focus();};document.getElementById('cancelPlayer').onclick=()=>{editingPlayerId='';document.getElementById('playerFormWrap').hidden=true;document.getElementById('playerForm').reset();document.getElementById('savePlayer').textContent='SAVE PLAYER';};
  document.getElementById('quickAddBtn').onclick=()=>{document.getElementById('quickAddWrap').hidden=false;document.getElementById('quickAddText').focus();};
  document.getElementById('cancelQuickAdd').onclick=()=>{document.getElementById('quickAddWrap').hidden=true;document.getElementById('quickAddForm').reset();document.getElementById('quickSelectXI').checked=true;};
  document.getElementById('importPlayerBtn').onclick=()=>{document.getElementById('importPlayerWrap').hidden=false;document.getElementById('importPlayerCode').focus();};document.getElementById('cancelImportPlayer').onclick=()=>{document.getElementById('importPlayerWrap').hidden=true;document.getElementById('importPlayerForm').reset();};
  document.getElementById('importPlayerForm').onsubmit=async e=>{e.preventDefault();const err=document.getElementById('importPlayerError'),btn=document.getElementById('saveImportPlayer');err.style.display='none';try{btn.disabled=true;btn.textContent='IMPORTING…';const raw=document.getElementById('importPlayerCode').value.trim();const parts=raw.split(':');if(parts.length!==2)throw new Error('Player ID format must be TEAMID:PLAYER_ID.');const sourceTeam=normalizeId(parts[0]),sourceId=parts[1].trim();if(!sourceTeam||!sourceId)throw new Error('Invalid Player ID.');const snap=await getDoc(doc(db,'teams',sourceTeam,'players',sourceId));if(!snap.exists())throw new Error('Shared player profile not found. Ask the player/team to open EDIT and save once to enable sharing.');const src=snap.data();const data={name:src.name||'Player',jerseyNo:src.jerseyNo||'',role:src.role||'Player',battingStyle:src.battingStyle||'Right Hand',bowlingStyle:src.bowlingStyle||'None',isCaptain:false,isViceCaptain:false,isWicketKeeper:!!src.isWicketKeeper,photoDataUrl:src.photoDataUrl||'',active:true,playingXI:false,shareProfile:true,importedFrom:raw,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};const ref=await addDoc(collection(db,'teams',team.teamId,'players'),data);players.push({id:ref.id,...data});render();document.getElementById('importPlayerWrap').hidden=true;document.getElementById('importPlayerForm').reset();alert(`${data.name} imported successfully.`);}catch(ex){err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='IMPORT PLAYER';}};
  document.getElementById('quickAddForm').onsubmit=async e=>{e.preventDefault();const btn=document.getElementById('saveQuickAdd'),err=document.getElementById('quickAddError');err.style.display='none';try{const raw=document.getElementById('quickAddText').value.trim();if(!raw)throw new Error('Enter at least one player.');const roleWords=/(batter|batsman|bowler|all[- ]?rounder|wicket[- ]?keeper|keeper|wk|captain|vice captain|vc)/i;let chunks=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean);if(chunks.length===1){const commaParts=raw.split(/[,;|]+/).map(x=>x.trim()).filter(Boolean);const looksStructured=commaParts.length>=3&&commaParts.some(x=>/^\d{1,3}$/.test(x)||roleWords.test(x));if(!looksStructured&&commaParts.length>1)chunks=commaParts;}if(chunks.length===1){chunks=raw.split(/(?<=\))(?=[A-Z])|(?<=[a-z])(?=[A-Z][a-z]+(?:\s|$))/).map(x=>x.trim()).filter(Boolean);}if(chunks.length>25)throw new Error('Add maximum 25 players at a time.');const existingJerseys=new Set(players.map(p=>String(p.jerseyNo||'').trim()).filter(Boolean));let nextAuto=1;const autoJersey=()=>{while(existingJerseys.has(String(nextAuto)))nextAuto++;const j=String(nextAuto++);existingJerseys.add(j);return j;};const parsed=chunks.map((line,i)=>{let name=line,jersey='',role='Player',isCaptain=false,isViceCaptain=false,isWicketKeeper=false;const csv=line.split(',').map(x=>x.trim()).filter(Boolean);if(csv.length>=2&&(/^\d{1,3}$/.test(csv[1])||csv.length>=3)){name=csv[0];if(/^\d{1,3}$/.test(csv[1]))jersey=csv[1];role=csv[2]||(!jersey?csv[1]:'Player')||'Player';}const tags=[...name.matchAll(/\(([^)]+)\)/g)].map(m=>m[1]).join(' ');name=name.replace(/\s*\([^)]+\)\s*/g,' ').replace(/\s+/g,' ').trim();const meta=(tags+' '+role).trim();if(/all[- ]?rounder/i.test(meta))role='All-rounder';else if(/bowler/i.test(meta))role='Bowler';else if(/wicket[- ]?keeper|keeper|\bwk\b/i.test(meta)){role='Wicket-keeper';isWicketKeeper=true;}else if(/batter|batsman/i.test(meta))role='Batter';if(/vice captain|\bvc\b/i.test(meta))isViceCaptain=true;else if(/captain/i.test(meta))isCaptain=true;if(!name)throw new Error(`Player name missing near item ${i+1}.`);if(jersey&&existingJerseys.has(jersey))throw new Error(`Jersey ${jersey} already exists.`);if(jersey)existingJerseys.add(jersey);else jersey=autoJersey();return{name,jerseyNo:jersey,role,battingStyle:'Right Hand',bowlingStyle:'None',isCaptain,isViceCaptain,isWicketKeeper,active:true};});btn.disabled=true;btn.textContent='ADDING…';const selectXI=document.getElementById('quickSelectXI').checked;let xiCount=players.filter(p=>p.playingXI).length;const batch=writeBatch(db);const added=[];for(const d of parsed){const ref=doc(collection(db,'teams',team.teamId,'players'));const playingXI=selectXI&&xiCount<11;if(playingXI)xiCount++;const data={...d,playingXI,shareProfile:true,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};batch.set(ref,data);added.push({id:ref.id,...data});}await batch.commit();players.push(...added);players.sort((a,b)=>(Number(a.jerseyNo)||999)-(Number(b.jerseyNo)||999)||String(a.name).localeCompare(String(b.name)));document.getElementById('quickAddForm').reset();document.getElementById('quickSelectXI').checked=true;document.getElementById('quickAddWrap').hidden=true;render();}catch(ex){err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='ADD SQUAD';}};
  document.querySelectorAll('[data-squad-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.squadFilter;document.querySelectorAll('[data-squad-filter]').forEach(x=>x.classList.toggle('active',x===b));render();});
  document.getElementById('playerForm').onsubmit=async e=>{e.preventDefault();const btn=document.getElementById('savePlayer'),err=document.getElementById('playerError');err.style.display='none';try{btn.disabled=true;btn.textContent='SAVING…';const name=document.getElementById('playerName').value.trim();if(!name)throw new Error('Player Name is required.');let photoDataUrl='';const pf=document.getElementById('playerPhoto').files?.[0];if(pf)photoDataUrl=await fileToCompressedDataUrl(pf);const base={name,jerseyNo:document.getElementById('playerJersey').value.trim(),role:document.getElementById('playerRole').value,battingStyle:document.getElementById('playerBat').value,bowlingStyle:document.getElementById('playerBowl').value,isCaptain:document.getElementById('playerCaptain').checked,isViceCaptain:document.getElementById('playerVC').checked,isWicketKeeper:document.getElementById('playerWK').checked,shareProfile:true,updatedAt:serverTimestamp()};if(editingPlayerId){const p=players.find(x=>x.id===editingPlayerId);const updates={...base,photoDataUrl:photoDataUrl||p?.photoDataUrl||''};await updateDoc(doc(db,'teams',team.teamId,'players',editingPlayerId),updates);Object.assign(p,updates);editingPlayerId='';}else{const data={...base,photoDataUrl,active:true,playingXI:false,createdAt:serverTimestamp()};const ref=await addDoc(collection(db,'teams',team.teamId,'players'),data);players.push({id:ref.id,...data});}players.sort((a,b)=>(Number(a.jerseyNo)||999)-(Number(b.jerseyNo)||999)||String(a.name).localeCompare(String(b.name)));document.getElementById('playerForm').reset();document.getElementById('playerFormWrap').hidden=true;document.getElementById('savePlayer').textContent='SAVE PLAYER';render();}catch(ex){err.textContent=friendlyError(ex);err.style.display='block';}finally{btn.disabled=false;btn.textContent='SAVE PLAYER';}};
  await load();
}


async function teamCreateMatchPage(user,team){
  // Development/testing mode: unlimited team matches until subscriptions are enabled for production.
  const trialAvailable=true;
  let players=[];
  try{const snap=await getDocs(collection(db,'teams',team.teamId,'players'));players=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.active&&p.playingXI);}catch{}
  let opponentTeams=[];try{const os=await getDocs(collection(db,'teams',team.teamId,'opponents'));opponentTeams=os.docs.map(d=>({id:d.id,...d.data()}));}catch{}
  const xi=players.map(p=>`<span class="ct-xi-chip">${esc(p.name)}${p.jerseyNo?' #'+esc(p.jerseyNo):''}</span>`).join('');
  teamModuleShell(team,'CREATE MATCH','Set the opponent, venue, overs, Playing XI and toss before starting the match.',`
    <section class="ct-match-form-card">
      <div class="ct-match-access ok"><strong>UNLIMITED TEST MATCHES ACTIVE</strong><span>Development mode • Create and score any number of matches. Subscription limits will be enabled only after CricTrack is fully tested.</span></div>
      <form id="createMatchForm">
        <div class="ct-match-grid">
          <label><span>Saved Opponent</span><select id="matchOpponentSaved"><option value="">Manual / New Opponent</option>${opponentTeams.map(o=>`<option value="${esc(o.id)}">${esc(o.name||'Opponent')}</option>`).join('')}</select></label><label><span>Opponent Team *</span><input id="matchOpponent" maxlength="80" required placeholder="Opponent team name"></label>
          <label><span>Venue *</span><input id="matchVenue" maxlength="100" required placeholder="Ground / venue"></label>
          <label><span>Match Date *</span><input id="matchDate" type="date" required></label>
          <label><span>Start Time *</span><input id="matchTime" type="time" required></label>
          <label><span>Match Type *</span><select id="matchType"><option>Limited Overs</option><option>T20</option><option>T10</option><option>ODI</option><option>Practice Match</option></select></label>
          <label><span>Overs *</span><input id="matchOvers" type="number" min="1" max="100" value="20" required></label>
        </div>
        <div class="ct-match-section"><h3>PLAYING XI <b>${players.length}/11</b></h3><div class="ct-xi-list">${xi||'<span class="ct-xi-empty">No Playing XI selected. Go to Players & Squad first.</span>'}</div></div>
        <div class="ct-match-section"><h3>TOSS</h3><div class="ct-match-grid">
          <label><span>Toss Winner</span><select id="tossWinner"><option value="">Not decided yet</option><option value="self">${esc(team.name||team.teamId)}</option><option value="opponent">Opponent</option></select></label>
          <label><span>Decision</span><select id="tossDecision"><option value="">Select after toss</option><option value="bat">Bat</option><option value="bowl">Bowl</option></select></label>
        </div></div>
        <label class="ct-match-notes"><span>Match Notes</span><textarea id="matchNotes" maxlength="300" placeholder="Optional match rules or notes"></textarea></label>
        <div id="matchError" class="error"></div><div id="matchSuccess" class="success-box"></div>
        <button class="ct-start-match" id="startMatchBtn" ${trialAvailable?'':'disabled'}>START MATCH</button>
      </form>
    </section>`);
  const today=new Date();document.getElementById('matchDate').value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;document.getElementById('matchOpponentSaved').onchange=e=>{const o=opponentTeams.find(x=>x.id===e.target.value);if(o)document.getElementById('matchOpponent').value=o.name||'';};
  document.getElementById('createMatchForm').onsubmit=async e=>{
    e.preventDefault();const err=document.getElementById('matchError'),ok=document.getElementById('matchSuccess'),btn=document.getElementById('startMatchBtn');err.style.display='none';ok.style.display='none';
    try{
      if(players.length!==11)throw new Error(`Select exactly 11 Playing XI players first. Current selection: ${players.length}/11.`);
      const opponent=document.getElementById('matchOpponent').value.trim(),venue=document.getElementById('matchVenue').value.trim(),date=document.getElementById('matchDate').value,time=document.getElementById('matchTime').value,overs=Number(document.getElementById('matchOvers').value);
      if(!opponent||!venue||!date||!time)throw new Error('Complete all required match details.');if(!Number.isInteger(overs)||overs<1||overs>100)throw new Error('Overs must be between 1 and 100.');
      btn.disabled=true;btn.textContent='STARTING MATCH…';
      const matchRef=doc(collection(db,'teams',team.teamId,'matches'));const batch=writeBatch(db);
      batch.set(matchRef,{matchId:matchRef.id,ownerTeamId:team.teamId,teamAId:team.teamId,teamAName:team.name||team.teamId,teamBName:opponent,venue,date,startTime:time,matchType:document.getElementById('matchType').value,overs,status:'live',innings:1,tossWinner:document.getElementById('tossWinner').value,tossDecision:document.getElementById('tossDecision').value,notes:document.getElementById('matchNotes').value.trim(),playingXI:players.map(p=>({id:p.id,name:p.name,jerseyNo:p.jerseyNo||'',role:p.role||'',photoDataUrl:p.photoDataUrl||''})),opponentRoster:(opponentTeams.find(o=>String(o.name||'').toLowerCase()===opponent.toLowerCase())?.players||[]).slice(0,25),createdBy:auth.currentUser.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
      await batch.commit();
      ok.innerHTML='<strong>Match started successfully</strong><br>Opening Live Scoring…';ok.style.display='block';btn.textContent='MATCH STARTED';setTimeout(()=>teamLiveScoringPage(user,team,matchRef.id),500);
    }catch(ex){err.textContent=friendlyError(ex);err.style.display='block';btn.disabled=false;btn.textContent='START MATCH';}
  };
}

async function teamMatchesPage(user,team){
  teamModuleShell(team,'MATCHES','Live and completed matches with saved results and scorecards.',`<div class="ct-match-history-tools"><button data-filter="all" class="active">ALL</button><button data-filter="live">LIVE</button><button data-filter="completed">COMPLETED</button></div><div id="teamMatchSummary" class="ct-match-summary"></div><div id="teamMatchList" class="ct-match-history"><div class="loading-card">Loading matches…</div></div>`);
  const box=document.getElementById('teamMatchList');
  try{
    const snap=await getDocs(collection(db,'teams',team.teamId,'matches'));
    const arr=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const summary=document.getElementById('teamMatchSummary');const liveCount=arr.filter(m=>m.status==='live').length,doneCount=arr.filter(m=>m.status==='completed').length;summary.innerHTML=`<div><b>${arr.length}</b><span>Total</span></div><div><b>${liveCount}</b><span>Live</span></div><div><b>${doneCount}</b><span>Completed</span></div>`;
    const renderList=(filter='all')=>{const view=filter==='all'?arr:arr.filter(m=>m.status===filter);box.innerHTML=view.length?view.map(m=>{const inn=m.inningsData||[];const a=inn[0],b=inn[1];return `<article class="ct-history-card"><div><span class="ct-history-status ${m.status==='completed'?'done':'live'}">${esc((m.status||'live').toUpperCase())}</span><h3>${esc(m.teamAName||team.name)} vs ${esc(m.teamBName||'Opponent')}</h3><p>${esc(m.date||'')} • ${esc(m.venue||'')} • ${esc(m.overs||'')} overs</p>${a?`<strong>${esc(a.battingTeamName)} ${a.runs}/${a.wickets} (${Math.floor((a.legalBalls||0)/6)}.${(a.legalBalls||0)%6})</strong>`:''}${b?`<strong>${esc(b.battingTeamName)} ${b.runs}/${b.wickets} (${Math.floor((b.legalBalls||0)/6)}.${(b.legalBalls||0)%6})</strong>`:''}<small>${esc(m.resultText||'')}</small></div><button data-open-match="${esc(m.id)}">${m.status==='completed'?'VIEW SCORECARD':'OPEN LIVE'}</button></article>`}).join(''):'<div class="empty-state"><strong>No matches here</strong><span>No matches match this filter.</span></div>';box.querySelectorAll('[data-open-match]').forEach(b=>b.onclick=()=>teamLiveScoringPage(user,team,b.dataset.openMatch));};
    renderList();document.querySelectorAll('[data-filter]').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');renderList(btn.dataset.filter);});
  }catch(ex){box.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}
}


async function teamStatisticsPage(user,team){
  teamModuleShell(team,'STATISTICS','Completed-match performance, batting leaders and bowling leaders.',`<div id="teamStatsBody" class="ct-stats-page"><div class="loading-card">Calculating team statistics…</div></div>`);
  const box=document.getElementById('teamStatsBody');
  try{
    const snap=await getDocs(collection(db,'teams',team.teamId,'matches'));
    const matches=snap.docs.map(d=>({id:d.id,...d.data()}));
    const completed=matches.filter(m=>m.status==='completed');
    let wins=0,losses=0,ties=0,runsFor=0,runsAgainst=0,wickets=0;
    const batting={},bowling={};
    for(const m of completed){
      const result=String(m.resultText||'');
      if(/tied/i.test(result))ties++;
      else if(result.toLowerCase().startsWith(String(team.name||team.teamId).toLowerCase()+ ' won'))wins++;
      else if(/ won by /i.test(result))losses++;
      for(const inn of (m.inningsData||[])){
        if(inn.battingTeamId===team.teamId){
          runsFor+=Number(inn.runs||0);
          Object.values(inn.batters||{}).forEach(b=>{const key=b.name||'Player';const x=batting[key]||(batting[key]={name:key,matches:0,runs:0,balls:0,fours:0,sixes:0,outs:0,high:0});x.matches++;x.runs+=Number(b.runs||0);x.balls+=Number(b.balls||0);x.fours+=Number(b.fours||0);x.sixes+=Number(b.sixes||0);x.outs+=b.out?1:0;x.high=Math.max(x.high,Number(b.runs||0));});
        }else{
          runsAgainst+=Number(inn.runs||0);
          Object.values(inn.bowlers||{}).forEach(b=>{const key=b.name||'Player';const x=bowling[key]||(bowling[key]={name:key,matches:0,balls:0,runs:0,wickets:0,wides:0,noBalls:0,bestW:0,bestR:9999});x.matches++;x.balls+=Number(b.balls||0);x.runs+=Number(b.runs||0);x.wickets+=Number(b.wickets||0);x.wides+=Number(b.wides||0);x.noBalls+=Number(b.noBalls||0);if(Number(b.wickets||0)>x.bestW||(Number(b.wickets||0)===x.bestW&&Number(b.runs||0)<x.bestR)){x.bestW=Number(b.wickets||0);x.bestR=Number(b.runs||0);}});
          wickets+=Object.values(inn.bowlers||{}).reduce((a,b)=>a+Number(b.wickets||0),0);
        }
      }
    }
    const batLeaders=Object.values(batting).sort((a,b)=>b.runs-a.runs).slice(0,10);
    const bowlLeaders=Object.values(bowling).sort((a,b)=>b.wickets-a.wickets||a.runs-b.runs).slice(0,10);
    const winPct=completed.length?((wins/completed.length)*100).toFixed(1):'0.0';
    box.innerHTML=`
      <div class="ct-stats-summary">
        <div><b>${completed.length}</b><span>Completed</span></div><div><b>${wins}</b><span>Wins</span></div><div><b>${losses}</b><span>Losses</span></div><div><b>${ties}</b><span>Ties</span></div><div><b>${winPct}%</b><span>Win Rate</span></div><div><b>${wickets}</b><span>Wickets</span></div>
      </div>
      <div class="ct-stats-panels"><section><h3>TEAM PERFORMANCE</h3><div class="ct-stat-line"><span>Runs Scored</span><b>${runsFor}</b></div><div class="ct-stat-line"><span>Runs Conceded</span><b>${runsAgainst}</b></div><div class="ct-stat-line"><span>Net Runs</span><b>${runsFor-runsAgainst}</b></div><div class="ct-stat-line"><span>Matches Stored</span><b>${matches.length}</b></div></section>
      <section><h3>BATTING LEADERS</h3>${batLeaders.length?batLeaders.map((x,i)=>`<div class="ct-leader-row"><b>${i+1}</b><span><strong>${esc(x.name)}</strong><small>${x.runs} runs • HS ${x.high} • SR ${x.balls?((x.runs/x.balls)*100).toFixed(1):'0.0'} • 4s ${x.fours} • 6s ${x.sixes}</small></span></div>`).join(''):'<p class="ct-no-data">No completed batting data yet.</p>'}</section>
      <section><h3>BOWLING LEADERS</h3>${bowlLeaders.length?bowlLeaders.map((x,i)=>`<div class="ct-leader-row"><b>${i+1}</b><span><strong>${esc(x.name)}</strong><small>${x.wickets} wickets • Best ${x.bestW}/${x.bestR===9999?0:x.bestR} • Eco ${x.balls?((x.runs*6)/x.balls).toFixed(2):'0.00'} • WD ${x.wides} • NB ${x.noBalls}</small></span></div>`).join(''):'<p class="ct-no-data">No completed bowling data yet.</p>'}</section></div>`;
  }catch(ex){box.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}
}


async function teamOpponentsPage(user,team){
  teamModuleShell(team,'OPPONENTS','Head-to-head records plus reusable opponent team rosters.',`<div class="ct-opponent-toolbar"><button class="ct-save-primary" id="manageOpponents">MANAGE OPPONENT ROSTERS</button></div><section id="opponentManager" class="ct-player-form-wrap" hidden><form id="opponentForm" class="ct-premium-form compact"><h3>OPPONENT TEAM LIBRARY</h3><div class="ct-form-grid"><label>Saved Team<select id="oppSaved"><option value="">New opponent</option></select></label><label>Opponent Team Name *<input id="oppName" required></label></div><div class="ct-opponent-player-add"><h4>ADD PLAYER</h4><div class="ct-form-grid"><label>Name<input id="oppPlayerName"></label><label>Jersey No.<input id="oppPlayerJersey" maxlength="3"></label><label>Role<select id="oppPlayerRole"><option>Batter</option><option>Bowler</option><option>All-rounder</option><option>Wicketkeeper</option><option>WK-Batter</option></select></label><label class="wide">Photo<input id="oppPlayerPhoto" type="file" accept="image/*"></label></div><button type="button" class="ct-secondary-btn" id="oppAddPlayer">ADD TO ROSTER</button><div class="ct-import-row"><input id="oppImportId" placeholder="CricTrack Player ID e.g. TEAMID:PLAYER_ID"><button type="button" class="ct-secondary-btn" id="oppImportPlayer">IMPORT ID</button></div></div><div id="oppRosterPreview" class="ct-opponent-roster-preview"></div><div class="ct-form-buttons"><button type="button" class="ct-secondary-btn" id="oppCancel">CANCEL</button><button class="ct-save-primary" id="oppSave">SAVE OPPONENT</button></div><div id="oppError" class="error"></div></form></section><div id="opponentBody" class="ct-opponents-page"><div class="loading-card">Building opponent records…</div></div>`);
  const box=document.getElementById('opponentBody'),manager=document.getElementById('opponentManager');let libraries=[],editingId='',draft=[];
  const renderDraft=()=>{document.getElementById('oppRosterPreview').innerHTML=draft.length?draft.map((p,i)=>`<article class="ct-mini-player"><div class="ct-player-avatar">${p.photoDataUrl?`<img src="${esc(p.photoDataUrl)}">`:`<b>${esc((p.name||'P')[0])}</b>`}</div><div><strong>${esc(p.name)}</strong><span>#${esc(p.jerseyNo||'—')} • ${esc(p.role||'Player')}</span></div><button type="button" data-remove-opp="${i}">REMOVE</button></article>`).join(''):'<div class="empty-state"><span>No opponent players added yet. Add manually or import a CricTrack Player ID.</span></div>';document.querySelectorAll('[data-remove-opp]').forEach(b=>b.onclick=()=>{draft.splice(Number(b.dataset.removeOpp),1);renderDraft();});};
  const loadLibraries=async()=>{const snap=await getDocs(collection(db,'teams',team.teamId,'opponents'));libraries=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));document.getElementById('oppSaved').innerHTML='<option value="">New opponent</option>'+libraries.map(o=>`<option value="${esc(o.id)}">${esc(o.name||'Opponent')}</option>`).join('');};
  const loadH2H=async()=>{try{const snap=await getDocs(collection(db,'teams',team.teamId,'matches'));const map={};snap.docs.map(d=>d.data()).filter(m=>m.status==='completed').forEach(m=>{const n=m.teamBName||'Opponent',x=map[n]||(map[n]={name:n,played:0,wins:0,losses:0,ties:0,runsFor:0,runsAgainst:0,last:m.date||''});x.played++;const inn=m.inningsData||[];const a=inn.find(i=>i.battingTeamId===team.teamId)||inn[0],b=inn.find(i=>i.battingTeamId!==team.teamId)||inn[1];x.runsFor+=a?.runs||0;x.runsAgainst+=b?.runs||0;const r=m.resultText||'';if(/tie/i.test(r))x.ties++;else if(r.toLowerCase().includes(String(team.name||team.teamId).toLowerCase()))x.wins++;else x.losses++;});const arr=Object.values(map);box.innerHTML=arr.length?arr.map(x=>`<article class="ct-opponent-card"><div><h3>${esc(x.name)}</h3><span>${x.played} matches • Last ${esc(x.last||'—')}</span></div><div class="ct-h2h-numbers"><b>${x.wins}<small>W</small></b><b>${x.losses}<small>L</small></b><b>${x.ties}<small>T</small></b></div><div class="ct-h2h-footer"><span>Runs ${x.runsFor}–${x.runsAgainst}</span><strong>${x.played?((x.wins/x.played)*100).toFixed(0):0}% win rate</strong></div></article>`).join(''):'<div class="empty-state"><strong>No head-to-head data yet</strong><span>Completed matches will automatically build opponent records.</span></div>';}catch(ex){box.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}};
  await Promise.all([loadLibraries(),loadH2H()]);
  document.getElementById('manageOpponents').onclick=()=>{manager.hidden=false;renderDraft();};document.getElementById('oppCancel').onclick=()=>{manager.hidden=true;};
  document.getElementById('oppSaved').onchange=e=>{const o=libraries.find(x=>x.id===e.target.value);editingId=o?.id||'';document.getElementById('oppName').value=o?.name||'';draft=JSON.parse(JSON.stringify(o?.players||[]));renderDraft();};
  document.getElementById('oppAddPlayer').onclick=async()=>{const name=document.getElementById('oppPlayerName').value.trim();if(!name){alert('Enter player name.');return;}let photoDataUrl='';const f=document.getElementById('oppPlayerPhoto').files?.[0];if(f)photoDataUrl=await fileToCompressedDataUrl(f);draft.push({id:`manual-${Date.now()}`,name,jerseyNo:document.getElementById('oppPlayerJersey').value.trim(),role:document.getElementById('oppPlayerRole').value,photoDataUrl});document.getElementById('oppPlayerName').value='';document.getElementById('oppPlayerJersey').value='';document.getElementById('oppPlayerPhoto').value='';renderDraft();};
  document.getElementById('oppImportPlayer').onclick=async()=>{try{const raw=document.getElementById('oppImportId').value.trim(),parts=raw.split(':');if(parts.length!==2)throw new Error('Use TEAMID:PLAYER_ID format.');const snap=await getDoc(doc(db,'teams',normalizeId(parts[0]),'players',parts[1].trim()));if(!snap.exists())throw new Error('Shared Player ID not found.');const p=snap.data();draft.push({id:`import-${Date.now()}`,sourcePlayerId:raw,name:p.name||'Player',jerseyNo:p.jerseyNo||'',role:p.role||'Player',battingStyle:p.battingStyle||'',bowlingStyle:p.bowlingStyle||'',photoDataUrl:p.photoDataUrl||''});document.getElementById('oppImportId').value='';renderDraft();}catch(ex){alert(friendlyError(ex));}};
  document.getElementById('opponentForm').onsubmit=async e=>{e.preventDefault();const err=document.getElementById('oppError');err.style.display='none';try{const name=document.getElementById('oppName').value.trim();if(!name)throw new Error('Opponent Team Name is required.');const data={name,players:draft.slice(0,25),updatedAt:serverTimestamp()};if(editingId)await updateDoc(doc(db,'teams',team.teamId,'opponents',editingId),data);else await addDoc(collection(db,'teams',team.teamId,'opponents'),{...data,createdAt:serverTimestamp()});await loadLibraries();editingId='';draft=[];document.getElementById('opponentForm').reset();renderDraft();manager.hidden=true;alert('Opponent team roster saved. It will auto-load in Create Match.');}catch(ex){err.textContent=friendlyError(ex);err.style.display='block';}};
}

async function teamReportsPage(user,team){
  teamModuleShell(team,'REPORTS','Premium PDF promotion suite, player cards, match scorecards, squad books and performance reports.',`<section class="ct-report-hero v360"><div><strong>CRICTRACK PREMIUM PDF STUDIO</strong><span>Team • Match • Player • Certificates • Awards • Squad • H2H</span></div><b>V3.7</b></section><div id="reportSummary" class="ct-match-summary"></div><section class="ct-pdf-pickers"><label><span>MATCH FOR PDF</span><select id="pdfMatchSelect"></select></label><label><span>PLAYER FOR PDF</span><select id="pdfPlayerSelect"></select></label><label><span>ACHIEVEMENT TYPE</span><select id="pdfAchievementType"><option>Performance Excellence</option><option>Batting Excellence</option><option>Bowling Excellence</option><option>All-Round Excellence</option><option>Captaincy Recognition</option><option>Fielding Excellence</option></select></label></section><div class="ct-pdf-action-grid"><button id="pdfSeason"><b>TEAM SEASON BOOK</b><span>Complete performance report</span></button><button id="pdfMatch"><b>MATCH SCORECARD</b><span>Full innings scorecard</span></button><button id="pdfMatchShare"><b>MATCH SHARE CARD</b><span>One-page result poster</span></button><button id="pdfPlayer"><b>PLAYER CAREER PDF</b><span>Detailed player performance</span></button><button id="pdfPlayerCard"><b>PLAYER SHARE CARD</b><span>One-page player poster</span></button><button id="pdfSquad"><b>SQUAD BOOK PDF</b><span>Team roster & roles</span></button><button id="pdfH2H"><b>HEAD-TO-HEAD PDF</b><span>Opponent records</span></button><button id="pdfBat"><b>BATTING LEADERS PDF</b><span>Runs, SR, HS, boundaries</span></button><button id="pdfBowl"><b>BOWLING LEADERS PDF</b><span>Wickets, best, economy</span></button><button id="pdfPOM"><b>PLAYER OF THE MATCH</b><span>Premium award certificate</span></button><button id="pdfAchievement"><b>PLAYER ACHIEVEMENT</b><span>Shareable achievement certificate</span></button><button id="pdfPlayerMatch"><b>PLAYER MATCH REPORT</b><span>Selected match performance</span></button><button id="pdfWinner"><b>MATCH WINNER CERTIFICATE</b><span>Team victory certificate</span></button><button id="pdfXI"><b>PLAYING XI SHEET</b><span>Official match squad PDF</span></button><button id="pdfSeasonAwards"><b>SEASON AWARDS</b><span>Top performers & honours</span></button><button id="pdfTeamAchievement"><b>TEAM ACHIEVEMENT</b><span>Season performance certificate</span></button></div><div class="ct-report-actions v360"><button id="downloadMatchesCsv">MATCH CSV</button><button id="downloadPlayersCsv">PLAYER STATS CSV</button><button id="copyReportSummary">COPY SUMMARY</button></div><div id="reportPreview" class="ct-report-preview v360"><div class="loading-card">Building PDF studio…</div></div>`);
  const preview=document.getElementById('reportPreview');
  try{
    const [matchSnap,playerSnap]=await Promise.all([getDocs(collection(db,'teams',team.teamId,'matches')),getDocs(collection(db,'teams',team.teamId,'players'))]);
    const matches=matchSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    const done=matches.filter(m=>m.status==='completed');
    const roster=playerSnap.docs.map(d=>({id:d.id,...d.data()}));
    const teamName=team.name||team.teamId||'Team';
    const teamKey=String(teamName).toLowerCase();
    const oversText=balls=>`${Math.floor(Number(balls||0)/6)}.${Number(balls||0)%6}`;
    const escCsv=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const downloadBlob=(name,text,type)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1200);};
    const fmtDate=v=>v||'Date not set';
    const logoHtml=()=>team.logoDataUrl?`<img class="crest" src="${esc(team.logoDataUrl)}" alt="${esc(teamName)} logo">`:`<div class="crest fallback">${esc((team.shortName||teamName).slice(0,3).toUpperCase())}</div>`;
    const playerPortrait=(profile,name,cls='player-photo')=>profile?.photoDataUrl?`<img class="${cls}" src="${esc(profile.photoDataUrl)}" alt="${esc(name)}">`:`<div class="${cls} fallback">${esc((name||'P').slice(0,2).toUpperCase())}</div>`;

    let wins=0,losses=0,ties=0,runsFor=0,runsAgainst=0,totalTeamWkts=0,highestTeamScore=0,lowestTeamScore=null;
    const batting={},bowling={},opponents={},recent=[];
    for(const m of done){
      const result=String(m.resultText||'');let outcome='—';
      if(/tied/i.test(result)){ties++;outcome='T';}
      else if(result.toLowerCase().startsWith(teamKey+' won')){wins++;outcome='W';}
      else if(/ won by /i.test(result)){losses++;outcome='L';}
      recent.push(outcome);
      const oppName=m.teamBName||'Opponent',k=oppName.toLowerCase();
      const ox=opponents[k]||(opponents[k]={name:oppName,played:0,wins:0,losses:0,ties:0,runsFor:0,runsAgainst:0});ox.played++;
      if(outcome==='W')ox.wins++;else if(outcome==='L')ox.losses++;else if(outcome==='T')ox.ties++;
      for(const inn of (m.inningsData||[])){
        if(inn.battingTeamId===team.teamId){
          const rr=Number(inn.runs||0);runsFor+=rr;ox.runsFor+=rr;highestTeamScore=Math.max(highestTeamScore,rr);lowestTeamScore=lowestTeamScore===null?rr:Math.min(lowestTeamScore,rr);
          Object.values(inn.batters||{}).forEach(b=>{const key=b.name||'Player';const x=batting[key]||(batting[key]={name:key,innings:0,runs:0,balls:0,fours:0,sixes:0,outs:0,high:0});x.innings++;x.runs+=Number(b.runs||0);x.balls+=Number(b.balls||0);x.fours+=Number(b.fours||0);x.sixes+=Number(b.sixes||0);x.outs+=b.out?1:0;x.high=Math.max(x.high,Number(b.runs||0));});
        }else{
          const rr=Number(inn.runs||0);runsAgainst+=rr;ox.runsAgainst+=rr;
          Object.values(inn.bowlers||{}).forEach(b=>{const key=b.name||'Player';const x=bowling[key]||(bowling[key]={name:key,innings:0,balls:0,runs:0,wickets:0,wides:0,noBalls:0,bestW:0,bestR:9999});x.innings++;x.balls+=Number(b.balls||0);x.runs+=Number(b.runs||0);x.wickets+=Number(b.wickets||0);x.wides+=Number(b.wides||0);x.noBalls+=Number(b.noBalls||0);if(Number(b.wickets||0)>x.bestW||(Number(b.wickets||0)===x.bestW&&Number(b.runs||0)<x.bestR)){x.bestW=Number(b.wickets||0);x.bestR=Number(b.runs||0);}});
          totalTeamWkts+=Object.values(inn.bowlers||{}).reduce((a,b)=>a+Number(b.wickets||0),0);
        }
      }
    }
    const batLeaders=Object.values(batting).sort((a,b)=>b.runs-a.runs||b.high-a.high);
    const bowlLeaders=Object.values(bowling).sort((a,b)=>b.wickets-a.wickets||a.runs-b.runs);
    const oppLeaders=Object.values(opponents).sort((a,b)=>b.played-a.played||b.wins-a.wins);
    const winRate=done.length?((wins/done.length)*100):0;
    const avgRuns=done.length?(runsFor/done.length):0;
    const form=recent.slice(0,5);
    const playerNames=[...new Set([...roster.map(p=>p.name).filter(Boolean),...Object.keys(batting),...Object.keys(bowling)])].sort((a,b)=>a.localeCompare(b));
    const matchSelect=document.getElementById('pdfMatchSelect'),playerSelect=document.getElementById('pdfPlayerSelect');
    matchSelect.innerHTML=done.length?done.map(m=>`<option value="${esc(m.id)}">${esc(m.teamAName||teamName)} vs ${esc(m.teamBName||'Opponent')} • ${esc(m.date||'')}</option>`).join(''):'<option value="">No completed matches</option>';
    playerSelect.innerHTML=playerNames.length?playerNames.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join(''):'<option value="">No players</option>';
    document.getElementById('reportSummary').innerHTML=`<div><b>${done.length}</b><span>Completed</span></div><div><b>${wins}</b><span>Wins</span></div><div><b>${playerNames.length}</b><span>Players</span></div>`;

    const matchRows=matches.map(m=>{const inn=m.inningsData||[];const scores=inn.map(i=>`${i.battingTeamName||'Team'} ${i.runs||0}/${i.wickets||0} (${oversText(i.legalBalls)})`).join(' • ');return {id:m.id,date:m.date||'',opponent:m.teamBName||'',venue:m.venue||'',overs:m.overs||'',status:m.status||'',scores,result:m.resultText||''};});
    preview.innerHTML=`<section class="ct-report-preview-head"><div><span>PREMIUM PDF PROMOTION SUITE</span><h3>${esc(teamName)}</h3><p>16 premium PDF formats • Player photos • Certificates • Match promotion</p></div><div class="ct-report-form">${form.length?form.map(x=>`<b class="${x==='W'?'win':x==='L'?'loss':'tie'}">${x}</b>`).join(''):'<small>No form</small>'}</div></section><div class="ct-report-kpis"><div><b>${runsFor}</b><span>Runs</span></div><div><b>${totalTeamWkts}</b><span>Wickets</span></div><div><b>${highestTeamScore}</b><span>High Score</span></div><div><b>${winRate.toFixed(0)}%</b><span>Win Rate</span></div></div><div class="ct-pdf-catalog"><article><b>TEAM</b><span>Season book + H2H + squad</span></article><article><b>MATCH</b><span>Full scorecard + share card</span></article><article><b>PLAYER</b><span>Career report + share poster</span></article><article><b>LEADERS</b><span>Batting + bowling rankings</span></article></div><section class="ct-report-section"><h4>WHY THESE PDFs MATTER</h4><p class="ct-report-note">Every PDF uses live CricTrack data, team branding and share-friendly layouts. Players can save their profile cards, teams can circulate match results, and organizers can publish professional scorecards.</p></section>`;

    const commonCss=(landscape=false)=>`<style>@page{size:A4 ${landscape?'landscape':'portrait'};margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#eef4fb;color:#10233f;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.pdf-page{width:${landscape?'297mm':'210mm'};min-height:${landscape?'210mm':'297mm'};padding:15mm 14mm 14mm;background:#fff;position:relative;page-break-after:always;overflow:hidden}.pdf-page:last-child{page-break-after:auto}.cover{background:radial-gradient(circle at 82% 6%,#167bff 0,#0b4fb8 18%,#071a3a 48%,#041226 100%);color:#fff}.cover:after{content:"";position:absolute;right:-34mm;top:-30mm;width:115mm;height:115mm;border:1px solid rgba(94,190,255,.25);border-radius:50%;box-shadow:0 0 70px rgba(0,117,255,.22)}.brandbar{display:flex;align-items:center;gap:14px}.crest{width:23mm;height:23mm;object-fit:cover;border-radius:7mm;border:1px solid rgba(255,255,255,.45);background:#08245a}.crest.fallback{display:grid;place-items:center;font-weight:900;font-size:8mm;color:#fff}.brandtag{font-size:3.2mm;letter-spacing:1.3px;font-weight:900;color:#66c7ff}.hero-title{font-size:12mm;line-height:1;margin:3mm 0 2mm;font-weight:900}.hero-sub{font-size:4.2mm;color:#cfe6ff}.hero-rule{height:1px;background:linear-gradient(90deg,#5dc6ff,transparent);margin:8mm 0}.result-pill{display:inline-block;background:#11a864;color:#fff;padding:3mm 5mm;border-radius:999px;font-weight:900;font-size:4mm}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:8mm 0}.kpi{border:1px solid #d4e2f1;border-radius:5mm;padding:5mm;text-align:center;background:linear-gradient(180deg,#fff,#f6faff)}.kpi b{font-size:8mm;color:#0874df;display:block}.kpi span{font-size:2.8mm;font-weight:900;letter-spacing:.5px;color:#5d7390;text-transform:uppercase}.dark-kpis .kpi{background:rgba(3,20,46,.58);border-color:rgba(103,196,255,.35)}.dark-kpis .kpi b{color:#fff}.dark-kpis .kpi span{color:#9ed8ff}.section-head{display:flex;justify-content:space-between;align-items:end;border-bottom:1px solid #c7d8e9;padding-bottom:3mm;margin:2mm 0 5mm}.section-head h2{margin:0;font-size:6.2mm;color:#084f98}.section-head span{font-size:3mm;color:#6d8198}.panel{border:1px solid #d3e1ef;border-radius:5mm;padding:5mm;background:#fff;margin-bottom:5mm;break-inside:avoid}.panel.dark{background:#061a35;color:#fff;border-color:#1e69ae}.two{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.three{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.table{width:100%;border-collapse:collapse;font-size:3mm}.table th{background:#082f61;color:#fff;padding:3mm 2mm;text-align:left}.table td{padding:3mm 2mm;border-bottom:1px solid #dbe6f1;vertical-align:top}.table tr{break-inside:avoid}.table td.num,.table th.num{text-align:right}.small{font-size:2.8mm;color:#657b95}.statline{display:flex;justify-content:space-between;gap:5mm;padding:2.3mm 0;border-bottom:1px solid #e2eaf3}.statline:last-child{border-bottom:0}.statline b{color:#0a5fb5}.footer{position:absolute;left:14mm;right:14mm;bottom:7mm;display:flex;justify-content:space-between;border-top:1px solid #d6e2ee;padding-top:2.5mm;color:#60758d;font-size:2.6mm}.cover .footer{border-color:rgba(255,255,255,.24);color:#b8dcff}.score-banner{display:grid;grid-template-columns:1fr auto 1fr;gap:5mm;align-items:center;margin:8mm 0;padding:7mm;border-radius:6mm;background:linear-gradient(135deg,#071c3b,#0b65c8);color:#fff}.score-team h2{margin:0;font-size:7mm}.score-team b{display:block;font-size:12mm}.score-vs{font-size:5mm;font-weight:900;color:#7bd0ff}.leader{display:flex;gap:4mm;align-items:center;padding:4mm;border:1px solid #d6e3f0;border-radius:4mm;margin-bottom:3mm;background:#f8fbff}.leader .rank{width:9mm;height:9mm;border-radius:50%;display:grid;place-items:center;background:#0b69cc;color:#fff;font-weight:900}.leader b{display:block;font-size:4mm}.leader small{color:#657b95}.player-hero{display:flex;align-items:center;gap:7mm;padding:8mm;border-radius:7mm;background:linear-gradient(135deg,#071b39,#0b6dcc);color:#fff}.jersey{width:24mm;height:24mm;border-radius:50%;display:grid;place-items:center;border:2px solid #76caff;background:#06162d;font-size:9mm;font-weight:900}.player-hero h1{margin:0;font-size:10mm}.badge{display:inline-block;margin:1mm 1mm 0 0;padding:1.5mm 3mm;border-radius:999px;background:#0b74dc;color:#fff;font-size:2.7mm;font-weight:900}.match-card{border:1px solid #d3e1ef;border-left:2mm solid #0a73d9;border-radius:4mm;padding:4mm;margin-bottom:4mm;break-inside:avoid}.match-card h3{margin:0 0 1.5mm;font-size:4.4mm}.match-card .res{font-weight:900;color:#0a8c55}.share-wrap{height:180mm;display:grid;place-items:center}.share-card{width:245mm;min-height:150mm;border-radius:8mm;padding:12mm;background:radial-gradient(circle at 82% 10%,#1884ff 0,#0a4da8 24%,#06172f 58%,#030d1c 100%);color:#fff;box-shadow:0 7mm 18mm rgba(0,0,0,.2)}.share-card .big-result{font-size:9mm;font-weight:900;color:#65efa6;margin-top:5mm}.share-card .promo{margin-top:9mm;padding-top:4mm;border-top:1px solid rgba(255,255,255,.22);display:flex;justify-content:space-between;color:#9fd7ff;font-size:3mm}.no-data{padding:8mm;text-align:center;color:#6d8198;border:1px dashed #c6d8ea;border-radius:4mm}.player-photo{width:30mm;height:30mm;border-radius:50%;object-fit:cover;border:2px solid #71c8ff;background:#06162d}.player-photo.fallback{display:grid;place-items:center;color:#fff;font-weight:900;font-size:8mm}.cert-wrap{height:180mm;display:grid;place-items:center}.certificate{width:248mm;min-height:158mm;padding:10mm 12mm;border:2mm solid #0b6dcc;border-radius:6mm;background:radial-gradient(circle at 50% 0,#0e5fbe 0,#061c3b 42%,#031024 100%);color:#fff;position:relative}.certificate:before{content:"";position:absolute;inset:4mm;border:1px solid rgba(112,205,255,.4);border-radius:4mm}.cert-title{text-align:center;font-size:10mm;font-weight:900;letter-spacing:1px;margin:4mm 0 2mm}.cert-sub{text-align:center;color:#9ed8ff;font-size:4mm;letter-spacing:1px}.cert-name{text-align:center;font-size:13mm;font-weight:900;margin:6mm 0;color:#fff}.cert-detail{text-align:center;font-size:4.2mm;color:#d9ecff}.cert-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:7mm 0}.cert-stats div{background:rgba(3,18,42,.72);border:1px solid rgba(108,195,255,.35);border-radius:4mm;padding:4mm;text-align:center}.cert-stats b{display:block;font-size:7mm}.cert-stats span{font-size:2.6mm;color:#9fd5ff;text-transform:uppercase}.signature-row{display:flex;justify-content:space-between;margin-top:8mm;padding-top:4mm;border-top:1px solid rgba(255,255,255,.2);font-size:3mm;color:#b9dcff}.xi-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm}.xi-card{display:flex;align-items:center;gap:4mm;border:1px solid #d5e3f0;border-radius:4mm;padding:3.5mm}.xi-card .mini-photo{width:13mm;height:13mm;border-radius:50%;object-fit:cover;background:#0b4f9f;color:#fff;display:grid;place-items:center;font-weight:900}.award-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:5mm}.award-box{border-radius:6mm;padding:6mm;background:linear-gradient(135deg,#071a37,#0b62c0);color:#fff}.award-box h3{margin:2mm 0;font-size:6mm}.trophy{font-size:12mm}.ct-player-avatar{width:48px;height:48px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#06224a;border:2px solid #55baff;color:white;flex:0 0 48px}.ct-player-avatar img{width:100%;height:100%;object-fit:cover}@media print{button{display:none!important}}</style>`;
    const footer=(label,page='')=>`<div class="footer"><span>CricTrack • Track Every Run. Celebrate Every Win.</span><span>${esc(label)}${page?` • ${esc(page)}`:''}</span></div>`;
    const openPdf=(title,body,{landscape=false}={})=>{const w=window.open('','_blank');if(!w){alert('Allow pop-ups to create the PDF.');return;}w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>${commonCss(landscape)}</head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),350);<\/script></body></html>`);w.document.close();};
    const coverHeader=(label)=>`<div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • ${esc(label)}</div><div class="hero-title">${esc(teamName)}</div><div class="hero-sub">Team ID ${esc(team.teamId||'—')} • ${esc(team.city||'City not set')} • ${esc(team.homeGround||'Home ground not set')}</div></div></div>`;

    const deriveInnings=x=>{let score=0,legal=0,overBalls=[],overs=[],w=0,fow=[];(x.balls||[]).forEach(b=>{score+=Number(b.runs||0);if(b.legal)legal++;overBalls.push(b.label||String(b.runs||0));if(b.type==='wicket'){w++;fow.push(`${score}-${w} (${b.outBatterName||'Batter'}, ${oversText(legal)} ov)`);}if(b.legal&&legal%6===0){overs.push({n:legal/6,balls:overBalls.slice(),score});overBalls=[];}});if(overBalls.length)overs.push({n:`${Math.floor(legal/6)+1}*`,balls:overBalls.slice(),score});return {fow,overs};};
    const inningsPdf=x=>{const d=deriveInnings(x),extras=x.extras||{},extraTotal=Object.values(extras).reduce((a,b)=>a+Number(b||0),0),bats=Object.values(x.batters||{}).filter(b=>b.balls||b.runs||b.out),bowls=Object.values(x.bowlers||{}).filter(b=>b.balls||b.runs||b.wickets||b.wides||b.noBalls);return `<div class="section-head"><h2>${esc(x.battingTeamName||'Innings')} - ${x.runs||0}/${x.wickets||0}</h2><span>${oversText(x.legalBalls)} overs</span></div><table class="table"><thead><tr><th>Batter</th><th class="num">R</th><th class="num">B</th><th class="num">4s</th><th class="num">6s</th><th class="num">SR</th></tr></thead><tbody>${bats.map(b=>`<tr><td><b>${esc(b.name)}</b><div class="small">${esc(b.dismissal||'not out')}</div></td><td class="num">${b.runs||0}</td><td class="num">${b.balls||0}</td><td class="num">${b.fours||0}</td><td class="num">${b.sixes||0}</td><td class="num">${b.balls?((Number(b.runs||0)/Number(b.balls))*100).toFixed(1):'0.0'}</td></tr>`).join('')||'<tr><td colspan="6">No batting data</td></tr>'}</tbody></table><div class="panel" style="margin-top:4mm"><b>Extras ${extraTotal}</b><div class="small">WD ${extras.wd||0} • NB ${extras.nb||0} • B ${extras.b||0} • LB ${extras.lb||0} • PEN ${extras.pen||0}</div></div><table class="table"><thead><tr><th>Bowler</th><th class="num">O</th><th class="num">R</th><th class="num">W</th><th class="num">Eco</th><th class="num">WD/NB</th></tr></thead><tbody>${bowls.map(b=>`<tr><td><b>${esc(b.name)}</b></td><td class="num">${oversText(b.balls)}</td><td class="num">${b.runs||0}</td><td class="num">${b.wickets||0}</td><td class="num">${b.balls?((Number(b.runs||0)*6)/Number(b.balls)).toFixed(2):'0.00'}</td><td class="num">${b.wides||0}/${b.noBalls||0}</td></tr>`).join('')||'<tr><td colspan="6">No bowling data</td></tr>'}</tbody></table><div class="two" style="margin-top:5mm"><div class="panel"><b>Fall of Wickets</b><div class="small" style="margin-top:2mm">${d.fow.length?d.fow.map(esc).join('<br>'):'No wickets'}</div></div><div class="panel"><b>Over by Over</b><div class="small" style="margin-top:2mm">${d.overs.length?d.overs.map(o=>`Over ${o.n}: ${o.balls.map(esc).join(' • ')} = ${o.score}`).join('<br>'):'No over data'}</div></div></div>`;};

    const buildSeason=()=>{const batRows=batLeaders.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${x.runs}</td><td class="num">${x.balls}</td><td class="num">${x.high}</td><td class="num">${x.balls?((x.runs/x.balls)*100).toFixed(1):'0.0'}</td><td class="num">${x.fours}</td><td class="num">${x.sixes}</td></tr>`).join('');const bowlRows=bowlLeaders.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${oversText(x.balls)}</td><td class="num">${x.runs}</td><td class="num">${x.wickets}</td><td class="num">${x.bestW}/${x.bestR===9999?0:x.bestR}</td><td class="num">${x.balls?((x.runs*6)/x.balls).toFixed(2):'0.00'}</td></tr>`).join('');const oppRows=oppLeaders.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td class="num">${x.played}</td><td class="num">${x.wins}</td><td class="num">${x.losses}</td><td class="num">${x.ties}</td><td class="num">${x.runsFor}-${x.runsAgainst}</td><td class="num">${x.played?((x.wins/x.played)*100).toFixed(0):0}%</td></tr>`).join('');const matchCards=matchRows.map(r=>`<div class="match-card"><h3>${esc(teamName)} vs ${esc(r.opponent||'Opponent')}</h3><div class="small">${esc(r.date)} • ${esc(r.venue)} • ${esc(r.overs)} overs</div><p>${esc(r.scores||'Score not available')}</p><div class="res">${esc(r.result||String(r.status).toUpperCase())}</div></div>`).join('');const gen=new Date().toLocaleString();const body=`<section class="pdf-page cover">${coverHeader('PREMIUM TEAM SEASON BOOK')}<div class="hero-rule"></div><div class="kpis dark-kpis"><div class="kpi"><b>${done.length}</b><span>Matches</span></div><div class="kpi"><b>${wins}</b><span>Wins</span></div><div class="kpi"><b>${winRate.toFixed(0)}%</b><span>Win Rate</span></div><div class="kpi"><b>${runsFor}</b><span>Runs</span></div><div class="kpi"><b>${totalTeamWkts}</b><span>Wickets</span></div><div class="kpi"><b>${highestTeamScore}</b><span>High Score</span></div><div class="kpi"><b>${avgRuns.toFixed(1)}</b><span>Avg Score</span></div><div class="kpi"><b>${runsFor-runsAgainst}</b><span>Net Runs</span></div></div><div class="two"><div class="panel dark"><h3>Top Batter</h3>${batLeaders[0]?`<div style="font-size:7mm;font-weight:900">${esc(batLeaders[0].name)}</div><p>${batLeaders[0].runs} runs • HS ${batLeaders[0].high} • SR ${batLeaders[0].balls?((batLeaders[0].runs/batLeaders[0].balls)*100).toFixed(1):'0.0'}</p>`:'No batting data'}</div><div class="panel dark"><h3>Top Bowler</h3>${bowlLeaders[0]?`<div style="font-size:7mm;font-weight:900">${esc(bowlLeaders[0].name)}</div><p>${bowlLeaders[0].wickets} wickets • Best ${bowlLeaders[0].bestW}/${bowlLeaders[0].bestR===9999?0:bowlLeaders[0].bestR}</p>`:'No bowling data'}</div></div>${footer(`Generated ${gen}`,'Cover')}</section><section class="pdf-page"><div class="section-head"><h2>Batting Performance</h2><span>${batLeaders.length} players</span></div><table class="table"><thead><tr><th>#</th><th>Batter</th><th class="num">Runs</th><th class="num">Balls</th><th class="num">HS</th><th class="num">SR</th><th class="num">4s</th><th class="num">6s</th></tr></thead><tbody>${batRows||'<tr><td colspan="8">No batting data</td></tr>'}</tbody></table><div class="section-head" style="margin-top:8mm"><h2>Bowling Performance</h2><span>${bowlLeaders.length} bowlers</span></div><table class="table"><thead><tr><th>#</th><th>Bowler</th><th class="num">Overs</th><th class="num">Runs</th><th class="num">Wkts</th><th class="num">Best</th><th class="num">Eco</th></tr></thead><tbody>${bowlRows||'<tr><td colspan="7">No bowling data</td></tr>'}</tbody></table>${footer(teamName,'Performance')}</section><section class="pdf-page"><div class="section-head"><h2>Head-to-Head</h2><span>${oppLeaders.length} opponents</span></div><table class="table"><thead><tr><th>Opponent</th><th class="num">P</th><th class="num">W</th><th class="num">L</th><th class="num">T</th><th class="num">Runs</th><th class="num">Win%</th></tr></thead><tbody>${oppRows||'<tr><td colspan="7">No opponent data</td></tr>'}</tbody></table><div class="section-head" style="margin-top:8mm"><h2>Complete Match History</h2><span>${matchRows.length} matches</span></div>${matchCards||'<div class="no-data">No matches stored</div>'}${footer(teamName,'Match History')}</section>`;openPdf(`${teamName} - CricTrack Team Season Book`,body);};

    const chosenMatch=()=>done.find(m=>m.id===matchSelect.value)||done[0];
    const buildMatch=(share=false)=>{const m=chosenMatch();if(!m){alert('No completed match available.');return;}const inns=m.inningsData||[],a=inns[0],b=inns[1];if(share){const topBat=[];const topBowl=[];inns.forEach(x=>{Object.values(x.batters||{}).forEach(v=>topBat.push(v));Object.values(x.bowlers||{}).forEach(v=>topBowl.push(v));});topBat.sort((x,y)=>Number(y.runs||0)-Number(x.runs||0));topBowl.sort((x,y)=>Number(y.wickets||0)-Number(x.wickets||0)||Number(x.runs||0)-Number(y.runs||0));const body=`<section class="pdf-page"><div class="share-wrap"><div class="share-card">${coverHeader('MATCH RESULT • SHARE CARD')}<div class="score-banner"><div class="score-team"><h2>${esc(a?.battingTeamName||m.teamAName||teamName)}</h2><b>${a?`${a.runs}/${a.wickets}`:'—'}</b><span>${a?oversText(a.legalBalls):''} overs</span></div><div class="score-vs">VS</div><div class="score-team" style="text-align:right"><h2>${esc(b?.battingTeamName||m.teamBName||'Opponent')}</h2><b>${b?`${b.runs}/${b.wickets}`:'—'}</b><span>${b?oversText(b.legalBalls):''} overs</span></div></div><div class="big-result">${esc(m.resultText||'MATCH COMPLETED')}</div><div class="two" style="margin-top:8mm"><div class="panel dark"><b>TOP BATTER</b><h2>${esc(topBat[0]?.name||'—')}</h2><p>${topBat[0]?`${topBat[0].runs||0} (${topBat[0].balls||0}) • 4s ${topBat[0].fours||0} • 6s ${topBat[0].sixes||0}`:'No data'}</p></div><div class="panel dark"><b>TOP BOWLER</b><h2>${esc(topBowl[0]?.name||'—')}</h2><p>${topBowl[0]?`${topBowl[0].wickets||0} wickets • ${topBowl[0].runs||0} runs`:'No data'}</p></div></div><div class="promo"><span>${esc(fmtDate(m.date))} • ${esc(m.venue||'Venue')} • ${esc(m.overs||'')} overs</span><b>Scored on CricTrack</b></div></div></div></section>`;openPdf(`${teamName} vs ${m.teamBName||'Opponent'} - Share Card`,body,{landscape:true});return;}const body=`<section class="pdf-page cover">${coverHeader('PREMIUM MATCH SCORECARD')}<div class="hero-rule"></div><div class="score-banner"><div class="score-team"><h2>${esc(a?.battingTeamName||m.teamAName||teamName)}</h2><b>${a?`${a.runs}/${a.wickets}`:'—'}</b><span>${a?oversText(a.legalBalls):''} overs</span></div><div class="score-vs">VS</div><div class="score-team" style="text-align:right"><h2>${esc(b?.battingTeamName||m.teamBName||'Opponent')}</h2><b>${b?`${b.runs}/${b.wickets}`:'—'}</b><span>${b?oversText(b.legalBalls):''} overs</span></div></div><div class="result-pill">${esc(m.resultText||'MATCH COMPLETED')}</div><div style="margin-top:8mm" class="hero-sub">${esc(fmtDate(m.date))} • ${esc(m.venue||'Venue not set')} • ${esc(m.matchType||'Limited Overs')} • ${esc(m.overs||'')} overs</div>${footer(`${teamName} Match Scorecard`,'Cover')}</section>${inns.map((x,i)=>`<section class="pdf-page">${inningsPdf(x)}${footer(`${esc(x.battingTeamName||'Innings')} Scorecard`,`Innings ${i+1}`)}</section>`).join('')}`;openPdf(`${teamName} vs ${m.teamBName||'Opponent'} - CricTrack Scorecard`,body);};

    const playerSummary=name=>{const profile=roster.find(p=>p.name===name)||{name};const bat=batting[name]||{innings:0,runs:0,balls:0,fours:0,sixes:0,outs:0,high:0};const bowl=bowling[name]||{innings:0,balls:0,runs:0,wickets:0,wides:0,noBalls:0,bestW:0,bestR:9999};const logs=[];done.forEach(m=>{let br=null,bo=null;(m.inningsData||[]).forEach(x=>{if(x.battingTeamId===team.teamId){const q=Object.values(x.batters||{}).find(v=>v.name===name);if(q)br=q;}else{const q=Object.values(x.bowlers||{}).find(v=>v.name===name);if(q)bo=q;}});if(br||bo)logs.push({m,br,bo});});return {profile,bat,bowl,logs};};
    const chosenPlayer=()=>playerSelect.value||playerNames[0]||'';
    const buildPlayer=(card=false)=>{const name=chosenPlayer();if(!name){alert('No player available.');return;}const {profile,bat,bowl,logs}=playerSummary(name);const avg=bat.outs?(bat.runs/bat.outs):bat.runs, sr=bat.balls?((bat.runs/bat.balls)*100):0, eco=bowl.balls?((bowl.runs*6)/bowl.balls):0, jersey=profile.jerseyNo||'—',tags=[profile.role,profile.isCaptain?'Captain':'',profile.isViceCaptain?'Vice Captain':'',profile.isWicketKeeper?'Wicket Keeper':''].filter(Boolean);if(card){const body=`<section class="pdf-page"><div class="share-wrap"><div class="share-card"><div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • PLAYER SHARE CARD</div><div class="hero-sub">${esc(teamName)} • ${esc(team.teamId||'')}</div></div></div><div class="player-hero" style="margin-top:8mm">${playerPortrait(profile,name)}<div class="jersey">${esc(jersey)}</div><div><h1>${esc(name)}</h1><div>${tags.map(t=>`<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(profile.battingStyle||'')} ${profile.bowlingStyle?`• ${esc(profile.bowlingStyle)}`:''}</p></div></div><div class="kpis dark-kpis"><div class="kpi"><b>${bat.runs}</b><span>Runs</span></div><div class="kpi"><b>${bat.high}</b><span>High Score</span></div><div class="kpi"><b>${sr.toFixed(1)}</b><span>Strike Rate</span></div><div class="kpi"><b>${bat.sixes}</b><span>Sixes</span></div><div class="kpi"><b>${bowl.wickets}</b><span>Wickets</span></div><div class="kpi"><b>${bowl.bestW}/${bowl.bestR===9999?0:bowl.bestR}</b><span>Best</span></div><div class="kpi"><b>${eco.toFixed(2)}</b><span>Economy</span></div><div class="kpi"><b>${logs.length}</b><span>Matches</span></div></div><div class="promo"><span>Player performance powered by CricTrack</span><b>Share Your Cricket Story</b></div></div></div></section>`;openPdf(`${name} - CricTrack Player Card`,body,{landscape:true});return;}const logRows=logs.map(x=>`<tr><td>${esc(x.m.date||'')}</td><td>${esc(x.m.teamBName||'Opponent')}</td><td class="num">${x.br?`${x.br.runs||0} (${x.br.balls||0})`:'—'}</td><td class="num">${x.bo?`${x.bo.wickets||0}/${x.bo.runs||0}`:'—'}</td><td>${esc(x.m.resultText||'')}</td></tr>`).join('');const body=`<section class="pdf-page cover">${coverHeader('PREMIUM PLAYER CAREER REPORT')}<div class="player-hero" style="margin-top:10mm">${playerPortrait(profile,name)}<div class="jersey">${esc(jersey)}</div><div><h1>${esc(name)}</h1><div>${tags.map(t=>`<span class="badge">${esc(t)}</span>`).join('')}</div><p>${esc(profile.battingStyle||'Batting style not set')} • ${esc(profile.bowlingStyle||'Bowling style not set')}</p></div></div><div class="kpis dark-kpis"><div class="kpi"><b>${bat.runs}</b><span>Runs</span></div><div class="kpi"><b>${bat.high}</b><span>HS</span></div><div class="kpi"><b>${avg.toFixed(1)}</b><span>Average</span></div><div class="kpi"><b>${sr.toFixed(1)}</b><span>Strike Rate</span></div><div class="kpi"><b>${bowl.wickets}</b><span>Wickets</span></div><div class="kpi"><b>${bowl.bestW}/${bowl.bestR===9999?0:bowl.bestR}</b><span>Best</span></div><div class="kpi"><b>${eco.toFixed(2)}</b><span>Economy</span></div><div class="kpi"><b>${bat.fours}/${bat.sixes}</b><span>4s / 6s</span></div></div>${footer(name,'Career Cover')}</section><section class="pdf-page"><div class="section-head"><h2>${esc(name)} - Career Detail</h2><span>${logs.length} match records</span></div><div class="two"><div class="panel"><h3>Batting</h3><div class="statline"><span>Innings</span><b>${bat.innings}</b></div><div class="statline"><span>Runs</span><b>${bat.runs}</b></div><div class="statline"><span>Highest</span><b>${bat.high}</b></div><div class="statline"><span>Average</span><b>${avg.toFixed(2)}</b></div><div class="statline"><span>Strike Rate</span><b>${sr.toFixed(2)}</b></div><div class="statline"><span>4s / 6s</span><b>${bat.fours} / ${bat.sixes}</b></div></div><div class="panel"><h3>Bowling</h3><div class="statline"><span>Innings</span><b>${bowl.innings}</b></div><div class="statline"><span>Overs</span><b>${oversText(bowl.balls)}</b></div><div class="statline"><span>Wickets</span><b>${bowl.wickets}</b></div><div class="statline"><span>Best</span><b>${bowl.bestW}/${bowl.bestR===9999?0:bowl.bestR}</b></div><div class="statline"><span>Economy</span><b>${eco.toFixed(2)}</b></div><div class="statline"><span>WD / NB</span><b>${bowl.wides} / ${bowl.noBalls}</b></div></div></div><div class="section-head" style="margin-top:8mm"><h2>Match-by-Match Performance</h2><span>Stored CricTrack data</span></div><table class="table"><thead><tr><th>Date</th><th>Opponent</th><th class="num">Batting</th><th class="num">Bowling</th><th>Result</th></tr></thead><tbody>${logRows||'<tr><td colspan="5">No match performance stored</td></tr>'}</tbody></table>${footer(name,'Performance Detail')}</section>`;openPdf(`${name} - CricTrack Player Career Report`,body);};

    const buildSquad=()=>{const cards=roster.sort((a,b)=>Number(a.jerseyNo||999)-Number(b.jerseyNo||999)).map(p=>`<div class="leader"><div class="rank">${esc(p.jerseyNo||'—')}</div><div><b>${esc(p.name||'Player')}</b><small>${esc(p.role||'Player')} • ${esc(p.battingStyle||'Batting not set')} • ${esc(p.bowlingStyle||'Bowling not set')}</small><div>${p.isCaptain?'<span class="badge">CAPTAIN</span>':''}${p.isViceCaptain?'<span class="badge">VICE CAPTAIN</span>':''}${p.isWicketKeeper?'<span class="badge">WICKET KEEPER</span>':''}${p.playingXI?'<span class="badge">PLAYING XI</span>':''}</div></div></div>`).join('');const body=`<section class="pdf-page cover">${coverHeader('PREMIUM SQUAD BOOK')}<div class="hero-rule"></div><div class="hero-title">${roster.length} Players</div><div class="hero-sub">Team roster • Roles • Jersey numbers • Playing XI • Leadership</div><div class="kpis dark-kpis"><div class="kpi"><b>${roster.filter(p=>p.active!==false).length}</b><span>Active</span></div><div class="kpi"><b>${roster.filter(p=>p.playingXI).length}</b><span>Playing XI</span></div><div class="kpi"><b>${roster.filter(p=>p.isCaptain).length}</b><span>Captain</span></div><div class="kpi"><b>${roster.filter(p=>p.isWicketKeeper).length}</b><span>Keepers</span></div></div>${footer(teamName,'Squad Cover')}</section><section class="pdf-page"><div class="section-head"><h2>Squad Directory</h2><span>${roster.length} registered players</span></div>${cards||'<div class="no-data">No players registered</div>'}${footer(teamName,'Squad Directory')}</section>`;openPdf(`${teamName} - CricTrack Squad Book`,body);};

    const buildH2H=()=>{const rows=oppLeaders.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${x.played}</td><td class="num">${x.wins}</td><td class="num">${x.losses}</td><td class="num">${x.ties}</td><td class="num">${x.runsFor}-${x.runsAgainst}</td><td class="num">${x.played?((x.wins/x.played)*100).toFixed(0):0}%</td></tr>`).join('');const body=`<section class="pdf-page cover">${coverHeader('HEAD-TO-HEAD REPORT')}<div class="hero-rule"></div><div class="hero-title">Opponent Records</div><div class="hero-sub">Performance against every opponent stored in CricTrack</div><div class="kpis dark-kpis"><div class="kpi"><b>${oppLeaders.length}</b><span>Opponents</span></div><div class="kpi"><b>${done.length}</b><span>Matches</span></div><div class="kpi"><b>${wins}</b><span>Wins</span></div><div class="kpi"><b>${winRate.toFixed(0)}%</b><span>Win Rate</span></div></div>${footer(teamName,'H2H Cover')}</section><section class="pdf-page"><div class="section-head"><h2>Opponent Matrix</h2><span>Complete head-to-head history</span></div><table class="table"><thead><tr><th>#</th><th>Opponent</th><th class="num">P</th><th class="num">W</th><th class="num">L</th><th class="num">T</th><th class="num">Runs</th><th class="num">Win%</th></tr></thead><tbody>${rows||'<tr><td colspan="8">No opponent data</td></tr>'}</tbody></table>${footer(teamName,'Opponent Matrix')}</section>`;openPdf(`${teamName} - CricTrack Head to Head`,body);};

    const buildLeaders=type=>{const isBat=type==='bat',arr=isBat?batLeaders:bowlLeaders,title=isBat?'BATTING LEADERBOARD':'BOWLING LEADERBOARD';const rows=arr.map((x,i)=>isBat?`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${x.runs}</td><td class="num">${x.high}</td><td class="num">${x.balls?((x.runs/x.balls)*100).toFixed(1):'0.0'}</td><td class="num">${x.fours}</td><td class="num">${x.sixes}</td></tr>`:`<tr><td>${i+1}</td><td><b>${esc(x.name)}</b></td><td class="num">${oversText(x.balls)}</td><td class="num">${x.wickets}</td><td class="num">${x.bestW}/${x.bestR===9999?0:x.bestR}</td><td class="num">${x.balls?((x.runs*6)/x.balls).toFixed(2):'0.00'}</td><td class="num">${x.wides}/${x.noBalls}</td></tr>`).join('');const body=`<section class="pdf-page cover">${coverHeader(title)}<div class="hero-rule"></div><div class="hero-title">${isBat?'Top Run Makers':'Top Wicket Takers'}</div><div class="hero-sub">Official rankings generated from completed CricTrack matches</div>${arr[0]?`<div class="panel dark" style="margin-top:10mm"><div class="brandtag">#1 LEADER</div><div style="font-size:11mm;font-weight:900;margin:3mm 0">${esc(arr[0].name)}</div><p>${isBat?`${arr[0].runs} runs • HS ${arr[0].high}`:`${arr[0].wickets} wickets • Best ${arr[0].bestW}/${arr[0].bestR===9999?0:arr[0].bestR}`}</p></div>`:''}${footer(teamName,'Leaderboard Cover')}</section><section class="pdf-page"><div class="section-head"><h2>${title}</h2><span>${arr.length} ranked players</span></div><table class="table"><thead><tr>${isBat?'<th>#</th><th>Batter</th><th class="num">Runs</th><th class="num">HS</th><th class="num">SR</th><th class="num">4s</th><th class="num">6s</th>':'<th>#</th><th>Bowler</th><th class="num">Overs</th><th class="num">Wkts</th><th class="num">Best</th><th class="num">Eco</th><th class="num">WD/NB</th>'}</tr></thead><tbody>${rows||`<tr><td colspan="7">No ${isBat?'batting':'bowling'} data</td></tr>`}</tbody></table>${footer(teamName,title)}</section>`;openPdf(`${teamName} - CricTrack ${title}`,body);};

    const matchPlayerPerformance=(m,name)=>{let bat=null,bowl=null;(m?.inningsData||[]).forEach(inn=>{Object.values(inn.batters||{}).forEach(x=>{if(String(x.name||'').toLowerCase()===String(name).toLowerCase())bat=x;});Object.values(inn.bowlers||{}).forEach(x=>{if(String(x.name||'').toLowerCase()===String(name).toLowerCase())bowl=x;});});return {bat,bowl};};
    const buildPOM=()=>{const m=chosenMatch(),name=chosenPlayer();if(!m||!name){alert('Select a completed match and player.');return;}const profile=roster.find(p=>p.name===name)||{},perf=matchPlayerPerformance(m,name),bat=perf.bat||{},bowl=perf.bowl||{};const body=`<section class="pdf-page"><div class="cert-wrap"><div class="certificate"><div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • OFFICIAL MATCH AWARD</div><div class="hero-sub">${esc(teamName)} • ${esc(m.date||'')} • ${esc(m.venue||'')}</div></div></div><div class="cert-sub">CERTIFICATE OF EXCELLENCE</div><div class="cert-title">PLAYER OF THE MATCH</div><div style="display:flex;justify-content:center;margin-top:4mm">${playerPortrait(profile,name)}</div><div class="cert-name">${esc(name)}</div><div class="cert-detail">For an outstanding performance in ${esc(m.teamAName||teamName)} vs ${esc(m.teamBName||'Opponent')}</div><div class="cert-stats"><div><b>${bat.runs||0}</b><span>Runs</span></div><div><b>${bat.balls||0}</b><span>Balls</span></div><div><b>${bowl.wickets||0}</b><span>Wickets</span></div><div><b>${bowl.runs||0}</b><span>Bowl Runs</span></div></div><div class="result-pill">${esc(m.resultText||'MATCH COMPLETED')}</div><div class="signature-row"><span>Selected by Team Admin</span><b>CricTrack • Track Every Run</b><span>Digital Certificate</span></div></div></div></section>`;openPdf(`${name} - Player of the Match Certificate`,body,{landscape:true});};
    const buildAchievement=()=>{const name=chosenPlayer();if(!name)return alert('Select a player.');const profile=roster.find(p=>p.name===name)||{},ps=playerSummary(name),bat=ps.bat,bowl=ps.bowl,type=document.getElementById('pdfAchievementType').value;const body=`<section class="pdf-page"><div class="cert-wrap"><div class="certificate"><div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • PLAYER ACHIEVEMENT</div><div class="hero-sub">${esc(teamName)} • Team ID ${esc(team.teamId||'')}</div></div></div><div class="cert-sub">CERTIFICATE OF ACHIEVEMENT</div><div class="cert-title">${esc(type.toUpperCase())}</div><div style="display:flex;justify-content:center;margin-top:4mm">${playerPortrait(profile,name)}</div><div class="cert-name">${esc(name)}</div><div class="cert-detail">Recognized for cricketing contribution and performance recorded in CricTrack.</div><div class="cert-stats"><div><b>${bat.runs}</b><span>Career Runs</span></div><div><b>${bat.high}</b><span>High Score</span></div><div><b>${bowl.wickets}</b><span>Wickets</span></div><div><b>${ps.logs.length}</b><span>Matches</span></div></div><div class="signature-row"><span>${esc(profile.role||'Player')}</span><b>CricTrack Performance Recognition</b><span>${new Date().toLocaleDateString()}</span></div></div></div></section>`;openPdf(`${name} - CricTrack Achievement Certificate`,body,{landscape:true});};
    const buildPlayerMatch=()=>{const m=chosenMatch(),name=chosenPlayer();if(!m||!name)return alert('Select a completed match and player.');const profile=roster.find(p=>p.name===name)||{},p=matchPlayerPerformance(m,name),bat=p.bat||{},bowl=p.bowl||{},sr=bat.balls?((Number(bat.runs||0)/Number(bat.balls))*100).toFixed(1):'0.0',eco=bowl.balls?((Number(bowl.runs||0)*6)/Number(bowl.balls)).toFixed(2):'0.00';const body=`<section class="pdf-page cover">${coverHeader('PLAYER MATCH PERFORMANCE')}<div class="player-hero" style="margin-top:9mm">${playerPortrait(profile,name)}<div><h1>${esc(name)}</h1><p>${esc(m.teamAName||teamName)} vs ${esc(m.teamBName||'Opponent')}</p><div class="badge">${esc(m.resultText||'MATCH COMPLETED')}</div></div></div><div class="kpis dark-kpis"><div class="kpi"><b>${bat.runs||0}</b><span>Runs</span></div><div class="kpi"><b>${bat.balls||0}</b><span>Balls</span></div><div class="kpi"><b>${bat.fours||0}</b><span>Fours</span></div><div class="kpi"><b>${bat.sixes||0}</b><span>Sixes</span></div><div class="kpi"><b>${sr}</b><span>Strike Rate</span></div><div class="kpi"><b>${bowl.wickets||0}</b><span>Wickets</span></div><div class="kpi"><b>${bowl.runs||0}</b><span>Runs Given</span></div><div class="kpi"><b>${eco}</b><span>Economy</span></div></div><div class="hero-sub">${esc(m.date||'')} • ${esc(m.venue||'')} • ${esc(m.overs||'')} overs</div>${footer(name,'Match Performance')}</section>`;openPdf(`${name} - Match Performance`,body);};
    const buildWinner=()=>{const m=chosenMatch();if(!m)return alert('Select a completed match.');const result=String(m.resultText||'MATCH COMPLETED'),won=result.toLowerCase().startsWith(teamKey+' won');const title=won?'MATCH WINNER':'MATCH PARTICIPATION';const body=`<section class="pdf-page"><div class="cert-wrap"><div class="certificate"><div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • MATCH CERTIFICATE</div><div class="hero-sub">${esc(m.date||'')} • ${esc(m.venue||'')}</div></div></div><div class="cert-sub">OFFICIAL TEAM CERTIFICATE</div><div class="cert-title">${title}</div><div class="cert-name">${esc(teamName)}</div><div class="cert-detail">${esc(m.teamAName||teamName)} vs ${esc(m.teamBName||'Opponent')}</div><div style="text-align:center;margin:8mm 0"><span class="result-pill">${esc(result)}</span></div><div class="signature-row"><span>Team ID ${esc(team.teamId||'')}</span><b>CricTrack Match Records</b><span>Verified from stored scorecard</span></div></div></div></section>`;openPdf(`${teamName} - Match Certificate`,body,{landscape:true});};
    const buildXI=()=>{const m=chosenMatch();if(!m)return alert('Select a match.');const xi=(m.playingXI||[]),cards=xi.map((p,i)=>{const prof=roster.find(r=>r.id===p.id||r.name===p.name)||{};return `<div class="xi-card"><div class="mini-photo">${prof.photoDataUrl?`<img style="width:100%;height:100%;object-fit:cover;border-radius:50%" src="${esc(prof.photoDataUrl)}">`:esc((p.name||'P').slice(0,1))}</div><div><b>${i+1}. ${esc(p.name||'Player')}</b><div class="small">#${esc(p.jerseyNo||'—')} • ${esc(p.role||prof.role||'Player')}</div></div></div>`}).join('');const body=`<section class="pdf-page cover">${coverHeader('OFFICIAL PLAYING XI')}<div class="hero-rule"></div><div class="hero-title">Match Squad</div><div class="hero-sub">${esc(m.teamAName||teamName)} vs ${esc(m.teamBName||'Opponent')} • ${esc(m.date||'')} • ${esc(m.venue||'')}</div><div class="panel" style="margin-top:9mm;color:#10233f"><div class="xi-grid">${cards||'<div class="no-data">No Playing XI stored</div>'}</div></div>${footer(teamName,'Playing XI')}</section>`;openPdf(`${teamName} - Playing XI`,body);};
    const buildSeasonAwards=()=>{const topBat=batLeaders[0],topBowl=bowlLeaders[0],six=batLeaders.slice().sort((a,b)=>b.sixes-a.sixes)[0],sr=batLeaders.filter(x=>x.balls>=1).slice().sort((a,b)=>(b.runs/b.balls)-(a.runs/a.balls))[0];const box=(icon,title,x,sub)=>`<div class="award-box"><div class="trophy">${icon}</div><div class="brandtag">${title}</div><h3>${esc(x?.name||'—')}</h3><p>${sub(x)}</p></div>`;const body=`<section class="pdf-page cover">${coverHeader('SEASON AWARDS & HONOURS')}<div class="hero-rule"></div><div class="hero-title">CricTrack Awards</div><div class="hero-sub">Performance honours generated from completed match records</div><div class="award-grid" style="margin-top:10mm">${box('🏏','TOP BATTER',topBat,x=>x?`${x.runs} runs • HS ${x.high}`:'No data')}${box('🎯','TOP BOWLER',topBowl,x=>x?`${x.wickets} wickets • Best ${x.bestW}/${x.bestR===9999?0:x.bestR}`:'No data')}${box('🚀','SIX HITTER',six,x=>x?`${x.sixes} sixes`:'No data')}${box('⚡','IMPACT BATTER',sr,x=>x?`SR ${((x.runs/x.balls)*100).toFixed(1)}`:'No data')}</div><div class="kpis dark-kpis"><div class="kpi"><b>${wins}</b><span>Team Wins</span></div><div class="kpi"><b>${runsFor}</b><span>Runs</span></div><div class="kpi"><b>${totalTeamWkts}</b><span>Wickets</span></div><div class="kpi"><b>${winRate.toFixed(0)}%</b><span>Win Rate</span></div></div>${footer(teamName,'Season Awards')}</section>`;openPdf(`${teamName} - Season Awards`,body);};
    const buildTeamAchievement=()=>{const body=`<section class="pdf-page"><div class="cert-wrap"><div class="certificate"><div class="brandbar">${logoHtml()}<div><div class="brandtag">CRICTRACK • TEAM ACHIEVEMENT</div><div class="hero-sub">Official performance recognition</div></div></div><div class="cert-sub">CERTIFICATE OF TEAM PERFORMANCE</div><div class="cert-name">${esc(teamName)}</div><div class="cert-detail">Recognized for the season performance recorded through CricTrack digital scoring.</div><div class="cert-stats"><div><b>${done.length}</b><span>Matches</span></div><div><b>${wins}</b><span>Wins</span></div><div><b>${runsFor}</b><span>Runs</span></div><div><b>${winRate.toFixed(0)}%</b><span>Win Rate</span></div></div><div class="signature-row"><span>Team ID ${esc(team.teamId||'')}</span><b>Track Every Run. Celebrate Every Win.</b><span>${new Date().toLocaleDateString()}</span></div></div></div></section>`;openPdf(`${teamName} - Team Achievement Certificate`,body,{landscape:true});};
    document.getElementById('pdfSeason').onclick=buildSeason;
    document.getElementById('pdfMatch').onclick=()=>buildMatch(false);
    document.getElementById('pdfMatchShare').onclick=()=>buildMatch(true);
    document.getElementById('pdfPlayer').onclick=()=>buildPlayer(false);
    document.getElementById('pdfPlayerCard').onclick=()=>buildPlayer(true);
    document.getElementById('pdfSquad').onclick=buildSquad;
    document.getElementById('pdfH2H').onclick=buildH2H;
    document.getElementById('pdfBat').onclick=()=>buildLeaders('bat');
    document.getElementById('pdfBowl').onclick=()=>buildLeaders('bowl');
    document.getElementById('pdfPOM').onclick=buildPOM;
    document.getElementById('pdfAchievement').onclick=buildAchievement;
    document.getElementById('pdfPlayerMatch').onclick=buildPlayerMatch;
    document.getElementById('pdfWinner').onclick=buildWinner;
    document.getElementById('pdfXI').onclick=buildXI;
    document.getElementById('pdfSeasonAwards').onclick=buildSeasonAwards;
    document.getElementById('pdfTeamAchievement').onclick=buildTeamAchievement;

    document.getElementById('downloadMatchesCsv').onclick=()=>{const csv=['Date,Opponent,Venue,Overs,Status,Scores,Result',...matchRows.map(r=>[r.date,r.opponent,r.venue,r.overs,r.status,r.scores,r.result].map(escCsv).join(','))].join('\n');downloadBlob(`${team.teamId}_matches.csv`,csv,'text/csv;charset=utf-8');};
    document.getElementById('downloadPlayersCsv').onclick=()=>{const names=[...new Set([...Object.keys(batting),...Object.keys(bowling)])];const csv=['Player,Runs,Balls,High,SR,4s,6s,Overs,BowlRuns,Wickets,Best,Economy,WD,NB',...names.map(n=>{const a=batting[n]||{},b=bowling[n]||{};return [n,a.runs||0,a.balls||0,a.high||0,a.balls?((a.runs/a.balls)*100).toFixed(1):'0.0',a.fours||0,a.sixes||0,oversText(b.balls||0),b.runs||0,b.wickets||0,`${b.bestW||0}/${b.bestR===9999?0:(b.bestR||0)}`,b.balls?((b.runs*6)/b.balls).toFixed(2):'0.00',b.wides||0,b.noBalls||0].map(escCsv).join(',');})].join('\n');downloadBlob(`${team.teamId}_player_stats.csv`,csv,'text/csv;charset=utf-8');};
    document.getElementById('copyReportSummary').onclick=async()=>{const text=`${teamName} - CricTrack Summary\nMatches: ${done.length} | Wins: ${wins} | Losses: ${losses} | Win Rate: ${winRate.toFixed(0)}%\nRuns: ${runsFor} | Wickets: ${totalTeamWkts} | Highest: ${highestTeamScore}\nTop Batter: ${batLeaders[0]?.name||'—'} ${batLeaders[0]?.runs||0} runs\nTop Bowler: ${bowlLeaders[0]?.name||'—'} ${bowlLeaders[0]?.wickets||0} wickets`;try{await navigator.clipboard.writeText(text);alert('Team summary copied.');}catch{alert(text);}};
  }catch(ex){preview.innerHTML=`<div class="error visible">${esc(friendlyError(ex))}</div>`;}
}
async function teamLiveScoringPage(user,team,preferredMatchId=''){
  let matches=[];
  try{const snap=await getDocs(collection(db,'teams',team.teamId,'matches'));matches=snap.docs.map(d=>({id:d.id,...d.data()}));}catch{}
  let match=matches.find(m=>m.id===preferredMatchId)||matches.find(m=>m.status==='live');
  if(!match){teamModuleShell(team,'LIVE SCORING','Ball-by-ball scoring workspace',`<div class="empty-state"><strong>No live match</strong><span>Create and start a match first.</span><button class="ct-save-primary" id="goCreate">CREATE MATCH</button></div>`);document.getElementById('goCreate').onclick=()=>teamCreateMatchPage(user,team);return;}

  const teamRoster=(match.playingXI||[]).map((p,i)=>({id:p.id||`team-${i+1}`,name:p.name||`Player ${i+1}`}));
  const opponentRoster=Array.isArray(match.opponentRoster)&&match.opponentRoster.length?match.opponentRoster.map((p,i)=>({id:p.id||`opp-${i+1}`,name:p.name||`${match.teamBName||'Opponent'} Player ${i+1}`,jerseyNo:p.jerseyNo||'',role:p.role||'',photoDataUrl:p.photoDataUrl||''})):Array.from({length:11},(_,i)=>({id:`opp-${i+1}`,name:`${match.teamBName||'Opponent'} Player ${i+1}`}));
  const teamBatsFirst=(match.tossWinner==='self'&&match.tossDecision==='bat')||(match.tossWinner==='opponent'&&match.tossDecision==='bowl')||(!match.tossWinner);
  const makeInnings=(n)=>{
    const teamBat=(n===1?teamBatsFirst:!teamBatsFirst);
    return {number:n,battingTeamId:teamBat?team.teamId:'opponent',battingTeamName:teamBat?(match.teamAName||team.name||team.teamId):(match.teamBName||'Opponent'),bowlingTeamName:teamBat?(match.teamBName||'Opponent'):(match.teamAName||team.name||team.teamId),runs:0,wickets:0,legalBalls:0,extras:{wd:0,nb:0,b:0,lb:0,pen:0},balls:[],batters:{},bowlers:{},strikerId:'',nonStrikerId:'',bowlerId:'',completed:false};
  };
  let inningsData=Array.isArray(match.inningsData)&&match.inningsData.length?JSON.parse(JSON.stringify(match.inningsData)):[makeInnings(1)];
  let current=Math.max(0,Math.min(Number(match.innings||1)-1,inningsData.length-1));
  let inn=inningsData[current];
  const undoStack=[];
  const rosterForBat=()=>inn.battingTeamId===team.teamId?teamRoster:opponentRoster;
  const rosterForBowl=()=>inn.battingTeamId===team.teamId?opponentRoster:teamRoster;
  const nameOf=(id,roster)=>roster.find(x=>x.id===id)?.name||id||'';
  const oversText=balls=>`${Math.floor((balls||0)/6)}.${(balls||0)%6}`;
  const snapshot=()=>JSON.parse(JSON.stringify({inningsData,current,status:match.status,resultText:match.resultText||''}));
  const swap=()=>{const t=inn.strikerId;inn.strikerId=inn.nonStrikerId;inn.nonStrikerId=t;};
  const ensureStats=()=>{
    rosterForBat().forEach(p=>{if(!inn.batters[p.id])inn.batters[p.id]={name:p.name,runs:0,balls:0,fours:0,sixes:0,out:false,dismissal:'',fielder:'',dismissalBowler:''};});
    rosterForBowl().forEach(p=>{if(!inn.bowlers[p.id])inn.bowlers[p.id]={name:p.name,balls:0,runs:0,wickets:0,wides:0,noBalls:0};});
    const avail=rosterForBat().filter(p=>!inn.batters[p.id]?.out);
    if(!inn.strikerId&&avail[0])inn.strikerId=avail[0].id;
    if(!inn.nonStrikerId&&avail.find(p=>p.id!==inn.strikerId))inn.nonStrikerId=avail.find(p=>p.id!==inn.strikerId).id;
    if(!inn.bowlerId&&rosterForBowl()[0])inn.bowlerId=rosterForBowl()[0].id;
  };
  ensureStats();

  const choiceModal=(title,options,subtitle='')=>new Promise(resolve=>{
    const overlay=document.createElement('div');overlay.className='ct-choice-overlay';
    overlay.innerHTML=`<div class="ct-choice-modal"><div class="ct-choice-head"><div><strong>${esc(title)}</strong>${subtitle?`<small>${esc(subtitle)}</small>`:''}</div><button type="button" data-close>×</button></div><div class="ct-choice-grid">${options.map((o,i)=>`<button type="button" data-choice="${i}" class="${o.danger?'danger':''}"><b>${esc(o.label)}</b>${o.sub?`<small>${esc(o.sub)}</small>`:''}</button>`).join('')}</div></div>`;
    document.body.appendChild(overlay);
    const done=v=>{overlay.remove();resolve(v);};
    overlay.querySelector('[data-close]').onclick=()=>done(null);
    overlay.onclick=e=>{if(e.target===overlay)done(null);};
    overlay.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>done(options[Number(b.dataset.choice)]));
  });
  const choosePlayer=async(title,players)=>choiceModal(title,players.map(p=>({label:p.name,value:p.id})),`${players.length} players available`);

  const deriveInnings=(x)=>{
    let score=0,legal=0,lastWicketScore=0,lastWicketBall=0,partNo=1;
    const fow=[],parts=[],overs=[];let over=[];
    (x.balls||[]).forEach((b,idx)=>{
      score+=Number(b.runs||0);if(b.legal)legal++;
      over.push(b.label||String(b.runs||0));
      if(b.type==='wicket'){
        fow.push({score,wicket:fow.length+1,batter:b.outBatterName||nameOf(b.outBatterId||b.strikerId,rosterForBat()),over:oversText(legal)});
        parts.push({number:partNo++,runs:score-lastWicketScore,balls:legal-lastWicketBall});lastWicketScore=score;lastWicketBall=legal;
      }
      if(b.legal&&legal%6===0){overs.push({over:legal/6,balls:over.slice(),total:score});over=[];}
    });
    if(over.length)overs.push({over:`${Math.floor(legal/6)+1}*`,balls:over.slice(),total:score});
    if(score>lastWicketScore||legal>lastWicketBall)parts.push({number:partNo,runs:score-lastWicketScore,balls:legal-lastWicketBall,current:true});
    return {fow,parts,overs};
  };

  const persist=async()=>{
    match.innings=current+1;match.inningsData=inningsData;
    const ref=doc(db,'teams',team.teamId,'matches',match.id);
    await updateDoc(ref,{innings:match.innings,inningsData,status:match.status||'live',resultText:match.resultText||'',updatedAt:serverTimestamp()});
    render();
  };
  const ready=()=>{
    if(match.status==='completed'){alert('This match is completed. Scoring is locked.');return false;}
    if(!inn.strikerId||!inn.nonStrikerId||!inn.bowlerId){alert('Select Striker, Non-Striker and Bowler first.');return false;}
    return true;
  };
  const completeMatch=()=>{
    const first=inningsData[0],second=inningsData[1];
    if(!second)return;
    match.status='completed';second.completed=true;
    if(second.runs>first.runs)match.resultText=`${second.battingTeamName} won by ${10-second.wickets} wickets`;
    else if(second.runs===first.runs)match.resultText='Match tied';
    else match.resultText=`${first.battingTeamName} won by ${first.runs-second.runs} runs`;
  };
  const autoEnd=async()=>{
    if(match.status==='completed')return;
    if(inn.number===2&&inningsData[0]&&inn.runs>inningsData[0].runs){completeMatch();return;}
    if(inn.legalBalls>=Number(match.overs||20)*6||inn.wickets>=10){
      inn.completed=true;
      if(inn.number===1){if(inningsData.length<2)inningsData.push(makeInnings(2));current=1;inn=inningsData[1];ensureStats();}
      else completeMatch();
    }
  };

  const scorecardHtml=()=>inningsData.map((x,idx)=>{
    const d=deriveInnings(x);const bats=Object.values(x.batters||{}).filter(b=>b.balls||b.runs||b.out);const bowls=Object.values(x.bowlers||{}).filter(b=>b.balls||b.runs||b.wickets||b.wides||b.noBalls);
    const extras=x.extras||{};const extTotal=Object.values(extras).reduce((a,b)=>a+Number(b||0),0);
    return `<section class="ct-scorecard-innings"><div class="ct-scorecard-title"><div><strong>${esc(x.battingTeamName||`Innings ${idx+1}`)}</strong><span>${x.runs}/${x.wickets} • ${oversText(x.legalBalls)} overs</span></div>${idx===1&&inningsData[0]?`<small>Target ${inningsData[0].runs+1}</small>`:''}</div>
      <h4>BATTING</h4><div class="ct-score-table"><div class="head"><span>Batter</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span></div>${bats.map(b=>`<div><span><b>${esc(b.name)}</b><small>${esc(b.dismissal||'not out')}</small></span><span>${b.runs}</span><span>${b.balls}</span><span>${b.fours}</span><span>${b.sixes}</span><span>${b.balls?((b.runs/b.balls)*100).toFixed(1):'0.0'}</span></div>`).join('')||'<p class="ct-no-data">No batting data yet</p>'}</div>
      <div class="ct-extras-card"><b>Extras ${extTotal}</b><span>WD ${extras.wd||0} • NB ${extras.nb||0} • B ${extras.b||0} • LB ${extras.lb||0} • PEN ${extras.pen||0}</span></div>
      <h4>BOWLING</h4><div class="ct-score-table bowling"><div class="head"><span>Bowler</span><span>O</span><span>R</span><span>W</span><span>Eco</span><span>WD/NB</span></div>${bowls.map(b=>`<div><span><b>${esc(b.name)}</b></span><span>${oversText(b.balls)}</span><span>${b.runs}</span><span>${b.wickets}</span><span>${b.balls?((b.runs*6)/b.balls).toFixed(2):'0.00'}</span><span>${b.wides||0}/${b.noBalls||0}</span></div>`).join('')||'<p class="ct-no-data">No bowling data yet</p>'}</div>
      <h4>FALL OF WICKETS</h4><div class="ct-mini-list">${d.fow.length?d.fow.map(f=>`<span>${f.score}-${f.wicket} (${esc(f.batter)}, ${f.over} ov)</span>`).join(''):'<span>No wickets</span>'}</div>
      <h4>PARTNERSHIPS</h4><div class="ct-mini-list">${d.parts.map(p=>`<span>${p.current?'Current ':''}Partnership ${p.number}: <b>${p.runs}</b> runs (${p.balls} balls)</span>`).join('')}</div>
      <h4>OVER BY OVER</h4><div class="ct-over-history">${d.overs.map(o=>`<div><b>Over ${o.over}</b><span>${o.balls.map(esc).join(' • ')}</span><strong>${o.total}</strong></div>`).join('')||'<span>No overs yet</span>'}</div>
    </section>`;
  }).join('');

  const render=()=>{
    ensureStats();const first=inningsData[0];const target=inn.number===2&&first?first.runs+1:null;const ballsLeft=Math.max(0,Number(match.overs||20)*6-inn.legalBalls);const need=target?Math.max(0,target-inn.runs):0;const crr=inn.legalBalls?inn.runs/(inn.legalBalls/6):0;const rrr=target&&ballsLeft?need/(ballsLeft/6):0;
    document.getElementById('inningsLabel').textContent=`${inn.battingTeamName} • Innings ${inn.number}`;
    document.getElementById('targetLine').textContent=match.status==='completed'?'MATCH COMPLETED':target?`Target ${target} • Need ${need} from ${ballsLeft} • RRR ${rrr.toFixed(2)}`:`CRR ${crr.toFixed(2)}`;
    document.getElementById('matchResult').textContent=match.resultText||'';
    document.getElementById('liveRuns').textContent=inn.runs;document.getElementById('liveWkts').textContent=inn.wickets;document.getElementById('liveOvers').textContent=oversText(inn.legalBalls);
    const batOpts=rosterForBat().filter(p=>!inn.batters[p.id]?.out||p.id===inn.strikerId||p.id===inn.nonStrikerId).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    const bowlOpts=rosterForBowl().map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
    document.getElementById('strikerSelect').innerHTML=`<option value="">Select striker</option>${batOpts}`;document.getElementById('strikerSelect').value=inn.strikerId||'';
    document.getElementById('nonStrikerSelect').innerHTML=`<option value="">Select non-striker</option>${batOpts}`;document.getElementById('nonStrikerSelect').value=inn.nonStrikerId||'';
    document.getElementById('bowlerSelect').innerHTML=`<option value="">Select bowler</option>${bowlOpts}`;document.getElementById('bowlerSelect').value=inn.bowlerId||'';
    const st=inn.batters[inn.strikerId],ns=inn.batters[inn.nonStrikerId],bw=inn.bowlers[inn.bowlerId];
    document.getElementById('batterStats').innerHTML=st&&ns?`<div><span>STRIKER</span><b>${esc(st.name)} *</b><small>${st.runs} (${st.balls}) • 4s ${st.fours} • 6s ${st.sixes} • SR ${st.balls?((st.runs/st.balls)*100).toFixed(1):'0.0'}</small></div><div><span>NON-STRIKER</span><b>${esc(ns.name)}</b><small>${ns.runs} (${ns.balls}) • 4s ${ns.fours} • 6s ${ns.sixes}</small></div>`:'';
    document.getElementById('bowlerStats').innerHTML=bw?`<div><span>CURRENT BOWLER</span><b>${esc(bw.name)}</b><small>${oversText(bw.balls)} overs • ${bw.runs} runs • ${bw.wickets} wickets • Eco ${bw.balls?((bw.runs*6)/bw.balls).toFixed(2):'0.00'} • WD ${bw.wides||0} • NB ${bw.noBalls||0}</small></div>`:'';
    document.getElementById('extrasLine').textContent=`Extras: WD ${inn.extras.wd||0} • NB ${inn.extras.nb||0} • B ${inn.extras.b||0} • LB ${inn.extras.lb||0} • PEN ${inn.extras.pen||0}`;
    document.getElementById('liveRecent').innerHTML=(inn.balls||[]).slice(-12).map((b,i)=>`<span class="${b.type==='wicket'?'wicket':''}">${esc(b.label)}</span>`).join('');
    document.getElementById('scorecardBody').innerHTML=scorecardHtml();
    const locked=match.status==='completed';document.querySelectorAll('.ct-scoring-action,#scoreUndo,#endInnings').forEach(b=>b.disabled=locked);document.getElementById('endInnings').textContent=locked?'MATCH COMPLETED':'END INNINGS';
  };

  teamModuleShell(team,'LIVE SCORING',`${match.teamAName||team.name||team.teamId} vs ${match.teamBName||'Opponent'} • ${match.overs} overs`,`
    <section class="ct-live-score-card ct-live-v310"><div class="ct-live-match-title"><span>${match.status==='completed'?'COMPLETED':'LIVE'}</span><strong>${esc(match.teamAName||team.name||team.teamId)} vs ${esc(match.teamBName||'Opponent')}</strong><small>${esc(match.venue||'')} • ${esc(match.matchType||'')}</small></div>
    <div class="ct-innings-strip"><b id="inningsLabel"></b><span id="targetLine"></span></div><div id="matchResult" class="ct-result-line"></div>
    <div class="ct-score-main"><div><b id="liveRuns">0</b><span>RUNS</span></div><i>/</i><div><b id="liveWkts">0</b><span>WICKETS</span></div><div class="overs"><b id="liveOvers">0.0</b><span>OVERS</span></div></div>
    <div class="ct-player-selects"><label>STRIKER<select id="strikerSelect"></select></label><label>NON-STRIKER<select id="nonStrikerSelect"></select></label><label>BOWLER<select id="bowlerSelect"></select></label></div><div id="batterStats" class="ct-batter-stats"></div><div id="bowlerStats" class="ct-bowler-stats"></div>
    <div class="ct-score-buttons">${[0,1,2,3,4,6].map(n=>`<button class="ct-scoring-action" data-run="${n}">${n}</button>`).join('')}<button class="wicket ct-scoring-action" id="scoreWicket">WICKET</button><button class="undo" id="scoreUndo">UNDO</button></div>
    <div class="ct-extra-buttons"><button class="ct-scoring-action" data-extra="wd">WIDE</button><button class="ct-scoring-action" data-extra="nb">NO BALL</button><button class="ct-scoring-action" data-extra="b">BYE</button><button class="ct-scoring-action" data-extra="lb">LEG BYE</button></div><div id="extrasLine" class="ct-extras-line"></div>
    <div id="liveRecent" class="ct-recent-balls"></div><div class="ct-live-tools"><button id="endInnings">END INNINGS</button><button id="showScorecard">PREMIUM SCORECARD</button></div><div id="scorecardPanel" class="ct-scorecard-panel premium"><div class="ct-scorecard-head"><h3>CRICTRACK SCORECARD</h3><span>Batting • Bowling • FOW • Partnerships • Overs</span></div><div id="scorecardBody"></div></div><div id="liveError" class="error"></div></section>`);

  document.getElementById('strikerSelect').onchange=e=>{inn.strikerId=e.target.value;render();};
  document.getElementById('nonStrikerSelect').onchange=e=>{inn.nonStrikerId=e.target.value;render();};
  document.getElementById('bowlerSelect').onchange=e=>{inn.bowlerId=e.target.value;render();};

  document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{
    if(!ready())return;undoStack.push(snapshot());const n=Number(b.dataset.run),st=inn.batters[inn.strikerId],bw=inn.bowlers[inn.bowlerId];
    inn.runs+=n;inn.legalBalls++;st.runs+=n;st.balls++;if(n===4)st.fours++;if(n===6)st.sixes++;bw.balls++;bw.runs+=n;
    inn.balls.push({id:`${Date.now()}-${Math.random()}`,label:String(n),runs:n,legal:true,type:'run',strikerId:inn.strikerId,bowlerId:inn.bowlerId});
    if(n%2===1)swap();if(inn.legalBalls%6===0)swap();await autoEnd();try{await persist();}catch(ex){alert(friendlyError(ex));}
  });

  document.querySelectorAll('[data-extra]').forEach(b=>b.onclick=async()=>{
    if(!ready())return;const type=b.dataset.extra;let selected=null;
    if(type==='wd')selected=await choiceModal('Wide Runs',[1,2,3,4,5].map(n=>({label:`${n} Wide${n>1?'s':''}`,value:{runs:n,label:`${n}Wd`}})),'Select total wide runs');
    if(type==='b')selected=await choiceModal('Bye Runs',[1,2,3,4,5,6].map(n=>({label:`${n} Bye${n>1?'s':''}`,value:{runs:n,label:`${n}B`}})),'Legal delivery');
    if(type==='lb')selected=await choiceModal('Leg Bye Runs',[1,2,3,4,5,6].map(n=>({label:`${n} Leg Bye${n>1?'s':''}`,value:{runs:n,label:`${n}Lb`}})),'Legal delivery');
    if(type==='nb')selected=await choiceModal('No Ball',[{label:'1 No Ball',sub:'No bat runs',value:{runs:1,batRuns:0,label:'1Nb'}},{label:'No Ball + 1 Bat Run',value:{runs:2,batRuns:1,label:'Nb+1'}},{label:'No Ball + 2 Bat Runs',value:{runs:3,batRuns:2,label:'Nb+2'}},{label:'No Ball + 3 Bat Runs',value:{runs:4,batRuns:3,label:'Nb+3'}},{label:'No Ball + FOUR',value:{runs:5,batRuns:4,label:'Nb+4'}},{label:'No Ball + SIX',value:{runs:7,batRuns:6,label:'Nb+6'}}],'Illegal delivery • Next ball remains');
    if(!selected)return;const v=selected.value;undoStack.push(snapshot());const st=inn.batters[inn.strikerId],bw=inn.bowlers[inn.bowlerId];const runs=Number(v.runs||0),batRuns=Number(v.batRuns||0);inn.runs+=runs;const legal=type==='b'||type==='lb';
    if(type==='wd'){inn.extras.wd+=runs;bw.wides+=runs;bw.runs+=runs;}
    if(type==='nb'){inn.extras.nb+=1;bw.noBalls+=1;bw.runs+=runs;st.runs+=batRuns;if(batRuns===4)st.fours++;if(batRuns===6)st.sixes++;}
    if(type==='b'){inn.extras.b+=runs;}
    if(type==='lb'){inn.extras.lb+=runs;}
    if(legal){inn.legalBalls++;st.balls++;bw.balls++;}if(type==='nb'&&batRuns%2===1)swap();else if(type!=='nb'&&runs%2===1)swap();
    inn.balls.push({id:`${Date.now()}-${Math.random()}`,label:v.label||String(runs),runs,batRuns,legal,type,strikerId:inn.strikerId,bowlerId:inn.bowlerId});if(legal&&inn.legalBalls%6===0)swap();await autoEnd();try{await persist();}catch(ex){alert(friendlyError(ex));}
  });

  document.getElementById('scoreWicket').onclick=async()=>{
    if(!ready()||inn.wickets>=10)return;
    const wt=await choiceModal('Select Wicket Type',[{label:'Bowled',value:'Bowled'},{label:'Caught',value:'Caught'},{label:'LBW',value:'LBW'},{label:'Run Out',value:'Run Out'},{label:'Stumped',value:'Stumped'},{label:'Hit Wicket',value:'Hit Wicket'},{label:'Retired Out',value:'Retired Out'}],'Tap the dismissal type');if(!wt)return;
    const type=wt.value;let outId=inn.strikerId,completedRuns=0,fielder='',dismissalBowler=inn.bowlerId;
    if(type==='Run Out'){
      const out=await choiceModal('Who is Run Out?',[{label:nameOf(inn.strikerId,rosterForBat()),value:inn.strikerId},{label:nameOf(inn.nonStrikerId,rosterForBat()),value:inn.nonStrikerId}],'Select dismissed batter');if(!out)return;outId=out.value;
      const rr=await choiceModal('Completed Runs',[0,1,2,3,4,5,6].map(n=>({label:`${n} run${n===1?'':'s'} + wicket`,value:n})),'Runs completed before the wicket');if(!rr)return;completedRuns=rr.value;
      const fp=await choosePlayer('Run Out Fielder',rosterForBowl());if(fp)fielder=fp.label;
    }else if(type==='Caught'||type==='Stumped'){
      const fp=await choosePlayer(type==='Caught'?'Select Catcher':'Select Wicketkeeper',rosterForBowl());if(fp)fielder=fp.label;
    }
    undoStack.push(snapshot());const st=inn.batters[inn.strikerId],outB=inn.batters[outId],bw=inn.bowlers[inn.bowlerId];
    if(completedRuns){inn.runs+=completedRuns;if(st&&!st.out)st.runs+=completedRuns;if(completedRuns%2===1)swap();}
    inn.wickets++;inn.legalBalls++;if(st)st.balls++;bw.balls++;if(type!=='Run Out'&&type!=='Retired Out')bw.wickets++;
    if(outB){outB.out=true;outB.dismissal=type==='Caught'?`c ${fielder||'fielder'} b ${bw.name}`:type==='Stumped'?`st ${fielder||'wk'} b ${bw.name}`:type==='Run Out'?`run out (${fielder||'fielder'})`:type==='Retired Out'?'retired out':`${type.toLowerCase()}${type==='Bowled'||type==='LBW'||type==='Hit Wicket'?` b ${bw.name}`:''}`;outB.fielder=fielder;outB.dismissalBowler=type==='Run Out'||type==='Retired Out'?'':bw.name;}
    inn.balls.push({id:`${Date.now()}-${Math.random()}`,label:completedRuns?`${completedRuns}+W`:'W',runs:completedRuns,legal:true,type:'wicket',wicketType:type,outBatterId:outId,outBatterName:outB?.name||'',fielder,strikerId:inn.strikerId,bowlerId:inn.bowlerId});
    if(outId===inn.strikerId)inn.strikerId='';else if(outId===inn.nonStrikerId)inn.nonStrikerId='';if(inn.legalBalls%6===0)swap();ensureStats();await autoEnd();try{await persist();}catch(ex){alert(friendlyError(ex));}
  };

  document.getElementById('scoreUndo').onclick=async()=>{const prev=undoStack.pop();if(!prev){alert('Undo is available for scoring actions made in this open session.');return;}inningsData=prev.inningsData;current=prev.current;match.status=prev.status;match.resultText=prev.resultText;inn=inningsData[current];try{await persist();}catch(ex){alert(friendlyError(ex));}};
  document.getElementById('endInnings').onclick=async()=>{if(match.status==='completed')return;if(!confirm('End the current innings now?'))return;undoStack.push(snapshot());inn.completed=true;if(inn.number===1){if(inningsData.length<2)inningsData.push(makeInnings(2));current=1;inn=inningsData[1];ensureStats();}else completeMatch();await persist();};
  document.getElementById('showScorecard').onclick=()=>document.getElementById('scorecardPanel').classList.toggle('open');render();
}

function tournamentPdfStudio(user,t){
  shell(`<main class="dashboard premium-dashboard"><div class="topbar"><div><div class="admin-chip">PDF STUDIO</div><h2 class="section-title">${esc(t.name||t.tournamentId)}</h2><p class="section-copy">Premium tournament registration and organizer PDFs.</p></div><button class="logout" id="tourPdfBack">Dashboard</button></div><div class="ct-pdf-action-grid"><button id="tourProfilePdf"><b>TOURNAMENT PROFILE</b><span>Premium organizer brochure</span></button><button id="tourRegCert"><b>REGISTRATION CERTIFICATE</b><span>Official CricTrack registration proof</span></button><button id="tourContactPdf"><b>ORGANIZER CONTACT SHEET</b><span>Shareable tournament contact PDF</span></button></div></main>`,'TOURNAMENT • PDF STUDIO');
  document.getElementById('tourPdfBack').onclick=()=>tournamentDashboard(user,t);
  const open=(title,body,landscape=false)=>{const w=window.open('','_blank');if(!w)return alert('Allow pop-ups to create PDF.');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4 ${landscape?'landscape':'portrait'};margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial;background:#eef4fb;color:#10233f;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.page{width:${landscape?'297mm':'210mm'};min-height:${landscape?'210mm':'297mm'};padding:16mm;background:linear-gradient(160deg,#031127,#074a99);color:#fff}.card{background:#fff;color:#10233f;border-radius:6mm;padding:8mm;margin-top:8mm}.tag{color:#6ecaff;letter-spacing:1px;font-weight:900}.title{font-size:12mm;font-weight:900;margin:5mm 0}.k{display:grid;grid-template-columns:repeat(2,1fr);gap:4mm}.k div{background:#f4f9ff;border:1px solid #cce0f3;border-radius:4mm;padding:5mm}.k b{display:block;color:#096bc8;font-size:5mm}.foot{margin-top:10mm;border-top:1px solid rgba(255,255,255,.25);padding-top:4mm;color:#b9dcff}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300);<\/script></body></html>`);w.document.close();};
  const details=`<div class="k"><div><span>Tournament ID</span><b>${esc(t.tournamentId||'—')}</b></div><div><span>City</span><b>${esc(t.city||'—')}</b></div><div><span>Organizer</span><b>${esc(t.organizerName||'—')}</b></div><div><span>Mobile</span><b>${esc(t.mobile||'—')}</b></div><div><span>Email</span><b>${esc(t.contactEmail||'—')}</b></div><div><span>Start Date</span><b>${esc(t.startDate||'Not set')}</b></div></div>`;
  document.getElementById('tourProfilePdf').onclick=()=>open(`${t.name} - Tournament Profile`,`<section class="page"><div class="tag">CRICTRACK • PREMIUM TOURNAMENT PROFILE</div><div class="title">${esc(t.name||t.tournamentId)}</div><p>Organize • Score • Publish • Promote</p><div class="card">${details}<h3>Tournament Workspace</h3><p>Registered on CricTrack with a secure Tournament ID. This profile can be shared with teams, officials, sponsors and venues.</p></div><div class="foot">CricTrack • Track Every Run. Celebrate Every Win.</div></section>`);
  document.getElementById('tourRegCert').onclick=()=>open(`${t.name} - Registration Certificate`,`<section class="page"><div style="text-align:center;margin-top:24mm"><div class="tag">CRICTRACK • DIGITAL CERTIFICATE</div><div class="title">TOURNAMENT REGISTRATION</div><p>This certifies that</p><div style="font-size:14mm;font-weight:900;margin:10mm">${esc(t.name||t.tournamentId)}</div><p>is registered on CricTrack under Tournament ID <b>${esc(t.tournamentId||'')}</b>.</p><div class="card">${details}</div><div class="foot">Secure digital tournament workspace • CricTrack</div></div></section>`,true);
  document.getElementById('tourContactPdf').onclick=()=>open(`${t.name} - Organizer Contact`,`<section class="page"><div class="tag">CRICTRACK • TOURNAMENT CONTACT SHEET</div><div class="title">${esc(t.name||t.tournamentId)}</div><div class="card">${details}<h3>Organizer Contact</h3><p><b>${esc(t.organizerName||'Organizer')}</b><br>${esc(t.mobile||'')}<br>${esc(t.contactEmail||'')}</p></div><div class="foot">Share this sheet with teams, officials, venues and sponsors.</div></section>`);
}

function tournamentDashboard(user,t){shell(`<main class="dashboard ct-dashboard-shell ct-tournament-dashboard-v240"><div class="ct-dash-hero tournament"><div><div class="ct-dash-role">🏆 TOURNAMENT WORKSPACE</div><h2>${esc(t.name||t.tournamentId)}</h2><p>Tournament ID: ${esc(t.tournamentId||'')} • Setup workspace</p></div><button class="ct-dash-logout" id="tourLogout">Logout</button></div><div class="ct-dash-stats tournament-stats"><div><b>✓</b><span>Registered</span></div><div><b>⚙</b><span>Setup Ready</span></div><div><b>📅</b><span>Fixtures</span></div><div><b>🔒</b><span>Secure</span></div></div><div class="ct-dash-title"><strong>TOURNAMENT DASHBOARD</strong><span>Organize • Monitor • Publish</span></div><div class="ct-dash-grid tournament-grid-v240"><button class="ct-dash-card purple"><div>👥</div><strong>TEAMS</strong><small>Add, invite & manage teams</small></button><button class="ct-dash-card purple"><div>🧍</div><strong>PLAYERS</strong><small>Registration & approvals</small></button><button class="ct-dash-card green"><div>📅</div><strong>FIXTURES</strong><small>Create & schedule fixtures</small></button><button class="ct-dash-card blue" id="tourStartMatch"><div>📡</div><strong>LIVE MATCHES</strong><small>Start or monitor matches</small></button><button class="ct-dash-card blue"><div>✅</div><strong>RESULTS</strong><small>Results & full scorecards</small></button><button class="ct-dash-card orange"><div>📊</div><strong>POINTS TABLE</strong><small>Standings & qualification</small></button><button class="ct-dash-card orange"><div>🏆</div><strong>KNOCKOUTS</strong><small>Playoffs, semis & final</small></button><button class="ct-dash-card green"><div>📈</div><strong>STATISTICS</strong><small>Players, teams & records</small></button><button class="ct-dash-card red"><div>🥇</div><strong>AWARDS</strong><small>Awards & tournament honours</small></button><button class="ct-dash-card blue"><div>🏟️</div><strong>VENUES</strong><small>Grounds & availability</small></button><button class="ct-dash-card purple"><div>🔔</div><strong>ANNOUNCEMENTS</strong><small>Teams, officials & public</small></button><button class="ct-dash-card blue" id="tourPdfStudio"><div>📄</div><strong>PDF STUDIO</strong><small>Profile, certificate & contact PDFs</small></button><button class="ct-dash-card red"><div>⚙️</div><strong>SETTINGS</strong><small>Rules, branding & security</small></button></div><div class="ct-dash-secure">🛡️ <span><strong>Tournament workspace securely connected</strong><small>Setup data is saved in real time</small></span></div></main>`,'TOURNAMENT • SETUP WORKSPACE');document.getElementById('tourLogout').onclick=async()=>{await signOut(auth);home();};document.getElementById('tourStartMatch').onclick=()=>alert(t.canStartMatch?'Match start access active. Live Match module is the next coding phase.':'Subscription is required when you start tournament matches. Your setup data remains safe.');document.getElementById('tourPdfStudio').onclick=()=>tournamentPdfStudio(user,t);}
function scorerDashboard(user,u){shell(`<main class="dashboard premium-dashboard"><div class="topbar"><div><div class="admin-chip">🧑‍💻 SCORER</div><h2 class="section-title">My Matches</h2><p class="section-copy">Only matches assigned to this scorer will appear here.</p></div><button class="logout" id="scorerLogout">Logout</button></div><div class="empty-state"><div>🏏</div><strong>No assigned matches yet</strong><span>Tournament Admin can assign multiple scorers to different simultaneous matches.</span></div></main>`,'SCORER • ASSIGNED MATCHES');document.getElementById('scorerLogout').onclick=async()=>{await signOut(auth);home();};}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
onAuthStateChanged(auth,async user=>{if(authRoutingPaused)return;if(!user){home();return;}try{const a=await getDoc(doc(db,'admins',user.uid));if(a.exists()&&a.data().role==='superadmin')return adminDashboard(user);}catch{}try{const u=await getDoc(doc(db,'users',user.uid));if(u.exists()){const d=u.data();if(d.role==='team'){const s=await getDoc(doc(db,'teams',d.teamId));if(s.exists())return teamDashboard(user,s.data());}if(d.role==='tournament'){const s=await getDoc(doc(db,'tournaments',d.tournamentId));if(s.exists())return tournamentDashboard(user,s.data());}if(d.role==='scorer')return scorerDashboard(user,d);}}catch{}await signOut(auth).catch(()=>{});home();});
