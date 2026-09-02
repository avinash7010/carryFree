import { clearToken } from "./auth";

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  envApiBaseUrl && envApiBaseUrl.trim().length > 0
    ? envApiBaseUrl.replace(/\/$/, "")
    : "/api";

const buildHeaders = (token, isJson = true) => {
  const headers = {};

  if (isJson) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }

    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  return parseResponse(response);
};

export const apiGet = (path, token) =>
  apiRequest(path, {
    method: "GET",
    headers: buildHeaders(token, false),
  });

export const apiPost = (path, body, token) =>
  apiRequest(path, {
    method: "POST",
    headers: buildHeaders(token, true),
    body: JSON.stringify(body),
  });

export const apiPatch = (path, body, token) =>
  apiRequest(path, {
    method: "PATCH",
    headers: buildHeaders(token, true),
    body: JSON.stringify(body),
  });

export const apiPostMultipart = (path, formData, token) => {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return apiRequest(path, {
    method: "POST",
    headers,
    body: formData,
  });
};
