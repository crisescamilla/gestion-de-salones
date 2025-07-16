import { Service, ServiceCategory } from '../types';

export const serviceCategories: { id: ServiceCategory; name: string; icon: string }[] = [
  { id: 'tratamientos-corporales', name: 'Tratamientos Corporales', icon: 'Sparkles' },
  { id: 'servicios-unas', name: 'Servicios de Uñas', icon: 'Hand' },
  { id: 'tratamientos-faciales', name: 'Tratamientos Faciales', icon: 'Heart' },
  { id: 'servicios-cabello', name: 'Servicios de Cabello', icon: 'Scissors' },
  { id: 'masajes', name: 'Masajes', icon: 'Flower' },
  { id: 'productos', name: 'Productos', icon: 'ShoppingBag' },
  { id: 'barberia-cortes', name: 'Cortes de Barbería', icon: 'Scissors' },
  { id: 'barberia-barba', name: 'Barba y Afeitado', icon: 'Beard' },
  { id: 'barberia-tratamientos', name: 'Tratamientos de Barbería', icon: 'Droplet' },
  { id: 'spa-hidroterapia', name: 'Hidroterapia', icon: 'Droplet' },
  { id: 'spa-aromaterapia', name: 'Aromaterapia', icon: 'Leaf' },
  { id: 'spa-relajacion', name: 'Relajación y Mindfulness', icon: 'Lotus' },
  { id: 'spa-exfoliacion', name: 'Exfoliación y Envolturas', icon: 'Sparkles' },
  { id: 'estetica-tratamientos', name: 'Tratamientos Estéticos', icon: 'Sparkles' },
  { id: 'depilacion', name: 'Depilación', icon: 'Feather' },
  { id: 'masajes-especializados', name: 'Masajes Especializados', icon: 'Hands' },
  { id: 'peluqueria-infantil', name: 'Peluquería Infantil', icon: 'Baby' },
  { id: 'podologia', name: 'Podología', icon: 'Foot' },
  { id: 'tatuajes-piercings', name: 'Tatuajes y Piercings', icon: 'Ink' },
  { id: 'rehabilitacion-fisica', name: 'Rehabilitación Física', icon: 'Activity' },
  { id: 'yoga-pilates', name: 'Yoga y Pilates', icon: 'Yoga' },
  { id: 'bronceado', name: 'Bronceado', icon: 'Sun' },
  { id: 'maquillaje-profesional', name: 'Maquillaje Profesional', icon: 'Brush' },
  { id: 'cejas-pestanas', name: 'Cejas y Pestañas', icon: 'Eye' },
  { id: 'nutricion', name: 'Nutrición', icon: 'Apple' }
];

