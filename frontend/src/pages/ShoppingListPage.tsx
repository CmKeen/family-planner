import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { shoppingListAPI } from '@/lib/api';
import { ArrowLeft, Check, ShoppingCart, Printer } from 'lucide-react';

interface ShoppingItem {
  id: string;
  ingredientName: string;
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
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'category' | 'recipe'>('category');

  // Fetch shopping list
  const { data: shoppingData, isLoading } = useQuery({
    queryKey: ['shoppingList', planId],
    queryFn: async () => {
      const response = await shoppingListAPI.getByPlanId(planId!);
      return response.data.data.shoppingList as ShoppingList;
    },
    enabled: !!planId
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
    navigate(`/weekly-plan/${planId}`);
  };

  if (isLoading || !shoppingData) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la liste...</p>
        </div>
      </div>
    );
  }

  // Group items by category
  const itemsByCategory = shoppingData.items.reduce((acc, item) => {
    const category = item.category || 'Autres';
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
      if (!acc['Autres']) {
        acc['Autres'] = [];
      }
      acc['Autres'].push(item);
    }
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const totalItems = shoppingData.items.length;
  const checkedItems = shoppingData.items.filter(item => item.checked).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const categoryOrder = [
    'Viandes',
    'Poissons',
    'Fruits et légumes',
    'Produits laitiers',
    'Épicerie',
    'Condiments',
    'Autres'
  ];

  const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="container mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Liste de courses
          </h1>
          <p className="text-sm text-muted-foreground">
            Générée le {new Date(shoppingData.generatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer
        </Button>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold mb-2">Liste de courses</h1>
        <p className="text-sm text-muted-foreground">
          Générée le {new Date(shoppingData.generatedAt).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* Progress Card */}
      <Card className="mb-6 print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Progression</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {checkedItems} sur {totalItems} articles
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
          <TabsTrigger value="category">Par catégorie</TabsTrigger>
          <TabsTrigger value="recipe">Par recette</TabsTrigger>
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
                    {itemsByCategory[category].length} article{itemsByCategory[category].length > 1 ? 's' : ''}
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
                          {item.quantity} {item.unit} {item.ingredientName}
                        </div>
                        {item.recipeNames && item.recipeNames.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Pour: {item.recipeNames.join(', ')}
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
                    {items.length} article{items.length > 1 ? 's' : ''}
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
                          {item.quantity} {item.unit} {item.ingredientName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Catégorie: {item.category}
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
                    {item.quantity} {item.unit} {item.ingredientName}
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
          <p className="text-muted-foreground">Aucun article dans la liste</p>
        </div>
      )}
    </div>
  );
}
