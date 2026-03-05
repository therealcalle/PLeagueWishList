// ============================================
// PoE Item Categories
// Edit or extend these as you see fit
// ============================================

const CATEGORIES = [
  { id: 'unique-armour',     name: 'Unique Armour',      icon: '🛡️', color: '#af6025' },
  { id: 'unique-weapon',     name: 'Unique Weapons',     icon: '⚔️', color: '#af6025' },
  { id: 'unique-accessory',  name: 'Unique Accessories',  icon: '💍', color: '#af6025' },
  { id: 'unique-flask',      name: 'Unique Flasks',      icon: '🧪', color: '#af6025' },
  { id: 'unique-jewel',      name: 'Unique Jewels',      icon: '💎', color: '#af6025' },
  { id: 'gem-str',            name: 'Gems (Str)',          icon: '🔴', color: '#c41e3a' },
  { id: 'gem-dex',            name: 'Gems (Dex)',          icon: '🟢', color: '#18a830' },
  { id: 'gem-int',            name: 'Gems (Int)',          icon: '🔵', color: '#3b82f6' },
  { id: 'gem-other',          name: 'Gems (Other)',        icon: '⚪', color: '#cccccc' },
  { id: 'tattoo',            name: 'Tattoos',            icon: '🖋️', color: '#e07850' },
  { id: 'rune',              name: 'Runes',              icon: '🔶', color: '#b8a0d4' },
  { id: 'oil',               name: 'Oils',               icon: '💧', color: '#ccaa44' },
  { id: 'beast',             name: 'Beasts',             icon: '🐺', color: '#cc5555' },
  { id: 'base',              name: 'Crafting Bases',     icon: '🔨', color: '#f0f0f0' },
  { id: 'other',             name: 'Other',              icon: '📦', color: '#888888' },
];

function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}
