import type { Tenant, TenantOwner, BusinessTypeConfig } from "../types/tenant"
import { createTenantAdmin } from "./auth"
import { migrateStaffDataToTenants } from "./staffDataManager"
import { supabase } from "./supabaseClient"
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEYS = {
  TENANTS: "beauty-app-tenants",
  TENANT_OWNERS: "beauty-app-tenant-owners",
  CURRENT_TENANT: "beauty-app-current-tenant",
  TENANT_DATA_PREFIX: "beauty-app-tenant-data-",
}

// UUID validation utility
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Clean invalid tenant data
const cleanInvalidTenantData = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TENANTS);
    if (!stored) return;

    const tenants = JSON.parse(stored);
    const validTenants = tenants.filter((tenant: Tenant) => {
      if (!isValidUUID(tenant.id) || !isValidUUID(tenant.ownerId)) {
        console.warn(`Removing invalid tenant with non-UUID ID: ${tenant.id}`);
        // Clean up associated data
        const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${tenant.id}`;
        localStorage.removeItem(tenantDataKey);
        return false;
      }
      return true;
    });

    if (validTenants.length !== tenants.length) {
      localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(validTenants));
      console.log(`Cleaned ${tenants.length - validTenants.length} invalid tenants`);
    }

    // Clean invalid owners
    const ownersStored = localStorage.getItem(STORAGE_KEYS.TENANT_OWNERS);
    if (ownersStored) {
      const owners = JSON.parse(ownersStored);
      const validOwners = owners.filter((owner: TenantOwner) => {
        if (!isValidUUID(owner.id)) {
          console.warn(`Removing invalid owner with non-UUID ID: ${owner.id}`);
          return false;
        }
        return true;
      });

      if (validOwners.length !== owners.length) {
        localStorage.setItem(STORAGE_KEYS.TENANT_OWNERS, JSON.stringify(validOwners));
        console.log(`Cleaned ${owners.length - validOwners.length} invalid owners`);
      }
    }

    // Clean current tenant if invalid
    const currentStored = localStorage.getItem(STORAGE_KEYS.CURRENT_TENANT);
    if (currentStored) {
      const currentTenant = JSON.parse(currentStored);
      if (!isValidUUID(currentTenant.id) || !isValidUUID(currentTenant.ownerId)) {
        console.warn(`Removing invalid current tenant with non-UUID ID: ${currentTenant.id}`);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        document.cookie = `current_tenant_slug=; path=/; max-age=0`;
      }
    }
  } catch (error) {
    console.error("Error cleaning invalid tenant data:", error);
  }
}

// Business type configurations
export const businessTypeConfigs: BusinessTypeConfig[] = [
  {
    id: "salon",
    name: "Salón de Belleza",
    description: "Servicios completos de belleza para cabello, uñas y tratamientos faciales",
    defaultServices: [
      { name: "Corte y Peinado", category: "servicios-cabello", duration: 45, price: 430 },
      { name: "Tinte Completo", category: "servicios-cabello", duration: 120, price: 600 },
      { name: "Manicure Clásica", category: "servicios-unas", duration: 30, price: 250 },
      { name: "Limpieza Facial", category: "tratamientos-faciales", duration: 60, price: 400 },
    ],
    defaultColors: { primary: "#ec4899", secondary: "#3b82f6" },
    features: ["Gestión de citas", "Personal especializado", "Inventario", "Reportes"],
  },
  {
    id: "barberia",
    name: "Barbería",
    description: "Servicios especializados en cortes masculinos y cuidado de barba",
    defaultServices: [
      { name: "Corte Clásico", category: "servicios-cabello", duration: 30, price: 200 },
      { name: "Corte + Barba", category: "servicios-cabello", duration: 45, price: 300 },
      { name: "Afeitado Tradicional", category: "servicios-cabello", duration: 25, price: 150 },
      { name: "Arreglo de Cejas", category: "tratamientos-faciales", duration: 15, price: 80 },
    ],
    defaultColors: { primary: "#374151", secondary: "#f59e0b" },
    features: ["Gestión de citas", "Servicios masculinos", "Productos especializados"],
  },
  {
    id: "spa",
    name: "Spa",
    description: "Centro de relajación y bienestar con tratamientos corporales",
    defaultServices: [
      { name: "Masaje Relajante", category: "masajes", duration: 60, price: 750 },
      { name: "Facial Anti-edad", category: "tratamientos-faciales", duration: 75, price: 550 },
      { name: "Exfoliación Corporal", category: "tratamientos-corporales", duration: 45, price: 350 },
      { name: "Tratamiento Reafirmante", category: "tratamientos-corporales", duration: 90, price: 450 },
    ],
    defaultColors: { primary: "#059669", secondary: "#06b6d4" },
    features: ["Tratamientos de lujo", "Ambiente relajante", "Terapias especializadas"],
  },
  {
    id: "unas",
    name: "Centro de Uñas",
    description: "Especialistas en manicure, pedicure y nail art",
    defaultServices: [
      { name: "Manicure Clásica", category: "servicios-unas", duration: 30, price: 250 },
      { name: "Pedicure Spa", category: "servicios-unas", duration: 45, price: 450 },
      { name: "Uñas de Gel", category: "servicios-unas", duration: 60, price: 550 },
      { name: "Nail Art", category: "servicios-unas", duration: 90, price: 700 },
    ],
    defaultColors: { primary: "#3b82f6", secondary: "#ec4899" },
    features: ["Diseños personalizados", "Productos premium", "Técnicas avanzadas"],
  },
  {
    id: "centro-bienestar",
    name: "Centro de Bienestar",
    description: "Servicios integrales de salud, belleza y relajación",
    defaultServices: [
      { name: "Masaje Terapéutico", category: "masajes", duration: 60, price: 600 },
      { name: "Tratamiento Facial", category: "tratamientos-faciales", duration: 60, price: 400 },
      { name: "Depilación Láser", category: "tratamientos-corporales", duration: 30, price: 300 },
      { name: "Consulta Nutricional", category: "tratamientos-corporales", duration: 45, price: 250 },
    ],
    defaultColors: { primary: "#10b981", secondary: "#3b82f6" },
    features: ["Servicios integrales", "Profesionales certificados", "Enfoque holístico"],
  },
]

// Negocios de demostración para Netlify
const DEMO_TENANTS: Tenant[] = [
  {
    id: uuidv4(),
    name: "Bella Vita Spa",
    slug: "bella-vita-spa",
    businessType: "salon",
    primaryColor: "#ec4899",
    secondaryColor: "#3b82f6",
    address: "Av. Revolución 1234, Zona Centro, Tijuana, BC 22000, México",
    phone: "664-563-6423",
    email: "info@bellavitaspa.com",
    website: "https://bellavitaspa.com",
    description: "Tu destino de belleza y relajación en Tijuana",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: uuidv4(),
    subscription: {
      plan: "premium",
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    settings: {
      allowOnlineBooking: true,
      requireApproval: false,
      timeZone: "America/Tijuana",
      currency: "MXN",
      language: "es",
    },
  },
  {
    id: uuidv4(),
    name: "Centro de Belleza y Relajación",
    slug: "centro-de-belleza-y-relajacion",
    businessType: "spa",
    primaryColor: "#059669",
    secondaryColor: "#06b6d4",
    address: "Blvd. Agua Caliente 4500, Chapultepec, Tijuana, BC 22420, México",
    phone: "664-123-4567",
    email: "info@centrobelleza.com",
    website: "https://centrobelleza.com",
    description: "Experiencia premium en tratamientos de belleza y spa",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: uuidv4(),
    subscription: {
      plan: "premium",
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    settings: {
      allowOnlineBooking: true,
      requireApproval: false,
      timeZone: "America/Tijuana",
      currency: "MXN",
      language: "es",
    },
  },
  {
    id: uuidv4(),
    name: "El León Barbón VIP",
    slug: "el-leon-barbon-vip",
    businessType: "barberia",
    primaryColor: "#374151",
    secondaryColor: "#f59e0b",
    address: "Calle 5ta 789, Zona Centro, Tijuana, BC 22000, México",
    phone: "664-987-6543",
    email: "info@leonbarbon.com",
    website: "https://leonbarbon.com",
    description: "Barbería tradicional con toques modernos",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: uuidv4(),
    subscription: {
      plan: "basic",
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    settings: {
      allowOnlineBooking: true,
      requireApproval: false,
      timeZone: "America/Tijuana",
      currency: "MXN",
      language: "es",
    },
  },
];

// Propietarios de demostración para Netlify
const DEMO_OWNERS: TenantOwner[] = [];

// Create tenant in Supabase database - EXPORTED for direct access
export const createTenantInSupabase = async (tenant: Tenant): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping tenant creation');
      return false;
    }
    
    const { error } = await supabase
      .from('tenants')
      .upsert([{
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        business_type: tenant.businessType,
        logo: tenant.logo || null,
        primary_color: tenant.primaryColor || null,
        secondary_color: tenant.secondaryColor || null,
        address: tenant.address || null,
        phone: tenant.phone || null,
        email: tenant.email || null,
        website: tenant.website || null,
        description: tenant.description || null,
        is_active: tenant.isActive,
        created_at: tenant.createdAt,
        updated_at: tenant.updatedAt,
        owner_id: tenant.ownerId,
        subscription: tenant.subscription || null,
        settings: tenant.settings || null
      }], {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error creating tenant in Supabase:', error);
      return false;
    }

    console.log('Tenant created successfully in Supabase:', tenant.name);
    return true;
  } catch (error) {
    console.error('Error in createTenantInSupabase:', error);
    return false;
  }
};

// Create tenant owner in Supabase database - EXPORTED for direct access
export const createTenantOwnerInSupabase = async (owner: TenantOwner): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping owner creation');
      return false;
    }
    
    const { error } = await supabase
      .from('tenant_owners')
      .upsert([{
        id: owner.id,
        email: owner.email,
        first_name: owner.first_name,
        last_name: owner.last_name,
        password_hash: owner.password_hash,
        created_at: owner.created_at
      }], {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error creating tenant owner in Supabase:', error);
      return false;
    }

    console.log('Tenant owner created successfully in Supabase:', owner.email);
    return true;
  } catch (error) {
    console.error('Error in createTenantOwnerInSupabase:', error);
    return false;
  }
};

// Test Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data: _data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.warn('⚠️ Supabase connection test failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('⚠️ Supabase connection test error:', error);
    return false;
  }
};

// Ensure tenant exists in Supabase - EXPORTED for direct access
export const ensureTenantExistsInSupabase = async (tenantId: string): Promise<boolean> => {
  try {
    // Test connection first
    const isConnected = await testSupabaseConnection();
    if (!isConnected) {
      console.warn('⚠️ No connection to Supabase, skipping tenant check');
      return false;
    }
    
    // Check if tenant exists in Supabase
    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid PGRST116 error

    if (error) {
      console.error('Error checking tenant existence in Supabase:', error);
      return false;
    }

    if (data) {
      // Tenant already exists
      return true;
    }

    // Tenant doesn't exist, try to create it
    const tenant = getTenantById(tenantId);
    if (!tenant) {
      console.error('Tenant not found locally:', tenantId);
      return false;
    }

    // Also ensure owner exists
    const owner = getTenantOwnerById(tenant.ownerId);
    if (owner) {
      await createTenantOwnerInSupabase(owner);
    }

    return await createTenantInSupabase(tenant);
  } catch (error) {
    console.error('Error in ensureTenantExistsInSupabase:', error);
    return false;
  }
};

// Generate unique slug
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .trim()
}

// Inicializar datos de demostración si estamos en Netlify
const initializeDemoData = async () => {
  // Clean any invalid data first
  cleanInvalidTenantData();
  
  // Verificar si estamos en Netlify
  const isNetlify = typeof window !== 'undefined' && 
                    (window.location.hostname.includes('netlify.app') || 
                     window.location.hostname.includes('registro-de-negocio'));
  
  if (!isNetlify) return; // Esto previene la inicialización en local
  
  // Verificar si ya tenemos datos válidos
  const stored = localStorage.getItem(STORAGE_KEYS.TENANTS);
  const existingTenants = stored ? JSON.parse(stored) : [];
  
  // Filtrar tenants válidos
  const validTenants = existingTenants.filter((tenant: Tenant) => 
    isValidUUID(tenant.id) && isValidUUID(tenant.ownerId)
  );
  
  // Si no hay datos válidos o hay menos de 3 tenants válidos, inicializar con datos de demostración
  if (!validTenants.length || validTenants.length < 3) {
    console.log("Inicializando datos de demostración para Netlify...");
    
    // Guardar propietarios de demostración
    localStorage.setItem(STORAGE_KEYS.TENANT_OWNERS, JSON.stringify(DEMO_OWNERS));
    
    // Guardar negocios de demostración
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(DEMO_TENANTS));
    
    // Crear tenants y owners en Supabase
    for (const owner of DEMO_OWNERS) {
      await createTenantOwnerInSupabase(owner);
    }
    
    for (const tenant of DEMO_TENANTS) {
      await createTenantInSupabase(tenant);
      initializeTenantData(tenant.id, tenant.businessType);
    }
    
    console.log("Datos de demostración inicializados correctamente");
  } else {
    // Ensure existing tenants exist in Supabase
    for (const tenant of validTenants) {
      await ensureTenantExistsInSupabase(tenant.id);
    }
  }
};

// Check if slug is available
export const isSlugAvailable = (slug: string, excludeTenantId?: string): boolean => {
  const tenants = getTenants()
  return !tenants.some((t) => t.slug === slug && t.id !== excludeTenantId)
}

// Get all tenants
export const getTenants = (): Tenant[] => {
  cleanInvalidTenantData();
  // No inicializar datos demo en local, solo en Netlify (ya está controlado en initializeDemoData)
  // initializeDemoData(); // <-- NO LLAMAR AQUÍ
  const stored = localStorage.getItem(STORAGE_KEYS.TENANTS)
  const tenants = stored ? JSON.parse(stored) : []
  // Filter out any tenants with invalid UUIDs
  return tenants.filter((tenant: Tenant) => 
    isValidUUID(tenant.id) && isValidUUID(tenant.ownerId)
  )
}

// Get tenant by slug
export const getTenantBySlug = (slug: string): Tenant | null => {
  // Clean invalid data first
  cleanInvalidTenantData();
  // No inicializar datos demo en local, solo en Netlify (ya está controlado en initializeDemoData)
  // initializeDemoData(); // <-- NO LLAMAR AQUÍ
  const tenants = getTenants()
  const tenant = tenants.find((t) => t.slug === slug && t.isActive) || null
  // Validate UUID before returning
  if (tenant && (!isValidUUID(tenant.id) || !isValidUUID(tenant.ownerId))) {
    console.warn(`Tenant ${tenant.name} has invalid UUID, removing from storage`);
    // Remove invalid tenant
    const validTenants = tenants.filter(t => t.id !== tenant.id);
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(validTenants));
    return null;
  }
  return tenant
}

// Get tenant by ID
export const getTenantById = (tenantId: string): Tenant | null => {
  // Validate input UUID first
  if (!isValidUUID(tenantId)) {
    console.warn(`Invalid UUID provided to getTenantById: ${tenantId}`);
    return null;
  }
  
  const tenants = getTenants()
  const tenant = tenants.find((t) => t.id === tenantId) || null
  
  // Double-check UUID validity
  if (tenant && (!isValidUUID(tenant.id) || !isValidUUID(tenant.ownerId))) {
    console.warn(`Tenant ${tenant.name} has invalid UUID, removing from storage`);
    return null;
  }
  
  return tenant
}

// Save tenant
export const saveTenant = async (tenant: Tenant): Promise<void> => {
  // Validate UUIDs before saving
  if (!isValidUUID(tenant.id) || !isValidUUID(tenant.ownerId)) {
    console.error(`Cannot save tenant with invalid UUID: id=${tenant.id}, ownerId=${tenant.ownerId}`);
    return;
  }
  
  const tenants = getTenants()
  const existingIndex = tenants.findIndex((t) => t.id === tenant.id)

  if (existingIndex >= 0) {
    tenants[existingIndex] = { ...tenant, updatedAt: new Date().toISOString() }
  } else {
    tenants.push(tenant)
  }

  localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants))
  
  // Ensure tenant exists in Supabase
  await ensureTenantExistsInSupabase(tenant.id);
  
  // Si este tenant es el actual, actualizar también el tenant actual
  const currentTenant = getCurrentTenant();
  if (currentTenant && currentTenant.id === tenant.id) {
    setCurrentTenant(tenant);
  }
}

// Delete tenant (soft delete by setting isActive to false)
export const deleteTenant = (tenantId: string): boolean => {
  // Validate input UUID
  if (!isValidUUID(tenantId)) {
    console.warn(`Invalid UUID provided to deleteTenant: ${tenantId}`);
    return false;
  }
  
  try {
    const tenants = getTenants()
    const tenantIndex = tenants.findIndex((t) => t.id === tenantId)

    if (tenantIndex === -1) {
      return false // Tenant not found
    }

    // Soft delete - set isActive to false
    tenants[tenantIndex].isActive = false
    tenants[tenantIndex].updatedAt = new Date().toISOString()

    // Save updated tenants list
    localStorage.setItem(STORAGE_KEYS.TENANTS, JSON.stringify(tenants))

    // Clean up tenant-specific data
    const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${tenantId}`
    localStorage.removeItem(tenantDataKey)

    // Clean up tenant-specific storage keys
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes(`tenant-${tenantId}-`)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    return true
  } catch (error) {
    console.error("Error deleting tenant:", error)
    return false
  }
}

// Create new tenant with admin user
export const createTenant = async (
  tenantData: Omit<Tenant, "id" | "createdAt" | "updatedAt">,
  ownerId: string,
  ownerCredentials?: {
    firstName: string
    lastName: string
    email: string
    password: string
  },
): Promise<Tenant> => {
  // Validate owner UUID
  if (!isValidUUID(ownerId)) {
    throw new Error(`Invalid owner UUID: ${ownerId}`);
  }
  
  const tenant: Tenant = {
    ...tenantData,
    id: uuidv4(), // Use UUID instead of timestamp
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId,
  }

  await saveTenant(tenant)

  // Initialize tenant data storage
  initializeTenantData(tenant.id, tenantData.businessType)

  // Create admin user for this tenant if credentials provided
  if (ownerCredentials) {
    createTenantAdmin(tenant.id, ownerCredentials)
  }

  return tenant
}

// Initialize tenant-specific data
export const initializeTenantData = (tenantId: string, businessType: string): void => {
  // Validate tenant UUID
  if (!isValidUUID(tenantId)) {
    console.error(`Cannot initialize data for tenant with invalid UUID: ${tenantId}`);
    return;
  }
  
  const config = businessTypeConfigs.find((c) => c.id === businessType)
  if (!config) return

  const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${tenantId}`

  // Initialize with default services for business type
  const initialData = {
    services: config.defaultServices.map((service, index) => ({
      id: (index + 1).toString(),
      ...service,
      description: `Servicio de ${service.name.toLowerCase()}`,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    clients: [],
    appointments: [],
    staff: [],
    settings: {
      salonName: "",
      salonMotto: "Tu destino de belleza y relajación",
      updatedAt: new Date().toISOString(),
      updatedBy: "system",
    },
    themes: [],
    rewards: {
      settings: {
        id: "1",
        spendingThreshold: 5000,
        discountPercentage: 20,
        couponValidityDays: 30,
        isActive: true,
        updatedAt: new Date().toISOString(),
        updatedBy: "system",
      },
      coupons: [],
      history: [],
    },
  }

  localStorage.setItem(tenantDataKey, JSON.stringify(initialData))
}

// Get tenant-specific data
export const getTenantData = (tenantId: string, dataType: string): any => {
  // Validate tenant UUID
  if (!isValidUUID(tenantId)) {
    console.warn(`Invalid UUID provided to getTenantData: ${tenantId}`);
    return null;
  }
  
  const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${tenantId}`
  const stored = localStorage.getItem(tenantDataKey)

  if (!stored) return null

  const data = JSON.parse(stored)
  return data[dataType] || null
}

// Save tenant-specific data
export const saveTenantData = (tenantId: string, dataType: string, data: any): void => {
  // Validate tenant UUID
  if (!isValidUUID(tenantId)) {
    console.error(`Cannot save data for tenant with invalid UUID: ${tenantId}`);
    return;
  }
  
  const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${tenantId}`
  const stored = localStorage.getItem(tenantDataKey)

  const tenantData = stored ? JSON.parse(stored) : {}
  tenantData[dataType] = data

  localStorage.setItem(tenantDataKey, JSON.stringify(tenantData))
}

// Tenant owner management
export const getTenantOwners = (): TenantOwner[] => {
  // Clean invalid data first
  cleanInvalidTenantData();
  
  // Inicializar datos de demostración si es necesario
  initializeDemoData();
  
  const stored = localStorage.getItem(STORAGE_KEYS.TENANT_OWNERS)
  const owners = stored ? JSON.parse(stored) : []
  
  // Filter out any owners with invalid UUIDs
  return owners.filter((owner: TenantOwner) => isValidUUID(owner.id))
}

export const getTenantOwnerById = (ownerId: string): TenantOwner | null => {
  // Validate input UUID
  if (!isValidUUID(ownerId)) {
    console.warn(`Invalid UUID provided to getTenantOwnerById: ${ownerId}`);
    return null;
  }
  
  const owners = getTenantOwners()
  return owners.find((o) => o.id === ownerId) || null
}

export const getTenantOwnerByEmail = (email: string): TenantOwner | null => {
  const owners = getTenantOwners()
  const owner = owners.find((o) => o.email.toLowerCase() === email.toLowerCase()) || null
  
  // Validate UUID before returning
  if (owner && !isValidUUID(owner.id)) {
    console.warn(`Owner ${owner.email} has invalid UUID, removing from storage`);
    return null;
  }
  
  return owner
}

export const saveTenantOwner = async (owner: TenantOwner): Promise<void> => {
  // Validate UUID before saving
  if (!isValidUUID(owner.id)) {
    console.error(`Cannot save owner with invalid UUID: ${owner.id}`);
    return;
  }
  
  const owners = getTenantOwners()
  const existingIndex = owners.findIndex((o) => o.id === owner.id)

  if (existingIndex >= 0) {
    owners[existingIndex] = owner
  } else {
    owners.push(owner)
  }

  localStorage.setItem(STORAGE_KEYS.TENANT_OWNERS, JSON.stringify(owners))
  
  // Ensure owner exists in Supabase
  await createTenantOwnerInSupabase(owner);
}

// Current tenant context
export const getCurrentTenant = (): Tenant | null => {
  // Clean invalid data first
  cleanInvalidTenantData();
  
  // Primero intentar obtener desde la URL
  const urlTenant = getTenantFromURL();
  if (urlTenant && isValidUUID(urlTenant.id) && isValidUUID(urlTenant.ownerId)) {
    // Si encontramos un tenant válido en la URL, actualizamos el tenant actual
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(urlTenant));
    }
    return urlTenant;
  }
  
  // Si no hay tenant en la URL, intentar obtener del almacenamiento
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_TENANT);
    if (stored) {
      const tenant = JSON.parse(stored);
      // Validate UUIDs before returning
      if (isValidUUID(tenant.id) && isValidUUID(tenant.ownerId)) {
        return tenant;
      } else {
        // Remove invalid tenant from storage
        console.warn(`Current tenant has invalid UUID, removing from storage`);
        localStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
        document.cookie = `current_tenant_slug=; path=/; max-age=0`;
      }
    }
  }
  
  return null;
}

export const setCurrentTenant = async (tenant: Tenant | null): Promise<void> => {
  if (tenant) {
    // Validate UUIDs before setting
    if (!isValidUUID(tenant.id) || !isValidUUID(tenant.ownerId)) {
      console.error(`Cannot set current tenant with invalid UUID: id=${tenant.id}, ownerId=${tenant.ownerId}`);
      return;
    }
    
    try {
      // Ensure tenant exists in Supabase before setting as current
      await ensureTenantExistsInSupabase(tenant.id);
      
      localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant));
      
      // También guardar en sessionStorage para persistencia entre pestañas
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant));
      
      // Guardar slug en cookie para persistencia entre navegadores
      document.cookie = `current_tenant_slug=${tenant.slug}; path=/; max-age=2592000`; // 30 días
    } catch (error) {
      console.error("Error ensuring tenant exists in Supabase:", error);
      // Still save locally even if Supabase sync fails
      localStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant));
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(tenant));
      document.cookie = `current_tenant_slug=${tenant.slug}; path=/; max-age=2592000`;
    }
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_TENANT);
    document.cookie = `current_tenant_slug=; path=/; max-age=0`; // Eliminar cookie
  }
}

// URL routing for tenants
export const getTenantFromURL = (): Tenant | null => {
  if (typeof window === 'undefined') return null;
  
  const path = window.location.pathname;
  const segments = path.split("/").filter(Boolean);

  // Check if first segment is a tenant slug
  if (segments.length > 0) {
    const potentialSlug = segments[0];
    console.log("🔍 Buscando tenant con slug:", potentialSlug);
    const tenant = getTenantBySlug(potentialSlug);
    
    if (tenant && isValidUUID(tenant.id) && isValidUUID(tenant.ownerId)) {
      console.log("✅ Tenant encontrado en URL:", tenant.name);
      return tenant;
    } else if (tenant) {
      console.log("❌ Tenant encontrado pero con UUID inválido:", tenant.id);
    } else {
      console.log("❌ No se encontró tenant con slug:", potentialSlug);
    }
  }

  // Si no se encuentra en la URL, intentar obtener de la cookie
  if (document.cookie) {
    const match = document.cookie.match(/(^|;)\s*current_tenant_slug=([^;]+)/);
    if (match) {
      const cookieSlug = match[2];
      console.log("🍪 Buscando tenant desde cookie:", cookieSlug);
      const tenant = getTenantBySlug(cookieSlug);
      if (tenant && isValidUUID(tenant.id) && isValidUUID(tenant.ownerId)) {
        console.log("✅ Tenant encontrado en cookie:", tenant.name);
        return tenant;
      }
    }
  }

  return null;
}

export const generateTenantURL = (tenant: Tenant): string => {
  const baseURL = window.location.origin
  return `${baseURL}/${tenant.slug}`
}

// Tenant data isolation utilities
export const withTenantContext = <T>(tenantId: string, operation: () => T): T => {
  // Validate tenant UUID
  if (!isValidUUID(tenantId)) {
    throw new Error(`Invalid tenant UUID: ${tenantId}`);
  }
  
  const currentTenant = getCurrentTenant();
  
  if (currentTenant?.id !== tenantId) {
    throw new Error('Unauthorized access to tenant data');
  }
  
  return operation();
};

// Función para sincronizar datos entre navegadores usando localStorage
export const syncTenantData = (): void => {
  // Clean invalid data first
  cleanInvalidTenantData();
  
  // Verificar si hay datos en localStorage
  const tenants = localStorage.getItem(STORAGE_KEYS.TENANTS);
  const owners = localStorage.getItem(STORAGE_KEYS.TENANT_OWNERS);
  
  if (tenants) {
    // Guardar en sessionStorage para persistencia entre pestañas
    sessionStorage.setItem(STORAGE_KEYS.TENANTS, tenants);
  }
  
  if (owners) {
    // Guardar en sessionStorage para persistencia entre pestañas
    sessionStorage.setItem(STORAGE_KEYS.TENANT_OWNERS, owners);
  }
  
  // Sincronizar tenant actual
  const currentTenant = getCurrentTenant();
  if (currentTenant && isValidUUID(currentTenant.id) && isValidUUID(currentTenant.ownerId)) {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_TENANT, JSON.stringify(currentTenant));
    
    // Guardar slug en cookie para persistencia entre navegadores
    document.cookie = `current_tenant_slug=${currentTenant.slug}; path=/; max-age=2592000`; // 30 días
  }
};

// Migration utility for existing data
export const migrateToMultiTenant = async (): Promise<void> => {
  const existingClients = localStorage.getItem('beauty-salon-clients');
  const existingAppointments = localStorage.getItem('beauty-salon-appointments');
  const existingServices = localStorage.getItem('beauty-salon-services');
  const existingStaff = localStorage.getItem('beauty-salon-staff');
  
  if (existingClients || existingAppointments || existingServices || existingStaff) {
    // Create default tenant for existing data
    const defaultTenant: Tenant = {
      id: uuidv4(), // Use UUID instead of hardcoded string
      name: 'Bella Vita Spa',
      slug: 'bella-vita-spa',
      businessType: 'salon',
      primaryColor: '#ec4899',
      secondaryColor: '#3b82f6',
      address: 'Av. Principal 1234, Tijuana, BC',
      phone: '664-123-4567',
      email: 'info@bellavitaspa.com',
      description: 'Tu destino de belleza y relajación',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: uuidv4(), // Use UUID for owner ID
      subscription: {
        plan: 'premium',
        status: 'active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days trial
      },
      settings: {
        allowOnlineBooking: true,
        requireApproval: false,
        timeZone: 'America/Tijuana',
        currency: 'MXN',
        language: 'es',
      }
    };
    
    // Create default owner
    const defaultOwner: TenantOwner = {
      id: defaultTenant.ownerId,
      tenant_id: defaultTenant.id,
      email: 'admin@bellavitaspa.com',
      first_name: 'Admin',
      last_name: 'Bella Vita',
      is_active: true,
      password_hash: 'hashed-password', // This would be properly hashed
      created_at: new Date().toISOString()
    };
    await saveTenantOwner(defaultOwner);

    // Create admin user for default tenant
    createTenantAdmin(defaultTenant.id, {
      firstName: 'Admin',
      lastName: 'Bella Vita',
      email: 'admin@bellavitaspa.com',
      password: 'Admin123!'
    });
    
    // Migrate existing data to tenant-specific storage
    const tenantDataKey = `${STORAGE_KEYS.TENANT_DATA_PREFIX}${defaultTenant.id}`;
    const migratedData = {
      clients: existingClients ? JSON.parse(existingClients) : [],
      appointments: existingAppointments ? JSON.parse(existingAppointments) : [],
      services: existingServices ? JSON.parse(existingServices) : [],
      settings: {
        salonName: 'Bella Vita Spa',
        salonMotto: 'Tu destino de belleza y relajación',
        updatedAt: new Date().toISOString(),
        updatedBy: 'migration'
      }
    };
    
    localStorage.setItem(tenantDataKey, JSON.stringify(migratedData));
    
    // Migrar datos de personal a formato por tenant
    if (existingStaff) {
      const staffData = JSON.parse(existingStaff);
      const tenantStaffKey = `tenant-${defaultTenant.id}-beauty-salon-staff`;
      localStorage.setItem(tenantStaffKey, JSON.stringify(staffData));
      console.log('Staff data migrated to tenant-specific storage');
    }
    
    // Set as current tenant
    await setCurrentTenant(defaultTenant);
    
    console.log('Data migrated to multi-tenant structure');
    
    // Migrar datos de personal para todos los tenants
    migrateStaffDataToTenants();
  }
};

// Debug tenant information
export const debugTenants = () => {
  console.log("🔍 === TENANT DEBUG ===");
  
  // Obtener datos de todas las fuentes
  const localStorageTenants = localStorage.getItem(STORAGE_KEYS.TENANTS);
  const sessionStorageTenants = sessionStorage.getItem(STORAGE_KEYS.TENANTS);
  
  console.log("localStorage tenants:", localStorageTenants ? JSON.parse(localStorageTenants) : "None");
  console.log("sessionStorage tenants:", sessionStorageTenants ? JSON.parse(sessionStorageTenants) : "None");
  
  // Obtener tenant actual
  const currentTenant = getCurrentTenant();
  console.log("Current tenant:", currentTenant);
  
  // Obtener tenant de URL
  const urlTenant = getTenantFromURL();
  console.log("URL tenant:", urlTenant);
  
  // Obtener tenant de cookie
  const cookieMatch = document.cookie.match(/(^|;)\s*current_tenant_slug=([^;]+)/);
  const cookieSlug = cookieMatch ? cookieMatch[2] : null;
  console.log("Cookie tenant slug:", cookieSlug);
  
  // Listar todas las claves de localStorage relacionadas con tenants
  const tenantKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('tenant') || key.includes('beauty-app'))) {
      tenantKeys.push(key);
    }
  }
  console.log("All tenant-related localStorage keys:", tenantKeys);
  
  // Validar UUIDs de tenants
  if (localStorageTenants) {
    const tenants = JSON.parse(localStorageTenants);
    tenants.forEach((tenant: Tenant) => {
      console.log(`Tenant ${tenant.name}: id=${tenant.id} (valid: ${isValidUUID(tenant.id)}), ownerId=${tenant.ownerId} (valid: ${isValidUUID(tenant.ownerId)})`);
    });
  }
  
  console.log("🔍 === END TENANT DEBUG ===");
  
  // Devolver información para mostrar en UI
  return {
    localStorageTenants: localStorageTenants ? JSON.parse(localStorageTenants) : [],
    sessionStorageTenants: sessionStorageTenants ? JSON.parse(sessionStorageTenants) : [],
    currentTenant,
    urlTenant,
    cookieSlug,
    tenantKeys
  };
};

// Hacer funciones disponibles globalmente para debugging
if (typeof window !== "undefined") {
  const w = window as any;
  w.debugTenants = debugTenants;
  w.syncTenantData = syncTenantData;
  w.getTenantBySlug = getTenantBySlug;
  w.getCurrentTenant = getCurrentTenant;
  w.setCurrentTenant = setCurrentTenant;
  w.cleanInvalidTenantData = cleanInvalidTenantData;
  w.isValidUUID = isValidUUID;
  w.ensureTenantExistsInSupabase = ensureTenantExistsInSupabase;
}

// Aggregate helpers so modules can `import tenantManager from "@/utils/tenantManager"`
const tenantManagerAPI = {
  // General helpers
  generateSlug,
  isSlugAvailable,

  // Tenant core
  getTenants,
  getTenantBySlug,
  getTenantById,
  saveTenant,
  deleteTenant,
  createTenant,

  // Tenant-specific data
  initializeTenantData,
  getTenantData,
  saveTenantData,

  // Owner helpers
  getTenantOwners,
  getTenantOwnerById,
  getTenantOwnerByEmail,
  saveTenantOwner,

  // Context / routing
  getCurrentTenant,
  setCurrentTenant,
  getTenantFromURL,
  generateTenantURL,
  withTenantContext,

  // Migration
  migrateToMultiTenant,
  
  // Sync
  syncTenantData,
  debugTenants,
  
  // Validation
  isValidUUID: isValidUUID,
  cleanInvalidTenantData,
  
  // Supabase integration
  ensureTenantExistsInSupabase,
  createTenantInSupabase,
  createTenantOwnerInSupabase,
  testSupabaseConnection
};

export default tenantManagerAPI;