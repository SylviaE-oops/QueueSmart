const API_BASE = 'http://localhost:5000/api';

const state = {
  user: JSON.parse(localStorage.getItem('qs_user') || 'null'),
  services: [],
  notifications: [],
  currentEntry: null,
  history: [],
  bookRequests: [],
  adminQueue: [],
  adminStats: null,
  editingServiceId: null,
  toasts: [],
};

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function getCourseMaterialsData() {
  return window.COURSE_MATERIALS_DATA || {
    books: [],
    departments: [],
    courses: [],
    sections: [],
    professors: [],
  };
}

function toDataListOptions(list) {
  return (Array.isArray(list) ? list : []).map((item) => `<option value="${esc(item)}"></option>`).join('');
}

function setUser(user) {
  state.user = user;
  if (user) localStorage.setItem('qs_user', JSON.stringify(user));
  else localStorage.removeItem('qs_user');
}

function pushToast(title, message) {
  state.toasts = [{ title, message }, ...state.toasts].slice(0, 5);
  renderToasts();
}

function renderToasts() {
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
  qsa('[data-dismiss]', wrap).forEach((btn) => {
    btn.onclick = () => {
      state.toasts = state.toasts.filter((_, idx) => idx !== Number(btn.dataset.dismiss));
      renderToasts();
    };
  });
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function estimateWait(position, expectedDurationMin) {
  return Math.max(0, (Number(position) - 1) * Number(expectedDurationMin || 0));
}

function serviceStatusTag(service) {
  const open = service.isOpen ? '<span class="tag ok">Open</span>' : '<span class="tag warn">Closed</span>';
  const stock = service.inStock ? '<span class="tag ok">In stock</span>' : '<span class="tag danger">Out of stock</span>';
  return `${open} ${stock}`;
}

function shellHtml(content) {
  const active = location.hash || '#/login';
  const userLinks = [
    ['#/app/dashboard', 'User Dashboard'],
    ['#/app/join', 'Join Queue'],
    ['#/app/status', 'Queue Status'],
    ['#/app/book-requests', 'Book Requests'],
    ['#/app/history', 'History'],
    ['#/app/notifications', 'Notifications'],
  ];
  const adminLinks = [
    ['#/admin/dashboard', 'Admin Dashboard'],
    ['#/admin/services', 'Service Management'],
    ['#/admin/queues', 'Queue Management'],
    ['#/admin/stats', 'Usage Statistics'],
  ];
  const links = state.user?.role === 'admin' ? adminLinks : userLinks;
  const navLinks = links.map(([href, label]) => `<a class="${active === href ? 'active' : ''}" href="${href}">${label}</a>`).join('');

  return `
    <div class="container">
      <div class="grid">
        <aside class="panel">
          <div class="panelHeader">
            <div class="brand">
              <span>QueueSmart</span>
              <span class="badge">${state.user?.role === 'admin' ? 'Administrator' : 'User'}</span>
            </div>
            <p class="p" style="margin-top:8px;">
              Signed in as <strong>${esc(state.user?.email || '')}</strong>
            </p>
          </div>
          <nav class="nav">
            ${navLinks}
            <button class="btn secondary" id="logoutBtn">Logout</button>
          </nav>
        </aside>
        <main class="panel"><div class="content">${content}</div></main>
      </div>
    </div>
  `;
}

function authCardHtml(title, subtitle, body) {
  return `
    <div class="container" style="max-width:620px;">
      <div class="panel">
        <div class="content">
          <p class="h1">${title}</p>
          <p class="p">${subtitle}</p>
          ${body}
        </div>
      </div>
    </div>
  `;
}

function loginPage() {
  return authCardHtml(
    'Login',
    'QueueSmart helps UH students join and track textbook pickup queues in real time.',
    `
      <label class="label">Email</label>
      <input class="input" id="email" type="email" placeholder="name@cougarnet.uh.edu" />
      <label class="label">Password</label>
      <input class="input" id="password" type="password" placeholder="••••••••" />
      <div class="err" id="err" style="display:none;"></div>
      <div class="btnRow">
        <button class="btn" id="loginBtn">Login</button>
        <a class="btn secondary" href="#/register">Create account</a>
      </div>
      <p class="helper"><strong>Test users:</strong><br>
      Admin: admin@uh.edu / password<br>
      User: user@cougarnet.uh.edu / password</p>
    `
  );
}

function registerPage() {
  return authCardHtml(
    'Registration',
    'Create a QueueSmart account with basic credentials, matching your A2 and A3 flow.',
    `
      <label class="label">Full Name</label>
      <input class="input" id="fullName" placeholder="First Last" />
      <label class="label">Email</label>
      <input class="input" id="email" type="email" placeholder="name@cougarnet.uh.edu" />
      <label class="label">Password</label>
      <input class="input" id="password" type="password" placeholder="At least 6 characters" />
      <label class="label">Role</label>
      <select class="input" id="role">
        <option value="user">User</option>
        <option value="admin">Administrator</option>
      </select>
      <div class="err" id="err" style="display:none;"></div>
      <div class="btnRow">
        <button class="btn" id="registerBtn">Register</button>
        <a class="btn secondary" href="#/login">Back to login</a>
      </div>
    `
  );
}

function dashboardPage() {
  const servicesRows = state.services.map((service) => `
    <tr>
      <td>${esc(service.name)}</td>
      <td>${esc(service.pickupLocation || '—')}</td>
      <td>${esc(service.priority)}</td>
      <td>${serviceStatusTag(service)}</td>
    </tr>
  `).join('');

  const recentNotifications = state.notifications.slice(0, 3).map((n) => `<li>${esc(n.message)} <span class="tag muted">${esc(n.channel)}</span></li>`).join('') || '<li>No notifications yet.</li>';

  return shellHtml(`
    <p class="h1">User Dashboard</p>
    <p class="p">Overview of services, stock status, your active queue, and notifications.</p>
    <div class="cards three">
      <div class="card kpi"><div><div class="tag muted">Services Open</div><strong>${state.services.filter((s) => s.isOpen).length}</strong></div><span class="tag ok">Available</span></div>
      <div class="card kpi"><div><div class="tag muted">In Stock</div><strong>${state.services.filter((s) => s.inStock).length}</strong></div><span class="tag ok">Ready</span></div>
      <div class="card kpi"><div><div class="tag muted">Active Queue</div><strong>${state.currentEntry ? `#${state.currentEntry.position}` : '—'}</strong></div><span class="tag ${state.currentEntry ? 'warn' : 'muted'}">${state.currentEntry ? esc(state.currentEntry.status) : 'None'}</span></div>
    </div>
    <div class="cards" style="margin-top:12px;">
      <div class="card">
        <strong>Pickup Services</strong>
        <table class="table" style="margin-top:10px;">
          <thead><tr><th>Service</th><th>Location</th><th>Priority</th><th>Status</th></tr></thead>
          <tbody>${servicesRows}</tbody>
        </table>
      </div>
      <div class="card">
        <strong>Recent Notifications</strong>
        <ul style="padding-left:18px; color:var(--muted); line-height:1.7;">${recentNotifications}</ul>
      </div>
    </div>
  `);
}

function joinQueuePage() {
  const serviceOptions = state.services.map((service) => `
    <option value="${service.id}">${esc(service.name)} ${service.isOpen ? '' : '(Closed)'} ${service.inStock ? '' : '(Out of stock)'}</option>
  `).join('');
  return shellHtml(`
    <p class="h1">Join Queue</p>
    <p class="p">Select a pickup location, see stock status, estimated wait time, and join or leave the queue.</p>
    <div class="card">
      <label class="label">Pickup service</label>
      <select class="input" id="serviceSel">${serviceOptions}</select>
      <div class="cards three" style="margin-top:12px;">
        <div class="card"><div class="tag muted">Estimated wait</div><strong id="estWait">0 minutes</strong></div>
        <div class="card"><div class="tag muted">Queue length</div><strong id="queueLen">0</strong></div>
        <div class="card"><div class="tag muted">Book stock</div><strong id="stockText">—</strong></div>
      </div>
      <p class="helper" id="serviceMeta"></p>
      <div class="btnRow">
        <button class="btn" id="joinBtn">Join Queue</button>
        <button class="btn danger" id="leaveBtn">Leave Queue</button>
      </div>
    </div>
  `);
}

function statusPage() {
  const entry = state.currentEntry;
  return shellHtml(`
    <p class="h1">Queue Status</p>
    <p class="p">See your live position, estimated wait time, pickup location, and status updates.</p>
    <div class="cards">
      <div class="card">
        <strong>Current Queue</strong>
        ${entry ? `
          <div class="row" style="margin-top:10px;">
            <div><div class="tag muted">Service</div><p>${esc(entry.serviceName)}</p></div>
            <div><div class="tag muted">Position</div><p>#${entry.position}</p></div>
          </div>
          <div class="row">
            <div><div class="tag muted">Estimated wait</div><p>${entry.estimatedWaitMinutes} minutes</p></div>
            <div><div class="tag muted">Pickup location</div><p>${esc(entry.pickupLocation || '—')}</p></div>
          </div>
          <div class="row">
            <div><div class="tag muted">Status</div><p><span class="tag ${entry.status === 'almost_ready' ? 'warn' : 'muted'}">${esc(entry.status)}</span></p></div>
            <div><div class="tag muted">Stock</div><p><span class="tag ${entry.inStock ? 'ok' : 'danger'}">${entry.inStock ? 'In stock' : 'Out of stock'}</span></p></div>
          </div>
        ` : '<p class="empty">You are not currently in a queue.</p>'}
      </div>
      <div class="card">
        <strong>Status meaning</strong>
        <ul style="padding-left:18px; color:var(--muted); line-height:1.7;">
          <li>waiting: you are in line</li>
          <li>almost_ready: head to the pickup point soon</li>
          <li>completed: order served and moved into history</li>
          <li>cancelled: left queue or removed by admin</li>
        </ul>
      </div>
    </div>
  `);
}

function historyPage() {
  const rows = state.history.map((item) => `
    <tr>
      <td>${new Date(item.actionTime).toLocaleString()}</td>
      <td>${esc(item.serviceName)}</td>
      <td><span class="tag muted">${esc(item.action)}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="3" class="empty">No history yet.</td></tr>';
  return shellHtml(`
    <p class="h1">History</p>
    <p class="p">Past queue actions and completed pickups are stored here.</p>
    <div class="card"><table class="table"><thead><tr><th>Date</th><th>Service</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div>
  `);
}

function bookRequestsPage() {
  const data = getCourseMaterialsData();
  const materials = Array.isArray(data.materials) ? data.materials : [];

  const uniq = (values) => [...new Set(values.filter(Boolean))];

  const departments = Array.isArray(data.departments) && data.departments.length
    ? data.departments
    : uniq(materials.map((item) => String(item.department || '').trim()));

  const courses = Array.isArray(data.courses) && data.courses.length
    ? data.courses
    : uniq(materials.map((item) => {
      const dep = String(item.department || '').trim();
      const num = String(item.course || '').trim();
      return dep && num ? `${dep} ${num}` : '';
    }));

  const sections = Array.isArray(data.sections) && data.sections.length
    ? data.sections
    : uniq(materials.map((item) => String(item.section || '').trim()));

  const professors = Array.isArray(data.professors) && data.professors.length
    ? data.professors
    : uniq(materials.map((item) => String(item.professor || '').trim()));

  const books = Array.isArray(data.books) && data.books.length
    ? data.books
    : uniq(materials.map((item) => String(item.title || '').trim()));

  const departmentOptions = toDataListOptions(departments);
  const courseOptions = toDataListOptions(courses);
  const sectionOptions = toDataListOptions(sections);
  const professorOptions = toDataListOptions(professors);
  const bookOptions = toDataListOptions(books);

  const rows = state.bookRequests.map((item) => `
    <tr>
      <td>${new Date(item.createdAt).toLocaleString()}</td>
      <td>${esc(item.bookTitle)}</td>
      <td>${esc(item.author || '—')}</td>
      <td>${esc(item.courseCode || '—')}</td>
      <td><span class="tag muted">${esc(item.status)}</span></td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty">No book requests yet.</td></tr>';

  return shellHtml(`
    <p class="h1">Search for a Textbook to Request</p>
    <p class="p">Search existing UH course materials first. If you do not find your textbook, submit a request and we will track it for your class.</p>
    <div class="cards">
      <div class="card">
        <strong>Step 1: Search Materials</strong>
        <p class="helper">Start by searching for an existing textbook using term, department, course, section, professor, or title.</p>
        <div class="row">
          <div>
            <label class="label">Program / Campus</label>
            <select class="input" id="reqProgram">
              <option value="UH Main Campus">UH Main Campus</option>
              <option value="UH Sugar Land">UH Sugar Land</option>
              <option value="UH Katy">UH Katy</option>
            </select>
          </div>
          <div>
            <label class="label">Academic Term</label>
            <select class="input" id="reqTerm">
              <option value="Fall 2026">Fall 2026</option>
              <option value="Spring 2027">Spring 2027</option>
              <option value="Summer 2027">Summer 2027</option>
            </select>
          </div>
        </div>
        <div class="row">
          <div><label class="label">Department</label><input class="input" id="reqDepartment" list="departmentList" placeholder="BCIS" /></div>
          <div><label class="label">Course</label><input class="input" id="reqCourseCode" list="courseList" placeholder="BCIS 1305 - Business Computer Applications" /></div>
        </div>
        <div class="row">
          <div><label class="label">Section</label><input class="input" id="reqSection" list="sectionList" placeholder="12446" /></div>
          <div><label class="label">Professor</label><input class="input" id="reqProfessor" list="professorList" placeholder="Emese Felvegi" /></div>
        </div>
        <label class="label">Textbook Title (optional)</label>
        <input class="input" id="reqBookTitle" list="bookList" placeholder="Introduction to Algorithms" />
        <div class="btnRow">
          <button class="btn" id="findMaterialsBtn">Search Textbooks</button>
          <button class="btn secondary" id="emailMeBtn">Notify Me of Updates</button>
        </div>
        <div class="card" id="materialsResult" style="display:none; margin-top:12px;">
          <strong>Course Materials</strong>
          <p class="p" id="materialsMessage" style="margin-top:8px;"></p>
          <div class="tableScroll" style="margin-top:10px;">
            <table class="table materialsTable">
              <thead>
                <tr>
                  <th>Term</th><th>Department</th><th>Course</th><th>Section</th><th>Title</th><th>Author</th><th>Edition</th><th>ISBN</th><th>Required/Optional</th><th>Use</th>
                </tr>
              </thead>
              <tbody id="materialsTableBody"></tbody>
            </table>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid var(--border); margin:16px 0;" />
        <strong>Step 2: Request This Textbook (if not listed above)</strong>
        <p class="helper">If your textbook is not shown in search results, submit a request for follow-up.</p>
        <label class="label">Author</label>
        <input class="input" id="reqAuthor" placeholder="Cormen et al." />
        <div class="row">
          <div><label class="label">ISBN</label><input class="input" id="reqIsbn" placeholder="9780262033848" /></div>
          <div><label class="label">Notes</label><input class="input" id="reqNotes" placeholder="Required/optional, edition, bundle info" /></div>
        </div>
        <div class="btnRow">
          <button class="btn" id="submitBookRequestBtn">Submit Textbook Request</button>
        </div>
        <div class="err" id="bookReqErr" style="display:none;"></div>
      </div>
      <div class="card">
        <strong>Your Textbook Requests</strong>
        <div class="tableScroll" style="margin-top:10px;">
          <table class="table requestsTable">
            <thead><tr><th>Date</th><th>Title</th><th>Author</th><th>Course</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
    <datalist id="departmentList">${departmentOptions}</datalist>
    <datalist id="courseList">${courseOptions}</datalist>
    <datalist id="sectionList">${sectionOptions}</datalist>
    <datalist id="professorList">${professorOptions}</datalist>
    <datalist id="bookList">${bookOptions}</datalist>
  `);
}

function notificationsPage() {
  const rows = state.notifications.map((item) => `
    <tr>
      <td>${new Date(item.createdAt).toLocaleString()}</td>
      <td>${esc(item.message)}</td>
      <td><span class="tag muted">${esc(item.channel)}</span></td>
      <td>${item.isRead ? '<span class="tag ok">Read</span>' : `<button class="btn secondary" data-read="${item.id}">Mark read</button>`}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="empty">No notifications yet.</td></tr>';
  return shellHtml(`
    <p class="h1">Notifications</p>
    <p class="p">In-app, email, and SMS notifications created by the backend are listed here.</p>
    <div class="card"><table class="table"><thead><tr><th>Date</th><th>Message</th><th>Channel</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
  `);
}

function adminDashboardPage() {
  const rows = state.services.map((service) => `
    <tr>
      <td>${esc(service.name)}</td>
      <td>${service.activeQueueLength}</td>
      <td>${service.stockQuantity}</td>
      <td>${serviceStatusTag(service)}</td>
    </tr>
  `).join('');
  return shellHtml(`
    <p class="h1">Admin Dashboard</p>
    <p class="p">Monitor queue size, stock quantity, and service availability across all pickup locations.</p>
    <div class="card"><table class="table"><thead><tr><th>Service</th><th>Queue</th><th>Stock</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
  `);
}

function serviceManagementPage() {
  const rows = state.services.map((service) => `
    <tr>
      <td>${esc(service.name)}</td>
      <td>${esc(service.pickupLocation || '—')}</td>
      <td>${service.stockQuantity}</td>
      <td>${esc(service.priority)}</td>
      <td>${serviceStatusTag(service)}</td>
      <td><button class="btn secondary" data-edit-service="${service.id}">Edit</button></td>
    </tr>
  `).join('');

  return shellHtml(`
    <p class="h1">Service Management</p>
    <p class="p">Create and edit pickup services, stock quantity, priority, location, and availability.</p>
    <div class="cards">
      <div class="card">
        <strong id="serviceFormTitle">${state.editingServiceId ? 'Edit Service' : 'Create Service'}</strong>
        <label class="label">Service Name</label><input class="input" id="svcName" />
        <label class="label">Description</label><textarea class="input" id="svcDescription"></textarea>
        <div class="row">
          <div><label class="label">Expected Duration</label><input class="input" id="svcDuration" type="number" min="1" /></div>
          <div><label class="label">Priority</label><select class="input" id="svcPriority"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></div>
        </div>
        <div class="row">
          <div><label class="label">Stock Quantity</label><input class="input" id="svcStock" type="number" min="0" /></div>
          <div><label class="label">Pickup Location</label><input class="input" id="svcLocation" /></div>
        </div>
        <label class="label">Queue Status</label><select class="input" id="svcOpen"><option value="true">Open</option><option value="false">Closed</option></select>
        <div class="btnRow"><button class="btn" id="saveServiceBtn">Save Service</button><button class="btn secondary" id="clearServiceBtn">Clear</button></div>
        <div class="err" id="serviceErr" style="display:none;"></div>
      </div>
      <div class="card">
        <strong>Services</strong>
        <table class="table" style="margin-top:10px;"><thead><tr><th>Name</th><th>Location</th><th>Stock</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
    </div>
  `);
}

function queueManagementPage() {
  const options = state.services.map((service) => `<option value="${service.id}">${esc(service.name)}</option>`).join('');
  return shellHtml(`
    <p class="h1">Queue Management</p>
    <p class="p">View a service queue, serve the next user, move users up or down, or remove them.</p>
    <div class="card">
      <label class="label">Select service</label>
      <select class="input" id="adminServiceSel">${options}</select>
      <div class="btnRow"><button class="btn ok" id="serveNextBtn">Serve next user</button></div>
      <table class="table" style="margin-top:12px;"><thead><tr><th>Position</th><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody id="queueTableBody"></tbody></table>
    </div>
  `);
}

function statsPage() {
  const totals = state.adminStats?.totals || {};
  const rows = (state.adminStats?.serviceStats || []).map((row) => `
    <tr>
      <td>${esc(row.name)}</td>
      <td>${row.activeQueueLength}</td>
      <td>${row.totalServed}</td>
      <td>${row.stockQuantity}</td>
    </tr>
  `).join('');
  return shellHtml(`
    <p class="h1">Usage Statistics</p>
    <p class="p">Semester demand, service load, total notifications, and served counts.</p>
    <div class="cards three">
      <div class="card kpi"><div><div class="tag muted">Users</div><strong>${totals.users || 0}</strong></div><span class="tag muted">Registered</span></div>
      <div class="card kpi"><div><div class="tag muted">Active Queue Entries</div><strong>${totals.activeQueueEntries || 0}</strong></div><span class="tag warn">Live</span></div>
      <div class="card kpi"><div><div class="tag muted">Notifications Sent</div><strong>${totals.notificationsSent || 0}</strong></div><span class="tag ok">Tracked</span></div>
    </div>
    <div class="card" style="margin-top:12px;"><table class="table"><thead><tr><th>Service</th><th>Current Queue</th><th>Total Served</th><th>Stock Left</th></tr></thead><tbody>${rows}</tbody></table></div>
  `);
}

async function loadCommonData() {
  const servicesData = await api('/services');
  state.services = servicesData.services;

  if (state.user) {
    const [notificationsData, historyData, currentEntryData, bookRequestsData] = await Promise.all([
      api(`/notifications/${state.user.id}`),
      api(`/history/${state.user.id}`),
      api(`/queues/user/${state.user.id}/current`),
      api(`/book-requests/user/${state.user.id}`),
    ]);
    state.notifications = notificationsData.notifications;
    state.history = historyData.history;
    state.currentEntry = currentEntryData.entry;
    state.bookRequests = bookRequestsData.requests;
  }
}

async function loadAdminStats() {
  const data = await api('/admin/stats');
  state.adminStats = data;
}

async function loadAdminQueue(serviceId) {
  const data = await api(`/queues/service/${serviceId}`);
  state.adminQueue = data.queue;
}

function bindLogin() {
  qs('#loginBtn').onclick = async () => {
    const err = qs('#err');
    err.style.display = 'none';
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: qs('#email').value.trim(), password: qs('#password').value }),
      });
      setUser(data.user);
      pushToast('Welcome', 'Login successful.');
      location.hash = data.user.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
    } catch (error) {
      err.style.display = 'block';
      err.textContent = error.message;
    }
  };
}

