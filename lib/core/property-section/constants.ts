/**
 * Available icons for sections (subset of lucide icons)
 */
export const SECTION_ICONS = [
  'cooking-pot',
  'bath',
  'sofa',
  'bed',
  'flower-2',
  'car',
  'box',
  'home',
  'door-open',
  'lamp',
  'washing-machine',
  'refrigerator',
  'tv',
  'armchair',
  'fence',
  'trees',
  'drill',
  'wrench',
  'paint-bucket',
  'hammer'
] as const;

export type SectionIcon = (typeof SECTION_ICONS)[number];

/**
 * Default sections to seed for new properties.
 */
export const DEFAULT_SECTIONS = [
  { name: 'Kitchen', icon: 'cooking-pot', color: '#ef4444', sortOrder: '0' },
  { name: 'Bathroom', icon: 'bath', color: '#3b82f6', sortOrder: '1' },
  { name: 'Living Room', icon: 'sofa', color: '#22c55e', sortOrder: '2' },
  { name: 'Bedroom', icon: 'bed', color: '#a855f7', sortOrder: '3' },
  { name: 'Garden', icon: 'flower-2', color: '#84cc16', sortOrder: '4' },
  { name: 'Garage', icon: 'car', color: '#6b7280', sortOrder: '5' },
  { name: 'Other', icon: 'box', color: '#f59e0b', sortOrder: '6' }
] as const;
