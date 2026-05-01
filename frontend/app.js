const API_BASE = 'http://localhost:5001/api'; // changed to 5001 for testing purpose

const state = {
  user: JSON.parse(localStorage.getItem('qs_user') || 'null'),
  services: [],
  notifications: [],
  currentEntry: null,
  history: [],
  bookRequests: [],
  adminQueue: [],
  adminStats: null,
  adminStatsFilters: {
    period: 'monthly',
    serviceId: '',
    userId: '',
  },
  adminBookRequests: [],
  adminLocations: [],
  adminSelectedServiceId: null,
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

function estimateWait(position, service = {}, queueLength = 0) {
  const peopleAhead = Math.max(0, Number(position || 1) - 1);
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;

  const name = String(service.name || service.serviceName || '').toLowerCase();
  const location = String(service.locationName || '').toLowerCase();

  let baseMinutes = 4;

  if (name.includes('library') || location.includes('library')) baseMinutes = 3;
  if (name.includes('bookstore') || location.includes('bookstore')) baseMinutes = 5;
  if (name.includes('law')) baseMinutes = 4;

  let rushFactor = 1;

  if (hour >= 11 && hour <= 14) rushFactor += 0.35;
  if (hour >= 16 && hour <= 18) rushFactor += 0.25;
  if ([1, 8, 9].includes(month)) rushFactor += 0.25;

  const queuePressure = 1 + Math.min(Number(queueLength || 0), 20) * 0.02;

  const prepTime = baseMinutes;

  const minutes = Math.ceil(
    prepTime + (peopleAhead * baseMinutes * rushFactor * queuePressure)
  );

  return Math.max(baseMinutes, minutes);
}


function extractLocationFromDescription(description = '') {
  const text = String(description || '');
  const match = text.match(/at the\s+(.+?)(\.|$)/i);

  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
}

function getPickupLocation(service = {}, entry = {}) {
  const name = String(entry.serviceName || service.name || '').toLowerCase();

  if (name.includes('library')) return 'UH Library Pickup Desk';
  if (name.includes('bookstore')) return 'Campus Bookstore';
  if (name.includes('law')) return 'Law Center Pickup Desk';

  return (
    entry.locationName ||
    service.locationName ||
    service.location ||
    service.pickupLocation ||
    extractLocationFromDescription(service.description) ||
    'Pickup Desk'
  );
}

function getSmartQueueRecommendation(services = []) {
  const openServices = services.filter((s) => s.isOpen);

  if (!openServices.length) {
    return {
      title: 'No queue recommended',
      message: 'All pickup queues are currently closed.',
    };
  }

  const ranked = openServices
    .map((service) => {
      const previewPosition = Number(service.activeQueueLength || 0) + 1;
      const waitMinutes = estimateWait(
        previewPosition,
        service,
        Number(service.activeQueueLength || 0)
      );

      let score = waitMinutes + Number(service.activeQueueLength || 0) * 2;

      const name = String(service.name || '').toLowerCase();

      if (name.includes('library')) score -= 1;
      if (name.includes('bookstore')) score += 1;

      return {
        service,
        waitMinutes,
        score,
      };
    })
    .sort((a, b) => a.score - b.score);

  const best = ranked[0];

  return {
    title: `${best.service.name} is the best choice`,
    message: `AI recommendation: join ${best.service.name}. Estimated wait is ${best.waitMinutes} minutes with ${best.service.activeQueueLength || 0} people currently in line. Pickup location: ${getPickupLocation(best.service)}.`,
  };
}

function shellHtml(content) {
  const active = location.hash || '#/login';
  const userLinks = [
  ['#/app/dashboard', '📊 User Dashboard'],
  ['#/app/join', '➕ Join Queue'],
  ['#/app/status', '📋 Queue Status'],
  ['#/app/book-requests', '📚 Book Requests'],
  ['#/app/history', '🕒 History'],
  ['#/app/notifications', '🔔 Notifications'],
];

const adminLinks = [
  ['#/admin/dashboard', '📊 Admin Dashboard'],
  ['#/admin/services', '⚙️ Queue Setup'],
  ['#/admin/queues', '👥 Queue Management'],
  ['#/admin/book-requests', '📚 Book Requests'],
  ['#/admin/stats', '📈 Usage Statistics'],
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
function serviceStatusTag(service) {
  if (!service) {
    return '<span class="tag muted">Unknown</span>';
  }

  if (service.isOpen) {
    return '<span class="tag ok">Open</span>';
  }

  return '<span class="tag danger">Closed</span>';
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
    ${(() => {
      const ai = getSmartQueueRecommendation(availableServices);
      return `
        <div class="card" style="border: 2px solid var(--ok); margin-bottom: 14px;">
          <strong>AI Smart Queue Advisor</strong>
          <p class="p" style="margin-top:8px;">${esc(ai.title)}</p>
          <p class="helper">${esc(ai.message)}</p>
        </div>
      `;
    })()}
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

  const service = entry
    ? state.services.find((s) => Number(s.id) === Number(entry.serviceId)) || {}
    : {};

  const waitMinutes = entry
    ? estimateWait(
        entry.position,
        { ...service, ...entry },
        Number(service.activeQueueLength || entry.position || 1)
      )
    : 0;

  return shellHtml(`
    <p class="h1">Queue Status</p>
    <p class="p">See your live position, estimated wait time, pickup location, and status updates.</p>
    <div class="cards">
      <div class="card">
        <strong>Current Queue</strong>
        ${entry ? `
          <div class="row" style="margin-top:10px;">
            <div>
              <div class="tag muted">Service</div>
              <p>${esc(entry.serviceName)}</p>
            </div>
            <div>
              <div class="tag muted">Position</div>
              <p>#${entry.position}</p>
            </div>
          </div>

          <div class="row">
            <div>
              <div class="tag muted">Estimated wait</div>
              <p>${waitMinutes} minutes</p>
            </div>
            <div>
              <div class="tag muted">Pickup location</div>
              <p>${esc(entry.locationName || service.locationName || 'Campus Bookstore')}</p>
            </div>
          </div>

          <div class="row">
            <div>
              <div class="tag muted">Status</div>
              <p>
                <span class="tag ${entry.status === 'almost_ready' ? 'warn' : 'muted'}">
                  ${esc(entry.status)}
                </span>
              </p>
            </div>
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
  const selectedServiceId = Number(state.adminSelectedServiceId || state.services[0]?.id || 0);
  const options = state.services
    .map((service) => `<option value="${service.id}" ${service.id === selectedServiceId ? 'selected' : ''}>${esc(service.name)}</option>`)
    .join('');
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

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatMinutes(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return `${Number(value).toFixed(1)} min`;
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') return 'N/A';
  return `${Number(value).toFixed(1)}%`;
}

function statsStatusTag(status) {
  const normalized = String(status || '').toLowerCase();
  const className = normalized === 'served'
    ? 'ok'
    : normalized === 'canceled'
      ? 'warn'
      : normalized === 'no-show'
        ? 'danger'
        : 'muted';

  return `<span class="tag ${className}">${esc(normalized || 'unknown')}</span>`;
}

function renderTimelineChart(points = [], canvasId = '') {
  if (!points.length) {
    return '<p class="empty">No trend data available for this filter.</p>';
  }
  return `<div style="position:relative;height:180px;"><canvas id="${esc(canvasId)}"></canvas></div>`;
}

function renderHeatmap(cells = []) {
  if (!cells.length) {
    return '<p class="empty">No heatmap data available.</p>';
  }

  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const counts = new Map(cells.map((cell) => [`${cell.day}-${cell.hour}`, Number(cell.total || 0)]));
  const maxCount = Math.max(...cells.map((cell) => Number(cell.total || 0)), 1);
  const items = [];

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const total = counts.get(`${day}-${hour}`) || 0;
      const level = Math.ceil((total / maxCount) * 4);
      items.push(`
        <div class="heatCell level${level}" title="${labels[day]} ${String(hour).padStart(2, '0')}:00 - ${total} joins">
          <span>${total}</span>
        </div>
      `);
    }
  }

  return `<div class="heatGrid">${items.join('')}</div>`;
}

function buildAdminStatsQuery() {
  const params = new URLSearchParams();
  const filters = state.adminStatsFilters || {};

  params.set('period', filters.period || 'monthly');
  if (filters.serviceId) params.set('serviceId', filters.serviceId);
  if (filters.userId) params.set('userId', filters.userId);

  return params.toString();
}

function statsPage() {
  const report = state.adminStats || {};
  const filters = state.adminStatsFilters || {};
  const overview = report.overview || {};
  const queueUsage = report.queueUsage || {};
  const users = report.users || [];
  const services = report.services || [];
  const serviceOptions = state.services.map((service) => `
    <option value="${service.id}" ${String(filters.serviceId || '') === String(service.id) ? 'selected' : ''}>${esc(service.name)}</option>
  `).join('');
  const userRows = users.map((user) => `
    <tr>
      <td>${user.userId}</td>
      <td><strong>${esc(user.fullName)}</strong><br><span class="helper">${esc(user.contactInfo)}</span></td>
      <td>${user.totalVisits}</td>
      <td>${formatMinutes(user.averageWaitMinutes)}</td>
      <td>
        ${user.visits.length ? `
          <details>
            <summary>View ${user.visits.length} visits</summary>
            <div class="visitList">
              ${user.visits.map((visit) => `
                <div class="visitItem">
                  <strong>${esc(visit.serviceName)}</strong>
                  <span>${formatDateTime(visit.joinedAt)}</span>
                  <span>${statsStatusTag(visit.status)}</span>
                  <span>${formatMinutes(visit.waitMinutes)}</span>
                </div>
              `).join('')}
            </div>
          </details>
        ` : '<span class="empty">No visits</span>'}
      </td>
    </tr>
  `).join('');
  const serviceCards = services.map((service) => `
    <div class="card statsCard">
      <div class="statsCardHeader">
        <div>
          <strong>${esc(service.name)}</strong>
          <p class="p">${esc(service.description || 'No description available.')}</p>
        </div>
        <span class="tag ${service.isOpen ? 'ok' : 'danger'}">${service.isOpen ? 'Open' : 'Closed'}</span>
      </div>
      <div class="cards three compactCards">
        <div class="card kpi"><div><div class="tag muted">Served</div><strong>${service.totalUsersServed || 0}</strong></div><span class="tag ok">Completed</span></div>
        <div class="card kpi"><div><div class="tag muted">Max Queue</div><strong>${service.maximumQueueLength || 0}</strong></div><span class="tag warn">Peak</span></div>
        <div class="card kpi"><div><div class="tag muted">Avg Wait</div><strong>${formatMinutes(service.averageWaitMinutes)}</strong></div><span class="tag muted">Filtered</span></div>
      </div>
      <div class="row">
        <div class="card">
          <strong>Queue length over time</strong>
          ${renderTimelineChart(service.queueLengthTimeline || [], `chart-svc-${service.id}`)}
        </div>
        <div class="card">
          <strong>Busy-hour heatmap</strong>
          ${renderHeatmap(service.busyHourHeatmap || [])}
        </div>
      </div>
      <div class="statsMeta">
        <span><strong>Location:</strong> ${esc(service.locationName || 'Unassigned')}</span>
        <span><strong>Peak hours:</strong> ${(service.peakHours || []).map((item) => `${String(item.hour).padStart(2, '0')}:00 (${item.total})`).join(', ') || 'N/A'}</span>
        <span><strong>Handling time:</strong> min ${formatMinutes(service.handlingTime?.min)}, max ${formatMinutes(service.handlingTime?.max)}, avg ${formatMinutes(service.handlingTime?.average)}</span>
      </div>
    </div>
  `).join('');
  const statusRows = (queueUsage.statusBreakdown || []).map((row) => `
    <tr>
      <td>${statsStatusTag(row.status)}</td>
      <td>${row.total}</td>
    </tr>
  `).join('');

  return shellHtml(`
    <p class="h1">Usage Statistics</p>
    <p class="p">Detailed user reports, service activity reporting, and queue performance KPIs with date, service, and user filters.</p>

    <div class="card statsFilters">
      <div class="row">
        <div>
          <label class="label">Date range</label>
          <select class="input" id="statsPeriodSel">
            <option value="daily" ${filters.period === 'daily' ? 'selected' : ''}>Daily</option>
            <option value="weekly" ${filters.period === 'weekly' ? 'selected' : ''}>Weekly</option>
            <option value="monthly" ${filters.period === 'monthly' ? 'selected' : ''}>Monthly</option>
          </select>
        </div>
        <div>
          <label class="label">Specific service</label>
          <select class="input" id="statsServiceSel">
            <option value="">All services</option>
            ${serviceOptions}
          </select>
        </div>
        <div>
          <label class="label">Individual user lookup</label>
          <input class="input" id="statsUserIdInput" type="number" min="1" value="${esc(filters.userId || '')}" placeholder="Enter user ID" />
        </div>
      </div>
      <div class="btnRow">
        <button class="btn" id="applyStatsFiltersBtn">Apply filters</button>
        <button class="btn secondary" id="resetStatsFiltersBtn">Reset</button>
        <button class="btn secondary" id="exportStatsCsvBtn">&#8595; Export CSV</button>
        <button class="btn secondary" id="printStatsBtn">&#128438; Print / PDF</button>
      </div>
      <details class="csvOptions">
        <summary class="helper" style="cursor:pointer;">CSV export options &rsaquo;</summary>
        <div class="csvOptionsBody">
          <div class="csvOptionGroup">
            <strong>Datasets to include</strong>
            <label><input type="checkbox" id="csvExportOverview" checked /> Overview metrics</label>
            <label><input type="checkbox" id="csvExportStatus" checked /> Queue status breakdown</label>
            <label><input type="checkbox" id="csvExportUsers" checked /> User participation data</label>
            <label><input type="checkbox" id="csvExportServices" checked /> Service &amp; queue activity</label>
          </div>
          <div class="csvOptionGroup">
            <strong>User visit columns</strong>
            <label><input type="checkbox" id="csvColUserId" checked /> User ID</label>
            <label><input type="checkbox" id="csvColUserName" checked /> User Name</label>
            <label><input type="checkbox" id="csvColEmail" checked /> Email</label>
            <label><input type="checkbox" id="csvColService" checked /> Service</label>
            <label><input type="checkbox" id="csvColJoinTime" checked /> Join Time</label>
            <label><input type="checkbox" id="csvColEndTime" checked /> End Time</label>
            <label><input type="checkbox" id="csvColStatus" checked /> Status</label>
            <label><input type="checkbox" id="csvColWaitTime" checked /> Wait Time</label>
          </div>
        </div>
      </details>
      <p class="helper">Report generated: ${formatDateTime(report.filters?.generatedAt)}</p>
    </div>

    <div class="cards three">
      <div class="card kpi"><div><div class="tag muted">Total Users Served</div><strong>${overview.totalUsersServed || 0}</strong></div><span class="tag ok">KPI</span></div>
      <div class="card kpi"><div><div class="tag muted">Average Wait Time</div><strong>${formatMinutes(overview.averageWaitTime)}</strong></div><span class="tag warn">KPI</span></div>
      <div class="card kpi"><div><div class="tag muted">Average Service Time</div><strong>${formatMinutes(overview.averageServiceTime)}</strong></div><span class="tag muted">KPI</span></div>
      <div class="card kpi"><div><div class="tag muted">Maximum Queue Length</div><strong>${overview.maximumQueueLength || 0}</strong></div><span class="tag danger">KPI</span></div>
      <div class="card kpi"><div><div class="tag muted">Drop-off Rate</div><strong>${formatPercent(overview.dropOffRate)}</strong></div><span class="tag warn">KPI</span></div>
      <div class="card kpi"><div><div class="tag muted">Queue Efficiency</div><strong>${formatPercent(overview.queueEfficiencyRate)}</strong></div><span class="tag ok">KPI</span></div>
    </div>

    <div class="row" style="margin-top:12px;">
      <div class="card">
        <strong>Queue activity over time</strong>
        <p class="p helper">How queue load changed across the selected period</p>
        ${renderTimelineChart(queueUsage.queueLengthTimeline || [], 'chart-overall-queue')}
      </div>
      <div class="card">
        <strong>Visit status distribution</strong>
        <p class="p helper">Proportion of served, cancelled, and no-show visits</p>
        <div style="position:relative;height:180px;"><canvas id="chart-status-pie"></canvas></div>
      </div>
    </div>

    <div class="row" style="margin-top:12px;">
      <div class="card">
        <strong>Users served per service</strong>
        <p class="p helper">Which services handle the most traffic</p>
        <div style="position:relative;height:220px;"><canvas id="chart-service-users"></canvas></div>
      </div>
      <div class="card">
        <strong>Average wait time per service</strong>
        <p class="p helper">Spot slow or overloaded services</p>
        <div style="position:relative;height:220px;"><canvas id="chart-service-wait"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <strong>Wait time distribution</strong>
      <p class="p helper">How wait times spread across all visits — most users wait how long?</p>
      <div style="position:relative;height:180px;"><canvas id="chart-wait-histogram"></canvas></div>
    </div>

    <div class="card" style="margin-top:12px;">
      <strong>User / Customer Reports</strong>
      <p class="p">Includes user ID, contact information, total visits, average wait time, and visit-by-visit queue participation history.</p>
      <div class="tableScroll">
        <table class="table statsTable"><thead><tr><th>User ID</th><th>User</th><th>Total Visits</th><th>Avg Wait</th><th>Visit History</th></tr></thead><tbody>${userRows || '<tr><td colspan="5" class="empty">No user activity matches the current filters.</td></tr>'}</tbody></table>
      </div>
    </div>

    <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
      ${serviceCards || '<div class="card"><p class="empty">No service activity matches the current filters.</p></div>'}
    </div>
  `);
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // RFC 4180: quote if contains comma, double-quote, newline, or carriage return
  if (/[,"\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function isoTs(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function safeNum(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isNaN(n) ? '' : n.toFixed(decimals);
}

function exportStatsCSV() {
  const report   = state.adminStats || {};
  const filters  = report.filters  || {};
  const overview = report.overview || {};
  const users    = report.users    || [];
  const services = report.services || [];
  const queueUsage = report.queueUsage || {};
  const appliedFilters = state.adminStatsFilters || {};

  // ── Which datasets to export (from checkboxes) ─────────────────────────
  const exportOverview  = qs('#csvExportOverview')  ? qs('#csvExportOverview').checked  : true;
  const exportUsers     = qs('#csvExportUsers')     ? qs('#csvExportUsers').checked     : true;
  const exportServices  = qs('#csvExportServices')  ? qs('#csvExportServices').checked  : true;
  const exportStatus    = qs('#csvExportStatus')    ? qs('#csvExportStatus').checked    : true;

  // ── Which user-visit columns to include ────────────────────────────────
  const colUserId    = !qs('#csvColUserId')    || qs('#csvColUserId').checked;
  const colUserName  = !qs('#csvColUserName')  || qs('#csvColUserName').checked;
  const colEmail     = !qs('#csvColEmail')     || qs('#csvColEmail').checked;
  const colService   = !qs('#csvColService')   || qs('#csvColService').checked;
  const colJoinTime  = !qs('#csvColJoinTime')  || qs('#csvColJoinTime').checked;
  const colStatus    = !qs('#csvColStatus')    || qs('#csvColStatus').checked;
  const colWaitTime  = !qs('#csvColWaitTime')  || qs('#csvColWaitTime').checked;
  const colEndTime   = !qs('#csvColEndTime')   || qs('#csvColEndTime').checked;

  const nowIso  = new Date().toISOString();
  const period  = filters.period || appliedFilters.period || 'all';
  const serviceFilter = appliedFilters.serviceId
    ? (services.find((s) => String(s.id) === String(appliedFilters.serviceId))?.name || `ID ${appliedFilters.serviceId}`)
    : 'All services';
  const userFilter = appliedFilters.userId ? `User ID ${appliedFilters.userId}` : 'All users';

  const files = [];

  // ═══════════════════════════════════════════════════════════════════════
  // 1.  REPORT METADATA  (always included, separate sheet marker)
  // ═══════════════════════════════════════════════════════════════════════
  const metaRows = [
    ['# QueueSmart Usage Statistics Report'],
    ['# Generated at (ISO 8601)', nowIso],
    ['# Period filter', period],
    ['# Service filter', serviceFilter],
    ['# User filter', userFilter],
    [],
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // 2.  OVERVIEW METRICS
  // ═══════════════════════════════════════════════════════════════════════
  if (exportOverview) {
    metaRows.push(['[OVERVIEW METRICS]']);
    metaRows.push(['Metric', 'Value', 'Unit']);
    metaRows.push(['Total Users Served',   overview.totalUsersServed ?? 0,                    'count']);
    metaRows.push(['Total Visits',          overview.totalVisits ?? 0,                         'count']);
    metaRows.push(['Total Unique Users',    overview.totalUsers ?? 0,                          'count']);
    metaRows.push(['Average Wait Time',     safeNum(overview.averageWaitTime),                 'minutes']);
    metaRows.push(['Average Service Time',  safeNum(overview.averageServiceTime),              'minutes']);
    metaRows.push(['Max Queue Length',      overview.maximumQueueLength ?? 0,                  'entries']);
    metaRows.push(['Drop-off Rate',         safeNum(overview.dropOffRate, 1),                  'percent']);
    metaRows.push(['Queue Efficiency Rate', safeNum(overview.queueEfficiencyRate, 1),          'percent']);
    metaRows.push([]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3.  VISIT STATUS BREAKDOWN
  // ═══════════════════════════════════════════════════════════════════════
  if (exportStatus) {
    metaRows.push(['[QUEUE STATUS BREAKDOWN]']);
    metaRows.push(['Status', 'Total', 'Share (%)']);
    const totalVisits = overview.totalVisits || 0;
    for (const row of (queueUsage.statusBreakdown || [])) {
      const share = totalVisits ? safeNum((row.total / totalVisits) * 100, 1) : '';
      metaRows.push([csvCell(row.status), row.total, share]);
    }
    metaRows.push([]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4.  USER PARTICIPATION  —  one flat row per visit
  //     Spec: User ID, User Name, Service, Join Time, Start Time (n/a),
  //           End Time, Status, Wait Time (mins)
  // ═══════════════════════════════════════════════════════════════════════
  if (exportUsers) {
    metaRows.push(['[USER PARTICIPATION DATA]']);

    const headers = [];
    if (colUserId)   headers.push('User ID');
    if (colUserName) headers.push('User Name');
    if (colEmail)    headers.push('Email');
    if (colService)  headers.push('Service');
    if (colJoinTime) headers.push('Join Time (ISO 8601)');
    if (colStatus)   headers.push('Status');
    if (colWaitTime) headers.push('Wait Time (mins)');
    if (colEndTime)  headers.push('End Time (ISO 8601)');
    headers.push('Visit #', 'Total Visits for User', 'Avg Wait for User (mins)');
    metaRows.push(headers);

    // Preserve interface sort order (already alpha by fullName from backend)
    for (const user of users) {
      const visits = user.visits; // already sorted newest-first from backend
      if (!visits.length) {
        const row = [];
        if (colUserId)   row.push(user.userId);
        if (colUserName) row.push(csvCell(user.fullName));
        if (colEmail)    row.push(csvCell(user.email));
        if (colService)  row.push('');
        if (colJoinTime) row.push('');
        if (colStatus)   row.push('');
        if (colWaitTime) row.push('');
        if (colEndTime)  row.push('');
        row.push(1, user.totalVisits, safeNum(user.averageWaitMinutes));
        metaRows.push(row);
        continue;
      }
      visits.forEach((visit, idx) => {
        const row = [];
        if (colUserId)   row.push(user.userId);
        if (colUserName) row.push(csvCell(user.fullName));
        if (colEmail)    row.push(csvCell(user.email));
        if (colService)  row.push(csvCell(visit.serviceName));
        if (colJoinTime) row.push(isoTs(visit.joinedAt));
        if (colStatus)   row.push(csvCell(visit.status));
        if (colWaitTime) row.push(safeNum(visit.waitMinutes));
        if (colEndTime)  row.push(isoTs(visit.terminalTime));
        row.push(idx + 1, user.totalVisits, safeNum(user.averageWaitMinutes));
        metaRows.push(row);
      });
    }
    metaRows.push([]);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5.  SERVICE & QUEUE ACTIVITY
  // ═══════════════════════════════════════════════════════════════════════
  if (exportServices) {
    metaRows.push(['[SERVICE & QUEUE ACTIVITY]']);
    metaRows.push([
      'Service', 'Location', 'Status',
      'Total Visits', 'Users Served', 'Drop-offs',
      'Max Queue Length',
      'Avg Wait Time (mins)', 'Min Handling Time (mins)', 'Avg Handling Time (mins)', 'Max Handling Time (mins)',
      'Peak Hour 1', 'Peak Hour 2', 'Peak Hour 3',
    ]);
    for (const svc of services) {
      const peaks = (svc.peakHours || []).slice(0, 3).map((p) => `${String(p.hour).padStart(2, '0')}:00 (${p.total})`);
      metaRows.push([
        csvCell(svc.name),
        csvCell(svc.locationName || ''),
        svc.isOpen ? 'Open' : 'Closed',
        svc.totalVisits,
        svc.totalUsersServed,
        svc.dropOffs,
        svc.maximumQueueLength,
        safeNum(svc.averageWaitMinutes),
        safeNum(svc.handlingTime?.min),
        safeNum(svc.handlingTime?.average),
        safeNum(svc.handlingTime?.max),
        csvCell(peaks[0] || ''),
        csvCell(peaks[1] || ''),
        csvCell(peaks[2] || ''),
      ]);
    }
    metaRows.push([]);
  }

  // ── Serialise rows to CSV string ───────────────────────────────────────
  const csv = metaRows
    .map((row) => row.map((cell) => csvCell(cell === undefined ? '' : cell)).join(','))
    .join('\r\n');

  // ── BOM + download ─────────────────────────────────────────────────────
  // UTF-8 BOM so Excel opens it correctly without import wizard
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `queuesmart-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function printStatsReport() {
  const report = state.adminStats || {};
  const filters = report.filters || {};
  const appliedFilters = state.adminStatsFilters || {};
  const overview = report.overview || {};
  const users = report.users || [];
  const services = report.services || [];
  const queueUsage = report.queueUsage || {};
  const generatedAt = new Date(filters.generatedAt || Date.now()).toLocaleString();

  // Capture a Chart.js canvas as a base64 PNG; returns empty string if not found
  function chartImg(id, altText) {
    const canvas = document.getElementById(id);
    if (!canvas) return `<p style="color:#888;font-style:italic;">${altText || 'No chart data'}</p>`;
    return `<img src="${canvas.toDataURL('image/png')}" alt="${altText || id}" style="width:100%;max-height:260px;object-fit:contain;display:block;" />`;
  }

  // Filter description
  const periodLabel = { daily: 'Last 24 hours', weekly: 'Last 7 days', monthly: 'Last 30 days', all: 'All time' };
  const filterLines = [
    `Period: ${periodLabel[appliedFilters.period || 'monthly'] || appliedFilters.period || 'Monthly'}`,
    `Service: ${appliedFilters.serviceId ? (services.find((s) => String(s.id) === String(appliedFilters.serviceId))?.name || `ID ${appliedFilters.serviceId}`) : 'All services'}`,
    `User: ${appliedFilters.userId ? `User ID ${appliedFilters.userId}` : 'All users'}`,
  ];

  // User report table rows — visits expanded inline (no <details>)
  const userTableRows = users.map((user) => {
    if (!user.visits.length) {
      return `<tr>
        <td>${user.userId}</td><td>${esc(user.fullName)}</td><td>${esc(user.email)}</td>
        <td>0</td><td>N/A</td><td colspan="4" style="color:#888;">No visits</td>
      </tr>`;
    }
    return user.visits.map((visit, i) => `<tr>
      ${i === 0 ? `<td rowspan="${user.visits.length}">${user.userId}</td>
        <td rowspan="${user.visits.length}">${esc(user.fullName)}</td>
        <td rowspan="${user.visits.length}">${esc(user.email)}</td>
        <td rowspan="${user.visits.length}">${user.totalVisits}</td>
        <td rowspan="${user.visits.length}">${user.averageWaitMinutes != null ? Number(user.averageWaitMinutes).toFixed(1) + ' min' : 'N/A'}</td>` : ''}
      <td>${esc(visit.serviceName)}</td>
      <td>${new Date(visit.joinedAt).toLocaleString()}</td>
      <td>${esc(visit.status)}</td>
      <td>${visit.waitMinutes != null ? Number(visit.waitMinutes).toFixed(1) + ' min' : 'N/A'}</td>
    </tr>`).join('');
  }).join('');

  // Service summary table
  const svcTableRows = services.map((svc) => {
    const peak = (svc.peakHours || []).slice(0, 3).map((p) => `${String(p.hour).padStart(2, '0')}:00`).join(', ') || 'N/A';
    return `<tr>
      <td>${esc(svc.name)}</td>
      <td>${esc(svc.locationName || '—')}</td>
      <td>${svc.isOpen ? 'Open' : 'Closed'}</td>
      <td>${svc.totalVisits}</td>
      <td>${svc.totalUsersServed}</td>
      <td>${svc.maximumQueueLength}</td>
      <td>${svc.averageWaitMinutes != null ? Number(svc.averageWaitMinutes).toFixed(1) + ' min' : 'N/A'}</td>
      <td>${svc.dropOffs}</td>
      <td>${esc(peak)}</td>
    </tr>`;
  }).join('');

  // Status breakdown table
  const statusTableRows = (queueUsage.statusBreakdown || []).map((row) => `<tr><td>${esc(row.status)}</td><td>${row.total}</td></tr>`).join('');

  const CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; padding: 20mm 15mm; }
    h1 { font-size: 20pt; color: #3730a3; margin-bottom: 4pt; }
    h2 { font-size: 13pt; color: #3730a3; margin: 18pt 0 6pt; border-bottom: 1.5px solid #c7d2fe; padding-bottom: 3pt; }
    h3 { font-size: 11pt; margin: 12pt 0 4pt; }
    .subtitle { color: #555; font-size: 10pt; margin-bottom: 12pt; }
    .meta { background: #f5f3ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 10pt 14pt; margin-bottom: 14pt; font-size: 9.5pt; }
    .meta p { margin: 2pt 0; }
    .meta strong { color: #3730a3; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin-bottom: 14pt; }
    .kpi-card { border: 1px solid #e0e7ff; border-radius: 6px; padding: 10pt; }
    .kpi-label { font-size: 8.5pt; color: #555; margin-bottom: 3pt; }
    .kpi-value { font-size: 16pt; font-weight: bold; color: #111; }
    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin-bottom: 14pt; }
    .chart-box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10pt; }
    .chart-box h3 { font-size: 9.5pt; color: #444; margin-bottom: 6pt; }
    .chart-full { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10pt; margin-bottom: 14pt; }
    .chart-full h3 { font-size: 9.5pt; color: #444; margin-bottom: 6pt; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 14pt; }
    th { background: #ede9fe; color: #3730a3; font-weight: 600; padding: 5pt 6pt; text-align: left; border: 1px solid #c4b5fd; }
    td { padding: 4pt 6pt; border: 1px solid #e5e7eb; vertical-align: top; }
    tr:nth-child(even) td { background: #f9fafb; }
    .svc-card { border: 1px solid #e0e7ff; border-radius: 6px; padding: 10pt 14pt; margin-bottom: 12pt; break-inside: avoid; }
    .svc-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8pt; }
    .svc-card-name { font-size: 12pt; font-weight: bold; }
    .svc-card-meta { font-size: 8.5pt; color: #666; margin-top: 2pt; }
    .svc-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6pt; margin-bottom: 8pt; }
    .svc-kpi { background: #f5f3ff; border-radius: 4px; padding: 6pt; }
    .svc-kpi-label { font-size: 7.5pt; color: #888; }
    .svc-kpi-val { font-size: 13pt; font-weight: bold; }
    .badge { display: inline-block; padding: 1pt 7pt; border-radius: 10pt; font-size: 8pt; font-weight: 600; }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-closed { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 20pt; border-top: 1px solid #e5e7eb; padding-top: 8pt; font-size: 8.5pt; color: #999; text-align: center; }
    @media print {
      body { padding: 0; }
      h2 { break-after: avoid; }
      .svc-card { break-inside: avoid; }
      .chart-box, .chart-full { break-inside: avoid; }
    }
  `;

  const svcDetailSections = services.map((svc) => {
    const peak = (svc.peakHours || []).map((p) => `${String(p.hour).padStart(2, '0')}:00 (${p.total})`).join(', ') || 'N/A';
    return `
      <div class="svc-card">
        <div class="svc-card-header">
          <div>
            <div class="svc-card-name">${esc(svc.name)}</div>
            <div class="svc-card-meta">
              ${esc(svc.description || '')}
              ${svc.locationName ? ` &nbsp;·&nbsp; ${esc(svc.locationName)}` : ''}
            </div>
          </div>
          <span class="badge ${svc.isOpen ? 'badge-ok' : 'badge-closed'}">${svc.isOpen ? 'Open' : 'Closed'}</span>
        </div>
        <div class="svc-kpi-row">
          <div class="svc-kpi"><div class="svc-kpi-label">Users Served</div><div class="svc-kpi-val">${svc.totalUsersServed}</div></div>
          <div class="svc-kpi"><div class="svc-kpi-label">Max Queue Length</div><div class="svc-kpi-val">${svc.maximumQueueLength}</div></div>
          <div class="svc-kpi"><div class="svc-kpi-label">Avg Wait</div><div class="svc-kpi-val">${svc.averageWaitMinutes != null ? Number(svc.averageWaitMinutes).toFixed(1) + ' min' : 'N/A'}</div></div>
          <div class="svc-kpi"><div class="svc-kpi-label">Drop-offs</div><div class="svc-kpi-val">${svc.dropOffs}</div></div>
        </div>
        <div class="charts-grid">
          <div class="chart-box"><h3>Queue Load Over Time</h3>${chartImg(`chart-svc-${svc.id}`, 'Queue timeline')}</div>
          <div class="chart-box"><h3>Handling Time</h3>
            <table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
              <tr><td>Min</td><td>${svc.handlingTime?.min != null ? Number(svc.handlingTime.min).toFixed(1) + ' min' : 'N/A'}</td></tr>
              <tr><td>Avg</td><td>${svc.handlingTime?.average != null ? Number(svc.handlingTime.average).toFixed(1) + ' min' : 'N/A'}</td></tr>
              <tr><td>Max</td><td>${svc.handlingTime?.max != null ? Number(svc.handlingTime.max).toFixed(1) + ' min' : 'N/A'}</td></tr>
              <tr><td>Peak hours</td><td>${esc(peak)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>QueueSmart Report &mdash; ${esc(appliedFilters.period || 'monthly')}</title>
  <style>${CSS}</style>
</head>
<body>

  <h1>QueueSmart &mdash; Usage Statistics Report</h1>
  <p class="subtitle">Analytics and performance report for administrators</p>

  <div class="meta">
    <p><strong>Generated at:</strong> ${generatedAt}</p>
    ${filterLines.map((line) => `<p><strong>${esc(line.split(':')[0])}:</strong> ${esc(line.split(':').slice(1).join(':').trim())}</p>`).join('')}
  </div>

  <h2>Overview KPIs</h2>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Total Users Served</div><div class="kpi-value">${overview.totalUsersServed ?? 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">Average Wait Time</div><div class="kpi-value">${overview.averageWaitTime != null ? Number(overview.averageWaitTime).toFixed(1) + ' min' : 'N/A'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Average Service Time</div><div class="kpi-value">${overview.averageServiceTime != null ? Number(overview.averageServiceTime).toFixed(1) + ' min' : 'N/A'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Max Queue Length</div><div class="kpi-value">${overview.maximumQueueLength ?? 0}</div></div>
    <div class="kpi-card"><div class="kpi-label">Drop-off Rate</div><div class="kpi-value">${overview.dropOffRate != null ? Number(overview.dropOffRate).toFixed(1) + '%' : 'N/A'}</div></div>
    <div class="kpi-card"><div class="kpi-label">Queue Efficiency</div><div class="kpi-value">${overview.queueEfficiencyRate != null ? Number(overview.queueEfficiencyRate).toFixed(1) + '%' : 'N/A'}</div></div>
  </div>

  <h2>Queue Analytics</h2>
  <div class="charts-grid">
    <div class="chart-box"><h3>Queue Activity Over Time</h3>${chartImg('chart-overall-queue', 'Queue activity chart')}</div>
    <div class="chart-box"><h3>Visit Status Distribution</h3>${chartImg('chart-status-pie', 'Status distribution chart')}</div>
  </div>
  <div class="charts-grid">
    <div class="chart-box"><h3>Users Served per Service</h3>${chartImg('chart-service-users', 'Users per service chart')}</div>
    <div class="chart-box"><h3>Average Wait Time per Service</h3>${chartImg('chart-service-wait', 'Wait time per service chart')}</div>
  </div>
  <div class="chart-full"><h3>Wait Time Distribution</h3>${chartImg('chart-wait-histogram', 'Wait time histogram')}</div>

  <h2>Visit Status Breakdown</h2>
  <table>
    <thead><tr><th>Status</th><th>Total Visits</th></tr></thead>
    <tbody>${statusTableRows || '<tr><td colspan="2">No data</td></tr>'}</tbody>
  </table>

  <h2>Service Performance Summary</h2>
  <table>
    <thead><tr><th>Service</th><th>Location</th><th>Status</th><th>Visits</th><th>Served</th><th>Max Queue</th><th>Avg Wait</th><th>Drop-offs</th><th>Peak Hours</th></tr></thead>
    <tbody>${svcTableRows || '<tr><td colspan="9">No service data</td></tr>'}</tbody>
  </table>

  <h2>Service Detail</h2>
  ${svcDetailSections || '<p style="color:#888;">No service data available for the selected filters.</p>'}

  <h2>User Activity Report</h2>
  <table>
    <thead><tr><th>User ID</th><th>Full Name</th><th>Email</th><th>Visits</th><th>Avg Wait</th><th>Service</th><th>Joined At</th><th>Status</th><th>Wait</th></tr></thead>
    <tbody>${userTableRows || '<tr><td colspan="9">No user activity for selected filters.</td></tr>'}</tbody>
  </table>

  <div class="footer">QueueSmart &mdash; Report generated ${generatedAt} &mdash; Confidential</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=960,height=800,scrollbars=yes');
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to generate PDF reports.');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Give images and layout a moment to settle before triggering print
  win.setTimeout(() => { win.focus(); win.print(); }, 400);
}

function initStatsCharts() {
  if (typeof Chart === 'undefined') return;

  (state._charts || []).forEach((c) => { try { c.destroy(); } catch (_) {} });
  state._charts = [];

  const report = state.adminStats || {};
  const queueUsage = report.queueUsage || {};
  const services = report.services || [];
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];

  function mkChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const chart = new Chart(canvas, config);
    state._charts.push(chart);
  }

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  // 1. Queue activity over time — area chart
  const timeline = queueUsage.queueLengthTimeline || [];
  mkChart('chart-overall-queue', {
    type: 'line',
    data: {
      labels: timeline.map((p) => p.label),
      datasets: [{
        label: 'Queue length',
        data: timeline.map((p) => p.queueLength),
        fill: true,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        tension: 0.35,
        pointRadius: 3,
      }],
    },
    options: { ...baseOpts, scales: { y: { beginAtZero: true } } },
  });

  // 2. Visit status distribution — pie chart
  const statusBreakdown = queueUsage.statusBreakdown || [];
  mkChart('chart-status-pie', {
    type: 'pie',
    data: {
      labels: statusBreakdown.map((s) => s.status),
      datasets: [{ data: statusBreakdown.map((s) => s.total), backgroundColor: COLORS }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } },
  });

  // 3. Users served per service — bar chart
  mkChart('chart-service-users', {
    type: 'bar',
    data: {
      labels: services.map((s) => s.name),
      datasets: [{
        label: 'Users served',
        data: services.map((s) => s.totalUsersServed),
        backgroundColor: COLORS.slice(0, services.length),
        borderRadius: 4,
      }],
    },
    options: { ...baseOpts, scales: { y: { beginAtZero: true } } },
  });

  // 4. Average wait time per service — horizontal bar
  mkChart('chart-service-wait', {
    type: 'bar',
    data: {
      labels: services.map((s) => s.name),
      datasets: [{
        label: 'Avg wait (min)',
        data: services.map((s) => (s.averageWaitMinutes != null ? Number(s.averageWaitMinutes.toFixed(1)) : 0)),
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      }],
    },
    options: { ...baseOpts, indexAxis: 'y', scales: { x: { beginAtZero: true } } },
  });

  // 5. Wait time distribution — histogram
  const allWaits = (report.users || [])
    .flatMap((u) => u.visits.map((v) => v.waitMinutes))
    .filter((w) => w !== null && w >= 0);
  const buckets = [
    { label: '0-5 min', min: 0, max: 5 },
    { label: '5-10 min', min: 5, max: 10 },
    { label: '10-15 min', min: 10, max: 15 },
    { label: '15-20 min', min: 15, max: 20 },
    { label: '20-30 min', min: 20, max: 30 },
    { label: '30-60 min', min: 30, max: 60 },
    { label: '60+ min', min: 60, max: Infinity },
  ];
  mkChart('chart-wait-histogram', {
    type: 'bar',
    data: {
      labels: buckets.map((b) => b.label),
      datasets: [{
        label: 'Visits',
        data: buckets.map((b) => allWaits.filter((w) => w >= b.min && w < b.max).length),
        backgroundColor: '#22c55e',
        borderRadius: 4,
      }],
    },
    options: { ...baseOpts, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });

  // 6. Per-service queue timeline — line chart per service card
  for (const service of services) {
    const svcTimeline = service.queueLengthTimeline || [];
    mkChart(`chart-svc-${service.id}`, {
      type: 'line',
      data: {
        labels: svcTimeline.map((p) => p.label),
        datasets: [{
          label: 'Queue length',
          data: svcTimeline.map((p) => p.queueLength),
          fill: true,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59,130,246,0.1)',
          tension: 0.35,
          pointRadius: 2,
        }],
      },
      options: { ...baseOpts, scales: { y: { beginAtZero: true } } },
    });
  }
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
  const query = buildAdminStatsQuery();
  const data = await api(`/admin/reports?${query}`);
  state.adminStats = data;
}

function bindAdminStats() {
  const applyBtn = qs('#applyStatsFiltersBtn');
  const resetBtn = qs('#resetStatsFiltersBtn');

  if (applyBtn) {
    applyBtn.onclick = async () => {
      state.adminStatsFilters = {
        period: qs('#statsPeriodSel')?.value || 'monthly',
        serviceId: qs('#statsServiceSel')?.value || '',
        userId: qs('#statsUserIdInput')?.value.trim() || '',
      };
      await render();
    };
  }

  if (resetBtn) {
    resetBtn.onclick = async () => {
      state.adminStatsFilters = {
        period: 'monthly',
        serviceId: '',
        userId: '',
      };
      await render();
    };
  }

  const csvBtn = qs('#exportStatsCsvBtn');
  if (csvBtn) {
    csvBtn.onclick = () => exportStatsCSV();
  }

  const printBtn = qs('#printStatsBtn');
  if (printBtn) {
    printBtn.onclick = () => printStatsReport();
  }
}

async function loadAdminQueue(serviceId) {
  const data = await api(`/queues/service/${serviceId}`);
  state.adminQueue = data.queue;
}

function getAdminSelectedServiceId() {
  const fallbackId = Number(state.services[0]?.id || 0);
  const selectedId = Number(state.adminSelectedServiceId || fallbackId);
  const exists = state.services.some((service) => service.id === selectedId);
  return exists ? selectedId : fallbackId;
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
function extractLocationFromDescription(description = '') {
  const text = String(description || '');

  const match = text.match(/at the\s+(.+?)(\.|$)/i);

  if (match && match[1]) {
    return match[1].trim();
  }

  return '';
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

    const previewPosition = Number(service.activeQueueLength || 0) + 1;
    const waitMinutes = estimateWait(
      previewPosition,
      service,
      Number(service.activeQueueLength || 0)
    );

    estWait.textContent = `${waitMinutes} minutes`;
    queueLen.textContent = service.activeQueueLength || 0;
    stockText.textContent =
     service.locationName ||
     service.location ||
     service.pickupLocation ||
     extractLocationFromDescription(service.description) ||
     'Campus Bookstore';
    serviceMeta.textContent = `${service.description || ''}`;

    joinBtn.disabled = !!state.currentEntry || !service.isOpen;
    leaveBtn.disabled = !state.currentEntry;
  }

  serviceSel.onchange = refreshCard;

  joinBtn.onclick = async () => {
    try {
      await api('/queues/join', {
        method: 'POST',
        body: JSON.stringify({
          userId: state.user.id,
          serviceId: Number(serviceSel.value),
        }),
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
        body: JSON.stringify({
          userId: state.user.id,
        }),
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
  const serviceId = Number(qs('#adminServiceSel')?.value || getAdminSelectedServiceId());
  state.adminSelectedServiceId = serviceId;
  await api('/admin/queue/reorder', {
    method: 'POST',
    body: JSON.stringify({ serviceId, orderedEntryIds: state.adminQueue.map((item) => item.id) }),
  });
  pushToast('Queue updated', 'Queue order saved.');
  await afterAdminQueueChange();
}

async function afterAdminQueueChange() {
  const currentSelection = Number(qs('#adminServiceSel')?.value || getAdminSelectedServiceId());
  state.adminSelectedServiceId = currentSelection;
  await loadCommonData();
  await loadAdminQueue(currentSelection);
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
    state.adminSelectedServiceId = Number(sel.value);
    await loadAdminQueue(state.adminSelectedServiceId);
    renderAdminQueueTable();
  };

  qs('#serveNextBtn').onclick = async () => {
    try {
      const serviceId = Number(sel.value || getAdminSelectedServiceId());
      state.adminSelectedServiceId = serviceId;
      await api('/admin/queue/serve-next', { method: 'POST', body: JSON.stringify({ serviceId }) });
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
      state.adminSelectedServiceId = getAdminSelectedServiceId();
      if (state.adminSelectedServiceId) await loadAdminQueue(state.adminSelectedServiceId);
      app.innerHTML = queueManagementPage();
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
      initStatsCharts();
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
    if (hash === '#/admin/stats') bindAdminStats();
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
