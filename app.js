// app.js - lógica para cargar lecciones, quizzes y simuladores
async function loadLessons(){
  const res = await fetch('lessons.json');
  const data = await res.json();
  return data.lessons;
}

const LESSON_META = {
  'http-https': { ports: ['80','443'], task: 'nmap -sV -p 80,443 <host>' },
  'ftp': { ports: ['21'], task: 'nmap -sV -p 21 <host>' },
  'sftp': { ports: ['22'], task: 'nmap -sV -p 22 <host>' },
  'smtp': { ports: ['25','587','465'], task: 'nmap -sV -p 25,587,465 <host>' },
  'pop3-imap': { ports: ['110','143','993','995'], task: 'nmap -sV -p 110,143,993,995 <host>' },
  'ssh': { ports: ['22'], task: 'nmap -sV -p 22 <host>' },
  'telnet': { ports: ['23'], task: 'nmap -sV -p 23 <host>' },
  'rdp': { ports: ['3389'], task: 'nmap -sV -p 3389 <host>' },
  'dns': { ports: ['53'], task: 'nmap -sU -p 53 <host>' },
  'dhcp': { ports: ['67','68'], task: 'nmap -sU -p 67,68 <host>' },
  'snmp': { ports: ['161'], task: 'nmap -sU -p 161 <host>' },
  'tftp': { ports: ['69'], task: 'nmap -sU -p 69 <host>' },
  'sip': { ports: ['5060','5061'], task: 'nmap -sU -p 5060,5061 <host>' },
  'ntp': { ports: ['123'], task: 'nmap -sU -p 123 <host>' },
  'smb': { ports: ['445'], task: 'nmap -sV -p 445 <host>' },
  'ldap': { ports: ['389','636'], task: 'nmap -sV -p 389,636 <host>' },
  'icmp': { ports: [], task: 'ping <host>' },
  'arp': { ports: [], task: 'arp -a' },
  'tcp-udp': { ports: ['TCP','UDP'], task: 'nmap -sS -p 22,80,443 <host>' }
};

function byId(id){return document.getElementById(id)}

function renderLessonList(lessons){
  const ul = byId('lesson-list');
  ul.innerHTML = '';
  lessons.forEach(l=>{
    const li = document.createElement('li');
    const meta = LESSON_META[l.id];
    li.textContent = l.title;
    if(meta?.ports?.length){
      const badge = document.createElement('span');
      badge.className = 'badge bg-success ms-2';
      badge.textContent = meta.ports.join('/')
      li.appendChild(badge);
    }
    li.onclick = ()=>openLesson(l);
    ul.appendChild(li);
  })
}

function openLesson(lesson){
  byId('lesson-title').textContent = lesson.title;
  const contentEl = byId('lesson-content'); contentEl.innerHTML='';
  const p = document.createElement('p'); p.textContent = lesson.content; contentEl.appendChild(p);
  const meta = LESSON_META[lesson.id];
  if(meta?.ports?.length){ const ports=document.createElement('div'); ports.className='badge bg-success'; ports.textContent='Puertos: '+meta.ports.join(', '); contentEl.appendChild(ports); }
  byId('interactive-area').innerHTML = '';
  byId('quiz').classList.remove('hidden');
  currentLesson = lesson;
  renderQuiz(lesson.quiz);
  if(lesson.interactive === 'osi-drag') renderOsiDrag();
  if(lesson.interactive === 'sim-compare') { /* hint shown in simulator */ }
  if(lesson.interactive === 'arp') renderArpSim();
  if(lesson.interactive === 'dns') renderDnsSim();
  if(lesson.interactive === 'icmp') renderIcmpSim();
  if(lesson.interactive === 'dhcp') renderDhcpSim();
  if(lesson.interactive === 'tls') renderTlsSim();
  if(lesson.interactive === 'nmap') renderNmapSim();
  renderTask(lesson);
}

// --- QUIZ ---
let currentLesson = null;
function renderQuiz(quiz){
  if(!quiz) { byId('quiz').classList.add('hidden'); return }
  byId('quiz').classList.remove('hidden');
  byId('quiz-question').textContent = quiz.q;
  const container = byId('quiz-answers'); container.innerHTML = '';
  quiz.options.forEach((opt,i)=>{
    const btn = document.createElement('button');
    btn.className='chip'; btn.textContent = opt; btn.onclick = ()=>{
      const result = byId('quiz-result');
      if(i===quiz.a){ result.textContent = '✅ ¡Correcto!'; result.className=''; markLessonComplete(currentLesson?.id); renderTask(currentLesson); }
      else{ result.textContent = '❌ Incorrecto. Intenta otra vez.'; result.className=''; }
    };
    container.appendChild(btn);
  })
}

