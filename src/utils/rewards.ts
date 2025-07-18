import { RewardCoupon, RewardHistory, RewardSettings, AdminNotification } from '../types';
import { getClients, getAppointments, saveClient } from './storage';
import { getCurrentTenant } from './tenantManager';

const STORAGE_KEYS = {
  REWARD_COUPONS: 'beauty-salon-reward-coupons',
  REWARD_HISTORY: 'beauty-salon-reward-history',
  REWARD_SETTINGS: 'beauty-salon-reward-settings',
  ADMIN_NOTIFICATIONS: 'beauty-salon-admin-notifications'
};

// Get tenant-specific storage key
const getTenantStorageKey = (key: string): string => {
  const tenant = getCurrentTenant();
  if (tenant) {
    return `tenant-${tenant.id}-${key}`;
  }
  return key; // Fallback to legacy key for backward compatibility
};

// Default reward settings
const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  id: '1',
  spendingThreshold: 5000,
  discountPercentage: 20,
  couponValidityDays: 30,
  isActive: true,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system'
};

// Generate unique coupon code
const generateCouponCode = (): string => {
  const tenant = getCurrentTenant();
  const prefix = tenant ? tenant.slug.substring(0, 4).toUpperCase() : 'BELLA';
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${randomPart}`;
};

// Get reward settings
export const getRewardSettings = (): RewardSettings => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.REWARD_SETTINGS));
  return stored ? JSON.parse(stored) : DEFAULT_REWARD_SETTINGS;
};

// Save reward settings
export const saveRewardSettings = (settings: RewardSettings): void => {
  localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.REWARD_SETTINGS), JSON.stringify(settings));
};

// Get reward coupons
export const getRewardCoupons = (): RewardCoupon[] => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.REWARD_COUPONS));
  return stored ? JSON.parse(stored) : [];
};

// Save reward coupon
export const saveRewardCoupon = (coupon: RewardCoupon): void => {
  const coupons = getRewardCoupons();
  const existingIndex = coupons.findIndex(c => c.id === coupon.id);
  
  if (existingIndex >= 0) {
    coupons[existingIndex] = coupon;
  } else {
    coupons.push(coupon);
  }
  
  localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.REWARD_COUPONS), JSON.stringify(coupons));
};

// Get reward history
export const getRewardHistory = (): RewardHistory[] => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.REWARD_HISTORY));
  return stored ? JSON.parse(stored) : [];
};

// Save reward history
export const saveRewardHistory = (history: RewardHistory): void => {
  const histories = getRewardHistory();
  histories.push(history);
  localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.REWARD_HISTORY), JSON.stringify(histories));
};

// Get admin notifications
export const getAdminNotifications = (): AdminNotification[] => {
  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEYS.ADMIN_NOTIFICATIONS));
  return stored ? JSON.parse(stored) : [];
};

// Save admin notification
export const saveAdminNotification = (notification: AdminNotification): void => {
  const notifications = getAdminNotifications();
  notifications.unshift(notification); // Add to beginning
  
  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications.splice(50);
  }
  
  localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.ADMIN_NOTIFICATIONS), JSON.stringify(notifications));
};

// Mark notification as read
export const markNotificationAsRead = (notificationId: string): void => {
  const notifications = getAdminNotifications();
  const notification = notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.isRead = true;
    localStorage.setItem(getTenantStorageKey(STORAGE_KEYS.ADMIN_NOTIFICATIONS), JSON.stringify(notifications));
  }
};

// Calculate client total spending
export const calculateClientTotalSpending = async (clientId: string): Promise<number> => {
  const appointments = await getAppointments();
  return appointments
    .filter(apt => apt.client_id === clientId && apt.status === 'completed')
    .reduce((total, apt) => total + (apt.total_price || 0), 0);
};

// Get client's available coupons
export const getClientAvailableCoupons = async (clientId: string): Promise<RewardCoupon[]> => {
  const coupons = getRewardCoupons();
  const now = new Date();
  return coupons.filter(coupon => 
    coupon.clientId === clientId &&
    !coupon.isUsed &&
    new Date(coupon.expiresAt) > now
  );
};

// Get client's reward history
export const getClientRewardHistory = async (clientId: string): Promise<RewardHistory[]> => {
  const history = getRewardHistory();
  return history
    .filter(h => h.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// Check if client qualifies for reward
export const checkClientRewardEligibility = async (clientId: string): Promise<boolean> => {
  const settings = getRewardSettings();
  if (!settings.isActive) return false;
  const totalSpent = await calculateClientTotalSpending(clientId);
  const existingCoupons = getRewardCoupons().filter(c => c.clientId === clientId);
  // Check if client has reached threshold and hasn't received a coupon for this threshold
  const hasReachedThreshold = totalSpent >= settings.spendingThreshold;
  const hasActiveCoupon = existingCoupons.some(c => !c.isUsed && new Date(c.expiresAt) > new Date());
  return hasReachedThreshold && !hasActiveCoupon;
};

// Generate reward coupon for client
export const generateRewardCoupon = async (clientId: string): Promise<RewardCoupon | null> => {
  const settings = getRewardSettings();
  const clients = await getClients();
  const client = clients.find(c => c.id === clientId);
  if (!client || !(await checkClientRewardEligibility(clientId))) {
    return null;
  }
  const totalSpent = await calculateClientTotalSpending(clientId);
  const coupon: RewardCoupon = {
    id: Date.now().toString(),
    clientId,
    code: generateCouponCode(),
    discountPercentage: settings.discountPercentage,
    isUsed: false,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + settings.couponValidityDays * 24 * 60 * 60 * 1000).toISOString(),
    triggerAmount: totalSpent
  };
  // Save coupon
  saveRewardCoupon(coupon);
  // Add to reward history
  const history: RewardHistory = {
    id: Date.now().toString() + '_history',
    clientId,
    type: 'coupon_generated',
    description: `Cupón de ${settings.discountPercentage}% generado por alcanzar $${settings.spendingThreshold} en compras`,
    amount: totalSpent,
    couponId: coupon.id,
    createdAt: new Date().toISOString()
  };
  saveRewardHistory(history);
  // Create admin notification
  const notification: AdminNotification = {
    id: Date.now().toString() + '_notification',
    type: 'reward_generated',
    title: '🎁 Nueva Recompensa Generada',
    message: `${client.fullName} ha alcanzado $${totalSpent.toLocaleString()} en compras y recibió un cupón del ${settings.discountPercentage}%`,
    clientId,
    couponId: coupon.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  saveAdminNotification(notification);
  // Update client total spent
  client.totalSpent = totalSpent;
  client.rewardsEarned = (client.rewardsEarned || 0) + 1;
  saveClient(client);
  return coupon;
};

// Use reward coupon
export const useRewardCoupon = (couponCode: string, appointmentId: string): { success: boolean; discount: number; error?: string } => {
  const coupons = getRewardCoupons();
  const coupon = coupons.find(c => c.code === couponCode && !c.isUsed);
  
  if (!coupon) {
    return { success: false, discount: 0, error: 'Cupón no válido o ya utilizado' };
  }
  
  if (new Date(coupon.expiresAt) < new Date()) {
    return { success: false, discount: 0, error: 'Cupón expirado' };
  }
  
  // Mark coupon as used
  coupon.isUsed = true;
  coupon.usedAt = new Date().toISOString();
  coupon.usedInAppointment = appointmentId;
  saveRewardCoupon(coupon);
  
  // Add to reward history
  const history: RewardHistory = {
    id: Date.now().toString(),
    clientId: coupon.clientId,
    type: 'coupon_used',
    description: `Cupón ${couponCode} utilizado (${coupon.discountPercentage}% descuento)`,
    amount: 0,
    couponId: coupon.id,
    createdAt: new Date().toISOString()
  };
  saveRewardHistory(history);
  
  return { success: true, discount: coupon.discountPercentage };
};

// Check and generate rewards for all clients
export const checkAllClientsForRewards = async (): Promise<RewardCoupon[]> => {
  const clients = await getClients();
  const newCoupons: RewardCoupon[] = [];
  for (const client of clients) {
    if (await checkClientRewardEligibility(client.id)) {
      const coupon = await generateRewardCoupon(client.id);
      if (coupon) {
        newCoupons.push(coupon);
      }
    }
  }
  return newCoupons;
};

// Get expired coupons
export const getExpiredCoupons = (): RewardCoupon[] => {
  const coupons = getRewardCoupons();
  const now = new Date();
  
  return coupons.filter(coupon => 
    !coupon.isUsed && 
    new Date(coupon.expiresAt) < now
  );
};

// Clean up expired coupons and notify
export const cleanupExpiredCoupons = async (): Promise<void> => {
  const expiredCoupons = getExpiredCoupons();
  const clients = await getClients();
  for (const coupon of expiredCoupons) {
    const client = clients.find(c => c.id === coupon.clientId);
    if (client) {
      const notification: AdminNotification = {
        id: Date.now().toString() + Math.random(),
        type: 'coupon_expired',
        title: '⏰ Cupón Expirado',
        message: `El cupón ${coupon.code} de ${client.fullName} ha expirado sin ser utilizado`,
        clientId: coupon.clientId,
        couponId: coupon.id,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      saveAdminNotification(notification);
    }
  }
};

// Get reward statistics
export const getRewardStatistics = async () => {
  const coupons = getRewardCoupons();
  const clients = await getClients();
  const totalCouponsGenerated = coupons.length;
  const totalCouponsUsed = coupons.filter(c => c.isUsed).length;
  const totalCouponsExpired = getExpiredCoupons().length;
  const totalCouponsActive = coupons.filter(c => !c.isUsed && new Date(c.expiresAt) > new Date()).length;
  const clientsWithRewards = clients.filter(c => c.rewardsEarned && c.rewardsEarned > 0).length;
  const totalRewardsValue = coupons
    .filter(c => c.isUsed)
    .reduce((total, c) => {
      const avgAppointmentCost = 500;
      return total + (avgAppointmentCost * (c.discountPercentage / 100));
    }, 0);
  return {
    totalCouponsGenerated,
    totalCouponsUsed,
    totalCouponsExpired,
    totalCouponsActive,
    clientsWithRewards,
    totalRewardsValue,
    usageRate: totalCouponsGenerated > 0 ? (totalCouponsUsed / totalCouponsGenerated) * 100 : 0
  };
};