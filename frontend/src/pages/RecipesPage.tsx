import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { recipeAPI, familyAPI } from '@/lib/api';
import { Heart, Clock, Users, Search, Filter, ArrowLeft, Utensils, Pencil } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import ComponentRecipeWizard from '@/components/ComponentRecipeWizard';

interface Ingredient {
  id: string;
  name: string;
  nameEn: string | null;
  quantity: number;
  unit: string;
  category: string;
}

interface Instruction {
  id: string;
  stepNumber: number;
  text: string;
  textEn: string | null;
}

interface Recipe {
  id: string;
  title: string;
  titleEn: string | null;
  description: string | null;
  descriptionEn: string | null;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  category: string;
  mealType: string[];
  isFavorite: boolean;
  isComponentBased?: boolean;
  kosherCategory?: string;
  vegetarian: boolean;
  vegan: boolean;
  glutenFree: boolean;
  halalFriendly: boolean;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
}

export default function RecipesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxTime: '',
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    kosher: false,
    halal: false
  });

  // Fetch families to get familyId
  const { data: families } = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const response = await familyAPI.getAll();
      return response.data.data.families;
    }
  });

  const selectedFamily = families?.[0];

  // Helper function to get text in the current language
  // Works with any language by looking for field with language suffix
  // e.g., getLocalizedField(recipe, 'title') will return 'titleEn' for English
  const getLocalizedField = <T extends Record<string, any>>(obj: T, fieldName: string): string => {
    const currentLang = i18n.language;

    // If current language is French (or default), use base field
    if (currentLang === 'fr') {
      return obj[fieldName] || '';
    }

    // For other languages, look for the field with language suffix
    // e.g., 'en' -> 'titleEn', 'es' -> 'titleEs'
    const langSuffix = currentLang.charAt(0).toUpperCase() + currentLang.slice(1);
    const translatedFieldName = `${fieldName}${langSuffix}`;
    const translatedValue = obj[translatedFieldName];

    // Use translated text if available, otherwise fall back to base field
    return translatedValue || obj[fieldName] || '';
  };

  // Categories mapping - values must match the API's category field exactly (lowercase without accents)
  const categories = [
    { value: 'all', label: t('recipes.categories.all') },
    { value: 'viande', label: t('recipes.categories.meats') },
    { value: 'volaille', label: 'Volaille' },
    { value: 'boeuf', label: 'Boeuf' },
    { value: 'poisson', label: t('recipes.categories.fish') },
    { value: 'pates', label: t('recipes.categories.pasta') },
    { value: 'legume', label: t('recipes.categories.vegetables') },
    { value: 'soupe', label: t('recipes.categories.soups') },
    { value: 'salade', label: t('recipes.categories.salads') },
    { value: 'accompagnement', label: 'Accompagnement' },
    { value: 'legumineuses', label: 'Légumineuses' }
  ];

  // Fetch recipes
  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes', searchQuery, selectedCategory, filters, i18n.language],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: 1,
        limit: 50,
        language: i18n.language // Pass current language for search
      };

      if (searchQuery) params.search = searchQuery;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (filters.maxTime) params.maxTime = parseInt(filters.maxTime);
      if (filters.vegetarian) params.vegetarian = true;
      if (filters.vegan) params.vegan = true;
      if (filters.glutenFree) params.glutenFree = true;
      if (filters.kosher) params.kosher = true;
      if (filters.halal) params.halal = true;

      const response = await recipeAPI.getAll(params);
      return response.data.data.recipes as Recipe[];
    }
  });

  // Fetch recipe details
  const { data: recipeDetails } = useQuery({
    queryKey: ['recipe', selectedRecipe?.id],
    queryFn: async () => {
      const response = await recipeAPI.getById(selectedRecipe!.id);
      return response.data.data.recipe as Recipe;
    },
    enabled: !!selectedRecipe
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (recipeId: string) => recipeAPI.toggleFavorite(recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      if (selectedRecipe) {
        queryClient.invalidateQueries({ queryKey: ['recipe', selectedRecipe.id] });
      }
    }
  });

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setSelectedRecipe(null); // Close detail dialog
    setActiveTab('create'); // Switch to create tab (which will show wizard in edit mode)
  };

  const handleToggleFavorite = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    toggleFavoriteMutation.mutate(recipeId);
  };

  const handleResetFilters = () => {
    setFilters({
      maxTime: '',
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      kosher: false,
      halal: false
    });
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const filteredRecipes = recipesData || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Mobile Optimized */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10 safe-top">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-2">
                <Utensils className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">{t('recipes.title')}</h1>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 pb-20">
        {/* Top-level Browse/Create Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="browse">{t('recipes.tabs.browse')}</TabsTrigger>
            <TabsTrigger value="create">{t('recipes.tabs.create')}</TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse">
      <div className="mb-6">

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('recipes.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-4">
          <TabsList className="w-full overflow-x-auto overflow-y-hidden flex h-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value} className="flex-shrink-0">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full md:w-auto"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? t('recipes.filters.hide') : t('recipes.filters.show')}
          </Button>

          {showFilters && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('recipes.filters.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Time Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('recipes.filters.maxTime')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder={t('recipes.filters.maxTimePlaceholder')}
                    value={filters.maxTime}
                    onChange={(e) => setFilters({ ...filters, maxTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Dietary Filters */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('recipes.filters.dietary')}
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.vegetarian}
                        onChange={(e) => setFilters({ ...filters, vegetarian: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">{t('recipes.filters.vegetarian')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.vegan}
                        onChange={(e) => setFilters({ ...filters, vegan: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">{t('recipes.filters.vegan')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.glutenFree}
                        onChange={(e) => setFilters({ ...filters, glutenFree: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">{t('recipes.filters.glutenFree')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.kosher}
                        onChange={(e) => setFilters({ ...filters, kosher: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">{t('recipes.filters.kosher')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filters.halal}
                        onChange={(e) => setFilters({ ...filters, halal: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">{t('recipes.filters.halal')}</span>
                    </label>
                  </div>
                </div>

                <Button variant="outline" onClick={handleResetFilters} className="w-full">
                  {t('recipes.filters.reset')}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recipe Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('recipes.loading')}</p>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('recipes.noResults')}</p>
          <Button variant="outline" onClick={handleResetFilters} className="mt-4">
            {t('recipes.filters.reset')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              className="cursor-pointer hover:shadow-lg transition-all overflow-hidden group"
              onClick={() => handleRecipeClick(recipe)}
            >
              {/* Recipe Image */}
              {recipe.imageUrl && (
                <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={`http://localhost:3001${recipe.imageUrl}`}
                    alt={getLocalizedField(recipe, 'title')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  {/* Favorite button overlay */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleToggleFavorite(e, recipe.id)}
                    className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm"
                  >
                    <Heart
                      className={`h-5 w-5 ${
                        recipe.isFavorite
                          ? 'fill-red-500 text-red-500'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </Button>
                </div>
              )}

              <CardHeader className={recipe.imageUrl ? 'pb-3' : ''}>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{getLocalizedField(recipe, 'title')}</CardTitle>
                  {!recipe.imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleToggleFavorite(e, recipe.id)}
                      className="ml-2 flex-shrink-0"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          recipe.isFavorite
                            ? 'fill-red-500 text-red-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {getLocalizedField(recipe, 'description')}
                </p>

                <div className="flex flex-wrap gap-3 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{t('recipes.card.minutes', { count: recipe.totalTime })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{t('recipes.card.servings', { count: recipe.servings })}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{recipe.category}</Badge>
                  {recipe.kosherCategory && (
                    <Badge variant="outline">{t('recipes.kosherCategory', { category: recipe.kosherCategory })}</Badge>
                  )}
                  {recipe.mealType?.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {(recipe.mealType?.length || 0) > 2 && (
                    <Badge variant="outline" className="text-xs">
                      {t('recipes.card.more', { count: (recipe.mealType?.length || 0) - 2 })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create">
            {selectedFamily ? (
              <ComponentRecipeWizard
                familyId={selectedFamily.id}
                recipe={editingRecipe || undefined}
                onSuccess={() => {
                  setActiveTab('browse');
                  setEditingRecipe(null); // Clear editing state
                  queryClient.invalidateQueries({ queryKey: ['recipes'] });
                }}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-muted-foreground">{t('common.loading')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {recipeDetails && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl pr-8">{getLocalizedField(recipeDetails, 'title')}</DialogTitle>
                  <div className="flex gap-2">
                    {/* Edit button - only show for component-based recipes */}
                    {recipeDetails.isComponentBased && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRecipe(recipeDetails)}
                      >
                        <Pencil className="h-5 w-5 text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleToggleFavorite(e, recipeDetails.id)}
                    >
                      <Heart
                        className={`h-6 w-6 ${
                          recipeDetails.isFavorite
                            ? 'fill-red-500 text-red-500'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Recipe Image */}
                {recipeDetails.imageUrl && (
                  <div className="relative w-full h-64 md:h-80 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={`http://localhost:3001${recipeDetails.imageUrl}`}
                      alt={getLocalizedField(recipeDetails, 'title')}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Description */}
                <p className="text-muted-foreground">{getLocalizedField(recipeDetails, 'description')}</p>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t('recipes.detail.time')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('recipes.detail.prepTime', { time: recipeDetails.prepTime })} · {t('recipes.detail.cookTime', { time: recipeDetails.cookTime })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t('recipes.detail.servings')}</p>
                      <p className="text-sm text-muted-foreground">{recipeDetails.servings}</p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge>{recipeDetails.category}</Badge>
                  {recipeDetails.kosherCategory && (
                    <Badge variant="outline">{t('recipes.kosherCategory', { category: recipeDetails.kosherCategory })}</Badge>
                  )}
                  {recipeDetails.mealType.map(tag => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Ingredients */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('recipes.detail.ingredients')}</h3>
                  <ul className="space-y-2">
                    {recipeDetails.ingredients.map((ingredient) => (
                      <li key={ingredient.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>
                          {ingredient.quantity} {ingredient.unit} {getLocalizedField(ingredient, 'name')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">{t('recipes.detail.instructions')}</h3>
                  <ol className="space-y-4">
                    {recipeDetails.instructions
                      .sort((a, b) => a.stepNumber - b.stepNumber)
                      .map((instruction) => (
                        <li key={instruction.id} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {instruction.stepNumber}
                          </span>
                          <p className="flex-1 pt-0.5">{getLocalizedField(instruction, 'text')}</p>
                        </li>
                      ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </main>
    </div>
  );
}