// --- OSI drag-drop mini-game ---
function renderOsiDrag(){
  const area = byId('interactive-area');
  const layers = ["Física","Enlace","Red","Transporte","Sesión","Presentación","Aplicación"];
  const shuffled = layers.slice().sort(()=>Math.random()-0.5);
  const instr = document.createElement('p'); instr.textContent='Arrastra las capas en orden desde Física (abajo) hasta Aplicación (arriba).';
  area.appendChild(instr);
  const source = document.createElement('div'); source.className='drop-target';
  shuffled.forEach(name=>{
    const chip = document.createElement('div'); chip.className='chip'; chip.draggable=true; chip.textContent=name;
    chip.ondragstart = e=>{ e.dataTransfer.setData('text/plain', name); }
    source.appendChild(chip);
  })
  area.appendChild(source);
  const target = document.createElement('div'); target.className='drop-target';
  layers.forEach((slotName,idx)=>{
    const slot = document.createElement('div'); slot.className='slot'; slot.dataset.pos=idx; slot.textContent=slotName+': (arrastra aquí)';
    slot.ondragover = e=>e.preventDefault();
    slot.ondrop = e=>{
      e.preventDefault(); const name = e.dataTransfer.getData('text/plain'); slot.textContent = slotName+' → '+name; slot.classList.add('correct');
      checkOsiAnswer(target, layers);
    }
    target.appendChild(slot);
  })
  area.appendChild(target);
}

function checkOsiAnswer(target, layers){
  const slots = Array.from(target.querySelectorAll('.slot'));
  if(slots.every(s=>s.textContent.includes('→'))){
    // verify order: user placed names after colon; we compare
    const placed = slots.map(s=>s.textContent.split('→')[1].trim());
    const correct = layers.slice(); // Física..Aplicación
    // Note: our slots are ordered Física->Aplicación, correct should match that order
    if(placed.join('|')===correct.join('|')){
      const note = document.createElement('div'); note.textContent='🎉 ¡Perfecto! Has ordenado correctamente.'; note.className='card'; document.getElementById('interactive-area').appendChild(note);
    } else {
      const note = document.createElement('div'); note.textContent='Intenta de nuevo: algunas posiciones no coinciden.'; note.className='card'; document.getElementById('interactive-area').appendChild(note);
    }
  }
}

// --- Simulador simple de paquetes ---
function setupSimulator(){
  byId('start-sim').onclick = ()=>{
    byId('simulator').classList.toggle('hidden');
  }
  byId('send-pkt').onclick = ()=>sendPacket();
}

function logSim(msg){
  const log = byId('sim-log'); const p = document.createElement('div'); p.textContent = msg; log.prepend(p);
}

function sendPacket(){
  const proto = byId('proto-select').value;
  const dropPct = Number(byId('drop-pct').value);
  const canvas = byId('net-canvas'); const ctx = canvas.getContext('2d');
  // simple animation: sender at left, receiver at right
  const startX=40, endX=640, y=70; const radius=10; let x=startX;
  const shouldDrop = proto==='UDP' && Math.random()*100 < dropPct;
  logSim(`Enviando paquete via ${proto}...`);
  const id = setInterval(()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    // nodes
    ctx.fillStyle='#0f172a'; ctx.fillRect(20,50,8,40); ctx.fillRect(660,50,8,40);
    // link
    ctx.strokeStyle='#cbd5e1'; ctx.beginPath(); ctx.moveTo(30,y); ctx.lineTo(660,y); ctx.stroke();
    // packet
    ctx.fillStyle = proto==='TCP' ? '#2b6df6' : '#f97316'; ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2); ctx.fill();
    x += 8;
    if(x> endX){ clearInterval(id);
      if(shouldDrop){ logSim('📭 Paquete perdido (simulado).'); flashMessage('Paquete perdido'); }
      else { logSim('✅ Paquete recibido correctamente.'); flashMessage('Paquete entregado'); }
    }
  },30)
}

function flashMessage(txt){
  const el = document.createElement('div'); el.className='card'; el.textContent = txt; const area = byId('simulator'); area.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}

function renderStepFlow(steps){
  const area = byId('interactive-area');
  const wrap = document.createElement('div'); wrap.className='drop-target';
  const stage = document.createElement('div'); stage.className='card';
  const text = document.createElement('div'); text.textContent = steps[0];
  const btn = document.createElement('button'); btn.className='chip'; btn.textContent='Siguiente';
  let i = 0;
  btn.onclick = ()=>{ i = Math.min(i+1, steps.length-1); text.textContent = steps[i]; if(i===steps.length-1){ btn.disabled=true; btn.textContent='Fin'; markLessonInteractiveDone(currentLesson?.id); }};
  stage.appendChild(text);
  stage.appendChild(btn);
  wrap.appendChild(stage);
  area.appendChild(wrap);
}

