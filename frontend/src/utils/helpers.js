import colors from '../theme/colors';

export const getCategoryColor = (category) => {
  return colors.categories[category] || colors.primary;
};

export const getSentimentColor = (sentiment) => {
  return colors.sentiments[sentiment] || colors.textSecondary;
};

export const getCategoryIcon = (category) => {
  switch (category) {
    case 'Whereabouts':
      return 'location-outline';
    case 'Tasks':
      return 'checkbox-outline';
    case 'Study':
      return 'book-outline';
    case 'Work':
      return 'briefcase-outline';
    case 'Ideas':
      return 'bulb-outline';
    case 'People':
      return 'people-outline';
    case 'Health':
      return 'fitness-outline';
    case 'Personal':
    default:
      return 'person-outline';
  }
};

export const truncateText = (text, maxLength = 80) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};
