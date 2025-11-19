
describe('Shopping List Algorithm', () => {
  describe('roundQuantity', () => {
    const roundQuantity = (quantity: number, unit: string): number => {
      const unitLower = unit.toLowerCase();

      if (unitLower.includes('kg')) {
        return Math.ceil(quantity * 4) / 4; // Round to 0.25 kg
      }

      if (unitLower.includes('g')) {
        if (quantity < 50) return Math.ceil(quantity / 10) * 10; // Round to 10g
        if (quantity < 200) return Math.ceil(quantity / 25) * 25; // Round to 25g
        return Math.ceil(quantity / 50) * 50; // Round to 50g
      }

      // Check ml before l to avoid matching 'ml' with 'l'
      if (unitLower.includes('ml')) {
        if (quantity < 100) return Math.ceil(quantity / 10) * 10; // Round to 10ml
        return Math.ceil(quantity / 50) * 50; // Round to 50ml
      }

      if (unitLower.includes('l')) {
        if (quantity < 0.5) return Math.ceil(quantity * 10) / 10; // Round to 0.1L
        return Math.ceil(quantity * 4) / 4; // Round to 0.25L
      }

      // For pieces, units, etc.
      return Math.ceil(quantity);
    };

    it('should round kg to 0.25 increments', () => {
      expect(roundQuantity(0.3, 'kg')).toBe(0.5);
      expect(roundQuantity(0.8, 'kg')).toBe(1.0);
      expect(roundQuantity(1.1, 'kg')).toBe(1.25);
      expect(roundQuantity(1.6, 'kg')).toBe(1.75);
    });

    it('should round small grams to 10g increments', () => {
      expect(roundQuantity(5, 'g')).toBe(10);
      expect(roundQuantity(15, 'g')).toBe(20);
      expect(roundQuantity(42, 'g')).toBe(50);
    });

    it('should round medium grams to 25g increments', () => {
      expect(roundQuantity(55, 'g')).toBe(75);
      expect(roundQuantity(120, 'g')).toBe(125);
      expect(roundQuantity(180, 'g')).toBe(200);
    });

    it('should round large grams to 50g increments', () => {
      expect(roundQuantity(220, 'g')).toBe(250);
      expect(roundQuantity(480, 'g')).toBe(500);
      expect(roundQuantity(750, 'g')).toBe(750);
    });

    it('should round small liters to 0.1L increments', () => {
      expect(roundQuantity(0.15, 'L')).toBe(0.2);
      expect(roundQuantity(0.35, 'L')).toBe(0.4);
    });

    it('should round large liters to 0.25L increments', () => {
      expect(roundQuantity(0.6, 'L')).toBe(0.75);
      expect(roundQuantity(1.1, 'L')).toBe(1.25);
      expect(roundQuantity(2.3, 'L')).toBe(2.5);
    });

    it('should round ml appropriately', () => {
      expect(roundQuantity(35, 'ml')).toBe(40); // Small: 10ml increments
      expect(roundQuantity(120, 'ml')).toBe(150); // Large: 50ml increments
      expect(roundQuantity(280, 'ml')).toBe(300);
    });

    it('should round pieces to whole numbers', () => {
      expect(roundQuantity(2.3, 'pcs')).toBe(3);
      expect(roundQuantity(4.7, 'units')).toBe(5);
      expect(roundQuantity(1.1, 'items')).toBe(2);
    });
  });

  describe('Ingredient Aggregation', () => {
    it('should aggregate same ingredients across recipes', () => {
      const ingredients = [
        { name: 'Tomates', quantity: 200, unit: 'g', category: 'Légumes' },
        { name: 'Tomates', quantity: 150, unit: 'g', category: 'Légumes' },
        { name: 'Tomates', quantity: 100, unit: 'g', category: 'Légumes' }
      ];

      const aggregated = new Map<string, any>();

      ingredients.forEach(ing => {
        const key = `${ing.name}|${ing.unit}|${ing.category}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += ing.quantity;
        } else {
          aggregated.set(key, { ...ing });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tomates');
      expect(result[0].quantity).toBe(450);
    });

    it('should not aggregate ingredients with different units', () => {
      const ingredients = [
        { name: 'Lait', quantity: 250, unit: 'ml', category: 'Produits laitiers' },
        { name: 'Lait', quantity: 1, unit: 'L', category: 'Produits laitiers' }
      ];

      const aggregated = new Map<string, any>();

      ingredients.forEach(ing => {
        const key = `${ing.name}|${ing.unit}|${ing.category}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += ing.quantity;
        } else {
          aggregated.set(key, { ...ing });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(2);
    });

    it('should aggregate by category', () => {
      const ingredients = [
        { name: 'Carotte', category: 'Légumes' },
        { name: 'Tomate', category: 'Légumes' },
        { name: 'Poulet', category: 'Viandes' },
        { name: 'Boeuf', category: 'Viandes' }
      ];

      const byCategory = ingredients.reduce((acc, ing) => {
        if (!acc[ing.category]) acc[ing.category] = [];
        acc[ing.category].push(ing);
        return acc;
      }, {} as Record<string, any[]>);

      expect(Object.keys(byCategory)).toHaveLength(2);
      expect(byCategory['Légumes']).toHaveLength(2);
      expect(byCategory['Viandes']).toHaveLength(2);
    });
  });

  describe('Component-Based Meal Aggregation', () => {
    it('should aggregate components from component-based meals', () => {
      const mealComponents = [
        { component: { name: 'Poulet', shoppingCategory: 'meat' }, quantity: 150, unit: 'g' },
        { component: { name: 'Brocoli', shoppingCategory: 'produce' }, quantity: 200, unit: 'g' },
        { component: { name: 'Riz blanc', shoppingCategory: 'pantry' }, quantity: 80, unit: 'g' }
      ];

      const aggregated = new Map<string, any>();

      mealComponents.forEach(mc => {
        const key = `${mc.component.name}|${mc.unit}|${mc.component.shoppingCategory}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += mc.quantity;
        } else {
          aggregated.set(key, {
            name: mc.component.name,
            quantity: mc.quantity,
            unit: mc.unit,
            category: mc.component.shoppingCategory
          });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(3);
      expect(result.find(i => i.name === 'Poulet')?.quantity).toBe(150);
      expect(result.find(i => i.name === 'Brocoli')?.quantity).toBe(200);
      expect(result.find(i => i.name === 'Riz blanc')?.quantity).toBe(80);
    });

    it('should aggregate same components across multiple meals', () => {
      const meal1Components = [
        { component: { name: 'Poulet', shoppingCategory: 'meat' }, quantity: 150, unit: 'g' }
      ];
      const meal2Components = [
        { component: { name: 'Poulet', shoppingCategory: 'meat' }, quantity: 150, unit: 'g' }
      ];
      const meal3Components = [
        { component: { name: 'Poulet', shoppingCategory: 'meat' }, quantity: 150, unit: 'g' }
      ];

      const allComponents = [...meal1Components, ...meal2Components, ...meal3Components];
      const aggregated = new Map<string, any>();

      allComponents.forEach(mc => {
        const key = `${mc.component.name}|${mc.unit}|${mc.component.shoppingCategory}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += mc.quantity;
        } else {
          aggregated.set(key, {
            name: mc.component.name,
            quantity: mc.quantity,
            unit: mc.unit,
            category: mc.component.shoppingCategory
          });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Poulet');
      expect(result[0].quantity).toBe(450); // 150 * 3
    });

    it('should combine recipe ingredients AND meal components', () => {
      // Recipe ingredients
      const recipeIngredients = [
        { name: 'Tomates', quantity: 300, unit: 'g', category: 'produce' }
      ];

      // Component-based meal
      const mealComponents = [
        { component: { name: 'Tomates', shoppingCategory: 'produce' }, quantity: 150, unit: 'g' }
      ];

      const aggregated = new Map<string, any>();

      // Add recipe ingredients
      recipeIngredients.forEach(ing => {
        const key = `${ing.name}|${ing.unit}|${ing.category}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += ing.quantity;
        } else {
          aggregated.set(key, { ...ing });
        }
      });

      // Add meal components
      mealComponents.forEach(mc => {
        const key = `${mc.component.name}|${mc.unit}|${mc.component.shoppingCategory}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += mc.quantity;
        } else {
          aggregated.set(key, {
            name: mc.component.name,
            quantity: mc.quantity,
            unit: mc.unit,
            category: mc.component.shoppingCategory
          });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tomates');
      expect(result[0].quantity).toBe(450); // 300 + 150
    });

    it('should scale components by portions', () => {
      const mealComponents = [
        { component: { name: 'Poulet', defaultQuantity: 150 }, quantity: 150, unit: 'g' }
      ];

      const portions = 4;
      const familyMembers = 4;
      const servingFactor = portions / familyMembers;

      const scaled = mealComponents.map(mc => ({
        ...mc,
        quantity: mc.quantity * servingFactor
      }));

      expect(scaled[0].quantity).toBe(150); // 150 * 1.0
    });

    it('should scale components for larger families', () => {
      const mealComponents = [
        { component: { name: 'Poulet', defaultQuantity: 150 }, quantity: 150, unit: 'g' }
      ];

      const portions = 6; // 6 people
      const defaultServings = 4;
      const servingFactor = portions / defaultServings;

      const scaled = mealComponents.map(mc => ({
        ...mc,
        quantity: mc.quantity * servingFactor
      }));

      expect(scaled[0].quantity).toBe(225); // 150 * 1.5
    });

    it('should handle mixed recipe meals and component meals in same plan', () => {
      // Meal 1: Recipe-based (has recipe with ingredients)
      const meal1RecipeIngredients = [
        { name: 'Pâtes', quantity: 400, unit: 'g', category: 'pantry' },
        { name: 'Tomates', quantity: 300, unit: 'g', category: 'produce' }
      ];

      // Meal 2: Component-based (has meal components)
      const meal2Components = [
        { component: { name: 'Poulet', shoppingCategory: 'meat' }, quantity: 600, unit: 'g' },
        { component: { name: 'Riz blanc', shoppingCategory: 'pantry' }, quantity: 320, unit: 'g' }
      ];

      // Meal 3: Mixed (recipe + extra components)
      const meal3RecipeIngredients = [
        { name: 'Saumon', quantity: 600, unit: 'g', category: 'meat' }
      ];
      const meal3Components = [
        { component: { name: 'Brocoli', shoppingCategory: 'produce' }, quantity: 800, unit: 'g' }
      ];

      const aggregated = new Map<string, any>();

      // Aggregate all sources
      [...meal1RecipeIngredients, ...meal3RecipeIngredients].forEach(ing => {
        const key = `${ing.name}|${ing.unit}|${ing.category}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += ing.quantity;
        } else {
          aggregated.set(key, { ...ing });
        }
      });

      [...meal2Components, ...meal3Components].forEach(mc => {
        const key = `${mc.component.name}|${mc.unit}|${mc.component.shoppingCategory}`;
        if (aggregated.has(key)) {
          aggregated.get(key).quantity += mc.quantity;
        } else {
          aggregated.set(key, {
            name: mc.component.name,
            quantity: mc.quantity,
            unit: mc.unit,
            category: mc.component.shoppingCategory
          });
        }
      });

      const result = Array.from(aggregated.values());
      expect(result).toHaveLength(6); // Pâtes, Tomates, Saumon, Poulet, Riz blanc, Brocoli
      expect(result.find(i => i.name === 'Pâtes')).toBeDefined();
      expect(result.find(i => i.name === 'Poulet')).toBeDefined();
      expect(result.find(i => i.name === 'Brocoli')).toBeDefined();
      expect(result.find(i => i.name === 'Saumon')).toBeDefined();
      expect(result.find(i => i.name === 'Riz blanc')).toBeDefined();
      expect(result.find(i => i.name === 'Tomates')).toBeDefined();
    });
  });

  describe('Portion Adjustment', () => {
    it('should scale ingredients based on portions', () => {
      const ingredient = { name: 'Riz', quantity: 200, unit: 'g', servings: 4 };
      const targetPortions = 6;

      const scaleFactor = targetPortions / ingredient.servings;
      const scaledQuantity = ingredient.quantity * scaleFactor;

      expect(scaledQuantity).toBe(300);
    });

    it('should handle fractional portion adjustments', () => {
      const ingredient = { name: 'Farine', quantity: 500, unit: 'g', servings: 8 };
      const targetPortions = 5;

      const scaleFactor = targetPortions / ingredient.servings;
      const scaledQuantity = ingredient.quantity * scaleFactor;

      expect(scaledQuantity).toBe(312.5);
    });

    it('should account for guests in portion calculations', () => {
      const basePortions = 4;
      const guests = { adults: 2, children: 1 };

      // Typically: 1 child = 0.5 adult portion
      const totalPortions = basePortions + guests.adults + (guests.children * 0.5);

      expect(totalPortions).toBe(6.5);
    });
  });

  describe('Inventory Deduction', () => {
    it('should deduct inventory from shopping list', () => {
      const shoppingItem = { name: 'Oeufs', needed: 12, unit: 'pcs' };
      const inventoryItem = { name: 'Oeufs', available: 6, unit: 'pcs' };

      const toBuy = Math.max(0, shoppingItem.needed - inventoryItem.available);

      expect(toBuy).toBe(6);
    });

    it('should not add to list if inventory is sufficient', () => {
      const shoppingItem = { name: 'Sel', needed: 10, unit: 'g' };
      const inventoryItem = { name: 'Sel', available: 500, unit: 'g' };

      const toBuy = Math.max(0, shoppingItem.needed - inventoryItem.available);

      expect(toBuy).toBe(0);
    });

    it('should handle partial inventory coverage', () => {
      const shoppingItem = { name: 'Beurre', needed: 300, unit: 'g' };
      const inventoryItem = { name: 'Beurre', available: 100, unit: 'g' };

      const toBuy = Math.max(0, shoppingItem.needed - inventoryItem.available);

      expect(toBuy).toBe(200);
    });
  });

  describe('Dietary Substitutions', () => {
    it('should suggest lactose-free alternative', () => {
      const ingredient = { name: 'Lait', category: 'Produits laitiers' };
      const dietProfile = { lactoseFree: true };

      const substitutions: Record<string, string> = {
        'Lait': 'Lait sans lactose',
        'Crème': 'Crème végétale',
        'Beurre': 'Margarine'
      };

      if (dietProfile.lactoseFree && substitutions[ingredient.name]) {
        expect(substitutions[ingredient.name]).toBeDefined();
        // Verify we got a lactose-free substitution (sans lactose, végétale, or non-dairy alternative)
        expect(substitutions[ingredient.name]).toMatch(/sans lactose|végétal|margarine/i);
      }
    });

    it('should suggest gluten-free alternative', () => {
      const ingredient = { name: 'Farine' };
      const dietProfile = { glutenFree: true };

      const substitutions: Record<string, string> = {
        'Farine': 'Farine sans gluten',
        'Pâtes': 'Pâtes sans gluten',
        'Pain': 'Pain sans gluten'
      };

      if (dietProfile.glutenFree && substitutions[ingredient.name]) {
        expect(substitutions[ingredient.name]).toBeDefined();
        expect(substitutions[ingredient.name]).toContain('sans gluten');
      }
    });

    it('should suggest vegan alternative', () => {
      const ingredient = { name: 'Oeuf' };
      const dietProfile = { vegan: true };

      const veganSubstitutions: Record<string, string> = {
        'Oeuf': 'Graines de lin moulues',
        'Lait': 'Lait d\'amande',
        'Fromage': 'Fromage végétal'
      };

      if (dietProfile.vegan && veganSubstitutions[ingredient.name]) {
        expect(veganSubstitutions[ingredient.name]).toBeDefined();
      }
    });
  });

  describe('Shopping List Generation Flow', () => {
    it('should generate complete shopping list from weekly plan', () => {
      const weeklyPlan = {
        meals: [
          {
            recipe: {
              ingredients: [
                { name: 'Poulet', quantity: 500, unit: 'g', category: 'Viandes' },
                { name: 'Riz', quantity: 200, unit: 'g', category: 'Épicerie' }
              ],
              servings: 4
            },
            portions: 6
          },
          {
            recipe: {
              ingredients: [
                { name: 'Riz', quantity: 150, unit: 'g', category: 'Épicerie' },
                { name: 'Tomates', quantity: 300, unit: 'g', category: 'Légumes' }
              ],
              servings: 4
            },
            portions: 6
          }
        ]
      };

      const aggregated = new Map<string, any>();

      weeklyPlan.meals.forEach(meal => {
        const scaleFactor = meal.portions / meal.recipe.servings;

        meal.recipe.ingredients.forEach(ing => {
          const key = `${ing.name}|${ing.unit}|${ing.category}`;
          const scaledQuantity = ing.quantity * scaleFactor;

          if (aggregated.has(key)) {
            aggregated.get(key).quantity += scaledQuantity;
          } else {
            aggregated.set(key, {
              ...ing,
              quantity: scaledQuantity
            });
          }
        });
      });

      const shoppingList = Array.from(aggregated.values());

      expect(shoppingList).toHaveLength(3);
      expect(shoppingList.find(item => item.name === 'Riz')?.quantity).toBe(525); // 300 + 225
      expect(shoppingList.find(item => item.name === 'Poulet')?.quantity).toBe(750);
      expect(shoppingList.find(item => item.name === 'Tomates')?.quantity).toBe(450);
    });
  });
});
