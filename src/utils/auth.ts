import { AdminUser, LoginAttempt, AuthSession } from '../types';
import { getCurrentTenant } from './tenantManager';
import { getTenantBySlug } from './tenantSupabase';


export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "beauty-app-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const STORAGE_KEYS = {
  ADMIN_USERS: 'beauty-salon-admin-users',
  LOGIN_ATTEMPTS: 'beauty-salon-login-attempts',
  AUTH_SESSION: 'beauty-salon-auth-session'
};

// Get tenant-specific storage key
const getTenantStorageKey = (key: string): string => {
  const tenant = getCurrentTenant();
  if (tenant) {
    return `tenant-${tenant.id}-${key}`;
  }
  return key; // Fallback to legacy key for backward compatibility
};

// Security constants - Removed all restrictions
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours (extended)

// Generate secure token
const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Debe contener al menos un número');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Username validation
export const validateUsername = (username: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('El nombre de usuario debe tener al menos 3 caracteres');
  }
  
  if (username.length > 20) {
    errors.push('El nombre de usuario no puede tener más de 20 caracteres');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Solo se permiten letras, números y guiones bajos');
  }
  
  if (/^\d/.test(username)) {
    errors.push('El nombre de usuario no puede comenzar con un número');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Initialize default admin user for current tenant
export const initializeDefaultAdmin = async (): Promise<void> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    console.warn("No tenant found, skipping admin initialization");
    return;
  }
  
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  
  if (users.length === 0) {
    console.log(`Initializing default admin for tenant: ${tenant.name}`);
    const defaultAdmin: AdminUser = {
      id: '1',
      username: 'admin',
      passwordHash: await hashPassword('Admin123!'),
      role: 'owner',
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    users.push(defaultAdmin);
    localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  }
};

// Create admin user for new tenant
export const createTenantAdmin = async (tenantId: string, ownerData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<AdminUser> => {
  const adminUser: AdminUser = {
    id: Date.now().toString(),
    username: ownerData.email.toLowerCase(), // Use email as username
    passwordHash: await hashPassword(ownerData.password),
    role: 'owner',
    createdAt: new Date().toISOString(),
    isActive: true
  };

  // Save to tenant-specific storage
  const tenantStorageKey = `tenant-${tenantId}-${STORAGE_KEYS.ADMIN_USERS}`;
  const existingUsers = localStorage.getItem(tenantStorageKey);
  const users = existingUsers ? JSON.parse(existingUsers) : [];
  
  users.push(adminUser);
  localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  
  return adminUser;
};

// Get admin users for current tenant
export const getAdminUsers = (): AdminUser[] => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    console.warn("No tenant found, returning empty admin users list");
    return [];
  }
  
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  return stored ? JSON.parse(stored) : [];
};

// Get login attempts
export const getLoginAttempts = (): LoginAttempt[] => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.LOGIN_ATTEMPTS));
  return stored ? JSON.parse(stored) : [];
};

// Record login attempt
export const recordLoginAttempt = (username: string, success: boolean): void => {
  const attempts = getLoginAttempts();
  const attempt: LoginAttempt = {
    id: Date.now().toString(),
    username: username.toLowerCase(),
    ipAddress: 'localhost', // In production, get real IP
    timestamp: new Date().toISOString(),
    success,
    userAgent: navigator.userAgent
  };
  
  attempts.push(attempt);
  
  // Keep only last 100 attempts
  if (attempts.length > 100) {
    attempts.splice(0, attempts.length - 100);
  }
  
  localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.LOGIN_ATTEMPTS), JSON.stringify(attempts));
};

// Check if user is locked out - DISABLED
export const isUserLockedOut = (_username: string): boolean => {
  return false; // Always return false - no lockouts
};

// Get lockout time remaining - DISABLED
export const getLockoutTimeRemaining = (_username: string): number => {
  return 0; // Always return 0 - no lockouts
};

