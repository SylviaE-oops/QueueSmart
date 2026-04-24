import { config } from './config';

const API_URL = config.apiBaseUrl;
const PRIORITY_MAP = { 1: 'low', 2: 'medium', 3: 'high' };

function getAuthHeaders(extraHeaders = {}) {
  const userId = localStorage.getItem('qs_user_id');
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
    ...extraHeaders
  };
}

function normalizeService(service) {
  const numericPriority = Number(service.priority ?? 1);

  return {
    id: Number(service.id),
    name: service.name,
    description: service.description,
    expectedDurationMin: Number(service.duration ?? service.expectedDurationMin ?? 0),
    priority: PRIORITY_MAP[numericPriority] || 'low',
    status: service.status || 'open'
  };
}

export async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: getAuthHeaders(options.headers),
      ...options
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `API Error: ${response.statusText}`);
    }

    return payload;
  } catch (err) {
    console.error('API Error:', err);
    throw err;
  }
}

export async function loginUser(email, password) {
  const result = await apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: email, password })
  });

  return {
    success: true,
    data: {
      id: result.user.id,
      email: result.user.username,
      role: result.user.role,
      token: result.token
    }
  };
}

export async function registerUser(email, password) {
  const result = await apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: email, password, role: 'user' })
  });

  return {
    success: true,
    data: {
      id: result.id,
      email: result.username,
      role: result.role
    }
  };
}

export async function loadServices() {
  const result = await apiCall('/services');
  return {
    success: true,
    data: Array.isArray(result) ? result.map(normalizeService) : []
  };
}

export async function createService(serviceData) {
  const duration = Number(serviceData.expectedDurationMin || serviceData.duration || 5);
  const priorityMap = { low: 1, medium: 2, high: 3 };
  const priority = typeof serviceData.priority === 'number'
    ? serviceData.priority
    : (priorityMap[serviceData.priority] || 1);

  const result = await apiCall('/services', {
    method: 'POST',
    body: JSON.stringify({
      name: serviceData.name,
      description: serviceData.description,
      duration,
      priority,
      status: serviceData.status || 'open'
    })
  });

  return {
    success: true,
    data: normalizeService(result)
  };
}

export async function updateService(id, serviceData) {
  const duration = Number(serviceData.expectedDurationMin || serviceData.duration || 5);
  const priorityMap = { low: 1, medium: 2, high: 3 };
  const priority = typeof serviceData.priority === 'number'
    ? serviceData.priority
    : (priorityMap[serviceData.priority] || 1);

  const result = await apiCall(`/services/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: serviceData.name,
      description: serviceData.description,
      duration,
      priority,
      status: serviceData.status || 'open'
    })
  });

  return {
    success: true,
    data: normalizeService(result)
  };
}

export async function deleteService(id) {
  const result = await apiCall(`/services/${id}`, {
    method: 'DELETE'
  });

  return {
    success: true,
    data: result
  };
}

export async function loadQueues() {
  const role = localStorage.getItem('qs_role');
  const userId = localStorage.getItem('qs_user_id');

  if (!userId || role !== 'admin') {
    return { success: true, data: [] };
  }

  const result = await apiCall('/queue');
  return {
    success: true,
    data: Array.isArray(result) ? result : []
  };
}

export async function createQueue(queueData) {
  const userId = Number(localStorage.getItem('qs_user_id'));
  const result = await apiCall('/queue/join', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: Number(queueData.serviceId),
      userId
    })
  });

  return {
    success: true,
    data: result
  };
}

export async function leaveQueue(serviceId) {
  const userId = Number(localStorage.getItem('qs_user_id'));
  const result = await apiCall('/queue/leave', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: Number(serviceId),
      userId
    })
  });

  return {
    success: true,
    data: result
  };
}

export async function updateQueue(id, queueData) {
  return { success: false, error: 'Update queue endpoint not implemented in backend' };
}

export async function deleteQueue(id) {
  return { success: false, error: 'Delete queue endpoint not implemented in backend' };
}

export async function getQueuesByService(serviceId) {
  const result = await apiCall(`/queue/${serviceId}`);
  return {
    success: true,
    data: Array.isArray(result) ? result : []
  };
}

export async function getQueuesByEmail(email) {
  return { success: true, data: [] };
}

// ── Locations ─────────────────────────────────────────────────────────────────

export async function loadLocations() {
  const result = await apiCall('/locations');
  return { success: true, data: result.locations || [] };
}

export async function createLocation(data) {
  const result = await apiCall('/locations', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      address: data.address,
      maxQueues: Number(data.maxQueues || 1),
    }),
  });
  return { success: true, data: result };
}

export async function updateLocation(id, data) {
  const result = await apiCall(`/locations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: data.name,
      address: data.address,
      maxQueues: Number(data.maxQueues || 1),
    }),
  });
  return { success: true, data: result };
}

export async function deleteLocation(id) {
  const result = await apiCall(`/locations/${id}`, { method: 'DELETE' });
  return { success: true, data: result };
}

// ── Admin book requests ────────────────────────────────────────────────────────

export async function loadAdminBookRequests() {
  const result = await apiCall('/admin/book-requests');
  return { success: true, data: result.requests || [] };
}

export async function updateBookRequestStatus(id, status, locationId = null) {
  const result = await apiCall(`/admin/book-requests/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, locationId }),
  });
  return { success: true, data: result };
}
