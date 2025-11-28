import { Equipment, Quotation, SupplyRequestItem, SupplyRequestMetadata, User, ActivityLog } from '../types';

const KEYS = {
  EQUIPMENT: 'bidmaster_equipment',
  QUOTES: 'bidmaster_quotes',
  SUPPLY_REQUEST_ITEMS: 'bidmaster_supply_items',
  SUPPLY_REQUEST_META: 'bidmaster_supply_meta',
  USERS: 'bidmaster_users',
  CURRENT_SESSION: 'bidmaster_session',
  ACTIVITY_LOGS: 'bidmaster_activity_logs'
};

// --- AUTH & USERS ---

const DEFAULT_ADMIN: User = {
  id: 'admin-001',
  username: 'Adminmp',
  password: 'Minhphu@123',
  fullName: 'Administrator',
  role: 'admin'
};

export const initializeAuth = () => {
  const usersStr = localStorage.getItem(KEYS.USERS);
  if (!usersStr) {
    localStorage.setItem(KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
  } else {
    // Ensure default admin always exists or restore it if deleted by accident (optional)
    const users: User[] = JSON.parse(usersStr);
    if (!users.find(u => u.username === DEFAULT_ADMIN.username)) {
        users.unshift(DEFAULT_ADMIN);
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  }
};

export const getUsers = (): User[] => {
  initializeAuth();
  try {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : [DEFAULT_ADMIN];
  } catch (e) {
    return [DEFAULT_ADMIN];
  }
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(KEYS.USERS, JSON.stringify(users));
};

export const login = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(user));
    logActivity('Đăng nhập', `Người dùng ${username} đăng nhập thành công`);
    return user;
  }
  return null;
};

export const logout = () => {
  const user = getCurrentUser();
  if (user) {
    logActivity('Đăng xuất', `Người dùng ${user.username} đăng xuất`);
  }
  localStorage.removeItem(KEYS.CURRENT_SESSION);
};

export const getCurrentUser = (): User | null => {
  try {
    const data = localStorage.getItem(KEYS.CURRENT_SESSION);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// --- EQUIPMENT ---

export const getEquipment = (): Equipment[] => {
  try {
    const data = localStorage.getItem(KEYS.EQUIPMENT);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load equipment", e);
    return [];
  }
};

export const saveEquipment = (items: Equipment[]) => {
  localStorage.setItem(KEYS.EQUIPMENT, JSON.stringify(items));
};

// --- QUOTES ---

export const getQuotes = (): Quotation[] => {
  try {
    const data = localStorage.getItem(KEYS.QUOTES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load quotes", e);
    return [];
  }
};

export const saveQuotes = (quotes: Quotation[]) => {
  localStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));
};

// --- SUPPLY REQUEST ---

export const getSupplyRequestItems = (): SupplyRequestItem[] => {
  try {
    const data = localStorage.getItem(KEYS.SUPPLY_REQUEST_ITEMS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveSupplyRequestItems = (items: SupplyRequestItem[]) => {
  localStorage.setItem(KEYS.SUPPLY_REQUEST_ITEMS, JSON.stringify(items));
};

export const getSupplyRequestMeta = (): SupplyRequestMetadata => {
  try {
    const data = localStorage.getItem(KEYS.SUPPLY_REQUEST_META);
    return data ? JSON.parse(data) : {
      createdDate: new Date().toISOString().split('T')[0],
      creatorName: '',
      departmentHead: '',
      boardApproval: 'Ban Tổng Giám Đốc'
    };
  } catch (e) {
    return {
       createdDate: new Date().toISOString().split('T')[0],
       creatorName: '',
       departmentHead: '',
       boardApproval: 'Ban Tổng Giám Đốc'
    };
  }
};

export const saveSupplyRequestMeta = (meta: SupplyRequestMetadata) => {
  localStorage.setItem(KEYS.SUPPLY_REQUEST_META, JSON.stringify(meta));
};

// --- ACTIVITY LOGS ---

export const getActivityLogs = (): ActivityLog[] => {
  try {
    const data = localStorage.getItem(KEYS.ACTIVITY_LOGS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveActivityLogs = (logs: ActivityLog[]) => {
  localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
};

export const logActivity = (action: string, details: string) => {
  const currentUser = getCurrentUser();
  const username = currentUser ? currentUser.username : 'System';
  
  const newLog: ActivityLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    username,
    action,
    details
  };
  
  const logs = getActivityLogs();
  // Keep last 1000 logs
  if (logs.length > 1000) {
      logs.pop();
  }
  logs.unshift(newLog);
  saveActivityLogs(logs);
};

export const clearAllData = () => {
  localStorage.removeItem(KEYS.EQUIPMENT);
  localStorage.removeItem(KEYS.QUOTES);
  localStorage.removeItem(KEYS.SUPPLY_REQUEST_ITEMS);
  localStorage.removeItem(KEYS.SUPPLY_REQUEST_META);
  localStorage.removeItem(KEYS.ACTIVITY_LOGS);
  // Do not clear users or session
};