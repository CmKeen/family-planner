import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { familyAPI, invitationAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserPlus, Users, Mail, Trash2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function FamilySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [memberName, setMemberName] = useState('');
  const [memberAge, setMemberAge] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');

  const { data: families } = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const response = await familyAPI.getAll();
      return response.data.data.families;
    }
  });

  const selectedFamily = families?.[0];

  const sendInviteMutation = useMutation({
    mutationFn: (data: { inviteeEmail: string; role: string }) =>
      invitationAPI.send(selectedFamily?.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sentInvitations'] });
      toast({
        title: t('family.inviteModal.success'),
        variant: 'default'
      });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
    },
    onError: () => {
      toast({
        title: t('family.inviteModal.error'),
        variant: 'destructive'
      });
    }
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: { name: string; age?: number; role: string }) =>
      familyAPI.addMember(selectedFamily?.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast({
        title: t('family.addMemberModal.success'),
        variant: 'default'
      });
      setShowAddMemberModal(false);
      setMemberName('');
      setMemberAge('');
      setMemberRole('MEMBER');
    },
    onError: () => {
      toast({
        title: t('family.addMemberModal.error'),
        variant: 'destructive'
      });
    }
  });

  const handleSendInvite = () => {
    if (!inviteEmail) return;
    sendInviteMutation.mutate({ inviteeEmail: inviteEmail, role: inviteRole });
  };

  const handleAddMember = () => {
    if (!memberName) return;
    addMemberMutation.mutate({
      name: memberName,
      age: memberAge ? parseInt(memberAge) : undefined,
      role: memberRole
    });
  };

  if (!selectedFamily) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('family.loading')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('family.settings')}</h1>
              <p className="text-gray-600 mt-1">{selectedFamily.name}</p>
            </div>
            <Button onClick={() => navigate('/invitations')} variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              {t('family.actions.viewInvitations')}
            </Button>
          </div>
        </div>

        {/* Members Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('family.membersList.title')}</CardTitle>
                <CardDescription>{selectedFamily.members?.length || 0} {t('family.members')}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddMemberModal(true)} variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('family.actions.addMember')}
                </Button>
                <Button onClick={() => setShowInviteModal(true)} size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  {t('family.actions.inviteMember')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('family.membersList.name')}</TableHead>
                  <TableHead>{t('family.membersList.email')}</TableHead>
                  <TableHead>{t('family.membersList.role')}</TableHead>
                  <TableHead>{t('family.membersList.status')}</TableHead>
                  <TableHead className="text-right">{t('family.membersList.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedFamily.members?.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.user?.email || '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {t(`family.roles.${member.role}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.userId ? (
                        <span className="text-green-600 text-sm">{t('family.membersList.linked')}</span>
                      ) : (
                        <span className="text-gray-500 text-sm">{t('family.membersList.notLinked')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Invite Member Modal */}
        <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('family.inviteModal.title')}</DialogTitle>
              <DialogDescription>{t('family.inviteModal.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t('family.inviteModal.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('family.inviteModal.emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="role">{t('family.inviteModal.roleLabel')}</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">{t('family.roles.ADMIN')}</SelectItem>
                    <SelectItem value="PARENT">{t('family.roles.PARENT')}</SelectItem>
                    <SelectItem value="MEMBER">{t('family.roles.MEMBER')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                {t('family.inviteModal.cancel')}
              </Button>
              <Button onClick={handleSendInvite} disabled={sendInviteMutation.isPending}>
                {sendInviteMutation.isPending ? t('family.inviteModal.sending') : t('family.inviteModal.send')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Modal */}
        <Dialog open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('family.addMemberModal.title')}</DialogTitle>
              <DialogDescription>{t('family.addMemberModal.description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t('family.addMemberModal.nameLabel')}</Label>
                <Input
                  id="name"
                  placeholder={t('family.addMemberModal.namePlaceholder')}
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="age">{t('family.addMemberModal.ageLabel')}</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder={t('family.addMemberModal.agePlaceholder')}
                  value={memberAge}
                  onChange={(e) => setMemberAge(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="memberRole">{t('family.inviteModal.roleLabel')}</Label>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARENT">{t('family.roles.PARENT')}</SelectItem>
                    <SelectItem value="MEMBER">{t('family.roles.MEMBER')}</SelectItem>
                    <SelectItem value="CHILD">{t('family.roles.CHILD')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMemberModal(false)}>
                {t('family.addMemberModal.cancel')}
              </Button>
              <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                {addMemberMutation.isPending ? t('family.addMemberModal.adding') : t('family.addMemberModal.add')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
