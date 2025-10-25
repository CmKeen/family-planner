// Simple toast hook for notifications
export function useToast() {
  return {
    toast: ({ title, variant }: { title: string; variant?: 'default' | 'destructive' }) => {
      // Simple alert-based notification for now
      // In production, this would use a proper toast library like sonner or radix-ui toast
      if (variant === 'destructive') {
        alert(`❌ ${title}`);
      } else {
        alert(`✓ ${title}`);
      }
    }
  };
}