function bindRegister() {
  qs('#registerBtn').onclick = async () => {
    const err = qs('#err');
    err.style.display = 'none';
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName: qs('#fullName').value.trim(),
          email: qs('#email').value.trim(),
          password: qs('#password').value,
          role: qs('#role').value,
        }),
      });
      pushToast('Account created', 'Registration complete. You can now log in.');
      location.hash = '#/login';
    } catch (error) {
      err.style.display = 'block';
      err.textContent = error.message;
    }
  };
}

function bindShell() {
  const logoutBtn = qs('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      setUser(null);
      state.currentEntry = null;
      state.history = [];
      state.notifications = [];
      pushToast('Signed out', 'You have been logged out.');
      location.hash = '#/login';
    };
  }
}

function bindJoinQueue() {
  const serviceSel = qs('#serviceSel');
  const joinBtn = qs('#joinBtn');
  const leaveBtn = qs('#leaveBtn');
  const serviceMeta = qs('#serviceMeta');
  const estWait = qs('#estWait');
  const queueLen = qs('#queueLen');
  const stockText = qs('#stockText');

  function refreshCard() {
    const service = state.services.find((item) => String(item.id) === serviceSel.value);
    if (!service) return;
    estWait.textContent = `${service.estimatedNewWaitMinutes} minutes`;
    queueLen.textContent = service.activeQueueLength;
    stockText.textContent = service.inStock ? `${service.stockQuantity} available` : 'Out of stock';
    serviceMeta.textContent = `${service.description} Location: ${service.pickupLocation || '—'}. Priority: ${service.priority}.`;
    joinBtn.disabled = !!state.currentEntry || !service.isOpen || !service.inStock;
    leaveBtn.disabled = !state.currentEntry;
  }

  serviceSel.onchange = refreshCard;
  joinBtn.onclick = async () => {
    try {
      await api('/queues/join', {
        method: 'POST',
        body: JSON.stringify({ userId: state.user.id, serviceId: Number(serviceSel.value) }),
      });
      pushToast('Joined queue', 'You successfully joined the queue.');
      await loadCommonData();
      render();
    } catch (error) {
      pushToast('Queue join failed', error.message);
    }
  };

  leaveBtn.onclick = async () => {
    try {
      await api('/queues/leave', {
        method: 'POST',
        body: JSON.stringify({ userId: state.user.id }),
      });
      pushToast('Queue updated', 'You left the queue.');
      await loadCommonData();
      render();
    } catch (error) {
      pushToast('Queue leave failed', error.message);
    }
  };

  refreshCard();
}

