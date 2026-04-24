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
  adminBookRequests: [],
  adminLocations: [],
  editingServiceId: null,
  editingLocationId: null,
  editingLocationOriginalName: null,
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
  return service.isOpen ? '<span class="tag ok">Open</span>' : '<span class="tag warn">Closed</span>';
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
    ['#/admin/services', 'Queue Setup'],
    ['#/admin/queues', 'Queue Management'],
    ['#/admin/book-requests', 'Book Requests'],
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
      <td>${esc(service.locationName || '—')}</td>
      <td>${serviceStatusTag(service)}</td>
    </tr>
  `).join('');

  const recentNotifications = state.notifications.slice(0, 3).map((n) => `<li>${esc(n.message)} <span class="tag muted">${esc(n.channel)}</span></li>`).join('') || '<li>No notifications yet.</li>';

  return shellHtml(`
    <p class="h1">User Dashboard</p>
    <p class="p">Overview of services, stock status, your active queue, and notifications.</p>
    <div class="cards three">
      <div class="card kpi"><div><div class="tag muted">Services Open</div><strong>${state.services.filter((s) => s.isOpen).length}</strong></div><span class="tag ok">Available</span></div>
      <div class="card kpi"><div><div class="tag muted">Open Queues</div><strong>${state.services.filter((s) => s.isOpen).length}</strong></div><span class="tag ok">Open</span></div>
      <div class="card kpi"><div><div class="tag muted">Active Queue</div><strong>${state.currentEntry ? `#${state.currentEntry.position}` : '—'}</strong></div><span class="tag ${state.currentEntry ? 'warn' : 'muted'}">${state.currentEntry ? esc(state.currentEntry.status) : 'None'}</span></div>
    </div>
    <div class="cards" style="margin-top:12px;">
      <div class="card">
          <strong>Pickup Queues</strong>
        <table class="table" style="margin-top:10px;">
            <thead><tr><th>Queue</th><th>Location</th><th>Status</th></tr></thead>
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
  const readyRequests = (state.bookRequests || []).filter((r) => r.status === 'ready');
  const readyByLocation = {};
  const readyLocationIds = new Set();
  
  readyRequests.forEach((req) => {
    const locName = req.locationName || 'Unassigned';
    if (!readyByLocation[locName]) readyByLocation[locName] = [];
    readyByLocation[locName].push(req);
    if (req.locationId) readyLocationIds.add(req.locationId);
  });

  const readySection = readyRequests.length > 0 ? `
    <div class="card">
      <strong>Ready for Pickup</strong>
      <div class="cards" style="margin-top:10px;">
        ${Object.entries(readyByLocation).map(([locName, reqs]) => {
          const queuesAtLoc = state.services.filter((s) => s.locationName === locName);
          const queueId = queuesAtLoc.length > 0 ? queuesAtLoc[0].id : null;
          return `
            <div class="card" style="border: 2px solid var(--ok); padding: 12px;">
              <div style="font-weight:600; color: var(--ok); margin-bottom: 8px;">📍 ${esc(locName)}</div>
              <ul style="padding-left:18px; color:var(--muted); font-size: 14px; line-height: 1.6; margin: 0;">
                ${reqs.map((r) => `<li>${esc(r.bookTitle)}${r.courseCode ? ` (${esc(r.courseCode)})` : ''}</li>`).join('')}
              </ul>
              <button class="btn" onclick="joinQueueForLocation(${queueId}, '${esc(locName)}')"
                style="margin-top: 10px; font-size: 12px; padding: 6px 12px;"
                ${queueId ? '' : 'disabled'}>
                Join Queue for Pickup
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Filter services: if they have ready books, show only queues at those locations
  const availableServices = readyRequests.length > 0 
    ? state.services.filter((s) => readyLocationIds.has(s.locationId))
    : state.services;

  const serviceOptions = availableServices.map((service) => `
    <option value="${service.id}">${esc(service.name)} ${service.isOpen ? '' : '(Closed)'}</option>
  `).join('');

  const orSelectLabel = readyRequests.length > 0 
    ? 'Or join another queue at the same location'
    : 'Select a pickup queue';

  return shellHtml(`
    <p class="h1">Join Queue</p>
    <p class="p">Pick up your ready textbooks or join any available queue.</p>
    ${readySection}
    <div class="card">
        <label class="label">${orSelectLabel}</label>
      <select class="input" id="serviceSel">${serviceOptions}</select>
      <div class="cards three" style="margin-top:12px;">
        <div class="card"><div class="tag muted">Estimated wait</div><strong id="estWait">—</strong></div>
        <div class="card"><div class="tag muted">Queue length</div><strong id="queueLen">0</strong></div>
        <div class="card"><div class="tag muted">Pickup location</div><strong id="stockText">—</strong></div>
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
            <div><div class="tag muted">Pickup location</div><p>${esc(entry.locationName || '—')}</p></div>
          </div>
          <div class="row">
            <div><div class="tag muted">Status</div><p><span class="tag ${entry.status === 'almost_ready' ? 'warn' : 'muted'}">${esc(entry.status)}</span></p></div>
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
      <td>${serviceStatusTag(service)}</td>
    </tr>
  `).join('');
  return shellHtml(`
    <p class="h1">Admin Dashboard</p>
    <p class="p">Monitor queue size and availability across all pickup locations.</p>
    <div class="card"><table class="table"><thead><tr><th>Service</th><th>Queue</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
  `);
}

