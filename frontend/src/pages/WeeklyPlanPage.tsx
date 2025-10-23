import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { weeklyPlanAPI, recipeAPI } from '@/lib/api';
import { ArrowLeft, Clock, Heart, Sparkles, Lock, Unlock, RefreshCw } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  prepTime: number;
  cookTime: number;
  category: string;
  tags: string[];
}

interface Meal {
  id: string;
  dayOfWeek: string;
  mealType: 'LUNCH' | 'DINNER';
  recipe: Recipe;
  portions: number;
  isLocked: boolean;
  isFavorite: boolean;
}

interface WeeklyPlan {
  id: string;
  weekNumber: number;
  year: number;
  status: 'DRAFT' | 'VALIDATED' | 'ARCHIVED';
  meals: Meal[];
}

const DAYS_FR = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const DAY_NAMES_FR: Record<string, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche'
};

export default function WeeklyPlanPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [portionDialogOpen, setPortionDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [newPortions, setNewPortions] = useState(4);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');

  // Fetch weekly plan
  const { data: planData, isLoading: isPlanLoading } = useQuery({
    queryKey: ['weeklyPlan', planId],
    queryFn: async () => {
      const response = await weeklyPlanAPI.getById(planId!);
      return response.data.data.plan as WeeklyPlan;
    },
    enabled: !!planId
  });

  // Fetch recipes for swap dialog
  const { data: recipesData } = useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const response = await recipeAPI.getAll({ page: 1, limit: 50 });
      return response.data.data.recipes as Recipe[];
    },
    enabled: swapDialogOpen
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
    toggleLockMutation.mutate({ mealId: meal.id, isLocked: !meal.isLocked });
  };

  const handleValidate = () => {
    if (window.confirm('Valider ce plan hebdomadaire ? Cela générera la liste de courses.')) {
      validateMutation.mutate();
    }
  };

  const handleNavigateToShopping = () => {
    navigate(`/shopping-list/${planData?.id}`);
  };

  if (isPlanLoading || !planData) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du plan...</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalTime = planData.meals.reduce(
    (sum, meal) => sum + meal.recipe.prepTime + meal.recipe.cookTime,
    0
  );
  const favoriteCount = planData.meals.filter(m => m.isFavorite).length;
  const noveltyCount = planData.meals.filter(m => !m.isFavorite).length;

  // Organize meals by day
  const mealsByDay = DAYS_FR.map(day => ({
    day,
    lunch: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'LUNCH'),
    dinner: planData.meals.find(m => m.dayOfWeek === day && m.mealType === 'DINNER')
  }));

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            Semaine {planData.weekNumber} - {planData.year}
          </h1>
          <Badge variant={planData.status === 'VALIDATED' ? 'default' : 'secondary'}>
            {planData.status === 'DRAFT' ? 'Brouillon' : 'Validé'}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Temps total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{Math.round(totalTime / 60)}h</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Favoris
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
              Nouveautés
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
              Repas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{planData.meals.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        {planData.status === 'DRAFT' ? (
          <Button
            onClick={handleValidate}
            className="w-full md:w-auto"
            disabled={validateMutation.isPending}
          >
            {validateMutation.isPending ? 'Validation...' : 'Valider le plan'}
          </Button>
        ) : (
          <Button onClick={handleNavigateToShopping} className="w-full md:w-auto">
            Voir la liste de courses
          </Button>
        )}
      </div>

      {/* Meal Grid */}
      <div className="space-y-4">
        {mealsByDay.map(({ day, lunch, dinner }) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{DAY_NAMES_FR[day]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lunch */}
              {lunch && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">Déjeuner</Badge>
                        {lunch.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
                        {lunch.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <h3 className="font-semibold">{lunch.recipe.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {lunch.recipe.prepTime + lunch.recipe.cookTime} min · {lunch.portions} portions
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lunch.recipe.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwapClick(lunch)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Échanger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePortionClick(lunch)}
                    >
                      Portions
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleLock(lunch)}
                    >
                      {lunch.isLocked ? (
                        <Unlock className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Dinner */}
              {dinner && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">Dîner</Badge>
                        {dinner.isFavorite && <Heart className="h-4 w-4 fill-red-500 text-red-500" />}
                        {dinner.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <h3 className="font-semibold">{dinner.recipe.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {dinner.recipe.prepTime + dinner.recipe.cookTime} min · {dinner.portions} portions
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {dinner.recipe.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSwapClick(dinner)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Échanger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePortionClick(dinner)}
                    >
                      Portions
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleLock(dinner)}
                    >
                      {dinner.isLocked ? (
                        <Unlock className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Swap Recipe Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Échanger la recette</DialogTitle>
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
                <h4 className="font-semibold">{recipe.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {recipe.prepTime + recipe.cookTime} min · {recipe.category}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {recipe.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSwapDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSwapConfirm}
              disabled={!selectedRecipeId || swapMutation.isPending}
            >
              {swapMutation.isPending ? 'Échange...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Portions Dialog */}
      <Dialog open={portionDialogOpen} onOpenChange={setPortionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster les portions</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Nombre de portions
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
              Annuler
            </Button>
            <Button
              onClick={handlePortionConfirm}
              disabled={adjustPortionsMutation.isPending}
            >
              {adjustPortionsMutation.isPending ? 'Ajustement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