// Authenticate user - Improved with strict tenant isolation
export const authenticateUser = async (username: string, password: string): Promise<{
  success: boolean;
  user?: AdminUser;
  session?: AuthSession;
  error?: string;
}> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    return {
      success: false,
      error: 'No hay negocio seleccionado'
    };
  }
  
  const normalizedUsername = username.toLowerCase().trim();
  
  // Find user in current tenant
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  const user = users.find((u: AdminUser) => u.username.toLowerCase() === normalizedUsername && u.isActive);
  
  if (!user) {
    recordLoginAttempt(normalizedUsername, false);
    return {
      success: false,
      error: 'Credenciales incorrectas'
    };
  }
  
  // Verify password
  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    recordLoginAttempt(normalizedUsername, false);
    return {
      success: false,
      error: 'Credenciales incorrectas'
    };
  }
  
  // Create session
  const session: AuthSession = {
    id: generateToken(),
    userId: user.id,
    token: generateToken(),
    expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString(),
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    ipAddress: 'localhost',
    userAgent: navigator.userAgent
  };
  
  // Update user last login
  user.lastLogin = new Date().toISOString();
  const userIndex = users.findIndex((u: AdminUser) => u.id === user.id);
  users[userIndex] = user;
  localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  
  // Save session with tenant-specific key
  const sessionKey = `tenant-${tenant.id}-${STORAGE_KEYS.AUTH_SESSION}`;
  localStorage.setItem(sessionKey, JSON.stringify(session));
  
  recordLoginAttempt(normalizedUsername, true);
  
  return {
    success: true,
    user,
    session
  };
};

// Get current session - Improved with strict tenant isolation
export const getCurrentSession = (): AuthSession | null => {
  const tenant = getCurrentTenant();
  if (!tenant) return null;
  
  const sessionKey = `tenant-${tenant.id}-${STORAGE_KEYS.AUTH_SESSION}`;
  const stored = localStorage.getItem(sessionKey);
  if (!stored) return null;
  
  const session: AuthSession = JSON.parse(stored);
  const now = new Date().getTime();
  const expiresAt = new Date(session.expiresAt).getTime();
  
  // Check if session expired
  if (now > expiresAt) {
    logout();
    return null;
  }
  
  // Update last activity
  session.lastActivity = new Date().toISOString();
  localStorage.setItem(sessionKey, JSON.stringify(session));
  
  return session;
};

// Get current user
export const getCurrentUser = (): AdminUser | null => {
  const tenant = getCurrentTenant();
  if (!tenant) return null;
  
  const session = getCurrentSession();
  if (!session) return null;
  
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  
  return users.find((u: AdminUser) => u.id === session.userId && u.isActive) || null;
};

// Logout
export const logout = (): void => {
  const tenant = getCurrentTenant();
  if (!tenant) return;
  
  const sessionKey = `tenant-${tenant.id}-${STORAGE_KEYS.AUTH_SESSION}`;
  localStorage.removeItem(sessionKey);
};

// Check if authenticated
export const isAuthenticated = (): boolean => {
  return getCurrentSession() !== null;
};

// Create new admin user (only for owners)
export const createAdminUser = async (userData: {
  username: string;
  password: string;
  role: 'owner' | 'admin';
}, currentUser: AdminUser): Promise<{ success: boolean; error?: string }> => {
  if (currentUser.role !== 'owner') {
    return { success: false, error: 'No tienes permisos para crear usuarios' };
  }
  
  const tenant = getCurrentTenant();
  if (!tenant) {
    return { success: false, error: 'No hay negocio seleccionado' };
  }
  
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  
  const normalizedUsername = userData.username.toLowerCase().trim();
  
  // Check if username already exists
  if (users.some((u: AdminUser) => u.username.toLowerCase() === normalizedUsername)) {
    return { success: false, error: 'El nombre de usuario ya existe' };
  }
  
  // Validate username
  const usernameValidation = validateUsername(userData.username);
  if (!usernameValidation.isValid) {
    return { success: false, error: usernameValidation.errors.join(', ') };
  }
  
  // Validate password
  const passwordValidation = validatePassword(userData.password);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors.join(', ') };
  }
  
  const newUser: AdminUser = {
    id: Date.now().toString(),
    username: normalizedUsername,
    passwordHash: await hashPassword(userData.password),
    role: userData.role,
    createdAt: new Date().toISOString(),
    isActive: true
  };
  
  users.push(newUser);
  localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  
  return { success: true };
};

