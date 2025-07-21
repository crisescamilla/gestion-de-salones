// ✅ Gestor de servicios completo - Compatible con ServicesManager.tsx - TENANT AWARE
import type { Service, Product, ServiceCategory } from "../types"
import { emitEvent, AppEvents } from "./eventManager"
import { syncToSupabase, SyncDataType } from "./crossBrowserSync"
import { getServicesFromSupabase, saveServiceToSupabase, deleteServiceFromSupabase } from './servicesSupabase';
import { v4 as uuidv4 } from 'uuid';

// Interfaces para el historial de precios
interface PriceHistory {
  id: string
  serviceId: string
  oldPrice: number
  newPrice: number
  changedBy: string
  changedAt: string
  reason?: string
}

interface ServicesStatistics {
  activeServices: number
  activeProducts: number
  avgServicePrice: number
  recentPriceChanges: number
}

// Función para obtener la clave de almacenamiento específica del tenant
const getTenantStorageKey = (key: string, tenantId?: string): string => {
  // Si no se proporciona tenantId, intentar obtenerlo del contexto actual
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage()
    tenantId = currentTenant?.id
  }

  if (!tenantId) {
    console.warn("⚠️ No tenant ID available for saving service")
    return key // Fallback para compatibilidad
  }

  return `tenant-${tenantId}-${key}`
}

