/* QueueSmart A2 – Vanilla HTML/CSS/JS (Front-end only)
   - Validations: client-side only
*/

const state = {
  role: null,      // 'user' | 'admin'
  email: '',
  joined: { serviceId: null, position: null, status: 'waiting' }, // UI-only simulation
  toasts: [],
  services: [
    {
      id: 'svc-bookstore',
      name: 'Campus Bookstore Pickup',
      description: 'Pick up your textbook orders at the Campus Bookstore.',
      expectedDurationMin: 4,
      priority: 'medium',
      isOpen: true,
    },
    {
      id: 'svc-library',
      name: 'Library Pickup',
      description: 'Pick up reserved textbooks at the Main Library desk.',
      expectedDurationMin: 3,
      priority: 'low',
      isOpen: true,
    },
    {
      id: 'svc-law',
      name: 'Law Center Pickup',
      description: 'Pickup desk for law textbooks and course packets.',
      expectedDurationMin: 5,
      priority: 'high',
      isOpen: false,
    },
  ],
  queues: [
    { id: 'q1', serviceId: 'svc-bookstore', userEmail: 'student1@cougarnet.uh.edu', position: 3, status: 'waiting' },
    { id: 'q2', serviceId: 'svc-bookstore', userEmail: 'student2@cougarnet.uh.edu', position: 4, status: 'almost_ready' },
    { id: 'q3', serviceId: 'svc-library', userEmail: 'student3@cougarnet.uh.edu', position: 1, status: 'waiting' },
  ],
  history: [
    { id: 'h1', date: '2026-01-18', serviceName: 'Campus Bookstore Pickup', outcome: 'served' },
    { id: 'h2', date: '2026-01-19', serviceName: 'Library Pickup', outcome: 'left' },
    { id: 'h3', date: '2026-02-05', serviceName: 'Campus Bookstore Pickup', outcome: 'served' },
  ],
};

// ---------- Utilities ----------
function qs(sel, root = document){ return root.querySelector(sel); }
function qsa(sel, root = document){ return [...root.querySelectorAll(sel)]; }
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function estimateWaitTime(position, expectedDurationMin){ return Math.max(0, (position - 1) * expectedDurationMin); }

function pushToast(title, message){
  state.toasts = [{ title, message }, ...state.toasts].slice(0, 5);
  renderToasts();
}
function dismissToast(i){
  state.toasts = state.toasts.filter((_, idx) => idx !== i);
  renderToasts();
}
function renderToasts(){
  const wrap = qs('#toasts');
  if (!wrap) return;
  wrap.innerHTML = state.toasts.map((t, i) => `
    <div class="toast">
      <p class="toastTitle">${esc(t.title)}</p>
      <p class="toastMsg">${esc(t.message)}</p>
      <div class="btnRow" style="justify-content:flex-end;">
        <button class="btn secondary" data-dismiss="${i}">Dismiss</button>
      </div>
    </div>
  `).join('');
  qsa('[data-dismiss]', wrap).forEach(btn => {
    btn.addEventListener('click', () => dismissToast(Number(btn.dataset.dismiss)));
  });
}

function saveSession(){
  localStorage.setItem('qs_role', state.role ?? '');
  localStorage.setItem('qs_email', state.email ?? '');
}
function loadSession(){
  const r = localStorage.getItem('qs_role');
  const e = localStorage.getItem('qs_email');
  state.role = (r === 'user' || r === 'admin') ? r : null;
  state.email = e || '';
}
function logout(){
  state.role = null;
  state.email = '';
  saveSession();
  location.hash = '#/login';
}

// ---------- Layout ----------
function shellHtml({ role, email, activePath, content }){
  const linksUser = [
    ['#/app/dashboard', 'User Dashboard'],
    ['#/app/join', 'Join Queue'],
    ['#/app/status', 'Queue Status'],
    ['#/app/history', 'History'],
  ];
  const linksAdmin = [
    ['#/admin/dashboard', 'Admin Dashboard'],
    ['#/admin/services', 'Service Management'],
    ['#/admin/queues', 'Queue Management'],
  ];
  const links = role === 'admin' ? linksAdmin : linksUser;

  const navLinks = links.map(([href, label]) => {
    const active = activePath === href ? 'active' : '';
    return `<a class="${active}" href="${href}">${esc(label)}</a>`;
  }).join('');

  return `
    <div class="container">
      <div class="grid">
        <aside class="panel">
          <div class="panelHeader">
            <div class="brand">
              <span>QueueSmart</span>
              <span class="badge">${role === 'admin' ? 'Administrator' : 'User'}</span>
            </div>
            <p class="p" style="margin-top:8px;">
              ${email ? `Signed in as <strong>${esc(email)}</strong>` : 'Not signed in'}
            </p>
          </div>
          <nav class="nav">
            ${navLinks}
            <button class="btn secondary" id="logoutBtn">Logout</button>
          </nav>
        </aside>

        <main class="panel">
          <div class="content">${content}</div>
        </main>
      </div>
    </div>
  `;
}

