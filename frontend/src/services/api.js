const API_BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Error al comunicarse con el servidor",
      response.status,
      payload?.code || "REQUEST_ERROR",
      payload?.details || null
    );
  }

  return payload;
}

export const rifasService = {
  listPublic: () => apiRequest("/rifas"),
  getBySlug: (slug) => apiRequest(`/rifas/${encodeURIComponent(slug)}`),
  listAdmin: () => apiRequest("/admin/rifas"),
  createAdmin: (body) =>
    apiRequest("/admin/rifas", { method: "POST", body: JSON.stringify(body) }),
  updateAdmin: (id, body) =>
    apiRequest(`/admin/rifas/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  uploadImageAdmin: (id, formData) =>
    apiRequest(`/admin/rifas/${id}/imagen`, { method: "POST", body: formData }),
  createPremioAdmin: (id, body) =>
    apiRequest(`/admin/rifas/${id}/premios`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  saveAutorizacionAdmin: (id, body) =>
    apiRequest(`/admin/rifas/${id}/autorizaciones`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  changeStatusAdmin: (id, estado) =>
    apiRequest(`/admin/rifas/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    }),
};

export const numerosService = {
  listByRifa: (rifaId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
    });
    const qs = query.toString();
    return apiRequest(`/rifas/${rifaId}/numeros${qs ? `?${qs}` : ""}`);
  },
  listAdminByRifa: (rifaId, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
    });
    const qs = query.toString();
    return apiRequest(`/admin/rifas/${rifaId}/numeros${qs ? `?${qs}` : ""}`);
  },
  getDetalleAdmin: (rifaId, numero) =>
    apiRequest(`/admin/rifas/${rifaId}/numeros/${encodeURIComponent(numero)}`),
  getExportCsvUrl: (rifaId) => `${API_BASE}/admin/rifas/${rifaId}/numeros/exportar`,
  liberarManualAdmin: (body) =>
    apiRequest("/admin/numeros/liberar", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const reservasService = {
  create: (body) =>
    apiRequest("/reservas", { method: "POST", body: JSON.stringify(body) }),
  getByToken: (token) => apiRequest(`/reservas/${encodeURIComponent(token)}`),
};

export const pagosService = {
  reportPublic: (formData, idempotencyKey) =>
    apiRequest("/pagos", {
      method: "POST",
      body: formData,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
    }),
  listAdmin: (estado = "") =>
    apiRequest(`/admin/pagos${estado ? `?estado=${encodeURIComponent(estado)}` : ""}`),
  approveAdmin: (id, body = {}) =>
    apiRequest(`/admin/pagos/${id}/aprobar`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  rejectAdmin: (id, body) =>
    apiRequest(`/admin/pagos/${id}/rechazar`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  getPrivateReceiptUrl: (id) => `${API_BASE}/admin/pagos/${id}/comprobante`,
};

export const configService = {
  getPublic: () => apiRequest("/configuracion/publica"),
  updatePagosAdmin: (body) =>
    apiRequest("/admin/configuracion/pagos", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateGeneralAdmin: (body) =>
    apiRequest("/admin/configuracion/general", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
};

export const adminService = {
  login: (body) =>
    apiRequest("/admin/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => apiRequest("/admin/auth/logout", { method: "POST" }),
  me: () => apiRequest("/admin/auth/me"),
  dashboard: () => apiRequest("/admin/dashboard"),
  participantes: (q = "") =>
    apiRequest(`/admin/participantes${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  auditoria: () => apiRequest("/admin/auditoria"),
};
