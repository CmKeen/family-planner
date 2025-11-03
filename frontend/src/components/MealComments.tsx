import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { commentAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageCircle, Edit2, Trash2, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface Comment {
  id: string;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  member: {
    id: string;
    name: string;
    role: string;
  };
}

interface MealCommentsProps {
  planId: string;
  mealId: string;
  currentMemberId?: string;
  currentMemberRole?: string;
}

export function MealComments({
  planId,
  mealId,
  currentMemberId,
  currentMemberRole
}: MealCommentsProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Fetch comments
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', planId, mealId],
    queryFn: async () => {
      const response = await commentAPI.getComments(planId, mealId);
      return response.data.data.comments as Comment[];
    }
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (content: string) =>
      commentAPI.addComment(planId, mealId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', planId, mealId] });
      setNewComment('');
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      commentAPI.updateComment(planId, mealId, commentId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', planId, mealId] });
      setEditingCommentId(null);
      setEditContent('');
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      commentAPI.deleteComment(planId, mealId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', planId, mealId] });
      setDeleteDialogOpen(false);
      setCommentToDelete(null);
    }
  });

  const handleAddComment = () => {
    if (newComment.trim().length === 0) return;
    if (newComment.length > 2000) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleEditClick = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleEditSave = () => {
    if (editContent.trim().length === 0) return;
    if (editContent.length > 2000) return;
    if (editingCommentId) {
      updateCommentMutation.mutate({
        commentId: editingCommentId,
        content: editContent.trim()
      });
    }
  };

  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleDeleteClick = (commentId: string) => {
    setCommentToDelete(commentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (commentToDelete) {
      deleteCommentMutation.mutate(commentToDelete);
    }
  };

  const canEditComment = (comment: Comment) => {
    if (!currentMemberId) return false;
    // User can edit their own comments, or ADMIN/PARENT can edit any
    return (
      comment.member.id === currentMemberId ||
      currentMemberRole === 'ADMIN' ||
      currentMemberRole === 'PARENT'
    );
  };

  const canDeleteComment = (comment: Comment) => {
    if (!currentMemberId) return false;
    // User can delete their own comments, or ADMIN/PARENT can delete any
    return (
      comment.member.id === currentMemberId ||
      currentMemberRole === 'ADMIN' ||
      currentMemberRole === 'PARENT'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('activity.timeAgo.justNow');
    if (diffMins < 60) return t('activity.timeAgo.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('activity.timeAgo.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('activity.timeAgo.daysAgo', { count: diffDays });

    return date.toLocaleDateString();
  };

  const comments = commentsData || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">
          {t('comments.title')}
        </h3>
        <span className="text-sm text-muted-foreground">
          ({t('comments.count', { count: comments.length })})
        </span>
      </div>

      {/* Comment List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('comments.loading')}
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {t('comments.empty')}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              {editingCommentId === comment.id ? (
                // Edit mode
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {t('comments.characterCount', { count: editContent.length })}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCancel}
                        disabled={updateCommentMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('comments.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleEditSave}
                        disabled={
                          updateCommentMutation.isPending ||
                          editContent.trim().length === 0 ||
                          editContent.length > 2000
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {t('comments.save')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {comment.member.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                        {comment.isEdited && (
                          <span className="text-xs text-muted-foreground italic">
                            ({t('comments.edited')})
                          </span>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                    {(canEditComment(comment) || canDeleteComment(comment)) && (
                      <div className="flex gap-1 ml-2">
                        {canEditComment(comment) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditClick(comment)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        {canDeleteComment(comment) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteClick(comment.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Comment Form */}
      <div className="space-y-2">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('comments.placeholder')}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t('comments.characterCount', { count: newComment.length })}
          </span>
          <Button
            size="sm"
            onClick={handleAddComment}
            disabled={
              addCommentMutation.isPending ||
              newComment.trim().length === 0 ||
              newComment.length > 2000
            }
          >
            {addCommentMutation.isPending ? t('comments.posting') : t('comments.add')}
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('comments.deleteConfirm.title')}</DialogTitle>
            <DialogDescription>
              {t('comments.deleteConfirm.message')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteCommentMutation.isPending}
            >
              {t('comments.deleteConfirm.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCommentMutation.isPending}
            >
              {deleteCommentMutation.isPending
                ? t('comments.deleting')
                : t('comments.deleteConfirm.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