function bindNotifications() {
  qsa('[data-read]').forEach((btn) => {
    btn.onclick = async () => {
      await api(`/notifications/${btn.dataset.read}/read`, { method: 'POST' });
      await loadCommonData();
      render();
    };
  });
}

function bindBookRequests() {
  const findBtn = qs('#findMaterialsBtn');
  const emailBtn = qs('#emailMeBtn');
  const resultCard = qs('#materialsResult');
  const resultMsg = qs('#materialsMessage');
  const resultTableBody = qs('#materialsTableBody');
  const data = getCourseMaterialsData();
  const materials = Array.isArray(data.materials) ? data.materials : [];
  let currentResultMaterials = [];

  const uniq = (values) => [...new Set(values.filter(Boolean))];

  const departmentsSource = Array.isArray(data.departments) && data.departments.length
    ? data.departments
    : uniq(materials.map((item) => String(item.department || '').trim()));

  const coursesSource = Array.isArray(data.courses) && data.courses.length
    ? data.courses
    : uniq(materials.map((item) => {
      const dep = String(item.department || '').trim();
      const num = String(item.course || '').trim();
      return dep && num ? `${dep} ${num}` : '';
    }));

  const sectionsSource = Array.isArray(data.sections) && data.sections.length
    ? data.sections
    : uniq(materials.map((item) => String(item.section || '').trim()));

  const professorsSource = Array.isArray(data.professors) && data.professors.length
    ? data.professors
    : uniq(materials.map((item) => String(item.professor || '').trim()));

  const booksSource = Array.isArray(data.books) && data.books.length
    ? data.books
    : uniq(materials.map((item) => String(item.title || '').trim()));

  function norm(value) {
    return String(value || '').trim().toLowerCase();
  }

  function setListOptions(listId, values, limit = 80) {
    const list = qs(`#${listId}`);
    if (!list) return;
    list.innerHTML = toDataListOptions(values.slice(0, limit));
  }

  function normalizeSection(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(Number(raw));
    return raw.toLowerCase();
  }

  function parseCourseInput(rawValue) {
    const raw = String(rawValue || '').trim();
    const upper = raw.toUpperCase();
    const match = upper.match(/^([A-Z]{3,5})\s*(\d{3,4})/);
    if (match) {
      return {
        text: norm(raw),
        department: match[1].toLowerCase(),
        number: match[2]
      };
    }

    const numeric = raw.match(/\d{3,4}/);
    return {
      text: norm(raw),
      department: '',
      number: numeric ? numeric[0] : ''
    };
  }

  function renderResults(filtered, meta) {
    currentResultMaterials = filtered;

    if (!filtered.length) {
      resultTableBody.innerHTML = '<tr><td colspan="10" class="empty">No materials found for this filter. Try removing one field or click EMAIL ME for updates.</td></tr>';
      resultMsg.textContent = `No results for ${meta}.`;
      resultCard.style.display = 'block';
      return;
    }

    resultTableBody.innerHTML = filtered.map((item, index) => `
      <tr>
        <td>${esc(item.term || '—')}</td>
        <td>${esc(item.department || '—')}</td>
        <td>${esc(item.course || '—')}</td>
        <td>${esc(item.section || '—')}</td>
        <td>${esc(item.title || '—')}</td>
        <td>${esc(item.author || '—')}</td>
        <td>${esc(item.edition || '—')}</td>
        <td>${esc(item.isbn || 'N/A')}</td>
        <td>${esc(item.requiredOptional || 'Required')}</td>
        <td><button class="btn secondary" data-prefill-material="${index}">Use</button></td>
      </tr>
    `).join('');

    qsa('[data-prefill-material]', resultTableBody).forEach((btn) => {
      btn.onclick = () => {
        const index = Number(btn.dataset.prefillMaterial);
        const selected = currentResultMaterials[index];
        if (!selected) return;

        const titleField = qs('#reqBookTitle');
        const authorField = qs('#reqAuthor');
        const isbnField = qs('#reqIsbn');
        const courseField = qs('#reqCourseCode');
        const notesField = qs('#reqNotes');

        if (titleField) titleField.value = selected.title || '';
        if (authorField) authorField.value = selected.author || '';
        if (isbnField) isbnField.value = selected.isbn || '';
        if (courseField) courseField.value = `${selected.department || ''} ${selected.course || ''}`.trim();
        if (notesField) {
          const noteBits = [
            selected.requiredOptional || '',
            selected.edition ? `${selected.edition} edition` : '',
            selected.section ? `Section ${selected.section}` : '',
            selected.professor ? `Professor ${selected.professor}` : ''
          ].filter(Boolean);
          notesField.value = noteBits.join(' | ');
        }

        pushToast('Request form autofilled', 'Book details were copied from the search result.');
      };
    });

    resultMsg.textContent = `Showing ${filtered.length} material result(s) for ${meta}.`;
    resultCard.style.display = 'block';
  }

  function updateSuggestions() {
    const departmentInput = qs('#reqDepartment')?.value || '';
    const courseInput = qs('#reqCourseCode')?.value || '';
    const sectionInput = qs('#reqSection')?.value || '';
    const professorInput = qs('#reqProfessor')?.value || '';
    const titleInput = qs('#reqBookTitle')?.value || '';

    const deptValue = norm(departmentInput);
    const courseTokens = parseCourseInput(courseInput);
    const sectionValue = normalizeSection(sectionInput);
    const professorValue = norm(professorInput);
    const titleValue = norm(titleInput);

    const matchDept = (item) => !deptValue || norm(item.department) === deptValue;
    const matchCourse = (item) => {
      if (!courseTokens.text) return true;
      const itemCourseNum = String(item.course || '').trim();
      const full = `${String(item.department || '').trim()} ${itemCourseNum}`;
      return (
        norm(full).includes(courseTokens.text) ||
        norm(itemCourseNum).includes(courseTokens.text) ||
        (courseTokens.number && itemCourseNum === courseTokens.number)
      );
    };

    const scopedMaterials = materials.filter((item) => matchDept(item) && matchCourse(item));

    const suggestedDepartments = departmentsSource.filter((item) => norm(item).includes(deptValue));

    const suggestedCoursesRaw = scopedMaterials.length
      ? uniq(scopedMaterials.map((item) => `${String(item.department || '').trim()} ${String(item.course || '').trim()}`.trim()))
      : coursesSource;
    const suggestedCourses = suggestedCoursesRaw.filter((item) => norm(item).includes(courseTokens.text));

    const suggestedSectionsRaw = scopedMaterials.length
      ? uniq(scopedMaterials.map((item) => String(item.section || '').trim()))
      : sectionsSource;
    const suggestedSections = suggestedSectionsRaw.filter((item) => normalizeSection(item).includes(sectionValue));

    const suggestedProfessorsRaw = scopedMaterials.length
      ? uniq(scopedMaterials.map((item) => String(item.professor || '').trim()))
      : professorsSource;
    const suggestedProfessors = suggestedProfessorsRaw.filter((item) => norm(item).includes(professorValue));

    const suggestedBooksRaw = scopedMaterials.length
      ? uniq(scopedMaterials.map((item) => String(item.title || '').trim()))
      : booksSource;
    const suggestedBooks = suggestedBooksRaw.filter((item) => norm(item).includes(titleValue));

    setListOptions('departmentList', suggestedDepartments);
    setListOptions('courseList', suggestedCourses);
    setListOptions('sectionList', suggestedSections);
    setListOptions('professorList', suggestedProfessors);
    setListOptions('bookList', suggestedBooks);
  }

  if (findBtn && resultCard && resultMsg && resultTableBody) {
    const runSearch = () => {
      const department = qs('#reqDepartment')?.value.trim() || '';
      const course = qs('#reqCourseCode')?.value.trim() || '';
      const section = qs('#reqSection')?.value.trim() || '';
      const professor = qs('#reqProfessor')?.value.trim() || '';
      const term = qs('#reqTerm')?.value || '';
      const title = qs('#reqBookTitle')?.value.trim() || '';

      const deptValue = norm(department);
      const courseTokens = parseCourseInput(course);
      const sectionValue = normalizeSection(section);
      const termValue = norm(term);
      const professorValue = norm(professor);
      const titleValue = norm(title);

      const filtered = materials.filter((item) => {
        const itemTerm = norm(item.term);
        const itemDept = norm(item.department);
        const itemCourse = String(item.course || '').trim();
        const itemCourseValue = norm(itemCourse);
        const itemCourseNum = (itemCourse.match(/\d{3,4}/) || [itemCourse])[0];
        const itemSection = normalizeSection(item.section);
        const itemProfessor = norm(item.professor);
        const itemTitle = norm(item.title);

        const termMatches = !termValue || itemTerm.includes(termValue);
        const deptMatches = !deptValue || itemDept === deptValue;

        let courseMatches = true;
        if (courseTokens.text) {
          courseMatches =
            itemCourseValue.includes(courseTokens.text) ||
            `${itemDept} ${itemCourseNum}`.includes(courseTokens.text) ||
            (courseTokens.number && itemCourseNum === courseTokens.number) ||
            (courseTokens.department && courseTokens.number && itemDept === courseTokens.department && itemCourseNum === courseTokens.number);
        }

        const sectionMatches = !sectionValue || itemSection === sectionValue;
        const professorMatches = !professorValue || itemProfessor.includes(professorValue);
        const titleMatches = !titleValue || itemTitle.includes(titleValue);

        return termMatches && deptMatches && courseMatches && sectionMatches && professorMatches && titleMatches;
      });

      const parts = [
        term || 'any term',
        department || 'any department',
        course || 'any course',
        section ? `section ${section}` : 'any section',
        professor ? `professor ${professor}` : 'any professor',
        title ? `title ${title}` : 'any title'
      ];

      renderResults(filtered, parts.join(', '));
    };

    findBtn.onclick = runSearch;

    const filterIds = ['#reqDepartment', '#reqCourseCode', '#reqSection', '#reqProfessor', '#reqTerm', '#reqBookTitle'];
    filterIds.forEach((selector) => {
      const element = qs(selector);
      if (!element) return;
      element.addEventListener('change', runSearch);
      if (selector !== '#reqTerm') {
        element.addEventListener('input', updateSuggestions);
      }
    });

    updateSuggestions();
  }

  if (emailBtn) {
    emailBtn.onclick = () => {
      pushToast('Email alert set', 'We will notify you when course materials are updated.');
    };
  }

  const submitBtn = qs('#submitBookRequestBtn');
  if (!submitBtn) return;

  submitBtn.onclick = async () => {
    const err = qs('#bookReqErr');
    err.style.display = 'none';

    const payload = {
      userId: state.user.id,
      bookTitle: qs('#reqBookTitle').value.trim(),
      author: qs('#reqAuthor').value.trim(),
      isbn: qs('#reqIsbn').value.trim(),
      courseCode: qs('#reqCourseCode').value.trim(),
      notes: qs('#reqNotes').value.trim(),
    };

    try {
      await api('/book-requests', { method: 'POST', body: JSON.stringify(payload) });
      pushToast('Request submitted', 'Your book request was saved successfully.');
      await loadCommonData();
      render();
    } catch (error) {
      err.style.display = 'block';
      err.textContent = error.message;
    }
  };
}