function renderArpSim(){
  renderStepFlow([
    'Host A emite ARP Request (broadcast) preguntando por la MAC de 192.168.1.10',
    'Host B recibe el broadcast y responde con ARP Reply indicando su MAC',
    'Host A actualiza su tabla ARP y ya puede enviar tramas al destino'
  ]);
}

function renderDnsSim(){
  renderStepFlow([
    'Cliente consulta al resolvedor local por www.ejemplo.com',
    'Resolvedor pregunta a servidores root por el TLD .com',
    'Resolvedor consulta al servidor TLD .com por ejemplo.com',
    'Resolvedor consulta al autoritativo de ejemplo.com y obtiene la IP',
    'Resolvedor cachea y responde al cliente con la dirección IP'
  ]);
}

function renderIcmpSim(){
  renderStepFlow([
    'Host A envía Echo Request al destino',
    'Routers encaminan el paquete según tablas de ruta',
    'Host B recibe y responde con Echo Reply',
    'Host A confirma conectividad con el tiempo de ida y vuelta'
  ]);
}

function renderDhcpSim(){
  renderStepFlow([
    'Cliente envía Discover para buscar servidor DHCP',
    'Servidor responde Offer con parámetros propuestos',
    'Cliente envía Request aceptando la oferta',
    'Servidor envía Ack confirmando la concesión'
  ]);
}

function renderTlsSim(){
  renderStepFlow([
    'Cliente envía ClientHello con suites soportadas',
    'Servidor responde ServerHello y entrega su certificado',
    'Intercambio de claves y establecimiento de secreto compartido',
    'Handshake finalizado; canal cifrado listo para HTTP'
  ]);
}

function renderTask(lesson){
  const meta = LESSON_META[lesson.id]; if(!meta?.task) return;
  const area = byId('interactive-area');
  const p = loadProgress(); const done = !!p[lesson.id]?.quiz;
  const card = document.createElement('div'); card.className='card';
  const title = document.createElement('div'); title.textContent = 'Tarea de práctica (terminal simulada)';
  const cmd = document.createElement('code'); cmd.textContent = meta.task;
  const btn = document.createElement('button'); btn.className='btn btn-outline-success ms-2'; btn.textContent= done ? 'Abrir terminal con comando' : 'Completa el quiz para desbloquear'; btn.disabled = !done;
  btn.onclick = ()=>openTerminalWithCommand(meta.task.replace('<host>','192.168.1.10'));
  card.appendChild(title); card.appendChild(cmd); card.appendChild(btn);
  area.appendChild(card);
}

function openTerminalWithCommand(command){
  const input = byId('term-input'); if(input){ input.value = command; }
  const modalEl = document.getElementById('terminalModal');
  if(window.bootstrap && modalEl){ const m = new bootstrap.Modal(modalEl); m.show(); }
}

function renderNmapSim(){
  const area = byId('interactive-area');
  const panel = document.createElement('div'); panel.className='card';
  const form = document.createElement('div'); form.className='sim-controls';
  form.innerHTML = `
    <label>Host: <input id="nmap-host" placeholder="192.168.1.10" value="192.168.1.10"/></label>
    <label>Tipo: 
      <select id="nmap-type">
        <option value="ping">Ping scan (-sn)</option>
        <option value="syn">SYN scan (-sS)</option>
        <option value="udp">UDP scan (-sU)</option>
        <option value="version">Detección de versión (-sV)</option>
      </select>
    </label>
    <button id="nmap-run" class="btn btn-success">Ejecutar (simulado)</button>
  `;
  const out = document.createElement('div'); out.className='log'; out.id='nmap-out';
  panel.appendChild(form); panel.appendChild(out); area.appendChild(panel);

  byId('nmap-run').onclick = ()=>{
    const host = byId('nmap-host').value || '192.168.1.10';
    const type = byId('nmap-type').value;
    const lines = simulateNmap(host, type);
    out.innerHTML = '';
    lines.forEach(l=>{ const d=document.createElement('div'); d.textContent=l; out.appendChild(d); });
  };
}

function simulateNmap(host, type){
  const ts = new Date().toISOString().replace('T',' ').split('.')[0];
  const base = [`Starting Nmap 7.94 (sim) at ${ts}`, `Nmap scan report for ${host}`];
  if(type==='ping') return base.concat([
    `Host is up (simulated).`, `rtt: 3.1 ms`, `MAC Address: 00:11:22:33:44:55 (sim)`
  ,`Simulation note: usa ICMP/ARP para descubrimiento, sin tráfico real.`]);
  if(type==='syn') return base.concat([
    `PORT    STATE  SERVICE`, `22/tcp  open   ssh`, `80/tcp  open   http`, `443/tcp open   https`, `445/tcp closed microsoft-ds`
  ,`Simulation note: SYN stealth, no handshake completo.`]);
  if(type==='udp') return base.concat([
    `PORT    STATE         SERVICE`, `53/udp  open          domain`, `123/udp open|filtered ntp`, `161/udp open          snmp`
  ,`Simulation note: respuestas UDP pueden ser silenciosas (open|filtered).`]);
  if(type==='version') return base.concat([
    `PORT    STATE  SERVICE VERSION`, `22/tcp  open   ssh     OpenSSH 8.9 (sim)`, `80/tcp  open   http    nginx 1.23 (sim)`, `443/tcp open   https   nginx 1.23 (sim) TLS1.3`
  ,`Service detection performed (sim).`]);
  return base.concat([`No scan type selected.`]);
}

