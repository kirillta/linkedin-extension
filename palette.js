/**
 * Shared 16-slot color palette used by RoleHighlighter and the popup.
 * Each slot: { text, bg, bg2, border }.
 * bg + bg2 form a Trello-style diagonal gradient. colorIndex in a category
 * maps to one of these slots.
 */
const BADGE_PALETTE = [
    { text: '#1d4ed8', bg: '#dbeafe', bg2: '#bfdbfe', border: '#1d4ed8' },
    { text: '#6d28d9', bg: '#ede9fe', bg2: '#ddd6fe', border: '#6d28d9' },
    { text: '#b45309', bg: '#fef3c7', bg2: '#fde68a', border: '#b45309' },
    { text: '#0f766e', bg: '#ccfbf1', bg2: '#99f6e4', border: '#0f766e' },
    { text: '#c2410c', bg: '#ffedd5', bg2: '#fed7aa', border: '#c2410c' },
    { text: '#be123c', bg: '#ffe4e6', bg2: '#fecdd3', border: '#be123c' },
    { text: '#4338ca', bg: '#e0e7ff', bg2: '#c7d2fe', border: '#4338ca' },
    { text: '#374151', bg: '#f3f4f6', bg2: '#e5e7eb', border: '#374151' },
    { text: '#15803d', bg: '#dcfce7', bg2: '#bbf7d0', border: '#15803d' },
    { text: '#0369a1', bg: '#e0f2fe', bg2: '#bae6fd', border: '#0369a1' },
    { text: '#9d174d', bg: '#fce7f3', bg2: '#fbcfe8', border: '#9d174d' },
    { text: '#3f6212', bg: '#ecfccb', bg2: '#d9f99d', border: '#3f6212' },
    { text: '#0e7490', bg: '#cffafe', bg2: '#a5f3fc', border: '#0e7490' },
    { text: '#7e22ce', bg: '#f3e8ff', bg2: '#e9d5ff', border: '#7e22ce' },
    { text: '#854d0e', bg: '#fefce8', bg2: '#fef08a', border: '#854d0e' },
    { text: '#1e293b', bg: '#f8fafc', bg2: '#e2e8f0', border: '#1e293b' },
];
