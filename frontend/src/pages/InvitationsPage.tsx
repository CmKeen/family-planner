import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { familyAPI, invitationAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Check, X, Trash2, Users, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function InvitationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'accept' | 'decline' | 'cancel' | null;
    data: any;
  }>({ type: null, data: null });

  const { data: families } = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const response = await familyAPI.getAll();
      return response.data.data.families;
    }
  });

  const selectedFamily = families?.[0];

  const { data: receivedInvitations, isLoading: loadingReceived } = useQuery({
    queryKey: ['receivedInvitations'],
    queryFn: async () => {
      const response = await invitationAPI.getReceived();
      return response.data.data.invitations;
    }
  });

  const { data: sentInvitations, isLoading: loadingSent } = useQuery({
    queryKey: ['sentInvitations', selectedFamily?.id],
    queryFn: async () => {
      if (!selectedFamily) return [];
      const response = await invitationAPI.getSent(selectedFamily.id);
      return response.data.data.invitations;
    },
    enabled: !!selectedFamily
  });

  const acceptMutation = useMutation({
    mutationFn: (invitationId: string) => invitationAPI.accept(invitationId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['receivedInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast({
        title: t('invitations.notifications.accepted', {
          familyName: confirmDialog.data?.family?.name || ''
        }),
        variant: 'default'
      });
      setConfirmDialog({ type: null, data: null });
    },
    onError: () => {
      toast({
        title: t('invitations.notifications.acceptError'),
        variant: 'destructive'
      });
    }
  });

  const declineMutation = useMutation({
    mutationFn: (invitationId: string) => invitationAPI.decline(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedInvitations'] });
      toast({
        title: t('invitations.notifications.declined'),
        variant: 'default'
      });
      setConfirmDialog({ type: null, data: null });
    },
    onError: () => {
      toast({
        title: t('invitations.notifications.declineError'),
        variant: 'destructive'
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: ({ familyId, invitationId }: { familyId: string; invitationId: string }) =>
      invitationAPI.cancel(familyId, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
      toast({
        title: t('invitations.notifications.cancelled'),
        variant: 'default'
      });
      setConfirmDialog({ type: null, data: null });
    },
    onError: () => {
      toast({
        title: t('invitations.notifications.cancelError'),
        variant: 'destructive'
      });
    }
  });

  const handleConfirm = () => {
    if (!confirmDialog.data) return;

    switch (confirmDialog.type) {
      case 'accept':
        acceptMutation.mutate(confirmDialog.data.id);
        break;
      case 'decline':
        declineMutation.mutate(confirmDialog.data.id);
        break;
      case 'cancel':
        cancelMutation.mutate({
          familyId: selectedFamily?.id!,
          invitationId: confirmDialog.data.id
        });
        break;
    }
  };

  const getDaysUntilExpiration = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/family/settings')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">{t('invitations.title')}</h1>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              {t('invitations.received')}
              {receivedInvitations?.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">
                  {receivedInvitations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent">{t('invitations.sent')}</TabsTrigger>
          </TabsList>

          {/* Received Invitations */}
          <TabsContent value="received">
            <Card>
              <CardHeader>
                <CardTitle>{t('invitations.received')}</CardTitle>
                <CardDescription>
                  {receivedInvitations?.length || 0} {t('invitations.noReceived')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingReceived ? (
                  <p className="text-center text-gray-500 py-8">{t('invitations.loading')}</p>
                ) : receivedInvitations?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('invitations.noReceived')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('invitations.receivedList.from')}</TableHead>
                        <TableHead>{t('invitations.receivedList.family')}</TableHead>
                        <TableHead>{t('invitations.receivedList.role')}</TableHead>
                        <TableHead>{t('invitations.receivedList.expiresIn')}</TableHead>
                        <TableHead className="text-right">{t('invitations.receivedList.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivedInvitations?.map((invitation: any) => (
                        <TableRow key={invitation.id}>
                          <TableCell>
                            {invitation.inviter.firstName} {invitation.inviter.lastName}
                            <br />
                            <span className="text-xs text-gray-500">{invitation.inviter.email}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-500" />
                              <div>
                                <div className="font-medium">{invitation.family.name}</div>
                                <div className="text-xs text-gray-500">
                                  {invitation.family._count.members} {t('invitations.receivedList.members', { count: invitation.family._count.members })}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {t(`family.roles.${invitation.role}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {t('invitations.receivedList.expiresIn', { days: getDaysUntilExpiration(invitation.expiresAt) })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setConfirmDialog({ type: 'accept', data: invitation })}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                {t('invitations.actions.accept')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmDialog({ type: 'decline', data: invitation })}
                              >
                                <X className="h-4 w-4 mr-1" />
                                {t('invitations.actions.decline')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Invitations */}
          <TabsContent value="sent">
            <Card>
              <CardHeader>
                <CardTitle>{t('invitations.sent')}</CardTitle>
                <CardDescription>
                  {sentInvitations?.length || 0} {t('invitations.noSent')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSent ? (
                  <p className="text-center text-gray-500 py-8">{t('invitations.loading')}</p>
                ) : sentInvitations?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">{t('invitations.noSent')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('invitations.sentList.to')}</TableHead>
                        <TableHead>{t('invitations.sentList.role')}</TableHead>
                        <TableHead>{t('invitations.sentList.status')}</TableHead>
                        <TableHead>{t('invitations.sentList.sentOn')}</TableHead>
                        <TableHead className="text-right">{t('invitations.sentList.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sentInvitations?.map((invitation: any) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.inviteeEmail}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {t(`family.roles.${invitation.role}`)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                invitation.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : invitation.status === 'ACCEPTED'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {t(`invitations.status.${invitation.status}`)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell className="text-right">
                            {invitation.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmDialog({ type: 'cancel', data: invitation })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog
          open={confirmDialog.type !== null}
          onOpenChange={() => setConfirmDialog({ type: null, data: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === 'accept' && t('invitations.confirmAccept.title')}
                {confirmDialog.type === 'decline' && t('invitations.confirmDecline.title')}
                {confirmDialog.type === 'cancel' && t('invitations.confirmCancel.title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === 'accept' &&
                  t('invitations.confirmAccept.message', {
                    familyName: confirmDialog.data?.family?.name || ''
                  })}
                {confirmDialog.type === 'decline' && t('invitations.confirmDecline.message')}
                {confirmDialog.type === 'cancel' &&
                  t('invitations.confirmCancel.message', {
                    email: confirmDialog.data?.inviteeEmail || ''
                  })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {confirmDialog.type === 'accept' && t('invitations.confirmAccept.cancel')}
                {confirmDialog.type === 'decline' && t('invitations.confirmDecline.cancel')}
                {confirmDialog.type === 'cancel' && t('invitations.confirmCancel.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                {confirmDialog.type === 'accept' && t('invitations.confirmAccept.confirm')}
                {confirmDialog.type === 'decline' && t('invitations.confirmDecline.confirm')}
                {confirmDialog.type === 'cancel' && t('invitations.confirmCancel.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
