import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { shoppingListAPI } from '@/lib/api';
import { ArrowLeft, Check, ShoppingCart, Printer } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  recipeNames?: string[];
}

interface ShoppingList {
  id: string;
  weeklyPlanId: string;
  generatedAt: string;
  items: ShoppingItem[];
}

export default function ShoppingListPage() {
  const { t, i18n } = useTranslation();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'category' | 'recipe'>('category');

  // Fetch shopping list
  const { data: shoppingData, isLoading, error, refetch } = useQuery({
    queryKey: ['shoppingList', planId],
    queryFn: async () => {
      const response = await shoppingListAPI.getByPlanId(planId!);
      return response.data.data.shoppingList as ShoppingList;
    },
    enabled: !!planId,
    retry: false // Don't retry on 404
  });

  // Generate shopping list mutation
  const generateMutation = useMutation({
    mutationFn: () => shoppingListAPI.generate(planId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingList', planId] });
      refetch();
    }
  });

  // Toggle item checked mutation
  const toggleCheckMutation = useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      shoppingListAPI.toggleItem(shoppingData!.id, itemId, { checked }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingList', planId] });
    }
  });

  const handleToggleItem = (itemId: string, currentChecked: boolean) => {
    toggleCheckMutation.mutate({ itemId, checked: !currentChecked });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(`/plan/${planId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('shoppingList.loading')}</p>
        </div>
      </div>
    );
  }

  // Show generate button if shopping list doesn't exist (404 error)
  if (error || !shoppingData) {
    return (
      <div className="container mx-auto p-4">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('shoppingList.back')}
          </Button>
          <LanguageSwitcher />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">{t('shoppingList.notFound')}</h2>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              {t('shoppingList.notFoundDescription')}
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? t('shoppingList.generating') : t('shoppingList.generate')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group items by category
  const itemsByCategory = shoppingData.items.reduce((acc, item) => {
    const category = item.category || t('shoppingList.categories.other');
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  // Group items by recipe
  const itemsByRecipe = shoppingData.items.reduce((acc, item) => {
    if (item.recipeNames && item.recipeNames.length > 0) {
      item.recipeNames.forEach(recipeName => {
        if (!acc[recipeName]) {
          acc[recipeName] = [];
        }
        acc[recipeName].push(item);
      });
    } else {
      if (!acc[t('shoppingList.categories.other')]) {
        acc[t('shoppingList.categories.other')] = [];
      }
      acc[t('shoppingList.categories.other')].push(item);
    }
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const totalItems = shoppingData.items.length;
  const checkedItems = shoppingData.items.filter(item => item.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  // Category order - translatable
  const categoryOrder = [
    t('shoppingList.categories.meats'),
    t('shoppingList.categories.fish'),
    t('shoppingList.categories.fruitsVegetables'),
    t('shoppingList.categories.dairy'),
    t('shoppingList.categories.grocery'),
    t('shoppingList.categories.condiments'),
    t('shoppingList.categories.other')
  ];

  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('shoppingList.actions.back')}
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            {t('shoppingList.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('shoppingList.generatedOn', { date: formatDate(shoppingData.generatedAt) })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            {t('shoppingList.actions.print')}
          </Button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('shoppingList.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('shoppingList.generatedOn', { date: formatDate(shoppingData.generatedAt) })}
        </p>
      </div>

      {/* Progress Card */}
      <Card className="mb-6 print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('shoppingList.progress.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('shoppingList.progress.items', { checked: checkedItems, total: totalItems })}
              </span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'category' | 'recipe')} className="mb-6 print:hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="category">{t('shoppingList.viewModes.byCategory')}</TabsTrigger>
          <TabsTrigger value="recipe">{t('shoppingList.viewModes.byRecipe')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category View */}
      {viewMode === 'category' && (
        <div className="space-y-6">
          {sortedCategories.map(category => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{category}</span>
                  <Badge variant="secondary">
                    {itemsByCategory[category].length === 1
                      ? t('shoppingList.articles', { count: itemsByCategory[category].length })
                      : t('shoppingList.articles_plural', { count: itemsByCategory[category].length })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {itemsByCategory[category].map(item => (
                    <li key={item.id} className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleItem(item.id, item.checked)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors print:hidden ${
                          item.checked
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {item.checked && <Check className="h-4 w-4 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <div className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.quantity} {item.unit} {item.name}
                        </div>
                        {item.recipeNames && item.recipeNames.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {t('shoppingList.forRecipes', { recipes: item.recipeNames.join(', ') })}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recipe View */}
      {viewMode === 'recipe' && (
        <div className="space-y-6">
          {Object.entries(itemsByRecipe).map(([recipeName, items]) => (
            <Card key={recipeName}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{recipeName}</span>
                  <Badge variant="secondary">
                    {items.length === 1
                      ? t('shoppingList.articles', { count: items.length })
                      : t('shoppingList.articles_plural', { count: items.length })}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {items.map(item => (
                    <li key={item.id} className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleItem(item.id, item.checked)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors print:hidden ${
                          item.checked
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {item.checked && <Check className="h-4 w-4 text-primary-foreground" />}
                      </button>
                      <div className="flex-1">
                        <div className={`font-medium ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                          {item.quantity} {item.unit} {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {t('shoppingList.categoryLabel', { category: item.category })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Print View - Always show category view */}
      <div className="hidden print:block space-y-6">
        {sortedCategories.map(category => (
          <div key={category} className="mb-6">
            <h2 className="text-lg font-bold mb-3 border-b pb-2">{category}</h2>
            <ul className="space-y-2">
              {itemsByCategory[category].map(item => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="flex-shrink-0">☐</span>
                  <span>
                    {item.quantity} {item.unit} {item.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {totalItems === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('shoppingList.empty')}</p>
        </div>
      )}
    </div>
  );
}
