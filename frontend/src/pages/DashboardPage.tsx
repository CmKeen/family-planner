import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { familyAPI, weeklyPlanAPI, mealTemplateAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Utensils, Plus, Calendar, ShoppingCart, LogOut, CalendarDays, Users } from 'lucide-react';
import { getMonday, formatDate } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function DashboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);

  const { data: families, isLoading: loadingFamilies } = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const response = await familyAPI.getAll();
      return response.data.data.families;
    }
  });

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['weeklyPlans', selectedFamily],
    queryFn: async () => {
      if (!selectedFamily) return [];
      const response = await weeklyPlanAPI.getByFamily(selectedFamily);
      return response.data.data.plans;
    },
    enabled: !!selectedFamily
  });

  const { data: templates } = useQuery({
    queryKey: ['mealTemplates', selectedFamily],
    queryFn: async () => {
      if (!selectedFamily) return [];
      const response = await mealTemplateAPI.getAll(selectedFamily);
      return response.data.data.templates;
    },
    enabled: !!selectedFamily
  });

  useEffect(() => {
    if (families && families.length > 0 && !selectedFamily) {
      setSelectedFamily(families[0].id);
    }
  }, [families, selectedFamily]);

  useEffect(() => {
    if (families && families.length === 0) {
      navigate('/onboarding');
    }
  }, [families, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreatePlan = () => {
    setShowTemplateDialog(true);
  };

  const handleConfirmTemplate = async () => {
    if (!selectedFamily) return;

    try {
      setIsCreatingPlan(true);
      const weekStart = getMonday(new Date());
      const response = await weeklyPlanAPI.generateAuto(selectedFamily, {
        weekStartDate: weekStart.toISOString(),
        templateId: selectedTemplate || undefined
      });
      const newPlan = response.data.data.plan;
      setShowTemplateDialog(false);
      setSelectedTemplate(null);
      navigate(`/plan/${newPlan.id}`);
    } catch (error) {
      console.error('Error creating plan:', error);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const getMealCount = (template: any) => {
    if (!template.schedule) return 0;
    return template.schedule.reduce((count: number, day: any) => {
      return count + (day.mealTypes?.length || 0);
    }, 0);
  };

  if (loadingFamilies) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile Optimized */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10 safe-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center">
                <Utensils className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{t('dashboard.title')}</h1>
                <p className="text-xs text-muted-foreground">{t('dashboard.welcome', { name: user?.firstName })}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-safe">
        {/* Quick Actions - Mobile First */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={handleCreatePlan}
            className="h-24 flex-col space-y-2"
            size="lg"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">{t('dashboard.newPlan')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col space-y-2"
            size="lg"
            onClick={() => navigate('/recipes')}
          >
            <Utensils className="h-6 w-6" />
            <span className="text-sm">{t('dashboard.recipes')}</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col space-y-2 col-span-2"
            size="lg"
            onClick={() => navigate('/family/settings')}
          >
            <Users className="h-6 w-6" />
            <span className="text-sm">{t('family.title')}</span>
          </Button>
        </div>

        {/* Recent Plans */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{t('dashboard.yourPlans')}</h2>
            {families && families.length > 1 && (
              <select
                value={selectedFamily || ''}
                onChange={(e) => setSelectedFamily(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              >
                {families.map((family: any) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loadingPlans ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="grid gap-4">
              {plans.map((plan: any) => (
                <Card key={plan.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {t('dashboard.planCard.week', {
                            weekNumber: plan.weekNumber,
                            year: new Date(plan.weekStartDate).getFullYear()
                          })}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(plan.weekStartDate)}
                        </CardDescription>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        plan.status === 'VALIDATED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {t(`dashboard.status.${plan.status}`)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {t('dashboard.planCard.mealsPlanned', { count: plan.meals?.length || 0 })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1"
                      >
                        <Link to={`/plan/${plan.id}`}>
                          <Calendar className="h-4 w-4 mr-2" />
                          {t('dashboard.planCard.viewPlan')}
                        </Link>
                      </Button>
                      {plan.status === 'VALIDATED' && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Link to={`/shopping/${plan.id}`}>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            {t('dashboard.planCard.shopping')}
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.noPlans.title')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('dashboard.noPlans.description')}
                </p>
                <Button onClick={handleCreatePlan}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('dashboard.noPlans.button')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('weeklyPlan.dialogs.selectTemplate.title')}</DialogTitle>
            <DialogDescription>
              {t('weeklyPlan.dialogs.selectTemplate.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* System Templates */}
            {templates && templates.filter((t: any) => t.isSystem).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mealTemplates.systemTemplates')}
                </h3>
                <div className="grid gap-3">
                  {templates.filter((t: any) => t.isSystem).map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          selectedTemplate === template.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <CalendarDays className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-base">
                            {template.name}
                          </h4>
                          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                            {t('mealTemplates.mealCount', { count: getMealCount(template) })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {templates && templates.filter((t: any) => !t.isSystem).length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('mealTemplates.customTemplates')}
                </h3>
                <div className="grid gap-3">
                  {templates.filter((t: any) => !t.isSystem).map((template: any) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          selectedTemplate === template.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <CalendarDays className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-base">
                            {template.name}
                          </h4>
                          <span className="text-xs font-medium px-2 py-1 bg-gray-100 rounded-full">
                            {t('mealTemplates.mealCount', { count: getMealCount(template) })}
                          </span>
                        </div>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        )}
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setSelectedTemplate(null);
              }}
              disabled={isCreatingPlan}
            >
              {t('weeklyPlan.dialogs.selectTemplate.cancel')}
            </Button>
            <Button
              onClick={handleConfirmTemplate}
              disabled={isCreatingPlan}
            >
              {isCreatingPlan ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.loading')}
                </>
              ) : (
                t('weeklyPlan.dialogs.selectTemplate.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