function loadProgress(){
  try{ return JSON.parse(localStorage.getItem('progress')||'{}'); }catch{ return {}; }
}
function saveProgress(p){ localStorage.setItem('progress', JSON.stringify(p)); }
function markLessonComplete(id){ if(!id) return; const p = loadProgress(); p[id] = p[id]||{}; p[id].quiz = true; saveProgress(p); updateProgressUI(); }
function markLessonInteractiveDone(id){ if(!id) return; const p = loadProgress(); p[id] = p[id]||{}; p[id].interactive = true; saveProgress(p); updateProgressUI(); }
function completionRate(lessons){ const p = loadProgress(); const total = lessons.length; const done = lessons.filter(l=>p[l.id]?.quiz).length; return { done, total, pct: total? Math.round(done*100/total):0 } }
function renderProgressMenu(lessons){
  const grid = byId('progress-cards'); if(!grid) return; grid.innerHTML=''; grid.className='progress-grid';
  const p = loadProgress(); const user = (JSON.parse(localStorage.getItem('user')||'{}').username)||'usr';
  lessons.forEach(l=>{
    const quizDone = !!p[l.id]?.quiz; const interDone = !!p[l.id]?.interactive; const pct = (quizDone?50:0)+(interDone?50:0);
    const card = document.createElement('div'); card.className='progress-card'; card.style.cursor='pointer'; card.onclick=()=>openLesson(l);
    const lock = document.createElement('div'); lock.className='lock'+(pct===100?' unlocked':''); lock.textContent = pct===100 ? '🔓' : '🔒';
    const date = document.createElement('div'); date.className='date'; date.textContent = new Date().toLocaleDateString('es-ES',{day:'2-digit', month:'short', year:'numeric'});
    const title = document.createElement('div'); title.className='title'; title.textContent = l.title;
    const sub = document.createElement('div'); sub.className='sub'; sub.textContent = quizDone? 'Quiz completado' : 'Prototyping';
    const label = document.createElement('div'); label.className='sub'; label.textContent = 'Progreso';
    const line = document.createElement('div'); line.className='line';
    const fill = document.createElement('div'); fill.className='fill'; fill.style.width = pct+'%'; line.appendChild(fill);
    const footer = document.createElement('div'); footer.className='footer';
    const avatars = document.createElement('div'); avatars.className='avatars';
    const a1 = document.createElement('div'); a1.className='avatar'; a1.textContent = (user[0]||'U').toUpperCase();
    const a2 = document.createElement('div'); a2.className='avatar'; a2.textContent = 'AI';
    avatars.appendChild(a2); avatars.appendChild(a1);
    const pill = document.createElement('div'); pill.className='pill'; pill.textContent = pct===100? 'Completado' : 'En curso';
    card.appendChild(lock); card.appendChild(date); card.appendChild(title); card.appendChild(sub); card.appendChild(label); card.appendChild(line); card.appendChild(footer);
    footer.appendChild(avatars); footer.appendChild(pill);
    grid.appendChild(card);
  })
}
function updateProgressUI(){
  if(!window.__lessons) return;
  const {pct} = completionRate(window.__lessons);
  const fill = byId('progress-fill'); if(fill) fill.style.width = pct+'%';
  renderProgressMenu(window.__lessons);
  renderCertificateButton();
}

function renderCertificateButton(){
  const btn = byId('cert-btn'); if(!btn) return;
  const {pct} = completionRate(window.__lessons||[]);
  if(pct===100){ btn.classList.remove('hidden'); btn.onclick = generateCertificate; }
  else { btn.classList.add('hidden'); }
}

