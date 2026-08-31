const TOKEN_KEY = "carryfree_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const getTokenPayload = (token = getToken()) => {
  if (!token) {
    return null;
  }

  return decodeJwtPayload(token);
};

export const isTokenValid = (token) => {
  if (!token) {
    return false;
  }

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
};

export const getValidToken = () => {
  const token = getToken();

  if (!isTokenValid(token)) {
    clearToken();
    return null;
  }

  return token;
};

export const getCurrentUser = () => {
  const token = getValidToken();
  const payload = getTokenPayload(token);

  if (!payload || !payload.id) {
    return null;
  }

  return {
    id: payload.id,
    role: payload.role || "user",
  };
};