// Función auxiliar para obtener el tenant actual del localStorage
const getCurrentTenantFromStorage = () => {
  try {
    const stored = localStorage.getItem("beauty-app-current-tenant")
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// Datos de ejemplo de servicios (se inicializarán por tenant)
const getDefaultServices = (): Service[] => [
  {
    id: uuidv4(),
    name: "Corte de Cabello",
    description: "Corte profesional personalizado",
    price: 25,
    duration: 45,
    category: "servicios-cabello",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Manicure",
    description: "Cuidado completo de uñas",
    price: 20,
    duration: 60,
    category: "servicios-unas",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Facial Hidratante",
    description: "Tratamiento facial profundo",
    price: 45,
    duration: 90,
    category: "tratamientos-faciales",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Masaje Relajante",
    description: "Masaje corporal completo",
    price: 60,
    duration: 60,
    category: "masajes",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Datos de ejemplo de productos (se inicializarán por tenant)
const getDefaultProducts = (): Product[] => [
  {
    id: "1",
    name: "Shampoo Hidratante",
    description: "Shampoo para cabello seco",
    price: 15,
    brand: "L'Oréal",
    category: "cabello",
    stock: 25,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Crema Facial Anti-edad",
    description: "Crema con retinol para anti-envejecimiento",
    price: 35,
    brand: "Neutrogena",
    category: "facial",
    stock: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Cache para servicios
let servicesCache: Map<string, Service[]> = new Map();
let servicesCacheTimestamp: Map<string, number> = new Map();
const SERVICES_CACHE_DURATION = 5000; // 5 segundos

// ✅ Funciones principales para servicios - TENANT AWARE
export const getServices = async (tenantId?: string): Promise<Service[]> => {
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage();
    tenantId = currentTenant?.id;
  }
  if (!tenantId) {
    console.warn('⚠️ No tenant ID available for services data');
    return [];
  }

  // Siempre consulta Supabase
  const remoteServices = await getServicesFromSupabase(tenantId);
  if (remoteServices && remoteServices.length > 0) {
    localStorage.setItem(getTenantStorageKey("services", tenantId), JSON.stringify(remoteServices));
    return remoteServices;
  }

  return [];
};

// Obtener solo los servicios activos desde Supabase
export const getActiveServices = async (tenantId?: string): Promise<Service[]> => {
  const services = await getServices(tenantId);
  return services.filter((service) => service.isActive !== false);
};

// Guardar (insertar/actualizar) un servicio en Supabase
export const saveService = async (service: Service, changedBy: string, tenantId?: string): Promise<boolean> => {
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage();
    tenantId = currentTenant?.id;
  }
  if (!tenantId) {
    console.warn('⚠️ No tenant ID available for saving service');
    return false;
  }
  return await saveServiceToSupabase(service, tenantId);
};

// Crear un nuevo servicio en Supabase
export const createService = async (
  serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string,
  tenantId?: string
): Promise<Service | null> => {
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage();
    tenantId = currentTenant?.id;
  }
  if (!tenantId) {
    console.warn('⚠️ No tenant ID available for creating service');
    return null;
  }
  const newService: Service = {
    ...serviceData,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isActive: true,
  };
  const ok = await saveServiceToSupabase(newService, tenantId);
  return ok ? newService : null;
};

// Eliminar un servicio en Supabase
export const deleteService = async (serviceId: string, deletedBy: string, tenantId?: string): Promise<boolean> => {
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage();
    tenantId = currentTenant?.id;
  }
  if (!tenantId) {
    console.warn('⚠️ No tenant ID available for deleting service');
    return false;
  }
  return await deleteServiceFromSupabase(serviceId, tenantId);
};

// ✅ Funciones principales para productos - TENANT AWARE
export const getProducts = (tenantId?: string): Product[] => {
  try {
    const storageKey = getTenantStorageKey("products", tenantId)
    const stored = localStorage.getItem(storageKey)

    if (stored) {
      return JSON.parse(stored)
    } else {
      // Inicializar con productos por defecto para este tenant
      const defaultProducts = getDefaultProducts()
      localStorage.setItem(storageKey, JSON.stringify(defaultProducts))
      return defaultProducts
    }
  } catch (error) {
    console.error("Error loading products:", error)
    return getDefaultProducts()
  }
}

export const saveProduct = (product: Product, changedBy: string, tenantId?: string): void => {
  try {
    const storageKey = getTenantStorageKey("products", tenantId)
    const products = getProducts(tenantId)
    const existingIndex = products.findIndex((p) => p.id === product.id)

    if (existingIndex >= 0) {
      products[existingIndex] = { ...product, updatedAt: new Date().toISOString() }
    } else {
      products.push(product)
    }

    localStorage.setItem(storageKey, JSON.stringify(products))

    // ✅ Emitir evento
    emitEvent(AppEvents.PRODUCT_UPDATED, {
      product,
      changedBy,
      tenantId: tenantId || getCurrentTenantFromStorage()?.id,
      timestamp: new Date().toISOString(),
    })

    console.log(`✅ Product saved for tenant ${tenantId || "current"}:`, product.id)
  } catch (error) {
    console.error("Error saving product:", error)
    throw error
  }
}

export const createProduct = (
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
  tenantId?: string,
): Product => {
  try {
    const newProduct: Product = {
      ...productData,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const storageKey = getTenantStorageKey("products", tenantId)
    const products = getProducts(tenantId)
    products.push(newProduct)
    localStorage.setItem(storageKey, JSON.stringify(products))

    // ✅ Emitir evento
    emitEvent(AppEvents.PRODUCT_CREATED, {
      product: newProduct,
      createdBy,
      tenantId: tenantId || getCurrentTenantFromStorage()?.id,
      timestamp: new Date().toISOString(),
    })

    console.log(`✅ Product created for tenant ${tenantId || "current"}:`, newProduct.id)
    return newProduct
  } catch (error) {
    console.error("Error creating product:", error)
    throw error
  }
}

export const deleteProduct = (productId: string, deletedBy: string, tenantId?: string): void => {
  try {
    const storageKey = getTenantStorageKey("products", tenantId)
    const products = getProducts(tenantId)
    const productToDelete = products.find((p) => p.id === productId)

    if (productToDelete) {
      const filteredProducts = products.filter((p) => p.id !== productId)
      localStorage.setItem(storageKey, JSON.stringify(filteredProducts))

      // ✅ Emitir evento
      emitEvent(AppEvents.PRODUCT_DELETED, {
        product: productToDelete,
        deletedBy,
        tenantId: tenantId || getCurrentTenantFromStorage()?.id,
        timestamp: new Date().toISOString(),
      })

      console.log(`🗑️ Product deleted for tenant ${tenantId || "current"}:`, productId)
    }
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// ✅ Funciones para estadísticas - TENANT AWARE
export const getServicesStatistics = async (tenantId?: string): Promise<ServicesStatistics> => {
  try {
    const services = await getServices(tenantId);
    const products = getProducts(tenantId);
    const priceHistory = getPriceHistory(tenantId);

    const activeServices = services.filter((s) => s.isActive !== false).length;
    const activeProducts = products.filter((p) => p.isActive !== false).length;

    const totalServicePrice = services
      .filter((s) => s.isActive !== false)
      .reduce((sum, service) => sum + service.price, 0);
    const avgServicePrice = activeServices > 0 ? totalServicePrice / activeServices : 0;

    // Cambios de precio en los últimos 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentPriceChanges = priceHistory.filter((history) => new Date(history.changedAt) > sevenDaysAgo).length;

    return {
      activeServices,
      activeProducts,
      avgServicePrice,
      recentPriceChanges,
    };
  } catch (error) {
    console.error("Error getting services statistics:", error);
    return {
      activeServices: 0,
      activeProducts: 0,
      avgServicePrice: 0,
      recentPriceChanges: 0,
    };
  }
};

// ✅ Funciones para historial de precios - TENANT AWARE
export const getPriceHistory = (tenantId?: string): PriceHistory[] => {
  try {
    const storageKey = getTenantStorageKey("priceHistory", tenantId)
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Error loading price history:", error)
    return []
  }
}

export const savePriceHistory = (history: PriceHistory, tenantId?: string): void => {
  try {
    const storageKey = getTenantStorageKey("priceHistory", tenantId)
    const priceHistory = getPriceHistory(tenantId)
    priceHistory.push(history)

    // Mantener solo los últimos 1000 registros
    if (priceHistory.length > 1000) {
      priceHistory.splice(0, priceHistory.length - 1000)
    }

    localStorage.setItem(storageKey, JSON.stringify(priceHistory))
  } catch (error) {
    console.error("Error saving price history:", error)
  }
}

export const getServicePriceHistory = (serviceId: string, tenantId?: string): PriceHistory[] => {
  try {
    const priceHistory = getPriceHistory(tenantId)
    return priceHistory
      .filter((history) => history.serviceId === serviceId)
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  } catch (error) {
    console.error("Error getting service price history:", error)
    return []
  }
}

// ✅ Función para actualización masiva de precios - TENANT AWARE
export const bulkUpdatePrices = async (
  updates: { serviceId: string; newPrice: number }[],
  changedBy: string,
  tenantId?: string,
): Promise<void> => {
  try {
    const storageKey = getTenantStorageKey("services", tenantId);
    const services = await getServices(tenantId);

    updates.forEach(({ serviceId, newPrice }) => {
      const serviceIndex = services.findIndex((s) => s.id === serviceId);
      if (serviceIndex >= 0) {
        const oldPrice = services[serviceIndex].price;

        // Registrar cambio de precio
        savePriceHistory(
          {
            id: Date.now().toString() + Math.random(),
            serviceId,
            oldPrice,
            newPrice,
            changedBy,
            changedAt: new Date().toISOString(),
            reason: "Actualización masiva",
          },
          tenantId,
        );

        // Actualizar precio
        services[serviceIndex] = {
          ...services[serviceIndex],
          price: newPrice,
          updatedAt: new Date().toISOString(),
        };
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(services));

    // Invalidar caché
    if (tenantId) {
      servicesCache.delete(tenantId);
      servicesCacheTimestamp.delete(tenantId);
    }

    // ✅ Emitir evento
    emitEvent(AppEvents.BULK_PRICE_UPDATE, {
      updates,
      changedBy,
      tenantId: tenantId || getCurrentTenantFromStorage()?.id,
      timestamp: new Date().toISOString(),
    });

    // Sincronizar con Supabase para compartir entre navegadores
    syncToSupabase(SyncDataType.SERVICES);

    console.log(`✅ Bulk price update completed for tenant ${tenantId || "current"}:`, updates.length, "services");
  } catch (error) {
    console.error("Error in bulk price update:", error);
    throw error;
  }
};

// ✅ Funciones de utilidad adicionales - TENANT AWARE
export const getServiceById = async (serviceId: string, tenantId?: string): Promise<Service | null> => {
  try {
    const services = await getServices(tenantId);
    return services.find((service) => service.id === serviceId) || null;
  } catch (error) {
    console.error("Error getting service by ID:", error);
    return null;
  }
};

export const getProductById = (productId: string, tenantId?: string): Product | null => {
  try {
    const products = getProducts(tenantId)
    return products.find((product) => product.id === productId) || null
  } catch (error) {
    console.error("Error getting product by ID:", error)
    return null
  }
}

export const getServicesByCategory = async (category: ServiceCategory, tenantId?: string): Promise<Service[]> => {
  const services = await getServices(tenantId);
  return services.filter((service) => service.category === category && service.isActive !== false)
}

export const searchServices = async (query: string, tenantId?: string): Promise<Service[]> => {
  try {
    const services = await getServices(tenantId);
    const lowercaseQuery = query.toLowerCase()

    return services.filter(
      (service) =>
        service.isActive !== false &&
        (service.name.toLowerCase().includes(lowercaseQuery) ||
          service.description.toLowerCase().includes(lowercaseQuery)),
    )
  } catch (error) {
    console.error("Error searching services:", error)
    return []
  }
}

export const searchProducts = (query: string, tenantId?: string): Product[] => {
  try {
    const products = getProducts(tenantId)
    const lowercaseQuery = query.toLowerCase()

    return products.filter(
      (product) =>
        product.isActive !== false &&
        (product.name.toLowerCase().includes(lowercaseQuery) ||
          product.description.toLowerCase().includes(lowercaseQuery) ||
          product.brand.toLowerCase().includes(lowercaseQuery)),
    )
  } catch (error) {
    console.error("Error searching products:", error)
    return []
  }
}

// ✅ Hook para usar servicios con contexto de tenant
export const useServicesManager = () => {
  const currentTenant = getCurrentTenantFromStorage()
  const tenantId = currentTenant?.id

  return {
    // Servicios
    getServices: () => getServices(tenantId),
    getActiveServices: () => getActiveServices(tenantId),
    saveService: (service: Service, changedBy: string) => saveService(service, changedBy, tenantId),
    createService: (serviceData: Omit<Service, "id" | "createdAt" | "updatedAt">, createdBy: string) =>
      createService(serviceData, createdBy, tenantId),
    deleteService: (serviceId: string, deletedBy: string) => deleteService(serviceId, deletedBy, tenantId),

    // Productos
    getProducts: () => getProducts(tenantId),
    saveProduct: (product: Product, changedBy: string) => saveProduct(product, changedBy, tenantId),
    createProduct: (productData: Omit<Product, "id" | "createdAt" | "updatedAt">, createdBy: string) =>
      createProduct(productData, createdBy, tenantId),
    deleteProduct: (productId: string, deletedBy: string) => deleteProduct(productId, deletedBy, tenantId),

    // Estadísticas y utilidades
    getServicesStatistics: () => getServicesStatistics(tenantId),
    getPriceHistory: () => getPriceHistory(tenantId),
    getServicePriceHistory: (serviceId: string) => getServicePriceHistory(serviceId, tenantId),
    bulkUpdatePrices: (updates: { serviceId: string; newPrice: number }[], changedBy: string) =>
      bulkUpdatePrices(updates, changedBy, tenantId),

    // Búsquedas
    getServiceById: (serviceId: string) => getServiceById(serviceId, tenantId),
    getProductById: (productId: string) => getProductById(productId, tenantId),
    getServicesByCategory: (category: ServiceCategory) => getServicesByCategory(category, tenantId),
    searchServices: (query: string) => searchServices(query, tenantId),
    searchProducts: (query: string) => searchProducts(query, tenantId),

    // Info del tenant
    tenantId,
    currentTenant,
  }
}

// ✅ Función para limpiar caché de servicios
export const clearServicesCache = (tenantId?: string): void => {
  if (tenantId) {
    servicesCache.delete(tenantId);
    servicesCacheTimestamp.delete(tenantId);
    console.log(`🧹 Services cache cleared for tenant: ${tenantId}`);
  } else {
    servicesCache.clear();
    servicesCacheTimestamp.clear();
    console.log("🧹 All services cache cleared");
  }
}

// ✅ Función para debugging
export const debugServicesData = async (tenantId?: string): Promise<void> => {
  // Si no se proporciona tenantId, intentar obtenerlo del contexto actual
  if (!tenantId) {
    const currentTenant = getCurrentTenantFromStorage();
    tenantId = currentTenant?.id;
  }

  console.log("🔍 === SERVICES DEBUG ===");
  console.log("Current tenant ID:", tenantId || "No tenant");

  if (tenantId) {
    console.log("Cache status for tenant:", tenantId, {
      hasCacheData: servicesCache.has(tenantId),
      cacheAge: servicesCache.has(tenantId) ? Date.now() - (servicesCacheTimestamp.get(tenantId) || 0) : "No cache",
      cacheSize: servicesCache.get(tenantId)?.length || 0,
    });

    const storageKey = getTenantStorageKey("services", tenantId);
    const localStorageData = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    console.log("LocalStorage status for tenant:", tenantId, {
      hasData: !!localStorageData,
      dataSize: localStorageData ? JSON.parse(localStorageData).length : 0,
      storageKey
    });

    const currentData = await getServices(tenantId);
    console.log("Current services data for tenant:", tenantId, {
      total: currentData.length,
      active: currentData.filter((s) => s.isActive !== false).length,
      names: currentData.map((s) => s.name),
    });
  }

  // Mostrar todos los tenants con datos en caché
  console.log("All tenants with cached services data:", {
    tenantIds: Array.from(servicesCache.keys()),
    totalCachedTenants: servicesCache.size
  });

  console.log("🔍 === END DEBUG ===");
}

// ✅ Hacer funciones disponibles globalmente para debugging
if (typeof window !== "undefined") {
  const w = window as any;
  w.debugServicesData = debugServicesData;
  w.clearServicesCache = clearServicesCache;
  w.getTenantStorageKey = getTenantStorageKey;
}