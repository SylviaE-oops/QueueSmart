import { config } from './config';

const API_URL = config.apiBaseUrl;

function getAuthHeaders(extraHeaders = {}) {
  const userId = localStorage.getItem('qs_user_id');
  return {
    'Content-Type': 'application/json',
    ...(userId ? { 'x-user-id': userId } : {}),
    ...extraHeaders
  };
}

function normalizeService(service) {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    expectedDurationMin: service.duration,
    priority: service.priority,
    status: 'open'
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
      priority
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
      priority
    })
  });

  return {
    success: true,
    data: normalizeService(result)
  };
}

export async function deleteService(id) {
  return { success: false, error: 'Delete endpoint not implemented in backend' };
}

export async function loadQueues() {
  // Queue listing needs a specific service in this backend.
  return { success: true, data: [] };
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