function fillServiceForm(service) {
  qs('#svcName').value = service?.name || '';
  qs('#svcDescription').value = service?.description || '';
  qs('#svcDuration').value = service?.expectedDurationMin || 3;
  qs('#svcPriority').value = service?.priority || 'low';
  qs('#svcStock').value = service?.stockQuantity ?? 0;
  qs('#svcLocation').value = service?.pickupLocation || '';
  qs('#svcOpen').value = String(service?.isOpen ?? true);
}

function bindServiceManagement() {
  fillServiceForm(state.services.find((item) => item.id === state.editingServiceId));

  qsa('[data-edit-service]').forEach((btn) => {
    btn.onclick = () => {
      state.editingServiceId = Number(btn.dataset.editService);
      render();
    };
  });

  qs('#clearServiceBtn').onclick = () => {
    state.editingServiceId = null;
    render();
  };

  qs('#saveServiceBtn').onclick = async () => {
    const err = qs('#serviceErr');
    err.style.display = 'none';
    const payload = {
      name: qs('#svcName').value.trim(),
      description: qs('#svcDescription').value.trim(),
      expectedDurationMin: Number(qs('#svcDuration').value),
      priority: qs('#svcPriority').value,
      stockQuantity: Number(qs('#svcStock').value),
      pickupLocation: qs('#svcLocation').value.trim(),
      isOpen: qs('#svcOpen').value === 'true',
    };
    try {
      if (state.editingServiceId) {
        await api(`/services/${state.editingServiceId}`, { method: 'PUT', body: JSON.stringify(payload) });
        pushToast('Service updated', 'Service changes saved.');
      } else {
        await api('/services', { method: 'POST', body: JSON.stringify(payload) });
        pushToast('Service created', 'New service added.');
      }
      state.editingServiceId = null;
      await loadCommonData();
      render();
    } catch (error) {
      err.style.display = 'block';
      err.textContent = error.message;
    }
  };
}