// ---------- Pages (Auth) ----------
function pageLogin(){
  return `
    <div class="container" style="max-width:560px;">
      <div class="panel">
        <div class="content">
          <p class="h1">Login</p>
          <p class="p">QueueSmart helps UH students join and track textbook pickup queues (mock UI).</p>

          <label class="label">Role (demo)</label>
          <select class="input" id="role">
            <option value="user">User</option>
            <option value="admin">Administrator</option>
          </select>

          <label class="label">Email</label>
          <input class="input" id="email" type="email" placeholder="name@cougarnet.uh.edu" />

          <label class="label">Password</label>
          <input class="input" id="password" type="password" placeholder="••••••••" />

          <div class="err" id="err" style="display:none;"></div>

          <div class="btnRow">
            <button class="btn" id="loginBtn">Login</button>
            <a class="btn secondary" href="#/register">Create account</a>
          </div>

          <p class="p" style="margin-top:14px;">
            <span class="tag muted">Client-side validation only</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

function bindLogin(){
  const err = qs('#err');
  const email = qs('#email');
  const password = qs('#password');
  const role = qs('#role');

  qs('#loginBtn').addEventListener('click', () => {
    const e = email.value.trim();
    const p = password.value;

    let msg = '';
    if (!e) msg = 'Email is required.';
    else if (!isEmail(e)) msg = 'Enter a valid email address.';
    else if (!p) msg = 'Password is required.';
    else if (p.length < 6) msg = 'Password must be at least 6 characters.';

    if (msg){
      err.style.display = 'block';
      err.textContent = msg;
      return;
    }

    err.style.display = 'none';
    state.role = role.value;
    state.email = e;
    saveSession();
    pushToast('Welcome', `Signed in as ${state.role}. (Mock auth)`);
    location.hash = state.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
  });
}

function pageRegister(){
  return `
    <div class="container" style="max-width:560px;">
      <div class="panel">
        <div class="content">
          <p class="h1">Registration</p>
          <p class="p">Create a QueueSmart account. (Mock registration)</p>

          <label class="label">Full Name</label>
          <input class="input" id="name" placeholder="First Last" />

          <label class="label">Email</label>
          <input class="input" id="email" type="email" placeholder="name@cougarnet.uh.edu" />

          <label class="label">Password</label>
          <input class="input" id="password" type="password" placeholder="At least 6 characters" />

          <label class="label">Confirm Password</label>
          <input class="input" id="confirm" type="password" />

          <div class="err" id="err" style="display:none;"></div>

          <div class="btnRow">
            <button class="btn" id="registerBtn">Register</button>
            <a class="btn secondary" href="#/login">Back to login</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindRegister(){
  const err = qs('#err');
  const name = qs('#name');
  const email = qs('#email');
  const password = qs('#password');
  const confirm = qs('#confirm');

  qs('#registerBtn').addEventListener('click', () => {
    const n = name.value.trim();
    const e = email.value.trim();
    const p = password.value;
    const c = confirm.value;

    let msg = '';
    if (!n) msg = 'Name is required.';
    else if (n.length > 80) msg = 'Name must be 80 characters or less.';
    else if (!e) msg = 'Email is required.';
    else if (!isEmail(e)) msg = 'Enter a valid email address.';
    else if (!p) msg = 'Password is required.';
    else if (p.length < 6) msg = 'Password must be at least 6 characters.';
    else if (c !== p) msg = 'Passwords do not match.';

    if (msg){
      err.style.display = 'block';
      err.textContent = msg;
      return;
    }
    err.style.display = 'none';
    pushToast('Account created', 'Registration complete (mock). Please login.');
    location.hash = '#/login';
  });
}

// ---------- Pages (User) ----------
function pageUserDashboard(){
  const active = state.services.filter(s => s.isOpen).length;
  const closed = state.services.filter(s => !s.isOpen).length;

  const rows = state.services.map(s => `
    <tr>
      <td>${esc(s.name)}</td>
      <td><span class="tag muted">${esc(s.priority)}</span></td>
      <td>${s.isOpen ? '<span class="tag ok">Open</span>' : '<span class="tag warn">Closed</span>'}</td>
    </tr>
  `).join('');

  const notif = state.toasts.slice(0,3).map(n => `
    <li><strong style="color:var(--text)">${esc(n.title)}:</strong> ${esc(n.message)}</li>
  `).join('') || `<li>No notifications yet.</li>`;

  return `
    <p class="h1">User Dashboard</p>
    <p class="p">Overview of queue status, services, and notifications (mock data).</p>

    <div class="cards">
      <div class="card kpi">
        <div><div class="tag muted">Services Open</div><strong>${active}</strong></div>
        <span class="tag ok">Available</span>
      </div>
      <div class="card kpi">
        <div><div class="tag muted">Services Closed</div><strong>${closed}</strong></div>
        <span class="tag warn">Check later</span>
      </div>
    </div>

    <div class="cards" style="margin-top:12px;">
      <div class="card">
        <strong>Active Services</strong>
        <p class="p" style="margin-top:8px;">Select a service on “Join Queue” to see estimates.</p>
        <table class="table">
          <thead><tr><th>Service</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div class="card">
        <strong>Notifications</strong>
        <p class="p" style="margin-top:8px;">In-app notifications only for A2.</p>
        <ul style="margin:0; padding-left:18px; color:var(--muted);">${notif}</ul>
      </div>
    </div>
  `;
}

function pageJoinQueue(){
  const options = state.services.map(s => `
    <option value="${esc(s.id)}" ${!s.isOpen ? 'disabled' : ''}>
      ${esc(s.name)} ${s.isOpen ? '' : '(Closed)'}
    </option>
  `).join('');

  // default selected service
  const defaultId = state.joined.serviceId || state.services[0]?.id;
  const service = state.services.find(s => s.id === defaultId);
  const qLen = state.queues.filter(q => q.serviceId === defaultId).length;
  const estimate = service ? estimateWaitTime(qLen + 1, service.expectedDurationMin) : 0;
  const joined = !!state.joined.serviceId;

  return `
    <p class="h1">Join Queue</p>
    <p class="p">Select a service, view estimated wait time, and join/leave (UI simulation).</p>

    <div class="card">
      <label class="label">Service</label>
      <select class="input" id="serviceSel">${options}</select>

      <div class="cards" style="margin-top:12px;">
        <div class="card">
          <div class="tag muted">Estimated wait time</div>
          <strong id="estWait">${estimate} minutes</strong>
          <p class="p" style="margin-top:8px;">Based on queue length × expected duration (mock).</p>
        </div>
        <div class="card">
          <div class="tag muted">Current queue length</div>
          <strong id="qLen">${qLen}</strong>
          <p class="p" style="margin-top:8px;" id="svcStatus">${service?.isOpen ? 'Service is open.' : 'Service is closed.'}</p>
        </div>
      </div>

      <div class="btnRow">
        <button class="btn" id="joinBtn" ${(!service?.isOpen || joined) ? 'disabled' : ''}>Join Queue</button>
        <button class="btn danger" id="leaveBtn" ${(!joined) ? 'disabled' : ''}>Leave Queue</button>
      </div>
    </div>
  `;
}

function bindJoinQueue(){
  const sel = qs('#serviceSel');
  const estWait = qs('#estWait');
  const qLenEl = qs('#qLen');
  const svcStatus = qs('#svcStatus');
  const joinBtn = qs('#joinBtn');
  const leaveBtn = qs('#leaveBtn');

  // set default selected service
  const defaultId = state.joined.serviceId || state.services[0]?.id;
  if (defaultId) sel.value = defaultId;

  function updateView(){
    const id = sel.value;
    const s = state.services.find(x => x.id === id);
    const qLen = state.queues.filter(q => q.serviceId === id).length;
    const estimate = s ? estimateWaitTime(qLen + 1, s.expectedDurationMin) : 0;

    estWait.textContent = `${estimate} minutes`;
    qLenEl.textContent = `${qLen}`;
    svcStatus.textContent = s?.isOpen ? 'Service is open.' : 'Service is closed.';

    const joined = !!state.joined.serviceId;
    joinBtn.disabled = !s?.isOpen || joined;
    leaveBtn.disabled = !joined;

    // If user is joined, keep the join tied to that service for simple A2 demo
    if (joined) sel.disabled = true;
    else sel.disabled = false;
  }

  sel.addEventListener('change', updateView);

  joinBtn.addEventListener('click', () => {
    const id = sel.value;
    const s = state.services.find(x => x.id === id);
    if (!s || !s.isOpen) return;

    const qLen = state.queues.filter(q => q.serviceId === id).length;
    state.joined.serviceId = id;
    state.joined.position = qLen + 1;
    state.joined.status = 'waiting';

    pushToast('Joined queue', `You joined "${s.name}" (mock).`);
    location.hash = '#/app/status';
  });

  leaveBtn.addEventListener('click', () => {
    const id = state.joined.serviceId;
    const s = state.services.find(x => x.id === id);
    state.joined.serviceId = null;
    state.joined.position = null;
    state.joined.status = 'waiting';
    pushToast('Left queue', `You left "${s?.name ?? 'service'}" (mock).`);
    updateView();
  });

  updateView();
}

function pageQueueStatus(){
  const joined = state.joined.serviceId != null;
  const serviceId = state.joined.serviceId || state.services[0]?.id;
  const service = state.services.find(s => s.id === serviceId);
  const position = state.joined.position || 5;
  const status = state.joined.status || 'waiting';

  const options = state.services.map(s => `
    <option value="${esc(s.id)}">${esc(s.name)}</option>
  `).join('');

  const wait = service ? estimateWaitTime(position, service.expectedDurationMin) : 0;

  return `
    <p class="h1">Queue Status</p>
    <p class="p">Shows current position, wait time, and status updates (simulation).</p>

    <div class="card">
      <label class="label">Service</label>
      <select class="input" id="serviceSel">${options}</select>

      <div class="row" style="margin-top:12px;">
        <div>
          <label class="label">Position in queue</label>
          <input class="input" id="position" type="number" min="1" value="${position}" ${joined ? 'readonly' : ''} />
          ${joined ? `<div class="p" style="margin-top:8px;"><span class="tag muted">Joined (sim)</span></div>` : ''}
        </div>
        <div>
          <label class="label">Status</label>
          <select class="input" id="status">
            <option value="waiting">Waiting</option>
            <option value="almost_ready">Almost ready</option>
            <option value="served">Served</option>
          </select>
        </div>
      </div>

      <div class="cards" style="margin-top:12px;">
        <div class="card kpi">
          <div>
            <div class="tag muted">Estimated wait</div>
            <strong id="wait">${wait} minutes</strong>
          </div>
          <span id="statusTag" class="tag ${status === 'served' ? 'ok' : status === 'almost_ready' ? 'warn' : 'muted'}">${esc(status.replace('_',' '))}</span>
        </div>
        <div class="card">
          <strong>Status updates</strong>
          <p class="p" style="margin-top:8px;" id="statusText"></p>
          <div class="btnRow">
            <button class="btn secondary" id="notifyBtn">Simulate notification</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bindQueueStatus(){
  const serviceSel = qs('#serviceSel');
  const statusSel = qs('#status');
  const positionEl = qs('#position');
  const waitEl = qs('#wait');
  const statusTag = qs('#statusTag');
  const statusText = qs('#statusText');
  const notifyBtn = qs('#notifyBtn');

  // default
  const joined = state.joined.serviceId != null;
  const defaultId = state.joined.serviceId || state.services[0]?.id;
  if (defaultId) serviceSel.value = defaultId;
  statusSel.value = state.joined.status || 'waiting';

  function renderStatusCopy(v){
    if (v === 'waiting') return 'You are in line. You will be notified when your turn is close.';
    if (v === 'almost_ready') return 'Please head to the pickup location. You are next.';
    return 'You have been served. This queue entry would be archived in A3/A4.';
  }

  function update(){
    const id = serviceSel.value;
    const s = state.services.find(x => x.id === id);
    const pos = Math.max(1, Number(positionEl.value || 1));
    const wait = s ? estimateWaitTime(pos, s.expectedDurationMin) : 0;
    waitEl.textContent = `${wait} minutes`;

    const st = statusSel.value;
    statusText.textContent = renderStatusCopy(st);
    statusTag.className = 'tag ' + (st === 'served' ? 'ok' : st === 'almost_ready' ? 'warn' : 'muted');
    statusTag.textContent = st.replace('_',' ');

    // keep state if joined
    if (joined){
      state.joined.status = st;
    }
  }

  // if joined, lock service selection to joined service
  if (joined){
    serviceSel.disabled = true;
    positionEl.setAttribute('readonly','readonly');
  }

  statusSel.addEventListener('change', update);
  positionEl.addEventListener('input', update);
  serviceSel.addEventListener('change', update);

  notifyBtn.addEventListener('click', () => {
    pushToast('Queue Update', `Status changed to "${statusSel.value}". (Mock)`);
  });

  update();
}

function pageHistory(){
  const rows = state.history.map(h => `
    <tr>
      <td>${esc(h.date)}</td>
      <td>${esc(h.serviceName)}</td>
      <td><span class="tag muted">${esc(h.outcome)}</span></td>
    </tr>
  `).join('');

  return `
    <p class="h1">History</p>
    <p class="p">Past queues joined (mock data).</p>

    <div class="card">
      <table class="table">
        <thead><tr><th>Date</th><th>Service</th><th>Outcome</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ---------- Pages (Admin) ----------
function pageAdminDashboard(){
  const counts = {};
  for (const q of state.queues) counts[q.serviceId] = (counts[q.serviceId] || 0) + 1;

  const rows = state.services.map(s => `
    <tr>
      <td>${esc(s.name)}</td>
      <td>${counts[s.id] || 0}</td>
      <td>${s.isOpen ? '<span class="tag ok">Open</span>' : '<span class="tag warn">Closed</span>'}</td>
      <td><button class="btn secondary" data-toggle="${esc(s.id)}">${s.isOpen ? 'Close queue' : 'Open queue'}</button></td>
    </tr>
  `).join('');

  return `
    <p class="h1">Admin Dashboard</p>
    <p class="p">Monitor services and queues. Quick open/close actions (UI only).</p>

    <div class="card">
      <table class="table">
        <thead><tr><th>Service</th><th>Queue length</th><th>Status</th><th>Quick actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function bindAdminDashboard(){
  qsa('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.toggle;
      const s = state.services.find(x => x.id === id);
      if (!s) return;
      s.isOpen = !s.isOpen;
      pushToast('Service updated', 'Open/close toggled (UI only).');
      render(); // refresh view
    });
  });
}

function pageServiceManagement(){
  const rows = state.services.map(s => `
    <tr>
      <td>${esc(s.name)}</td>
      <td><span class="tag muted">${esc(s.priority)}</span></td>
      <td>${s.isOpen ? '<span class="tag ok">Open</span>' : '<span class="tag warn">Closed</span>'}</td>
      <td><button class="btn secondary" data-edit="${esc(s.id)}">Edit</button></td>
    </tr>
  `).join('');

  return `
    <p class="h1">Service Management</p>
    <p class="p">Create or edit services (front-end only). Includes required validations.</p>

    <div class="cards">
      <div class="card">
        <strong id="formTitle">Create Service</strong>

        <input type="hidden" id="editingId" value="" />

        <label class="label">Service Name (required, max 100)</label>
        <input class="input" id="name" />
        <div class="err" id="err_name" style="display:none;"></div>

        <label class="label">Description (required)</label>
        <textarea class="input" id="desc"></textarea>
        <div class="err" id="err_desc" style="display:none;"></div>

        <div class="row">
          <div>
            <label class="label">Expected Duration (minutes, required)</label>
            <input class="input" id="dur" type="number" min="1" value="3" />
            <div class="err" id="err_dur" style="display:none;"></div>
          </div>
          <div>
            <label class="label">Priority Level</label>
            <select class="input" id="priority">
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <div class="err" id="err_pri" style="display:none;"></div>
          </div>
        </div>

        <label class="label">Queue status</label>
        <select class="input" id="isOpen">
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>

        <div class="btnRow">
          <button class="btn" id="saveBtn">Create service</button>
          <button class="btn secondary" id="clearBtn">Clear</button>
        </div>
      </div>

      <div class="card">
        <strong>Services</strong>
        <p class="p" style="margin-top:8px;">Click “Edit” to load a service into the form.</p>
        <table class="table">
          <thead><tr><th>Name</th><th>Priority</th><th>Status</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function bindServiceManagement(){
  const title = qs('#formTitle');
  const editingId = qs('#editingId');
  const name = qs('#name');
  const desc = qs('#desc');
  const dur = qs('#dur');
  const priority = qs('#priority');
  const isOpen = qs('#isOpen');

  const errName = qs('#err_name');
  const errDesc = qs('#err_desc');
  const errDur = qs('#err_dur');
  const errPri = qs('#err_pri');

  function clearErrors(){
    [errName, errDesc, errDur, errPri].forEach(e => { e.style.display='none'; e.textContent=''; });
  }

  function validate(){
    clearErrors();
    let ok = true;

    const n = name.value.trim();
    const d = desc.value.trim();
    const du = Number(dur.value);
    const pr = priority.value;

    if (!n){
      errName.style.display='block'; errName.textContent='Service Name is required.'; ok = false;
    } else if (n.length > 100){
      errName.style.display='block'; errName.textContent='Service Name must be 100 characters or less.'; ok = false;
    }
    if (!d){
      errDesc.style.display='block'; errDesc.textContent='Description is required.'; ok = false;
    }
    if (!Number.isFinite(du) || du <= 0){
      errDur.style.display='block'; errDur.textContent='Expected Duration must be a positive number.'; ok = false;
    }
    if (!['low','medium','high'].includes(pr)){
      errPri.style.display='block'; errPri.textContent='Priority is required.'; ok = false;
    }
    return ok;
  }

  function resetForm(){
    editingId.value = '';
    title.textContent = 'Create Service';
    qs('#saveBtn').textContent = 'Create service';
    name.value = '';
    desc.value = '';
    dur.value = '3';
    priority.value = 'low';
    isOpen.value = 'open';
    clearErrors();
  }

  qs('#clearBtn').addEventListener('click', resetForm);

  qs('#saveBtn').addEventListener('click', () => {
    if (!validate()) return;

    const payload = {
      name: name.value.trim(),
      description: desc.value.trim(),
      expectedDurationMin: Number(dur.value),
      priority: priority.value,
      isOpen: isOpen.value === 'open',
    };

    if (editingId.value){
      const s = state.services.find(x => x.id === editingId.value);
      if (!s) return;
      Object.assign(s, payload);
      pushToast('Service updated', 'Edited service saved (mock).');
    } else {
      const id = 'svc-' + Math.random().toString(16).slice(2);
      state.services.unshift({ id, ...payload });
      pushToast('Service created', 'New service added (mock).');
    }

    resetForm();
    render();
  });

  qsa('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.edit;
      const s = state.services.find(x => x.id === id);
      if (!s) return;
      editingId.value = s.id;
      title.textContent = 'Edit Service';
      qs('#saveBtn').textContent = 'Save changes';
      name.value = s.name;
      desc.value = s.description;
      dur.value = String(s.expectedDurationMin);
      priority.value = s.priority;
      isOpen.value = s.isOpen ? 'open' : 'closed';
      clearErrors();
    });
  });
}