function serviceManagementPage() {
  const locationOptions = ['<option value="">Unassigned</option>']
    .concat((state.adminLocations || []).map((loc) => `<option value="${loc.id}">${esc(loc.name)}</option>`))
    .join('');

  const rows = state.services.map((service) => `
    <tr>
      <td>${esc(service.name)}</td>
      <td>${esc(service.locationName || '—')}</td>
      <td>${serviceStatusTag(service)}</td>
      <td>
        <div class="btnRow" style="margin:0;">
          <button class="btn secondary" data-edit-service="${service.id}">Edit</button>
          <button class="btn danger" data-delete-service="${service.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  const locationRows = (state.adminLocations || []).map((location) => `
    <tr>
      <td>${esc(location.name)}</td>
      <td>${esc(location.address || '—')}</td>
      <td>${Number(location.maxQueues || 1)}</td>
      <td>${state.services.filter((service) => service.locationId === location.id).length}</td>
      <td>
        <div class="btnRow" style="margin:0;">
          <button class="btn secondary" data-edit-location="${location.id}">Edit</button>
          <button class="btn danger" data-delete-location="${location.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty">No locations yet.</td></tr>';

  const editingLocation = (state.adminLocations || []).find((item) => item.id === state.editingLocationId);
  const queueAssignmentOptions = state.services.map((service) => {
    const isAssignedToActive = editingLocation && service.locationId === editingLocation.id;
    const locationSuffix = service.locationName ? ` (${esc(service.locationName)})` : '';
    return `<option value="${service.id}" ${isAssignedToActive ? 'selected' : ''}>${esc(service.name)}${locationSuffix}</option>`;
  }).join('');

  return shellHtml(`
    <p class="h1">Queue Setup</p>
    <p class="p">Create and edit pickup queues, stock quantity, priority, location, and availability.</p>
    <div class="cards">
      <div class="card">
        <strong id="serviceFormTitle">${state.editingServiceId ? 'Edit Queue' : 'Create Queue'}</strong>
        <label class="label">Queue Name</label><input class="input" id="svcName" />
        <label class="label">Description</label><textarea class="input" id="svcDescription"></textarea>
        <label class="label">Pickup Location</label><select class="input" id="svcLocation">${locationOptions}</select>
        <label class="label">Queue Status</label><select class="input" id="svcOpen"><option value="true">Open</option><option value="false">Closed</option></select>
        <div class="btnRow"><button class="btn" id="saveServiceBtn">Save Queue</button><button class="btn secondary" id="clearServiceBtn">Clear</button></div>
        <div class="err" id="serviceErr" style="display:none;"></div>
      </div>
      <div class="card">
        <strong>Queues</strong>
        <table class="table" style="margin-top:10px;"><thead><tr><th>Name</th><th>Location</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      </div>
      <div class="card">
        <strong id="locationFormTitle">${state.editingLocationId ? 'Edit Location' : 'Create Location'}</strong>
        <label class="label">Location Name</label><input class="input" id="locName" />
        <label class="label">Address</label><input class="input" id="locAddress" />
        <label class="label">Max Queues</label><input class="input" id="locMaxQueues" type="number" min="1" value="1" />
        <label class="label">Available Queues &mdash; <span id="locQueuesCounter">0 selected</span></label>
        <select class="input" id="locQueues" multiple size="8">${queueAssignmentOptions}</select>
        <div class="btnRow"><button class="btn" id="saveLocationBtn">Save Location</button><button class="btn secondary" id="clearLocationBtn">Clear</button></div>
        <div class="err" id="locationErr" style="display:none;"></div>
      </div>
      <div class="card">
        <strong>Locations</strong>
        <table class="table" style="margin-top:10px;"><thead><tr><th>Name</th><th>Address</th><th>Max Queues</th><th>Assigned Queues</th><th></th></tr></thead><tbody>${locationRows}</tbody></table>
      </div>
    </div>
  `);
}

function adminBookRequestsPage() {
  const STATUS_LABELS = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', picked_up: 'Picked Up' };
  const STATUS_NEXT = { pending: 'preparing', preparing: 'ready', ready: 'picked_up' };
  const STATUS_TAG = { pending: 'warn', preparing: 'muted', ready: 'ok', picked_up: 'muted' };

  const requests = state.adminBookRequests || [];
  const locations = state.adminLocations || [];

  const counts = ['pending','preparing','ready','picked_up'].map((s) =>
    `<div class="card kpi"><div><div class="tag muted">${STATUS_LABELS[s]}</div><strong>${requests.filter(r=>r.status===s).length}</strong></div></div>`
  ).join('');

  const locOptions = locations.map((l) => `<option value="${l.id}">${esc(l.name)}${l.address ? ' — '+esc(l.address) : ''}</option>`).join('');

  const rows = requests.map((req) => {
    const next = STATUS_NEXT[req.status];
    const actionBtn = next
      ? `<button class="btn secondary" style="font-size:12px;padding:5px 10px;" data-advance="${req.id}" data-next="${next}"${next === 'ready' ? ` data-needs-location="1"` : ''}>${STATUS_LABELS[next] === 'Ready' ? 'Mark Ready' : 'Mark ' + STATUS_LABELS[next]}</button>`
      : '<span class="tag muted">Done</span>';
    return `
    <tr>
      <td>${req.id}</td>
      <td><div style="font-weight:600">${esc(req.studentName)}</div><div style="font-size:12px;color:#64748b">${esc(req.studentEmail)}</div></td>
      <td><div style="font-weight:600">${esc(req.bookTitle)}</div>${req.author ? `<div style="font-size:12px;color:#64748b">${esc(req.author)}</div>` : ''}${req.isbn ? `<div style="font-size:12px;color:#64748b">ISBN: ${esc(req.isbn)}</div>` : ''}</td>
      <td>${esc(req.courseCode || '—')}</td>
      <td><span class="tag ${STATUS_TAG[req.status]}">${STATUS_LABELS[req.status]}</span></td>
      <td>${esc(req.locationName || '—')}</td>
      <td style="font-size:12px;color:#64748b">${new Date(req.createdAt).toLocaleDateString()}</td>
      <td>${actionBtn}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="empty">No book requests yet.</td></tr>';

  const locationPickerModal = `
    <div id="locationPickerModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:999;display:none;align-items:center;justify-content:center;">
      <div class="card" style="max-width:400px;width:90%;">
        <strong>Assign Pickup Location</strong>
        <p class="p" style="margin-top:8px;">Select where the student will collect their books. They will be notified immediately.</p>
        ${locations.length === 0
          ? '<p class="p" style="color:var(--danger)">No locations found. Add locations in Queue Setup first.</p>'
          : `
            <label class="label">📍 Pickup Location *</label>
            <select class="input" id="locationPickerSel" style="font-weight: 600;">
              <option value="">-- Select a location --</option>
              ${locOptions}
            </select>
            <p id="selectedLocationInfo" class="helper" style="margin-top: 8px; color: var(--ok);"></p>
          `}
        <div class="err" id="locationPickerErr" style="display:none; margin-top: 8px; color:var(--danger);"></div>
        <div class="btnRow">
          <button class="btn" id="confirmReadyBtn" ${locations.length === 0 ? 'disabled' : ''}>Mark Ready &amp; Notify Student</button>
          <button class="btn secondary" id="cancelLocationBtn">Cancel</button>
        </div>
      </div>
    </div>`;

  return shellHtml(`
    <p class="h1">Book Requests</p>
    <p class="p">Review student requests, prepare bundles, assign a pickup location, and track collection.</p>
    ${locationPickerModal}
    <div class="cards four" style="margin-bottom:16px;">${counts}</div>
    <div class="card" style="overflow-x:auto;">
      <table class="table">
        <thead><tr><th>#</th><th>Student</th><th>Book</th><th>Course</th><th>Status</th><th>Location</th><th>Requested</th><th>Action</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `);
}

function queueManagementPage() {
  const options = state.services.map((service) => `<option value="${service.id}">${esc(service.name)}</option>`).join('');
  return shellHtml(`
    <p class="h1">Queue Management</p>
    <p class="p">View a queue, serve the next user, move users up or down, or remove them.</p>
    <div class="card">
      <label class="label">Select queue</label>
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
    <div class="card" style="margin-top:12px;"><table class="table"><thead><tr><th>Service</th><th>Current Queue</th><th>Total Served</th></tr></thead><tbody>${rows}</tbody></table></div>
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

function joinQueueForLocation(serviceId, locationName) {
  const serviceSel = qs('#serviceSel');
  if (serviceSel && serviceId) {
    serviceSel.value = serviceId;
    serviceSel.dispatchEvent(new Event('change'));
    setTimeout(() => {
      const joinBtn = qs('#joinBtn');
      if (joinBtn) joinBtn.click();
    }, 100);
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
    estWait.textContent = `${service.activeQueueLength} waiting`;
    queueLen.textContent = service.activeQueueLength;
    stockText.textContent = service.locationName || '—';
    serviceMeta.textContent = `${service.description || ''}`;
    joinBtn.disabled = !!state.currentEntry || !service.isOpen;
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
  qs('#svcLocation').value = service?.locationId || '';
  qs('#svcOpen').value = String(service?.isOpen ?? true);
}

function fillLocationForm(location) {
  qs('#locName').value = location?.name || '';
  qs('#locAddress').value = location?.address || '';
  qs('#locMaxQueues').value = Number(location?.maxQueues || 1);
  const selectedQueueIds = new Set(
    state.services
      .filter((service) => location && service.locationId === location.id)
      .map((service) => String(service.id))
  );
  qsa('#locQueues option').forEach((option) => {
    option.selected = selectedQueueIds.has(option.value);
  });
}

function getSelectedLocationQueueIds() {
  return qsa('#locQueues option')
    .filter((option) => option.selected)
    .map((option) => Number(option.value));
}

async function applyLocationQueueAssignments(locationId, selectedQueueIds) {
  const selectedSet = new Set(selectedQueueIds);

  for (const service of state.services) {
    const currentlyInLocation = service.locationId === locationId;
    const shouldBeInLocation = selectedSet.has(service.id);

    if (!currentlyInLocation && !shouldBeInLocation) continue;

    const targetLocationId = shouldBeInLocation ? locationId : null;
    if ((service.locationId || null) === targetLocationId) continue;

    const payload = {
      name: service.name,
      description: service.description,
      locationId: targetLocationId,
      isOpen: Boolean(service.isOpen),
    };

    await api(`/services/${service.id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }
}

function bindServiceManagement() {
  fillServiceForm(state.services.find((item) => item.id === state.editingServiceId));
  fillLocationForm((state.adminLocations || []).find((item) => item.id === state.editingLocationId));

  qsa('[data-edit-service]').forEach((btn) => {
    btn.onclick = () => {
      state.editingServiceId = Number(btn.dataset.editService);
      render();
    };
  });

  qsa('[data-delete-service]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('Delete this queue?')) return;
      try {
        await api(`/services/${Number(btn.dataset.deleteService)}`, { method: 'DELETE' });
        pushToast('Queue deleted', 'Queue removed successfully.');
        await loadCommonData();
        render();
      } catch (error) {
        pushToast('Delete failed', error.message);
      }
    };
  });

  qs('#clearServiceBtn').onclick = () => {
    state.editingServiceId = null;
    render();
  };

  qs('#saveServiceBtn').onclick = async () => {
    const err = qs('#serviceErr');
    err.style.display = 'none';
    const editingQueue = state.services.find((item) => item.id === state.editingServiceId) || null;
    const name = qs('#svcName').value.trim();
    const description = qs('#svcDescription').value.trim();

    if (!name) {
      err.style.display = 'block';
      err.textContent = 'Queue name is required.';
      return;
    }
    if (!description) {
      err.style.display = 'block';
      err.textContent = 'Description is required.';
      return;
    }

    const payload = {
      name,
      description,
      locationId: Number(qs('#svcLocation').value) || null,
      isOpen: qs('#svcOpen').value === 'true',
    };
    try {
      if (state.editingServiceId) {
        await api(`/services/${state.editingServiceId}`, { method: 'PUT', body: JSON.stringify(payload) });
        pushToast('Queue updated', 'Queue changes saved.');
      } else {
        await api('/services', { method: 'POST', body: JSON.stringify(payload) });
        pushToast('Queue created', 'New queue added.');
      }
      state.editingServiceId = null;
      await loadCommonData();
      render();
    } catch (error) {
      err.style.display = 'block';
      err.textContent = error.message;
    }
  };

  qsa('[data-edit-location]').forEach((btn) => {
    btn.onclick = () => {
      state.editingLocationId = Number(btn.dataset.editLocation);
      const location = (state.adminLocations || []).find((item) => item.id === state.editingLocationId);
      state.editingLocationOriginalName = location?.name || null;
      render();
    };
  });

  qsa('[data-delete-location]').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('Delete this location?')) return;
      try {
        await api(`/locations/${Number(btn.dataset.deleteLocation)}`, { method: 'DELETE' });
        pushToast('Location deleted', 'Location removed successfully.');
        state.editingLocationId = null;
        state.editingLocationOriginalName = null;
        state.adminLocations = (await api('/locations')).locations;
        await loadCommonData();
        render();
      } catch (error) {
        pushToast('Delete failed', error.message);
      }
    };
  });

  qs('#clearLocationBtn').onclick = () => {
    state.editingLocationId = null;
    state.editingLocationOriginalName = null;
    render();
  };

  function updateQueuesCounter() {
    const counter = qs('#locQueuesCounter');
    if (!counter) return;
    const max = Number(qs('#locMaxQueues').value || 1);
    const count = qsa('#locQueues option').filter((o) => o.selected).length;
    counter.textContent = `${count} / ${max} selected`;
    counter.style.color = count > max ? 'var(--danger)' : 'var(--muted)';
  }

  const maxQueuesInput = qs('#locMaxQueues');
  if (maxQueuesInput) {
    maxQueuesInput.oninput = updateQueuesCounter;
  }

  const locQueuesSel = qs('#locQueues');
  if (locQueuesSel) {
    locQueuesSel.onchange = updateQueuesCounter;
    updateQueuesCounter();
  }

  qs('#saveLocationBtn').onclick = async () => {
    const err = qs('#locationErr');
    err.style.display = 'none';

    const payload = {
      name: qs('#locName').value.trim(),
      address: qs('#locAddress').value.trim(),
      maxQueues: Number(qs('#locMaxQueues').value || 1),
    };
    const selectedQueueIds = getSelectedLocationQueueIds();

    if (!payload.name) {
      err.style.display = 'block';
      err.textContent = 'Location name is required.';
      return;
    }
    if (!Number.isInteger(payload.maxQueues) || payload.maxQueues < 1) {
      err.style.display = 'block';
      err.textContent = 'Max queues must be a positive whole number.';
      return;
    }
    if (selectedQueueIds.length > payload.maxQueues) {
      err.style.display = 'block';
      err.textContent = `You selected ${selectedQueueIds.length} queues, but Max Queues is ${payload.maxQueues}.`;
      return;
    }

    try {
      let savedLocationId = state.editingLocationId;

      if (state.editingLocationId) {
        await api(`/locations/${state.editingLocationId}`, { method: 'PUT', body: JSON.stringify(payload) });
        pushToast('Location updated', 'Location changes saved.');
      } else {
        const created = await api('/locations', { method: 'POST', body: JSON.stringify(payload) });
        savedLocationId = created.locationId;
        pushToast('Location created', 'New location added.');
      }

      await loadCommonData();
      await applyLocationQueueAssignments(savedLocationId, selectedQueueIds);

      state.editingLocationId = null;
      state.editingLocationOriginalName = null;
      state.adminLocations = (await api('/locations')).locations;
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

function bindAdminBookRequests() {
  const modal = qs('#locationPickerModal');
  let pendingAdvanceId = null;

  qsa('[data-advance]').forEach((btn) => {
    btn.onclick = async () => {
      const id = Number(btn.dataset.advance);
      const next = btn.dataset.next;
      if (btn.dataset.needsLocation) {
        pendingAdvanceId = id;
        modal.style.display = 'flex';
        return;
      }
      btn.disabled = true;
      btn.textContent = '…';
      try {
        await api(`/admin/book-requests/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: next }),
        });
        pushToast('Updated', `Request marked as "${{ pending:'Pending', preparing:'Preparing', ready:'Ready', picked_up:'Picked Up' }[next]}".`);
        state.adminBookRequests = (await api('/admin/book-requests')).requests;
        render();
      } catch (error) {
        pushToast('Error', error.message);
        btn.disabled = false;
      }
    };
  });

  if (qs('#confirmReadyBtn')) {
    const sel = qs('#locationPickerSel');
    const infoEl = qs('#selectedLocationInfo');
    const errEl = qs('#locationPickerErr');

    if (sel) {
      sel.onchange = () => {
        if (errEl) errEl.style.display = 'none';
        const locId = Number(sel.value);
        const loc = state.adminLocations?.find((l) => l.id === locId);
        if (infoEl) {
          infoEl.textContent = loc ? `✓ ${esc(loc.name)}${loc.address ? ' — ' + esc(loc.address) : ''}` : '';
        }
      };
    }

    qs('#confirmReadyBtn').onclick = async () => {
      if (errEl) errEl.style.display = 'none';
      const locationId = Number(sel?.value || 0);
      if (!locationId || !sel?.value) {
        if (errEl) {
          errEl.style.display = 'block';
          errEl.textContent = '⚠️ Please select a location from the dropdown.';
        }
        return;
      }
      modal.style.display = 'none';
      try {
        await api(`/admin/book-requests/${pendingAdvanceId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ready', locationId }),
        });
        pushToast('Updated', 'Request marked as Ready. Student has been notified.');
        state.adminBookRequests = (await api('/admin/book-requests')).requests;
        render();
      } catch (error) {
        pushToast('Error', error.message);
      }
    };
  }

  if (qs('#cancelLocationBtn')) {
    qs('#cancelLocationBtn').onclick = () => { modal.style.display = 'none'; pendingAdvanceId = null; };
  }
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
      pushToast('Queue updated', 'Next user served and notifications sent.');
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
    else if (hash === '#/admin/services') {
      state.adminLocations = (await api('/locations')).locations;
      app.innerHTML = serviceManagementPage();
    }
    else if (hash === '#/admin/queues') {
      app.innerHTML = queueManagementPage();
      const firstServiceId = state.services[0]?.id;
      if (firstServiceId) await loadAdminQueue(firstServiceId);
    }
    else if (hash === '#/admin/book-requests') {
      const [reqData, locData] = await Promise.all([
        api('/admin/book-requests'),
        api('/locations'),
      ]);
      state.adminBookRequests = reqData.requests;
      state.adminLocations = locData.locations;
      app.innerHTML = adminBookRequestsPage();
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
    if (hash === '#/admin/book-requests') bindAdminBookRequests();
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
