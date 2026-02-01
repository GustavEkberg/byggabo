/**
 * Available icons for contact categories (subset of lucide icons)
 */
export const CONTACT_CATEGORY_ICONS = [
  'hammer',
  'wrench',
  'pipette',
  'plug',
  'paint-bucket',
  'brick-wall',
  'trees',
  'home',
  'ruler',
  'hard-hat',
  'truck',
  'warehouse',
  'scissors',
  'spray-can',
  'thermometer',
  'wind',
  'droplets',
  'zap',
  'shield',
  'users'
] as const;

export type ContactCategoryIcon = (typeof CONTACT_CATEGORY_ICONS)[number];

/**
 * Default contact categories (English)
 */
export const DEFAULT_CONTACT_CATEGORIES_EN = [
  { name: 'Carpenter', icon: 'hammer', color: '#a16207', sortOrder: '0' },
  { name: 'Plumber', icon: 'pipette', color: '#0284c7', sortOrder: '1' },
  { name: 'Electrician', icon: 'zap', color: '#eab308', sortOrder: '2' },
  { name: 'Painter', icon: 'paint-bucket', color: '#ec4899', sortOrder: '3' },
  { name: 'Mason', icon: 'brick-wall', color: '#78716c', sortOrder: '4' },
  { name: 'Landscaper', icon: 'trees', color: '#22c55e', sortOrder: '5' },
  { name: 'HVAC', icon: 'thermometer', color: '#06b6d4', sortOrder: '6' },
  { name: 'Roofer', icon: 'home', color: '#8b5cf6', sortOrder: '7' },
  { name: 'Supplier', icon: 'truck', color: '#6b7280', sortOrder: '8' },
  { name: 'Other', icon: 'users', color: '#f59e0b', sortOrder: '9' }
] as const;

/**
 * Default contact categories (Swedish)
 */
export const DEFAULT_CONTACT_CATEGORIES_SV = [
  { name: 'Snickare', icon: 'hammer', color: '#a16207', sortOrder: '0' },
  { name: 'Elektriker', icon: 'zap', color: '#eab308', sortOrder: '1' },
  { name: 'Målare', icon: 'paint-bucket', color: '#ec4899', sortOrder: '2' },
  { name: 'Murare', icon: 'brick-wall', color: '#78716c', sortOrder: '3' },
  { name: 'Trädgård', icon: 'trees', color: '#22c55e', sortOrder: '4' },
  { name: 'VVS', icon: 'thermometer', color: '#06b6d4', sortOrder: '5' },
  { name: 'Takläggare', icon: 'home', color: '#8b5cf6', sortOrder: '6' },
  { name: 'Entreprenör', icon: 'hard-hat', color: '#0284c7', sortOrder: '7' },
  { name: 'Leverantör', icon: 'truck', color: '#6b7280', sortOrder: '8' },
  { name: 'Övrigt', icon: 'users', color: '#f59e0b', sortOrder: '9' }
] as const;

/**
 * Get default categories based on country code
 */
export const getDefaultContactCategories = (countryCode?: string) => {
  if (countryCode === 'SE') {
    return DEFAULT_CONTACT_CATEGORIES_SV;
  }
  return DEFAULT_CONTACT_CATEGORIES_EN;
};
