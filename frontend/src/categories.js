export const CATEGORY_COLORS = {
  Tech: '#6366f1',
  Startup: '#f59e0b',
  Business: '#10b981',
  Creative: '#ec4899',
  Finance: '#0ea5e9',
  Marketing: '#ef4444',
  Social: '#8b5cf6',
}

export const colorFor = (category) => CATEGORY_COLORS[category] || '#64748b'