function renderAdminQueueTable() {
  const body = qs('#queueTableBody');
  if (!body) return;
  if (!state.adminQueue.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No users currently in this queue.</td></tr>';
    return;
  }

  body.innerHTML = state.adminQueue.map((item, index) => `
    <tr>
      <td>${item.position}</td>
      <td>${esc(item.fullName)}</td>
      <td>${esc(item.email)}</td>
      <td><span class="tag ${item.status === 'almost_ready' ? 'warn' : 'muted'}">${esc(item.status)}</span></td>
      <td>
        <div class="btnRow" style="margin:0;">
          <button class="btn secondary" data-up="${index}" ${index === 0 ? 'disabled' : ''}>Up</button>
          <button class="btn secondary" data-down="${index}" ${index === state.adminQueue.length - 1 ? 'disabled' : ''}>Down</button>
          <button class="btn danger" data-remove-entry="${item.id}">Remove</button>
        </div>
      </td>
    </tr>
  `).join('');

  qsa('[data-up]').forEach((btn) => {
    btn.onclick = async () => {
      const index = Number(btn.dataset.up);
      [state.adminQueue[index - 1], state.adminQueue[index]] = [state.adminQueue[index], state.adminQueue[index - 1]];
      await persistQueueOrder();
    };
  });
  qsa('[data-down]').forEach((btn) => {
    btn.onclick = async () => {
      const index = Number(btn.dataset.down);
      [state.adminQueue[index], state.adminQueue[index + 1]] = [state.adminQueue[index + 1], state.adminQueue[index]];
      await persistQueueOrder();
    };
  });
  qsa('[data-remove-entry]').forEach((btn) => {
    btn.onclick = async () => {
      await api('/admin/queue/remove-entry', { method: 'POST', body: JSON.stringify({ entryId: Number(btn.dataset.removeEntry) }) });
      pushToast('Queue updated', 'Queue entry removed.');
      await afterAdminQueueChange();
    };
  });
}

