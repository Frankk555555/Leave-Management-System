import axios from "axios";
import config from "../config";

const API_URL = `${config.API_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (data) => api.post("/auth/login", data),
  getMe: () => api.get("/auth/me"),
};

// Users API
export const usersAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post("/users", data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getSupervisors: () => api.get("/users/supervisors"),
  resetPassword: (id, newPassword) =>
    api.put(`/users/${id}/reset-password`, { newPassword }),
  // Profile APIs (for users to edit their own profile)
  updateProfile: (data) => api.put("/users/profile", data),
  updateProfileImage: (formData) =>
    api.put("/users/profile/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateSignatureImage: (formData) =>
    api.put("/users/profile/signature", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  // Import users from CSV/Excel
  importUsers: (formData) =>
    api.post("/users/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// Leave Requests API
export const leaveRequestsAPI = {
  create: (formData) =>
    api.post("/leave-requests", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getMyRequests: () => api.get("/leave-requests"),
  getAll: () => api.get("/leave-requests/all"),
  getById: (id) => api.get(`/leave-requests/${id}`),
  cancel: (id) => api.put(`/leave-requests/${id}/cancel`),
  update: (id, data) => api.put(`/leave-requests/${id}`, data),
  getTeam: () => api.get("/leave-requests/team"),
};

// Leave Types API
export const leaveTypesAPI = {
  getAll: () => api.get("/leave-types"),
  create: (data) => api.post("/leave-types", data),
  update: (id, data) => api.put(`/leave-types/${id}`, data),
  delete: (id) => api.delete(`/leave-types/${id}`),
  initialize: () => api.post("/leave-types/init"),
};

// Holidays API
export const holidaysAPI = {
  getAll: (year) => api.get("/holidays", { params: { year } }),
  create: (data) => api.post("/holidays", data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
  initialize: () => api.post("/holidays/init"),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get("/notifications"),
  getUnreadCount: () => api.get("/notifications/unread-count"),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Reports API
export const reportsAPI = {
  getStatistics: (year) => api.get("/reports/statistics", { params: { year } }),
  exportExcel: (year, month) =>
    api.get("/reports/export/excel", {
      params: { year, month },
      responseType: "blob",
    }),
  exportPDF: (year, month) =>
    api.get("/reports/export/pdf", {
      params: { year, month },
      responseType: "blob",
    }),
  resetYearly: () => api.post("/reports/reset-yearly"),
  getAllRequests: (params) => api.get("/reports/all-requests", { params }),
};

// Departments API (สาขาวิชา/หน่วยงาน)
export const departmentsAPI = {
  getAll: (facultyId) => api.get("/departments", { params: { facultyId } }),
  create: (data) => api.post("/departments", data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  initialize: () => api.post("/departments/initialize"),
};

// Faculties API (คณะ/สำนัก/สถาบัน)
export const facultiesAPI = {
  getAll: () => api.get("/faculties"),
  create: (data) => api.post("/faculties", data),
  update: (id, data) => api.put(`/faculties/${id}`, data),
  delete: (id) => api.delete(`/faculties/${id}`),
  initialize: () => api.post("/faculties/initialize"),
};

export default api;