function generateCertificate(){
  const user = (JSON.parse(localStorage.getItem('user')||'{}').username)||'Usuario';
  const canvas = document.getElementById('cert-canvas'); const ctx = canvas.getContext('2d');
  const bg = new Image(); bg.src = 'imagen/image.png';
  bg.onload = ()=>{
    ctx.drawImage(bg,0,0,canvas.width,canvas.height);
    ctx.fillStyle = 'rgba(0,10,8,.6)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#00ff88'; ctx.font = '48px JetBrains Mono, monospace'; ctx.textAlign='center';
    ctx.fillText('Curso de Puertos — Finalizado', canvas.width/2, 180);
    ctx.fillStyle = '#b8ffdf'; ctx.font = '28px JetBrains Mono, monospace';
    ctx.fillText('Otorgado a', canvas.width/2, 240);
    ctx.fillStyle = '#00ff88'; ctx.font = '40px JetBrains Mono, monospace';
    ctx.fillText(user, canvas.width/2, 290);
    ctx.fillStyle = '#b8ffdf'; ctx.font = '22px JetBrains Mono, monospace';
    ctx.fillText(new Date().toLocaleDateString('es-ES'), canvas.width/2, 340);
    const data = canvas.toDataURL('image/png'); const dl = document.getElementById('cert-download'); if(dl){ dl.href = data; }
    const modalEl = document.getElementById('certModal'); if(window.bootstrap && modalEl){ const m = new bootstrap.Modal(modalEl); m.show(); }
  };
}

// --- Autenticación básica con SweetAlert2 ---
function setupAuth(){
  try{
    const user = JSON.parse(localStorage.getItem('user')||'null');
    if(user && user.username){ return; }
  }catch{}
  const ask = async()=>{
    const res = await Swal.fire({
      title: 'Bienvenido',
      text: '¿Quieres crear una cuenta o ingresar?',
      showDenyButton: true,
      confirmButtonText: 'Crear cuenta',
      denyButtonText: 'Ingresar',
      allowOutsideClick: false,
      allowEscapeKey: false
    });
    if(res.isConfirmed){ await registerUser(); } else { await loginUser(); }
  };
  ask();
}

async function registerUser(){
  const { value } = await Swal.fire({
    title: 'Crear cuenta',
    html: '<input id="swal-user" class="swal2-input" placeholder="Usuario" />'+
          '<input id="swal-pass" type="password" class="swal2-input" placeholder="Contraseña" />',
    focusConfirm: false,
    preConfirm: ()=>{
      const u = document.getElementById('swal-user').value.trim();
      const p = document.getElementById('swal-pass').value.trim();
      if(!u || !p) { Swal.showValidationMessage('Completa usuario y contraseña'); return null; }
      return {u,p};
    },
    allowOutsideClick: false,
    allowEscapeKey: false
  });
  if(value){ localStorage.setItem('user', JSON.stringify({ username:value.u })); Swal.fire('Listo','Cuenta creada. Bienvenido, '+value.u,'success'); updateProfileName(); }
}

async function loginUser(){
  const { value } = await Swal.fire({
    title: 'Ingresar',
    html: '<input id="swal-user" class="swal2-input" placeholder="Usuario" />',
    preConfirm: ()=>{
      const u = document.getElementById('swal-user').value.trim();
      if(!u){ Swal.showValidationMessage('Ingresa tu usuario'); return null; }
      return {u};
    },
    allowOutsideClick: false,
    allowEscapeKey: false
  });
  if(value){ localStorage.setItem('user', JSON.stringify({ username:value.u })); Swal.fire('Bienvenido','Hola, '+value.u,'success'); updateProfileName(); }
}

function updateProfileName(){
  let name = 'Tu perfil';
  try{ const u = JSON.parse(localStorage.getItem('user')||'null'); if(u?.username) name = u.username; }catch{}
  const el = document.querySelector('.profile-name'); if(el) el.textContent = name;
}

// inicialización
window.addEventListener('DOMContentLoaded', async()=>{
  if(!isAuthenticated()){ window.location.href = 'login.html'; return; }
  const lessons = await loadLessons(); window.__lessons = lessons;
  
  renderLessonList(lessons);
  setupSimulator();
  renderProgressMenu(lessons); updateProgressUI();
  const toggle = byId('progress-toggle'); const panel = byId('progress-panel');
  if(toggle){ toggle.onclick = ()=>panel.classList.toggle('hidden'); }
  const start = byId('start-learning'); if(start){ start.onclick = ()=>{ byId('hero')?.classList.add('hidden'); openLesson(lessons[0]); } }
  setupTerminal();
  setupEditorModal();
  const hero = byId('hero'); if(hero) hero.classList.add('matrix-anim');
  updateProfileName();
  const logoutBtn = byId('logout-btn'); if(logoutBtn){ logoutBtn.onclick = logout; }
});

// --- Terminal simulada ---
function setupTerminal(){
  const out = byId('term-out'); const input = byId('term-input'); const run = byId('term-run');
  if(!out || !input || !run) return;
  const print = txt=>{ const line=document.createElement('div'); line.textContent=txt; out.appendChild(line); out.scrollTop = out.scrollHeight; };
  print('Bienvenido a la terminal simulada. Escribe "help" para ver comandos.');
  const exec = ()=>{ const cmd=(input.value||'').trim(); if(!cmd) return; print(getPrompt()+' '+cmd); const lines = simulateCommand(cmd); lines.forEach(print); input.value=''; updateTerminalPrompt(); };
  run.onclick = exec;
  input.addEventListener('keydown', e=>{ if(e.key==='Enter') exec(); });
  updateTerminalPrompt();
}

