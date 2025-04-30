export const useAvatar = () => {
  // Get initials from name or email
  const getInitials = (text: string) => {
    if (!text) return '';
    const words = text.split(/[ @]/);
    return words.slice(0, 2).map(word => word[0]?.toUpperCase()).join('');
  };

  // Generate consistent color based on email
  const getAvatarColor = (email: string) => {
    if (!email) return '#4CAF50';
    
    const colors = [
      '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e',
      '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50',
      '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#f39c12',
      '#d35400', '#c0392b', '#7f8c8d'
    ];
    
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      hash = email.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Create avatar component style
  const getAvatarStyle = (email: string) => {
    return {
      backgroundColor: getAvatarColor(email)
    };
  };

  return {
    getInitials,
    getAvatarColor,
    getAvatarStyle
  };
}; 