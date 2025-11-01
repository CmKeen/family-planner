import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { foodComponentAPI, mealComponentAPI } from '@/lib/api';
import { X, Plus, ArrowLeftRight, Trash2 } from 'lucide-react';

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

interface MealComponentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  mealId: string;
  familyId: string;
  mealComponents: MealComponent[];
  portions: number;
  onUpdate: () => void;
}

const COMPONENT_CATEGORIES = [
  'PROTEIN',
  'VEGETABLE',
  'CARB',
  'FRUIT',
  'SAUCE',
  'CONDIMENT',
  'SPICE',
  'OTHER',
];

const COMPONENT_ROLES = [
  'MAIN_PROTEIN',
  'SECONDARY_PROTEIN',
  'PRIMARY_VEGETABLE',
  'SECONDARY_VEGETABLE',
  'BASE_CARB',
  'SIDE_CARB',
  'SAUCE',
  'GARNISH',
  'OTHER',
];

const getComponentIcon = (category: string): string => {
  const icons: Record<string, string> = {
    PROTEIN: '🍗',
    VEGETABLE: '🥦',
    CARB: '🍚',
    FRUIT: '🍎',
    SAUCE: '🥫',
    CONDIMENT: '🧂',
    SPICE: '🌶️',
    OTHER: '🍽️',
  };
  return icons[category] || '🍽️';
};

export const MealComponentEditor: React.FC<MealComponentEditorProps> = ({
  open,
  onOpenChange,
  planId,
  mealId,
  familyId,
  mealComponents,
  portions,
  onUpdate,
}) => {
  const { t, i18n } = useTranslation();
  const [components, setComponents] = useState<FoodComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddComponent, setShowAddComponent] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [newUnit, setNewUnit] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('OTHER');
  const [swapMode, setSwapMode] = useState<{ mealComponentId: string; category: string } | null>(null);

  useEffect(() => {
    if (open && familyId) {
      loadComponents();
    }
  }, [open, familyId]);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const response = await foodComponentAPI.getAll({ familyId });
      setComponents(response.data);
    } catch (error) {
      console.error('Failed to load components:', error);
    } finally {
      setLoading(false);
    }
  };

  const getComponentName = (component: FoodComponent): string => {
    const lang = i18n.language;
    if (lang === 'en' && component.nameEn) return component.nameEn;
    if (lang === 'nl' && component.nameNl) return component.nameNl;
    return component.name;
  };

  const handleAddComponent = async () => {
    if (!selectedComponentId) return;

    const selectedComponent = components.find((c) => c.id === selectedComponentId);
    if (!selectedComponent) return;

    try {
      setLoading(true);
      await mealComponentAPI.add(planId, mealId, {
        componentId: selectedComponentId,
        quantity: parseFloat(newQuantity) || selectedComponent.defaultQuantity,
        unit: newUnit || selectedComponent.unit,
        role: newRole,
        order: mealComponents.length,
      });
      setShowAddComponent(false);
      setSelectedComponentId('');
      setNewQuantity('');
      setNewUnit('');
      setNewRole('OTHER');
      onUpdate();
    } catch (error) {
      console.error('Failed to add component:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveComponent = async (mealComponentId: string) => {
    try {
      setLoading(true);
      await mealComponentAPI.remove(planId, mealId, mealComponentId);
      onUpdate();
    } catch (error) {
      console.error('Failed to remove component:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapComponent = async (newComponentId: string) => {
    if (!swapMode) return;

    const newComponent = components.find((c) => c.id === newComponentId);
    if (!newComponent) return;

    try {
      setLoading(true);
      await mealComponentAPI.swap(planId, mealId, swapMode.mealComponentId, {
        newComponentId,
        quantity: newComponent.defaultQuantity,
        unit: newComponent.unit,
      });
      setSwapMode(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to swap component:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredComponents = components.filter(
    (component) =>
      selectedCategory === 'all' || component.category === selectedCategory
  );

  const availableComponentsForSwap = swapMode
    ? components.filter((c) => c.category === swapMode.category)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('mealBuilder.title')}</DialogTitle>
          <DialogDescription>
            {t('mealBuilder.description')} ({t('mealBuilder.portions', { count: portions })})
          </DialogDescription>
        </DialogHeader>

        <div className="h-[60vh] overflow-y-auto pr-4">
          {/* Current Components */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {t('mealBuilder.preview.title')}
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddComponent(true)}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('components.actions.add')}
              </Button>
            </div>

            {mealComponents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('components.noComponents')}
              </p>
            ) : (
              <div className="space-y-2">
                {mealComponents.map((mc) => (
                  <div
                    key={mc.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getComponentIcon(mc.component.category)}
                      </span>
                      <div>
                        <p className="font-medium">{getComponentName(mc.component)}</p>
                        <p className="text-sm text-muted-foreground">
                          {mc.quantity} {mc.unit} {t('components.perPerson')} •{' '}
                          {t(`components.roles.${mc.role}`)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setSwapMode({
                            mealComponentId: mc.id,
                            category: mc.component.category,
                          })
                        }
                        disabled={loading}
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveComponent(mc.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Component Section */}
          {showAddComponent && (
            <div className="space-y-4 p-4 border rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{t('components.actions.add')}</h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddComponent(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('components.filters.category')}</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('components.categories.all')}</SelectItem>
                      {COMPONENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {t(`components.categories.${cat}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('components.actions.selectComponent')}</Label>
                  <Select
                    value={selectedComponentId}
                    onValueChange={(value) => {
                      setSelectedComponentId(value);
                      const comp = components.find((c) => c.id === value);
                      if (comp) {
                        setNewQuantity(comp.defaultQuantity.toString());
                        setNewUnit(comp.unit);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('components.actions.selectComponent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredComponents.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {getComponentIcon(comp.category)} {getComponentName(comp)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('mealBuilder.adjustQuantity')}</Label>
                  <Input
                    type="number"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="150"
                  />
                </div>

                <div>
                  <Label>{t('components.addCustomModal.unitLabel')}</Label>
                  <Input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="g, ml, piece"
                  />
                </div>

                <div className="col-span-2">
                  <Label>{t('components.roles.MAIN_PROTEIN')}</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {t(`components.roles.${role}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleAddComponent}
                disabled={!selectedComponentId || loading}
                className="w-full"
              >
                {t('mealBuilder.addToMeal')}
              </Button>
            </div>
          )}

          {/* Swap Component Section */}
          {swapMode && (
            <div className="space-y-4 p-4 border rounded-lg mb-6 bg-blue-50">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">
                  {t('mealBuilder.swapComponent.title', {
                    component: getComponentName(
                      mealComponents.find((mc) => mc.id === swapMode.mealComponentId)
                        ?.component || ({} as FoodComponent)
                    ),
                  })}
                </h4>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSwapMode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {availableComponentsForSwap.map((comp) => (
                  <Button
                    key={comp.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSwapComponent(comp.id)}
                    disabled={loading}
                  >
                    {getComponentIcon(comp.category)} {getComponentName(comp)}
                    <span className="ml-auto text-sm text-muted-foreground">
                      {comp.defaultQuantity} {comp.unit}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