// --- Estado de terminal simulado ---
const TERM_STATE_KEY = 'term_state';
function termLoad(){
  try{ const s = JSON.parse(localStorage.getItem(TERM_STATE_KEY)||'null'); if(s&&s.cwd&&s.fs) return s; }catch{}
  const user = (JSON.parse(localStorage.getItem('user')||'{}').username)||'user';
  const init = { cwd: `/home/${user}`, fs: { [`/home/${user}`]: {type:'dir'} } };
  localStorage.setItem(TERM_STATE_KEY, JSON.stringify(init));
  return init;
}
function termSave(s){ localStorage.setItem(TERM_STATE_KEY, JSON.stringify(s)); }
function pathJoin(cwd,p){ if(!p||p==='.') return cwd; if(p.startsWith('/')) return p; const segs=[...cwd.split('/'),...p.split('/')]; const out=[]; for(const a of segs){ if(!a||a==='.') continue; if(a==='..') out.pop(); else out.push(a); } return '/'+out.join('/'); }
function listDir(s,dir){ const p = pathJoin(s.cwd,dir||'.'); const names=new Set(); for(const k of Object.keys(s.fs)){ if(k.startsWith(p+'/')){ const rest=k.slice(p.length+1); const first=rest.split('/')[0]; names.add(first); } } return Array.from(names).sort(); }

function getPrompt(){ const st = termLoad(); const user = (JSON.parse(localStorage.getItem('user')||'{}').username)||'user'; return `${user} 📁 ${st.cwd} $`; }
function updateTerminalPrompt(){ const el = byId('term-prompt'); if(el) el.textContent = getPrompt(); }

// --- Editor simulado ---
function openEditorWithFile(path){
  const st = termLoad();
  const f = st.fs[path] || {type:'file',content:''};
  st.fs[path] = f; termSave(st);
  window.__editFilePath = path;
  const ta = document.getElementById('editor-area'); const nameEl = document.getElementById('editor-filename');
  if(ta) ta.value = f.content || '';
  if(nameEl) nameEl.textContent = path;
  const modalEl = document.getElementById('editorModal');
  if(window.bootstrap && modalEl){ const m = new bootstrap.Modal(modalEl); m.show(); }
}
function setupEditorModal(){
  const save = document.getElementById('editor-save');
  if(save){ save.onclick = ()=>{
    const st = termLoad(); const path = window.__editFilePath; const ta = document.getElementById('editor-area');
    if(path && ta){ st.fs[path] = { type:'file', content: ta.value }; termSave(st); }
    const modalEl = document.getElementById('editorModal');
    if(window.bootstrap && modalEl){ const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl); m.hide(); }
    const out = byId('term-out'); if(out){ const d=document.createElement('div'); d.textContent = `(sim) guardado ${path}`; out.appendChild(d); out.scrollTop = out.scrollHeight; }
  }; }
}