// Change password
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  user: AdminUser
): Promise<{ success: boolean; error?: string }> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    return { success: false, error: 'No hay negocio seleccionado' };
  }
  
  // Verify current password
  const currentPasswordHash = await hashPassword(currentPassword);
  if (currentPasswordHash !== user.passwordHash) {
    return { success: false, error: 'Contraseña actual incorrecta' };
  }
  
  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return { success: false, error: passwordValidation.errors.join(', ') };
  }
  
  // Update password
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  
  const userIndex = users.findIndex((u: AdminUser) => u.id === user.id);
  if (userIndex === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }
  
  users[userIndex].passwordHash = await hashPassword(newPassword);
  localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  
  // Record credential update
  recordCredentialUpdate(user.id, 'password');
  
  return { success: true };
};

// Change username
export const changeUsername = async (
  currentPassword: string,
  newUsername: string,
  user: AdminUser
): Promise<{ success: boolean; error?: string }> => {
  const tenant = getCurrentTenant();
  if (!tenant) {
    return { success: false, error: 'No hay negocio seleccionado' };
  }
  
  // Verify current password
  const currentPasswordHash = await hashPassword(currentPassword);
  if (currentPasswordHash !== user.passwordHash) {
    return { success: false, error: 'Contraseña actual incorrecta' };
  }
  
  // Validate new username
  const usernameValidation = validateUsername(newUsername);
  if (!usernameValidation.isValid) {
    return { success: false, error: usernameValidation.errors.join(', ') };
  }
  
  const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
  const stored = localStorage.getItem(tenantStorageKey);
  const users = stored ? JSON.parse(stored) : [];
  
  const normalizedUsername = newUsername.toLowerCase().trim();
  
  // Check if username already exists
  if (users.some((u: AdminUser) => u.username.toLowerCase() === normalizedUsername && u.id !== user.id)) {
    return { success: false, error: 'El nombre de usuario ya existe' };
  }
  
  // Update username
  const userIndex = users.findIndex((u: AdminUser) => u.id === user.id);
  if (userIndex === -1) {
    return { success: false, error: 'Usuario no encontrado' };
  }
  
  users[userIndex].username = normalizedUsername;
  localStorage.setItem(tenantStorageKey, JSON.stringify(users));
  
  // Record credential update
  recordCredentialUpdate(user.id, 'username');
  
  return { success: true };
};

// Record credential updates for security audit
export const recordCredentialUpdate = (userId: string, type: 'username' | 'password'): void => {
  const tenant = getCurrentTenant();
  if (!tenant) return;
  
  const updatesKey = `tenant-${tenant.id}-beauty-salon-credential-updates`;
  const stored = localStorage.getItem(updatesKey);
  const updates = stored ? JSON.parse(stored) : [];
  
  const update = {
    id: Date.now().toString(),
    userId,
    type,
    timestamp: new Date().toISOString(),
    ipAddress: 'localhost',
    userAgent: navigator.userAgent
  };
  
  updates.push(update);
  
  // Keep only last 50 updates
  if (updates.length > 50) {
    updates.splice(0, updates.length - 50);
  }
  
  localStorage.setItem(updatesKey, JSON.stringify(updates));
};

export const getCredentialUpdates = () => {
  const tenant = getCurrentTenant();
  if (!tenant) return [];
  
  const updatesKey = `tenant-${tenant.id}-beauty-salon-credential-updates`;
  const stored = localStorage.getItem(updatesKey);
  return stored ? JSON.parse(stored) : [];
};

// Get last credential update
export const getLastCredentialUpdate = (userId: string): { username?: string; password?: string } => {
  const updates = getCredentialUpdates();
  const userUpdates = updates.filter((update: any) => update.userId === userId);
  
  const lastUsernameUpdate = userUpdates
    .filter((update: any) => update.type === 'username')
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    
  const lastPasswordUpdate = userUpdates
    .filter((update: any) => update.type === 'password')
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  
  return {
    username: lastUsernameUpdate?.timestamp,
    password: lastPasswordUpdate?.timestamp
  };
};