async function persistQueueOrder() {
  const serviceId = Number(qs('#adminServiceSel').value);
  await api('/admin/queue/reorder', {
    method: 'POST',
    body: JSON.stringify({ serviceId, orderedEntryIds: state.adminQueue.map((item) => item.id) }),
  });
  pushToast('Queue updated', 'Queue order saved.');
  await afterAdminQueueChange();
}

async function afterAdminQueueChange() {
  await loadCommonData();
  await loadAdminQueue(Number(qs('#adminServiceSel').value));
  await loadAdminStats();
  render();
}

function bindQueueManagement() {
  const sel = qs('#adminServiceSel');
  sel.onchange = async () => {
    await loadAdminQueue(Number(sel.value));
    renderAdminQueueTable();
  };

  qs('#serveNextBtn').onclick = async () => {
    try {
      await api('/admin/queue/serve-next', { method: 'POST', body: JSON.stringify({ serviceId: Number(sel.value) }) });
      pushToast('Service updated', 'Next user served and notifications sent.');
      await afterAdminQueueChange();
    } catch (error) {
      pushToast('Serve failed', error.message);
    }
  };

  renderAdminQueueTable();
}

async function render() {
  const app = qs('#app');
  const hash = location.hash || '#/login';

  try {
    if (!state.user && !['#/login', '#/register'].includes(hash)) {
      location.hash = '#/login';
      return;
    }

    if (hash === '#/login') {
      app.innerHTML = loginPage();
      bindLogin();
      return;
    }
    if (hash === '#/register') {
      app.innerHTML = registerPage();
      bindRegister();
      return;
    }

    await loadCommonData();

    if (hash === '#/app/dashboard') app.innerHTML = dashboardPage();
    else if (hash === '#/app/join') app.innerHTML = joinQueuePage();
    else if (hash === '#/app/status') app.innerHTML = statusPage();
    else if (hash === '#/app/book-requests') app.innerHTML = bookRequestsPage();
    else if (hash === '#/app/history') app.innerHTML = historyPage();
    else if (hash === '#/app/notifications') app.innerHTML = notificationsPage();
    else if (hash === '#/admin/dashboard') app.innerHTML = adminDashboardPage();
    else if (hash === '#/admin/services') app.innerHTML = serviceManagementPage();
    else if (hash === '#/admin/queues') {
      app.innerHTML = queueManagementPage();
      const firstServiceId = state.services[0]?.id;
      if (firstServiceId) await loadAdminQueue(firstServiceId);
    }
    else if (hash === '#/admin/stats') {
      await loadAdminStats();
      app.innerHTML = statsPage();
    }
    else {
      location.hash = state.user.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard';
      return;
    }

    bindShell();
    if (hash === '#/app/join') bindJoinQueue();
    if (hash === '#/app/book-requests') bindBookRequests();
    if (hash === '#/app/notifications') bindNotifications();
    if (hash === '#/admin/services') bindServiceManagement();
    if (hash === '#/admin/queues') bindQueueManagement();
  } catch (error) {
    app.innerHTML = authCardHtml('QueueSmart', 'Something went wrong while loading the app.', `<div class="err" style="display:block;">${esc(error.message)}</div><p class="helper">Check that the backend is running and your MySQL credentials are correct.</p>`);
  }
}

window.addEventListener('hashchange', render);
window.addEventListener('load', async () => {
  renderToasts();
  if (!location.hash) {
    location.hash = state.user ? (state.user.role === 'admin' ? '#/admin/dashboard' : '#/app/dashboard') : '#/login';
  }
  await render();
});
