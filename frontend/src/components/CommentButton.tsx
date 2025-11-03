import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCommentCount } from '@/hooks/useCommentCount';

interface CommentButtonProps {
  planId: string;
  mealId: string;
  isExpanded: boolean;
  onClick: () => void;
}

export function CommentButton({ planId, mealId, isExpanded, onClick }: CommentButtonProps) {
  const { t } = useTranslation();
  const { count, hasComments } = useCommentCount(planId, mealId);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      {isExpanded ? t('comments.hide') : t('comments.show')}
      {hasComments && (
        <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] rounded-full px-1.5">
          {count}
        </Badge>
      )}
    </Button>
  );
}
