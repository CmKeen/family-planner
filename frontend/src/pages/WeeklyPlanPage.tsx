import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { weeklyPlanAPI, recipeAPI, mealTemplateAPI } from '@/lib/api';
import { ArrowLeft, Clock, Heart, Sparkles, Lock, Unlock, RefreshCw, Plus, Trash2, CalendarDays, Edit, History, AlertCircle, ShoppingCart } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MealComponentEditor } from '@/components/MealComponentEditor';
import { MealComments } from '@/components/MealComments';
import { CommentButton } from '@/components/CommentButton';
import { PlanActivityFeed } from '@/components/PlanActivityFeed';
import ShoppingListView from '@/components/ShoppingListView';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/authStore';

interface Recipe {
  id: string;
  title: string;
  titleEn?: string;
  prepTime: number;
  cookTime: number;
  category: string;
  cuisine?: string;
  isFavorite?: boolean;
  isNovelty?: boolean;
  isComponentBased?: boolean;
}

interface FoodComponent {
  id: string;
  name: string;
  nameEn?: string;
  nameNl?: string;
  category: string;
  defaultQuantity: number;
  unit: string;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  lactoseFree: boolean;
  isSystemComponent: boolean;
}

interface MealComponent {
  id: string;
  componentId: string;
  quantity: number;
  unit: string;
  role: string;
  order: number;
  component: FoodComponent;
}

interface Meal {
  id: string;
  dayOfWeek: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  recipe: Recipe | null;
  portions: number;
  locked: boolean;
  mealComponents?: MealComponent[];
}