function simulateCommand(cmd){
  const tokens = cmd.split(/\s+/);
  const base = ['(sim) No se ejecuta nada real.']
  if(tokens[0]==='help') return base.concat([
    'Comandos:',
    '  nmap -sn|-sS|-sU|-sV <host>  → salida simulada',
    '  ping <host>                   → ICMP simulado',
    '  arp -a                        → tabla ARP simulada',
    '  dns <dominio>                 → resolución DNS simulada',
    '  mkdir|ls|cd|pwd|touch|cat|echo "txt" > file | >> append',
    '  rm [-r] <path>                → borra archivo/dir simulado',
    '  mv <src> <dst>                → mueve/renombra (simulado)',
    '  cp [-r] <src> <dst>           → copia (simulado)',
    '  head|-n N <file>  tail|-n N <file>  grep <pat> <file>',
    '  nano <file> / vim <file>      → edita archivo simulado',
    '  python <script.py> / -c "..." / --version / -m pip --version',
    '  bash <script.sh> / bash -c "..." / sh (simulado)',
    '  clear                         → limpia la pantalla'
  ]);
  if(tokens[0]==='clear'){ byId('term-out').innerHTML=''; return []; }
  // FS simulado
  const st = termLoad();
  if(tokens[0]==='pwd') return [st.cwd];
  if(tokens[0]==='cd'){ st.cwd = pathJoin(st.cwd, tokens[1]||'/'); termSave(st); updateTerminalPrompt(); return [`(sim) cwd: ${st.cwd}`]; }
  if(tokens[0]==='ls'){ const dir = tokens[1]||'.'; const list=listDir(st,dir); return [list.length?list.join('  '):'(vacío)']; }
  if(tokens[0]==='mkdir'){ const p = pathJoin(st.cwd, tokens[1]||''); if(!p) return ['Uso: mkdir <dir>']; st.fs[p]={type:'dir'}; termSave(st); return [`(sim) creado directorio ${p}`]; }
  if(tokens[0]==='touch'){ const p = pathJoin(st.cwd, tokens[1]||''); if(!p) return ['Uso: touch <file>']; st.fs[p]={type:'file',content:st.fs[p]?.content||''}; termSave(st); return [`(sim) tocado ${p}`]; }
  if(tokens[0]==='nano' || tokens[0]==='vim'){ const p = pathJoin(st.cwd, tokens[1]||''); if(!p) return ['Uso: nano <file>']; openEditorWithFile(p); return [`(sim) editor abierto para ${p}`]; }
  if(tokens[0]==='cat'){ const p = pathJoin(st.cwd, tokens[1]||''); const f=st.fs[p]; return [f?.content||'(sim) archivo vacío o no existe']; }
  if(tokens[0]==='rm'){
    const recursive = tokens.includes('-r') || tokens.includes('-rf');
    const target = tokens.filter(t=>!t.startsWith('-'))[1]; if(!target) return ['Uso: rm [-r] <path>'];
    const p = pathJoin(st.cwd, target); const f = st.fs[p]; if(!f) return [`(sim) no existe ${p}`];
    if(f.type==='dir' && !recursive) return ['Uso: rm -r <directorio>'];
    Object.keys(st.fs).forEach(k=>{ if(k===p || k.startsWith(p+'/')) delete st.fs[k]; }); termSave(st);
    return [`(sim) eliminado ${p}`];
  }
  if(tokens[0]==='mv'){
    const src=tokens[1], dst=tokens[2]; if(!src||!dst) return ['Uso: mv <src> <dst>'];
    const sp=pathJoin(st.cwd,src), dp=pathJoin(st.cwd,dst); const f=st.fs[sp]; if(!f) return ['(sim) origen no existe'];
    const isDir = f.type==='dir';
    Object.keys(st.fs).slice().forEach(k=>{ if(k===sp || (isDir && k.startsWith(sp+'/'))){ const nk = k.replace(sp, dp); st.fs[nk]=st.fs[k]; delete st.fs[k]; } }); termSave(st);
    return [`(sim) movido ${sp} → ${dp}`];
  }
  if(tokens[0]==='cp'){
    const recursive = tokens.includes('-r'); const src=tokens.filter(t=>!t.startsWith('-'))[1]; const dst=tokens.filter(t=>!t.startsWith('-'))[2];
    if(!src||!dst) return ['Uso: cp [-r] <src> <dst>'];
    const sp=pathJoin(st.cwd,src), dp=pathJoin(st.cwd,dst); const f=st.fs[sp]; if(!f) return ['(sim) origen no existe'];
    if(f.type==='dir' && !recursive) return ['Uso: cp -r <dir> <dst>'];
    if(f.type==='file'){ st.fs[dp]={type:'file',content:f.content||''}; }
    else { Object.keys(st.fs).forEach(k=>{ if(k===sp || k.startsWith(sp+'/')){ const nk = k.replace(sp, dp); const val = st.fs[k]; st.fs[nk] = val.type==='file' ? {type:'file',content:val.content||''} : {type:'dir'}; } }); }
    termSave(st); return [`(sim) copiado ${sp} → ${dp}`];
  }
  if(tokens[0]==='head' || tokens[0]==='tail'){
    const isHead = tokens[0]==='head'; let n=10; const ni=tokens.indexOf('-n'); if(ni>-1){ n=Number(tokens[ni+1])||10; }
    const file=tokens[tokens.length-1]; const p=pathJoin(st.cwd,file); const f=st.fs[p]; if(!f||f.type!=='file') return ['(sim) archivo no encontrado'];
    const lines=(f.content||'').split(/\r?\n/); const sel = isHead? lines.slice(0,n) : lines.slice(Math.max(0,lines.length-n));
    return sel.length? sel : ['(vacío)'];
  }
  if(tokens[0]==='grep'){
    const pattern=tokens[1]; const file=tokens[tokens.length-1]; if(!pattern||!file) return ['Uso: grep <pat> <file>'];
    const p=pathJoin(st.cwd,file); const f=st.fs[p]; if(!f||f.type!=='file') return ['(sim) archivo no encontrado'];
    const pat = pattern.replace(/^"|"$/g,'').replace(/^'|'$/g,''); const lines=(f.content||'').split(/\r?\n/);
    const out = lines.map((ln,i)=>({ln,i})).filter(x=>x.ln.includes(pat)).map(x=>`${x.i+1}: ${x.ln}`);
    return out.length? out : ['(sin coincidencias)'];
  }
  if(tokens[0]==='chmod'){
    const mode=tokens[1]; const file=tokens[2]; if(!mode||!file) return ['Uso: chmod <modo> <path>'];
    const p=pathJoin(st.cwd,file); const f=st.fs[p]; if(!f) return ['(sim) archivo/directorio no encontrado']; f.mode=mode; termSave(st); return [`(sim) modo ${mode} aplicado a ${p}`];
  }
  if(tokens[0]==='echo' && tokens.includes('>')){ const idx=tokens.indexOf('>'); const text = tokens.slice(1,idx).join(' ').replace(/^"|"$/g,''); const file = pathJoin(st.cwd, tokens[idx+1]); st.fs[file]={type:'file',content:text}; termSave(st); return [`(sim) escrito en ${file}`]; }
  if(tokens[0]==='echo' && tokens.includes('>>')){ const idx=tokens.indexOf('>>'); const text = tokens.slice(1,idx).join(' ').replace(/^"|"$/g,''); const file = pathJoin(st.cwd, tokens[idx+1]); const prev = st.fs[file]?.content||''; st.fs[file]={type:'file',content: (prev ? prev+'\n' : '') + text}; termSave(st); return [`(sim) agregado a ${file}`]; }
  if(tokens[0]==='ping'){ const host=tokens[1]||'192.168.1.10'; return [
    `PING ${host} (sim) 56(84) bytes of data.`,
    `64 bytes from ${host}: icmp_seq=1 ttl=64 time=2.18 ms`,
    `64 bytes from ${host}: icmp_seq=2 ttl=64 time=2.12 ms`,
    `--- ${host} ping statistics ---`,
    `2 packets transmitted, 2 received, 0% packet loss, time 2002ms`
  ]; }
  if(tokens[0]==='arp' && tokens[1]==='-a') return [
    `Interface: 192.168.1.2 --- 0x3`,
    `  192.168.1.10  00-11-22-33-44-55  dynamic`,
    `  192.168.1.1   aa-bb-cc-dd-ee-ff  dynamic`
  ];
  if(tokens[0]==='dns'){ const dom=tokens[1]||'ejemplo.com'; return [
    `Consulta recursiva (sim) para ${dom}`,
    `Root → TLD → Autoritativo`,
    `${dom} A 93.184.216.34`
  ]; }
  if(tokens[0]==='python' && tokens[1]==='-c'){ const code = cmd.split('-c')[1]?.trim(); return ['Python 3.11 (sim) -c', code?code.replace(/^["']|["']$/g,''): '(sim) sin código']; }
  if(tokens[0]==='python' && tokens.includes('--version')) return ['Python 3.11.0 (sim)'];
  if(tokens[0]==='python' && tokens.includes('-m') && tokens[tokens.indexOf('-m')+1]==='pip' && tokens.includes('--version')) return ['pip 23.0 (sim)'];
  if(tokens[0]==='python'){ const file = tokens[1]||'script.py'; const p=pathJoin(st.cwd,file); const f=st.fs[p]; const out = [`Python 3.11 (sim) ejecutando ${file}`]; if(f?.content){ if(/print\(.*\)/.test(f.content)) out.push(f.content.match(/print\((.*)\)/)[1].replace(/['"]/g,'')); else out.push('(sim) script ejecutado'); } else out.push('(sim) archivo no encontrado'); return out; }
  if(tokens[0]==='bash' && tokens[1]==='-c'){ const code = cmd.split('-c')[1]?.trim(); const txt = code?code.replace(/^["']|["']$/g,''):''; const out=['bash (sim) -c']; if(/echo\s+.+/.test(txt)){ out.push(txt.replace(/^echo\s+/,'')); } else { out.push('(sim) comando interpretado'); } return out; }
  if(tokens[0]==='bash' || tokens[0]==='sh'){ const file = tokens[1]||'script.sh'; const p=pathJoin(st.cwd,file); const f=st.fs[p]; const out=[`${tokens[0]} (sim) ejecutando ${file}`]; if(f?.content){ out.push('(sim) salida del script'); } else out.push('(sim) archivo no encontrado'); return out; }
  if(tokens[0]==='nmap'){ const host=tokens[tokens.length-1]||'192.168.1.10';
    const type = tokens.includes('-sn')?'ping': tokens.includes('-sS')?'syn': tokens.includes('-sU')?'udp': tokens.includes('-sV')?'version':'syn';
    return simulateNmap(host,type);
  }
  return base.concat(['Comando no reconocido. Escribe "help".']);
}

// --- Autenticación UI ---
function isAuthenticated(){ try{ const u=JSON.parse(localStorage.getItem('user')||'null'); return !!(u&&u.username); }catch{ return false; } }
function logout(){ localStorage.removeItem('user'); updateProfileName(); window.location.href = 'login.html'; }
