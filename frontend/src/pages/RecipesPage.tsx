import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { recipeAPI } from '@/lib/api';
import { Heart, Clock, Users, Search, Filter } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface Instruction {
  id: string;
  stepNumber: number;
  description: string;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  category: string;
  tags: string[];
  isFavorite: boolean;
  kosherCategory?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
}

export default function RecipesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    maxTime: '',
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    kosher: false,
    halal: false
  });

  // Categories mapping
  const categories = [
    { value: 'all', label: t('recipes.categories.all') },
    { value: 'Viandes', label: t('recipes.categories.meats') },
    { value: 'Poissons', label: t('recipes.categories.fish') },
    { value: 'Pâtes', label: t('recipes.categories.pasta') },
    { value: 'Légumes', label: t('recipes.categories.vegetables') },
    { value: 'Soupes', label: t('recipes.categories.soups') },
    { value: 'Salades', label: t('recipes.categories.salads') }
  ];

  // Fetch recipes
  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes', searchQuery, selectedCategory, filters],
    queryFn: async () => {
      const params: Record<string, any> = {
        page: 1,
        limit: 50
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
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">{t('recipes.title')}</h1>

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
          <TabsList className="w-full overflow-x-auto flex">
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
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleRecipeClick(recipe)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{recipe.name}</CardTitle>
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
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {recipe.description}
                </p>

                <div className="flex flex-wrap gap-3 text-sm mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{t('recipes.card.minutes', { count: recipe.prepTime + recipe.cookTime })}</span>
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
                  {recipe.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {recipe.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      {t('recipes.card.more', { count: recipe.tags.length - 2 })}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {recipeDetails && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl pr-8">{recipeDetails.name}</DialogTitle>
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
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <p className="text-muted-foreground">{recipeDetails.description}</p>

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
                  {recipeDetails.tags.map(tag => (
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
                          {ingredient.quantity} {ingredient.unit} {ingredient.name}
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
                          <p className="flex-1 pt-0.5">{instruction.description}</p>
                        </li>
                      ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
