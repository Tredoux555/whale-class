export const formatTime = (dateString: string) => {
  if (!dateString) return '—';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString('en-GB', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Date formatting error:', error, dateString);
    return dateString;
  }
};

export const formatSecondsAgo = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};

export const getTypeIcon = (type: string) => {
  switch (type) {
    case 'text': return '📝';
    case 'image': return '🖼️';
    case 'video': return '▶️';
    case 'audio': return '🔊';
    default: return '📎';
  }
};

export const getVaultFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return '🖼️';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return '▶️';
  return '📄';
};

export const isImageFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
};

export const getFileIcon = (mimeType: string, filename: string) => {
  if (mimeType.includes('pdf')) return '📕';
  if (mimeType.includes('word') || filename.match(/\.docx?$/i)) return '📘';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || filename.match(/\.xlsx?$/i)) return '📗';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation') || filename.match(/\.pptx?$/i)) return '📙';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('text') || filename.match(/\.txt$/i)) return '📄';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  return '📎';
};

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