interface WeeklyPlan {
  id: string;
  weekNumber: number;
  year: number;
  status: 'DRAFT' | 'IN_VALIDATION' | 'VALIDATED' | 'LOCKED';
  cutoffDate?: string | null;
  cutoffTime?: string | null;
  allowCommentsAfterCutoff?: boolean;
  meals: Meal[];
  family?: {
    id: string;
    name: string;
    members?: Array<{
      id: string;
      userId?: string;
      name: string;
      role: string;
      canViewAuditLog?: boolean;
    }>;
  };
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export default function WeeklyPlanPage() {
  const { t } = useTranslation();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'plan' | 'shopping' | 'activity'>('plan');

  // Set initial tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'shopping' || tabParam === 'activity') {
      setActiveTab(tabParam as 'shopping' | 'activity');
    }
  }, [searchParams]);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [portionDialogOpen, setPortionDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [newPortions, setNewPortions] = useState(4);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [switchTemplateDialogOpen, setSwitchTemplateDialogOpen] = useState(false);
  const [addMealDialogOpen, setAddMealDialogOpen] = useState(false);
  const [saveAsRecipeDialogOpen, setSaveAsRecipeDialogOpen] = useState(false);
  const [componentEditorOpen, setComponentEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newMealDay, setNewMealDay] = useState('MONDAY');
  const [newMealType, setNewMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('DINNER');
  const [recipeName, setRecipeName] = useState('');
  const [recipeNameEn, setRecipeNameEn] = useState('');

  // Day names mapping
  const getDayName = (day: string): string => {
    const dayMap: Record<string, string> = {
      MONDAY: t('days.monday'),
      TUESDAY: t('days.tuesday'),
      WEDNESDAY: t('days.wednesday'),
      THURSDAY: t('days.thursday'),
      FRIDAY: t('days.friday'),
      SATURDAY: t('days.saturday'),
      SUNDAY: t('days.sunday')
    };
    return dayMap[day] || day;
  };

  // Fetch weekly plan
  const { data: planData, isLoading: isPlanLoading, refetch } = useQuery({
    queryKey: ['weeklyPlan', planId],
    queryFn: async () => {
      const response = await weeklyPlanAPI.getById(planId!);
      return response.data.data.plan as WeeklyPlan;
    },
    enabled: !!planId
  });

  // Get current user's family member from plan data (already includes family.members)
  const currentMember = planData?.family?.members?.find((m: any) => m.userId === user?.id);

  // Use permissions hook
  const permissions = usePermissions(
    currentMember?.role as 'ADMIN' | 'PARENT' | 'MEMBER' | 'CHILD' | undefined,
    planData,
    currentMember?.canViewAuditLog ?? true
  );

  // Fetch recipes for swap dialog
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await recipeAPI.getAll({ page: 1, limit: 50 });
      return response.data.data.recipes as Recipe[];
    },
    enabled: swapDialogOpen
  });

  // Fetch meal templates
  const { data: templates } = useQuery({
    queryKey: ['mealTemplates', planData?.family?.id],
    queryFn: async () => {
      if (!planData?.family?.id) return [];
      const response = await mealTemplateAPI.getAll(planData.family.id);
      return response.data.data.templates;
    },
    enabled: !!planData?.family?.id && switchTemplateDialogOpen
  });

  // Swap meal mutation
  const swapMutation = useMutation({
    mutationFn: ({ mealId, newRecipeId }: { mealId: string; newRecipeId: string }) =>
      weeklyPlanAPI.swapMeal(planId!, mealId, { newRecipeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
      setSwapDialogOpen(false);
      setSelectedMeal(null);
      setSelectedRecipeId('');
    }
  });

  // Adjust portions mutation
  const adjustPortionsMutation = useMutation({
    mutationFn: ({ mealId, portions }: { mealId: string; portions: number }) =>
      weeklyPlanAPI.adjustPortions(planId!, mealId, { portions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
      setPortionDialogOpen(false);
      setSelectedMeal(null);
    }
  });

  // Lock/unlock meal mutation
  const toggleLockMutation = useMutation({
    mutationFn: ({ mealId, isLocked }: { mealId: string; isLocked: boolean }) =>
      weeklyPlanAPI.lockMeal(planId!, mealId, { isLocked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
    }
  });

  // Validate plan mutation
  const validateMutation = useMutation({
    mutationFn: () => weeklyPlanAPI.validate(planId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
    }
  });

  // Switch template mutation
  const switchTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      weeklyPlanAPI.switchTemplate(planId!, { templateId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
      setSwitchTemplateDialogOpen(false);
      setSelectedTemplate(null);
    }
  });

  // Add meal mutation
  const addMealMutation = useMutation({
    mutationFn: ({ dayOfWeek, mealType }: { dayOfWeek: string; mealType: string }) =>
      weeklyPlanAPI.addMeal(planId!, { dayOfWeek, mealType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
      setAddMealDialogOpen(false);
    }
  });

  // Remove meal mutation
  const removeMealMutation = useMutation({
    mutationFn: (mealId: string) => weeklyPlanAPI.removeMeal(planId!, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
    }
  });

  // Save component meal as recipe mutation
  const saveAsRecipeMutation = useMutation({
    mutationFn: ({ mealId, recipeName, recipeNameEn }: { mealId: string; recipeName?: string; recipeNameEn?: string }) =>
      weeklyPlanAPI.saveAsRecipe(planId!, mealId, { recipeName, recipeNameEn }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weeklyPlan', planId] });
      setSaveAsRecipeDialogOpen(false);
      setSelectedMeal(null);
      setRecipeName('');
      setRecipeNameEn('');
    }
  });

  const handleSwapClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setSwapDialogOpen(true);
  };

  const handleSwapConfirm = () => {
    if (selectedMeal && selectedRecipeId) {
      swapMutation.mutate({ mealId: selectedMeal.id, newRecipeId: selectedRecipeId });
    }
  };

  const handlePortionClick = (meal: Meal) => {
    setSelectedMeal(meal);
    setNewPortions(meal.portions);
    setPortionDialogOpen(true);
  };

  const handlePortionConfirm = () => {
    if (selectedMeal && newPortions > 0) {
      adjustPortionsMutation.mutate({ mealId: selectedMeal.id, portions: newPortions });
    }
  };

  const handleToggleLock = (meal: Meal) => {
    toggleLockMutation.mutate({ mealId: meal.id, isLocked: !meal.locked });
  };

  const handleValidate = () => {
    if (window.confirm(t('weeklyPlan.dialogs.validatePlan'))) {
      validateMutation.mutate();
    }
  };


  const handleSwitchTemplate = () => {
    setSwitchTemplateDialogOpen(true);
  };

  const handleConfirmSwitchTemplate = () => {
    if (selectedTemplate) {
      switchTemplateMutation.mutate(selectedTemplate);
    }
  };

  const handleAddMeal = () => {
    setAddMealDialogOpen(true);
  };

  const handleConfirmAddMeal = () => {
    addMealMutation.mutate({ dayOfWeek: newMealDay, mealType: newMealType });
  };

  const handleRemoveMeal = (mealId: string) => {
    if (window.confirm(t('weeklyPlan.dialogs.confirmRemoveMeal'))) {
      removeMealMutation.mutate(mealId);
    }
  };

  const handleSaveAsRecipe = (meal: Meal) => {
    setSelectedMeal(meal);
    // Generate default names from components
    if (meal.mealComponents && meal.mealComponents.length > 0) {
      const names = meal.mealComponents.map(mc => mc.component.name);
      const namesEn = meal.mealComponents.map(mc => mc.component.nameEn || mc.component.name);
      setRecipeName(names.join(' avec '));
      setRecipeNameEn(namesEn.join(' with '));
    }
    setSaveAsRecipeDialogOpen(true);
  };

  const handleConfirmSaveAsRecipe = () => {
    if (selectedMeal) {
      saveAsRecipeMutation.mutate({
        mealId: selectedMeal.id,
        recipeName: recipeName || undefined,
        recipeNameEn: recipeNameEn || undefined
      });
    }
  };

  const getMealCount = (template: any) => {
    if (!template.schedule) return 0;
    return template.schedule.reduce((count: number, day: any) => {
      return count + (day.mealTypes?.length || 0);
    }, 0);
  };

  // Get component icon/emoji based on category
  const getComponentIcon = (category: string): string => {
    const icons: Record<string, string> = {
      PROTEIN: '🍗',
      VEGETABLE: '🥦',
      CARB: '🍚',
      FRUIT: '🍎',
      SAUCE: '🥫',
      CONDIMENT: '🧂',
      SPICE: '🌶️',
      OTHER: '🍽️'
    };
    return icons[category] || '🍽️';
  };

  if (isPlanLoading || !planData) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('weeklyPlan.loading')}</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalTime = planData.meals.reduce(
    (sum, meal) => sum + (meal.recipe ? meal.recipe.prepTime + meal.recipe.cookTime : 0),
    0
  );
  const favoriteCount = planData.meals.filter(m => m.recipe?.isFavorite).length;
  const noveltyCount = planData.meals.filter(m => m.recipe?.isNovelty).length;

  // Organize meals by day
  const mealsByDay = DAYS.map(day => ({
    day,
    breakfast: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'BREAKFAST'),
    lunch: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'LUNCH'),
    dinner: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'DINNER'),
    snack: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'SNACK')
  }));

  const getStatusText = (status: string): string => {
    if (status === 'DRAFT') return t('weeklyPlan.status.draft');
    if (status === 'IN_VALIDATION') return t('weeklyPlan.status.inValidation');
    if (status === 'VALIDATED') return t('weeklyPlan.status.validated');
    if (status === 'LOCKED') return t('weeklyPlan.status.locked');
    return status;
  };

  const toggleComments = (mealId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [mealId]: !prev[mealId]
    }));
  };

  const getMealTypeLabel = (mealType: string): string => {
    const mealTypeMap: Record<string, string> = {
      BREAKFAST: t('weeklyPlan.mealTypes.breakfast'),
      LUNCH: t('weeklyPlan.mealTypes.lunch'),
      DINNER: t('weeklyPlan.mealTypes.dinner'),
      SNACK: t('weeklyPlan.mealTypes.snack')
    };
    return mealTypeMap[mealType] || mealType;
  };

  const renderMealCard = (meal: Meal) => {
    // Component-based meal (has components but no recipe)
    if (!meal.recipe && meal.mealComponents && meal.mealComponents.length > 0) {
      const componentNames = meal.mealComponents
        .map(mc => `${getComponentIcon(mc.component.category)} ${mc.component.name}`)
        .join(' + ');

      return (
        <div key={meal.id} className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{getMealTypeLabel(meal.mealType)}</Badge>
                <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('mealBuilder.quickMeal')}
                </Badge>
                {meal.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <h3 className="font-semibold text-lg">{componentNames}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('weeklyPlan.portions', { count: meal.portions })} · {meal.mealComponents.length} {t('mealBuilder.preview.components', { count: meal.mealComponents.length })}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {meal.mealComponents.map(mc => (
                  <Badge key={mc.id} variant="outline" className="text-xs">
                    {mc.quantity}{mc.unit} {mc.component.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {planData.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  setSelectedMeal(meal);
                  setComponentEditorOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit className="h-3 w-3 mr-1" />
                {t('weeklyPlan.actions.editComponents')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveAsRecipe(meal)}
              disabled={planData.status !== 'DRAFT'}
            >
              <Heart className="h-3 w-3 mr-1" />
              {t('mealBuilder.saveAsRecipe')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePortionClick(meal)}
            >
              {t('weeklyPlan.actions.adjustPortions')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleToggleLock(meal)}
              disabled={planData.status !== 'DRAFT'}
            >
              {meal.locked ? (
                <Unlock className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </Button>
            {planData.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveMeal(meal.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Comments Section */}
          {permissions.canComment && (
            <div className="mt-3 pt-3 border-t">
              <CommentButton
                planId={planId!}
                mealId={meal.id}
                isExpanded={expandedComments[meal.id] || false}
                onClick={() => toggleComments(meal.id)}
              />
              {expandedComments[meal.id] && (
                <div className="mt-3">
                  <MealComments
                    planId={planId!}
                    mealId={meal.id}
                    currentMemberId={currentMember?.id}
                    currentMemberRole={currentMember?.role}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // No recipe and no components
    if (!meal.recipe) {
      return (
        <div key={meal.id} className="border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">{getMealTypeLabel(meal.mealType)}</Badge>
                {meal.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
              </div>
              <h3 className="font-semibold text-muted-foreground">{t('weeklyPlan.noRecipe')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('weeklyPlan.portions', { count: meal.portions })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSwapClick(meal)}
              disabled={planData.status !== 'DRAFT'}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('weeklyPlan.actions.selectRecipe')}
            </Button>
            {planData.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedMeal(meal);
                  setComponentEditorOpen(true);
                }}
                className="bg-blue-50 hover:bg-blue-100"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {t('mealBuilder.buildFromScratch')}
              </Button>
            )}
            {planData.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveMeal(meal.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Comments Section */}
          {permissions.canComment && (
            <div className="mt-3 pt-3 border-t">
              <CommentButton
                planId={planId!}
                mealId={meal.id}
                isExpanded={expandedComments[meal.id] || false}
                onClick={() => toggleComments(meal.id)}
              />
              {expandedComments[meal.id] && (
                <div className="mt-3">
                  <MealComments
                    planId={planId!}
                    mealId={meal.id}
                    currentMemberId={currentMember?.id}
                    currentMemberRole={currentMember?.role}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={meal.id} className="border rounded-lg p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{getMealTypeLabel(meal.mealType)}</Badge>
              {meal.recipe.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
              {meal.locked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <h3 className="font-semibold">{meal.recipe.title}</h3>
            <p className="text-sm text-muted-foreground">
              {t('weeklyPlan.minutes', { count: meal.recipe.prepTime + meal.recipe.cookTime })} · {t('weeklyPlan.portions', { count: meal.portions })}
            </p>
            {meal.recipe.category && (
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-xs">
                  {meal.recipe.category}
                </Badge>
                {meal.recipe.cuisine && (
                  <Badge variant="outline" className="text-xs">
                    {meal.recipe.cuisine}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSwapClick(meal)}
            disabled={planData.status !== 'DRAFT'}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('weeklyPlan.actions.swap')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePortionClick(meal)}
          >
            {t('weeklyPlan.actions.adjustPortions')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleToggleLock(meal)}
            disabled={planData.status !== 'DRAFT'}
          >
            {meal.locked ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </Button>
          {planData.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleRemoveMeal(meal.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Comments Section */}
        {permissions.canComment && (
          <div className="mt-3 pt-3 border-t">
            <CommentButton
              planId={planId!}
              mealId={meal.id}
              isExpanded={expandedComments[meal.id] || false}
              onClick={() => toggleComments(meal.id)}
            />
            {expandedComments[meal.id] && (
              <div className="mt-3">
                <MealComments
                  planId={planId!}
                  mealId={meal.id}
                  currentMemberId={currentMember?.id}
                  currentMemberRole={currentMember?.role}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {t('weeklyPlan.week', { number: planData.weekNumber, year: planData.year })}
          </h1>
          <Badge variant={planData.status === 'VALIDATED' ? 'default' : 'secondary'}>
            {getStatusText(planData.status)}
          </Badge>
        </div>
        <LanguageSwitcher />
      </div>

      {/* Cutoff Warning Banner */}
      {permissions.cutoffInfo.hasCutoff && (
        <Card className={`mb-6 ${permissions.cutoffInfo.isPassed ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${permissions.cutoffInfo.isPassed ? 'text-red-600' : 'text-yellow-600'}`} />
              <div className="flex-1">
                {permissions.cutoffInfo.isPassed ? (
                  <>
                    <p className="font-semibold text-red-900">
                      {t('permissions.cutoffPassed')}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {planData.allowCommentsAfterCutoff
                        ? t('permissions.commentsStillAllowed')
                        : t('permissions.noChangesAllowed')}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-yellow-900">
                      {t('permissions.cutoffSoon', {
                        hours: permissions.cutoffInfo.hoursUntilCutoff,
                        date: permissions.cutoffInfo.cutoffDate?.toLocaleString()
                      })}
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {t('permissions.cutoffWarning')}
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'plan'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('weeklyPlan.tabs.plan')}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('shopping')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'shopping'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t('weeklyPlan.tabs.shopping')}
            </div>
          </button>
          {permissions.canViewAuditLog && (
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'activity'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('weeklyPlan.tabs.activity')}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Shopping Tab */}
      {activeTab === 'shopping' && (
        <ShoppingListView planId={planId!} showPrintButton={true} />
      )}

      {/* Activity Feed Tab */}
      {activeTab === 'activity' && permissions.canViewAuditLog && (
        <PlanActivityFeed planId={planId!} />
      )}

      {/* Plan Tab */}
      {activeTab === 'plan' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('weeklyPlan.stats.totalTime')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">
                {t('weeklyPlan.hours', { count: Math.round(totalTime / 60) })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('weeklyPlan.stats.favorites')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{favoriteCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('weeklyPlan.stats.novelties')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold">{noveltyCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('weeklyPlan.stats.meals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{planData.meals.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {planData.status === 'DRAFT' && (
          <>
            <Button
              onClick={handleValidate}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? t('weeklyPlan.actions.validating') : t('weeklyPlan.actions.validate')}
            </Button>
            <Button
              variant="outline"
              onClick={handleSwitchTemplate}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {t('weeklyPlan.actions.changePattern')}
            </Button>
            <Button
              variant="outline"
              onClick={handleAddMeal}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('weeklyPlan.actions.addMeal')}
            </Button>
          </>
        )}
      </div>
      {/* Meal Grid */}
      <div className="space-y-4">
        {mealsByDay.map(({ day, breakfast, lunch, dinner, snack }) => {
          const dayMeals = [breakfast, lunch, dinner, snack].filter(Boolean) as Meal[];

          return (
            <Card key={day}>
              <CardHeader>
                <CardTitle>{getDayName(day)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {breakfast && renderMealCard(breakfast)}
                {lunch && renderMealCard(lunch)}
                {dinner && renderMealCard(dinner)}
                {snack && renderMealCard(snack)}

                {/* Empty state or Add Meal button */}
                {dayMeals.length === 0 && planData.status === 'DRAFT' && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm mb-4">{t('weeklyPlan.noMeals')}</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewMealDay(day);
                        setAddMealDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('weeklyPlan.actions.addMealForDay')}
                    </Button>
                  </div>
                )}

                {/* Day-specific Add Meal button (when there are existing meals) */}
                {dayMeals.length > 0 && planData.status === 'DRAFT' && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setNewMealDay(day);
                      setAddMealDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('weeklyPlan.actions.addMealForDay')}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
        </>
      )}

      {/* Swap Recipe Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('weeklyPlan.dialogs.swapRecipe.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {recipesData?.map((recipe) => (
              <div
                key={recipe.id}
                className={`p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  selectedRecipeId === recipe.id ? 'border-primary bg-accent' : ''
                }`}
                onClick={() => setSelectedRecipeId(recipe.id)}
              >
                <h4 className="font-semibold">{recipe.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('weeklyPlan.minutes', { count: recipe.prepTime + recipe.cookTime })} · {recipe.category}
                </p>
                {recipe.cuisine && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {recipe.cuisine}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>
              {t('weeklyPlan.dialogs.swapRecipe.cancel')}
            </Button>
            <Button
              onClick={handleSwapConfirm}
              disabled={!selectedRecipeId || swapMutation.isPending}
            >
              {swapMutation.isPending ? t('weeklyPlan.actions.swapping') : t('weeklyPlan.dialogs.swapRecipe.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Portions Dialog */}
      <Dialog open={portionDialogOpen} onOpenChange={setPortionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('weeklyPlan.dialogs.adjustPortions.title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              {t('weeklyPlan.dialogs.adjustPortions.label')}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={newPortions}
              onChange={(e) => setNewPortions(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortionDialogOpen(false)}>
              {t('weeklyPlan.dialogs.adjustPortions.cancel')}
            </Button>
            <Button
              onClick={handlePortionConfirm}
              disabled={adjustPortionsMutation.isPending}
            >
              {adjustPortionsMutation.isPending ? t('weeklyPlan.actions.adjusting') : t('weeklyPlan.dialogs.adjustPortions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Switch Template Dialog */}
      <Dialog open={switchTemplateDialogOpen} onOpenChange={setSwitchTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('weeklyPlan.dialogs.switchTemplate.title')}</DialogTitle>
            <DialogDescription>
              {t('weeklyPlan.dialogs.switchTemplate.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-destructive mb-4">
              {t('weeklyPlan.dialogs.switchTemplate.warning')}
            </p>
            <div className="space-y-3">
              {templates && templates.map((template: any) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`relative flex items-start space-x-4 p-4 rounded-lg border-2 transition-all text-left w-full ${
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSwitchTemplateDialogOpen(false);
                setSelectedTemplate(null);
              }}
              disabled={switchTemplateMutation.isPending}
            >
              {t('weeklyPlan.dialogs.switchTemplate.cancel')}
            </Button>
            <Button
              onClick={handleConfirmSwitchTemplate}
              disabled={!selectedTemplate || switchTemplateMutation.isPending}
            >
              {switchTemplateMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('weeklyPlan.actions.switchingTemplate')}
                </>
              ) : (
                t('weeklyPlan.dialogs.switchTemplate.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Meal Dialog */}
      <Dialog open={addMealDialogOpen} onOpenChange={setAddMealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('weeklyPlan.dialogs.addMealDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('weeklyPlan.dialogs.addMealDialog.dayLabel')}
              </label>
              <select
                value={newMealDay}
                onChange={(e) => setNewMealDay(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>{getDayName(day)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('weeklyPlan.dialogs.addMealDialog.mealTypeLabel')}
              </label>
              <select
                value={newMealType}
                onChange={(e) => setNewMealType(e.target.value as 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="BREAKFAST">{t('weeklyPlan.mealTypes.breakfast')}</option>
                <option value="LUNCH">{t('weeklyPlan.mealTypes.lunch')}</option>
                <option value="DINNER">{t('weeklyPlan.mealTypes.dinner')}</option>
                <option value="SNACK">{t('weeklyPlan.mealTypes.snack')}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMealDialogOpen(false)}>
              {t('weeklyPlan.dialogs.addMealDialog.cancel')}
            </Button>
            <Button
              onClick={handleConfirmAddMeal}
              disabled={addMealMutation.isPending}
            >
              {addMealMutation.isPending ? t('common.loading') : t('weeklyPlan.dialogs.addMealDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Recipe Dialog */}
      <Dialog open={saveAsRecipeDialogOpen} onOpenChange={setSaveAsRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('mealBuilder.saveRecipeModal.title')}</DialogTitle>
            <DialogDescription>
              {t('mealBuilder.saveRecipeModal.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('mealBuilder.saveRecipeModal.nameLabel')} (FR)
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder={t('mealBuilder.saveRecipeModal.namePlaceholder')}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t('mealBuilder.saveRecipeModal.nameLabel')} (EN)
              </label>
              <input
                type="text"
                value={recipeNameEn}
                onChange={(e) => setRecipeNameEn(e.target.value)}
                placeholder={t('mealBuilder.saveRecipeModal.namePlaceholder')}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsRecipeDialogOpen(false)}>
              {t('mealBuilder.saveRecipeModal.cancel')}
            </Button>
            <Button
              onClick={handleConfirmSaveAsRecipe}
              disabled={saveAsRecipeMutation.isPending}
            >
              {saveAsRecipeMutation.isPending ? t('common.loading') : t('mealBuilder.saveRecipeModal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meal Component Editor Dialog */}
      {selectedMeal && planId && planData?.family?.id && (
        <MealComponentEditor
          open={componentEditorOpen}
          onOpenChange={setComponentEditorOpen}
          planId={planId}
          mealId={selectedMeal.id}
          familyId={planData.family.id}
          mealComponents={selectedMeal.mealComponents || []}
          portions={selectedMeal.portions}
          onUpdate={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