// Función para depurar problemas de autenticación
export const debugAuth = () => {
  const tenant = getCurrentTenant();
  console.log("🔍 === AUTH DEBUG ===");
  console.log("Current tenant:", tenant?.name || "No tenant");
  console.log("Tenant ID:", tenant?.id || "No ID");
  
  // Listar todas las claves de localStorage relacionadas con usuarios
  const userKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('admin-users') || key.includes('auth-session'))) {
      userKeys.push({
        key,
        value: localStorage.getItem(key)
      });
    }
  }
  
  console.log("All user-related localStorage keys:", userKeys);
  
  // Verificar sesión actual
  const session = getCurrentSession();
  console.log("Current session:", session);
  
  // Verificar usuario actual
  const user = getCurrentUser();
  console.log("Current user:", user);
  
  console.log("🔍 === END AUTH DEBUG ===");
  
  return {
    tenant,
    userKeys,
    session,
    user
  };
};

// Función para reparar problemas de autenticación
export const repairAuth = async (tenantSlug: string, email: string, password: string) => {
  console.log("🔧 Reparando autenticación para:", tenantSlug, email);
  
  try {
    // 1. Obtener tenant por slug de Supabase
    const tenant = await getTenantBySlug(tenantSlug);
    
    if (!tenant) {
      console.error("❌ Tenant no encontrado en Supabase:", tenantSlug);
      return { success: false, error: "Negocio no encontrado" };
    }
    
    // 2. Sincronizar tenant en localStorage si no existe
    const { setCurrentTenant } = await import('./tenantManager');
    setCurrentTenant(tenant);
    
    // 3. Crear hash de contraseña
    const passwordHash = await hashPassword(password);
    
    // 4. Crear usuario administrador
    const adminUser: AdminUser = {
      id: Date.now().toString(),
      username: email.toLowerCase(),
      passwordHash,
      role: 'owner',
      createdAt: new Date().toISOString(),
      isActive: true
    };
    
    // 5. Guardar en almacenamiento específico del tenant
    const tenantStorageKey = `tenant-${tenant.id}-${STORAGE_KEYS.ADMIN_USERS}`;
    localStorage.setItem(tenantStorageKey, JSON.stringify([adminUser]));
    
    console.log("✅ Autenticación reparada exitosamente");
    return { success: true, user: adminUser, tenant };
  } catch (error) {
    console.error("❌ Error reparando autenticación:", error);
    return { success: false, error: "Error interno" };
  }
};

// Función para limpiar todas las sesiones
export const clearAllSessions = () => {
  console.log("🧹 Limpiando todas las sesiones...");
  
  // Buscar todas las claves de sesión
  const sessionKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(STORAGE_KEYS.AUTH_SESSION)) {
      sessionKeys.push(key);
    }
  }
  
  // Eliminar todas las sesiones
  sessionKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`Sesión eliminada: ${key}`);
  });
  
  console.log(`✅ ${sessionKeys.length} sesiones eliminadas`);
  return sessionKeys.length;
};

// Función para listar todos los usuarios de todos los tenants
export const listAllUsers = () => {
  console.log("📋 Listando todos los usuarios de todos los tenants...");
  
  const usersByTenant: Record<string, AdminUser[]> = {};
  
  // Buscar todas las claves de usuarios
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes(STORAGE_KEYS.ADMIN_USERS)) {
      const tenantMatch = key.match(/tenant-([^-]+)-/);
      const tenantId = tenantMatch ? tenantMatch[1] : 'unknown';
      
      const users = JSON.parse(localStorage.getItem(key) || '[]');
      usersByTenant[tenantId] = users;
    }
  }
  
  console.log("👥 Usuarios por tenant:", usersByTenant);
  return usersByTenant;
};

// Hacer funciones disponibles globalmente para debugging
if (typeof window !== "undefined") {
  const w = window as any;
  w.debugAuth = debugAuth;
  w.repairAuth = repairAuth;
  w.clearAllSessions = clearAllSessions;
  w.listAllUsers = listAllUsers;
}