export const services: Service[] = [
  // Tratamientos Corporales
  {
    id: '1',
    name: 'Depilación con Cera',
    category: 'tratamientos-corporales',
    duration: 60,
    price: 150,
    description: 'Depilación con cera natural para piernas, linea de bikini, axilas, brazos, espalda, bigote. precio por zona.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    name: 'Exfoliación Corporal',
    category: 'tratamientos-corporales',
    duration: 45,
    price: 350,
    description: 'Tratamiento exfoliante para renovar la piel del cuerpo',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    name: 'Tratamiento Reafirmante',
    category: 'tratamientos-corporales',
    duration: 90,
    price: 450,
    description: 'Tratamiento especializado para reafirmar y tonificar la piel',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Servicios de Uñas
  {
    id: '4',
    name: 'Manicure Clásica',
    category: 'servicios-unas',
    duration: 30,
    price: 250,
    description: 'Cuidado completo de uñas con esmaltado tradicional',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    name: 'Pedicure Spa',
    category: 'servicios-unas',
    duration: 45,
    price: 450,
    description: 'Tratamiento relajante para pies con exfoliación y masaje',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '6',
    name: 'Uñas de Gel',
    category: 'servicios-unas',
    duration: 60,
    price: 550,
    description: 'Aplicación de gel para uñas duraderas y resistentes',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Tratamientos Faciales
  {
    id: '7',
    name: 'Limpieza Facial Profunda',
    category: 'tratamientos-faciales',
    duration: 60,
    price: 400,
    description: 'Limpieza profunda con extracción de impurezas',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '8',
    name: 'Facial Hidratante',
    category: 'tratamientos-faciales',
    duration: 45,
    price: 350,
    description: 'Tratamiento hidratante para todo tipo de piel',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '9',
    name: 'Facial Anti-edad',
    category: 'tratamientos-faciales',
    duration: 75,
    price: 550,
    description: 'Tratamiento especializado para combatir signos de envejecimiento',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Servicios de Cabello
  {
    id: '10',
    name: 'Corte y Peinado',
    category: 'servicios-cabello',
    duration: 45,
    price: 430,
    description: 'Corte personalizado con peinado incluido',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '11',
    name: 'Tinte Completo',
    category: 'servicios-cabello',
    duration: 120,
    price: 600,
    description: 'Coloración completa del cabello con productos profesionales, depende del largo del cabello',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '12',
    name: 'Mechas y Reflejos',
    category: 'servicios-cabello',
    duration: 150,
    price: 700,
    description: 'Aplicación de mechas para dar luminosidad al cabello',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Masajes
  {
    id: '13',
    name: 'Masaje Relajante',
    category: 'masajes',
    duration: 60,
    price: 750,
    description: 'Masaje corporal completo para relajación y bienestar',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '14',
    name: 'Masaje Descontracturante',
    category: 'masajes',
    duration: 45,
    price: 450,
    description: 'Masaje terapéutico para aliviar tensiones musculares',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '15',
    name: 'Masaje con Piedras Calientes',
    category: 'masajes',
    duration: 75,
    price: 350,
    description: 'Terapia relajante con piedras volcánicas calientes',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Productos
  {
    id: '16',
    name: 'Crema Hidratante Facial',
    category: 'productos',
    duration: 5,
    price: 250,
    description: 'Crema hidratante de uso diario para rostro',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '17',
    name: 'Champú Profesional',
    category: 'productos',
    duration: 5,
    price: 280,
    description: 'Champú profesional para todo tipo de cabello',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '18',
    name: 'Mascarilla Nutritiva',
    category: 'productos',
    duration: 5,
    price: 220,
    description: 'Mascarilla intensiva para cabello dañado',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },

  // Barbería - Cortes
  {
    id: '19',
    name: 'Corte Clásico',
    category: 'barberia-cortes',
    duration: 30,
    price: 200,
    description: 'Corte de cabello clásico para caballero, incluye lavado y peinado.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '20',
    name: 'Fade Moderno',
    category: 'barberia-cortes',
    duration: 40,
    price: 250,
    description: 'Corte fade moderno, degradado a máquina y tijera.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Barbería - Barba
  {
    id: '21',
    name: 'Afeitado Clásico',
    category: 'barberia-barba',
    duration: 25,
    price: 180,
    description: 'Afeitado tradicional con navaja y toalla caliente.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '22',
    name: 'Perfilado de Barba',
    category: 'barberia-barba',
    duration: 20,
    price: 150,
    description: 'Perfilado y arreglo de barba con navaja y tijera.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Barbería - Tratamientos
  {
    id: '23',
    name: 'Mascarilla Facial Carbón',
    category: 'barberia-tratamientos',
    duration: 20,
    price: 120,
    description: 'Mascarilla facial de carbón activado para limpieza profunda.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '24',
    name: 'Tratamiento Capilar',
    category: 'barberia-tratamientos',
    duration: 25,
    price: 180,
    description: 'Tratamiento nutritivo para fortalecer el cabello masculino.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Spa - Hidroterapia
  {
    id: '25',
    name: 'Baño de Hidromasaje',
    category: 'spa-hidroterapia',
    duration: 40,
    price: 350,
    description: 'Relajante baño de hidromasaje con sales minerales.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Spa - Aromaterapia
  {
    id: '26',
    name: 'Sesión de Aromaterapia',
    category: 'spa-aromaterapia',
    duration: 30,
    price: 200,
    description: 'Terapia de relajación con aceites esenciales y aromas naturales.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Spa - Relajación y Mindfulness
  {
    id: '27',
    name: 'Sesión de Mindfulness',
    category: 'spa-relajacion',
    duration: 50,
    price: 300,
    description: 'Sesión guiada de mindfulness y relajación profunda.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // Spa - Exfoliación y Envolturas
  {
    id: '28',
    name: 'Envoltura de Chocolate',
    category: 'spa-exfoliacion',
    duration: 60,
    price: 400,
    description: 'Tratamiento corporal con envoltura de chocolate para nutrir la piel.',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];