function pageQueueManagement(){
  const options = state.services.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  const serviceId = state.services[0]?.id;
  return `
    <p class="h1">Queue Management</p>
    <p class="p">View and manage a service queue: reorder/remove users and “serve next” (UI simulation).</p>

    <div class="card">
      <label class="label">Select service</label>
      <select class="input" id="serviceSel">${options}</select>

      <div class="btnRow">
        <button class="btn" id="serveBtn">Serve next user</button>
        <span class="tag muted" id="selName"></span>
        <span class="tag muted" id="selLen"></span>
      </div>

      <table class="table" style="margin-top:12px;">
        <thead><tr><th>Position</th><th>User</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody id="qBody"></tbody>
      </table>
    </div>
  `;
}

function bindQueueManagement(){
  const sel = qs('#serviceSel');
  const body = qs('#qBody');
  const selName = qs('#selName');
  const selLen = qs('#selLen');
  const serveBtn = qs('#serveBtn');

  let localQueue = [];

  function loadQueue(){
    const id = sel.value;
    const s = state.services.find(x => x.id === id);
    selName.textContent = `Selected: ${s?.name ?? ''}`;

    localQueue = state.queues
      .filter(q => q.serviceId === id)
      .sort((a,b) => a.position - b.position)
      .map((q, i) => ({ ...q, position: i + 1 }));

    selLen.textContent = `Queue length: ${localQueue.length}`;
    serveBtn.disabled = localQueue.length === 0;

    renderTable();
  }

  function renderTable(){
    if (!localQueue.length){
      body.innerHTML = `<tr><td colspan="4" style="color:var(--muted);">No users currently in this queue (mock).</td></tr>`;
      return;
    }
    body.innerHTML = localQueue.map((q, idx) => `
      <tr>
        <td>${q.position}</td>
        <td>${esc(q.userEmail)}</td>
        <td><span class="tag muted">${esc(q.status)}</span></td>
        <td>
          <div class="btnRow" style="margin:0;">
            <button class="btn secondary" data-up="${idx}" ${idx===0?'disabled':''}>Up</button>
            <button class="btn secondary" data-down="${idx}" ${idx===localQueue.length-1?'disabled':''}>Down</button>
            <button class="btn danger" data-remove="${idx}">Remove</button>
          </div>
        </td>
      </tr>
    `).join('');

    qsa('[data-up]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.up), -1)));
    qsa('[data-down]').forEach(b => b.addEventListener('click', () => move(Number(b.dataset.down), +1)));
    qsa('[data-remove]').forEach(b => b.addEventListener('click', () => removeAt(Number(b.dataset.remove))));
  }

  function renumber(){
    localQueue = localQueue.map((q, i) => ({ ...q, position: i + 1 }));
    selLen.textContent = `Queue length: ${localQueue.length}`;
    serveBtn.disabled = localQueue.length === 0;
  }

  function move(i, dir){
    const j = i + dir;
    if (j < 0 || j >= localQueue.length) return;
    [localQueue[i], localQueue[j]] = [localQueue[j], localQueue[i]];
    renumber();
    pushToast('Queue reordered', 'User moved (UI only).');
    renderTable();
  }

  function removeAt(i){
    localQueue.splice(i, 1);
    renumber();
    pushToast('Removed user', 'User removed from queue (UI only).');
    renderTable();
  }

  serveBtn.addEventListener('click', () => {
    if (!localQueue.length) return;
    const first = localQueue.shift();
    renumber();
    pushToast('Served next user', `${first.userEmail} marked as served (simulation).`);
    renderTable();
  });

  sel.addEventListener('change', loadQueue);
  loadQueue();
}

// ---------- Router ----------
function requireAuth(){
  if (!state.role){
    location.hash = '#/login';
    return false;
  }
  return true;
}

function render(){
  const app = qs('#app');
  const hash = location.hash || '#/login';

  // Auth pages do not use the shell layout
  if (hash === '#/login' || hash === '#/'){
    app.innerHTML = pageLogin();
    bindLogin();
    return;
  }
  if (hash === '#/register'){
    app.innerHTML = pageRegister();
    bindRegister();
    return;
  }

  // Protected routes
  if (!requireAuth()) return;

  // Role-based guard
  const isAdminRoute = hash.startsWith('#/admin');
  if (isAdminRoute && state.role !== 'admin'){
    location.hash = '#/app/dashboard';
    return;
  }
  const isUserRoute = hash.startsWith('#/app');
  if (isUserRoute && state.role !== 'user'){
    location.hash = '#/admin/dashboard';
    return;
  }

  // Determine page content + binders
  let content = '';
  let binder = null;

  if (hash === '#/app/dashboard'){
    content = pageUserDashboard();
  } else if (hash === '#/app/join'){
    content = pageJoinQueue(); binder = bindJoinQueue;
  } else if (hash === '#/app/status'){
    content = pageQueueStatus(); binder = bindQueueStatus;
  } else if (hash === '#/app/history'){
    content = pageHistory();
  } else if (hash === '#/admin/dashboard'){
    content = pageAdminDashboard(); binder = bindAdminDashboard;
  } else if (hash === '#/admin/services'){
    content = pageServiceManagement(); binder = bindServiceManagement;
  } else if (hash === '#/admin/queues'){
    content = pageQueueManagement(); binder = bindQueueManagement;
  } else {
    location.hash = state.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
    return;
  }

  app.innerHTML = shellHtml({
    role: state.role,
    email: state.email,
    activePath: hash,
    content
  });

  const logoutBtn = qs('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (binder) binder();
}

// Boot
loadSession();
window.addEventListener('hashchange', render);
render();
renderToasts();
