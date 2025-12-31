export const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'MOVIE':
      return 'bg-yellow-600';
    case 'SERIES':
      return 'bg-blue-600';
    case 'GAME':
      return 'bg-green-600';
    default:
      return 'bg-gray-600';
  }
};