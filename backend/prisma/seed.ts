import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create sample recipes
  const recipes = [
    {
      title: 'Poulet rôti aux herbes',
      titleEn: 'Herbed Roast Chicken',
      description: 'Poulet entier rôti avec pommes de terre',
      prepTime: 15,
      cookTime: 60,
      difficulty: 2,
      kidsRating: 5,
      kosherCategory: 'meat',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: true,
      vegetarian: false,
      vegan: false,
      category: 'volaille',
      mealType: ['lunch', 'dinner'],
      cuisine: 'french',
      season: ['spring', 'summer', 'fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
      servings: 4,
      budget: 'medium',
      isFavorite: true,
      isNovelty: false,
      ingredients: [
        { name: 'Poulet entier', quantity: 1.5, unit: 'kg', category: 'Boucherie', order: 0 },
        { name: 'Pommes de terre', quantity: 800, unit: 'g', category: 'Fruits & Légumes', order: 1 },
        { name: 'Thym', quantity: 2, unit: 'branches', category: 'Épicerie', order: 2 },
        { name: 'Ail', quantity: 4, unit: 'gousses', category: 'Fruits & Légumes', order: 3 },
        { name: 'Huile d\'olive', quantity: 30, unit: 'ml', category: 'Épicerie', order: 4 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Préchauffer le four à 200°C' },
        { stepNumber: 2, text: 'Assaisonner le poulet avec sel, poivre et thym' },
        { stepNumber: 3, text: 'Disposer les pommes de terre autour du poulet' },
        { stepNumber: 4, text: 'Enfourner 60 minutes en arrosant régulièrement' }
      ]
    },
    {
      title: 'Pâtes tomates basilic',
      titleEn: 'Tomato Basil Pasta',
      description: 'Pâtes simples sauce tomate fraîche',
      prepTime: 5,
      cookTime: 15,
      difficulty: 1,
      kidsRating: 5,
      kosherCategory: 'parve',
      halalFriendly: true,
      glutenFree: false,
      lactoseFree: true,
      vegetarian: true,
      vegan: true,
      category: 'pates',
      mealType: ['lunch', 'dinner'],
      cuisine: 'italian',
      season: ['spring', 'summer', 'fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
      servings: 4,
      budget: 'low',
      isFavorite: true,
      isNovelty: false,
      ingredients: [
        { name: 'Pâtes', quantity: 500, unit: 'g', category: 'Épicerie', containsGluten: true, order: 0 },
        { name: 'Tomates concassées', quantity: 400, unit: 'g', category: 'Épicerie', order: 1 },
        { name: 'Basilic frais', quantity: 1, unit: 'bouquet', category: 'Fruits & Légumes', order: 2 },
        { name: 'Ail', quantity: 2, unit: 'gousses', category: 'Fruits & Légumes', order: 3 },
        { name: 'Huile d\'olive', quantity: 30, unit: 'ml', category: 'Épicerie', order: 4 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Cuire les pâtes selon les instructions du paquet' },
        { stepNumber: 2, text: 'Faire revenir l\'ail dans l\'huile d\'olive' },
        { stepNumber: 3, text: 'Ajouter les tomates concassées et laisser mijoter 10 min' },
        { stepNumber: 4, text: 'Mélanger avec les pâtes et ajouter le basilic frais' }
      ]
    },
    {
      title: 'Saumon grillé et légumes',
      titleEn: 'Grilled Salmon with Vegetables',
      description: 'Saumon grillé avec légumes de saison',
      prepTime: 10,
      cookTime: 20,
      difficulty: 2,
      kidsRating: 4,
      kosherCategory: 'parve',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: true,
      vegetarian: false,
      vegan: false,
      pescatarian: true,
      category: 'poisson',
      mealType: ['lunch', 'dinner'],
      cuisine: 'mediterranean',
      season: ['spring', 'summer'],
      imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800',
      servings: 4,
      budget: 'high',
      isFavorite: false,
      isNovelty: true,
      ingredients: [
        { name: 'Filets de saumon', quantity: 600, unit: 'g', category: 'Boucherie', order: 0 },
        { name: 'Courgettes', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 1 },
        { name: 'Poivrons', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 2 },
        { name: 'Citron', quantity: 1, unit: 'pièce', category: 'Fruits & Légumes', order: 3 },
        { name: 'Huile d\'olive', quantity: 30, unit: 'ml', category: 'Épicerie', order: 4 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Préchauffer le four à 200°C' },
        { stepNumber: 2, text: 'Couper les légumes en morceaux' },
        { stepNumber: 3, text: 'Disposer le saumon et les légumes sur une plaque' },
        { stepNumber: 4, text: 'Arroser d\'huile d\'olive et enfourner 20 minutes' }
      ]
    },
    {
      title: 'Burger maison',
      titleEn: 'Homemade Burger',
      description: 'Burgers faits maison avec frites',
      prepTime: 20,
      cookTime: 15,
      difficulty: 2,
      kidsRating: 5,
      kosherCategory: 'meat',
      halalFriendly: true,
      glutenFree: false,
      lactoseFree: true,
      vegetarian: false,
      vegan: false,
      category: 'boeuf',
      mealType: ['lunch', 'dinner'],
      cuisine: 'american',
      season: ['spring', 'summer', 'fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      servings: 4,
      budget: 'medium',
      isFavorite: true,
      isNovelty: false,
      ingredients: [
        { name: 'Buns à burger', quantity: 4, unit: 'pièces', category: 'Boulangerie', containsGluten: true, order: 0 },
        { name: 'Steaks hachés', quantity: 600, unit: 'g', category: 'Boucherie', order: 1 },
        { name: 'Salade', quantity: 1, unit: 'pièce', category: 'Fruits & Légumes', order: 2 },
        { name: 'Tomates', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 3 },
        { name: 'Oignons', quantity: 1, unit: 'pièce', category: 'Fruits & Légumes', order: 4 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Former 4 steaks avec la viande hachée' },
        { stepNumber: 2, text: 'Cuire les steaks à la poêle 3-4 min par face' },
        { stepNumber: 3, text: 'Toaster légèrement les buns' },
        { stepNumber: 4, text: 'Assembler: bun, salade, steak, tomate, oignon, condiments' }
      ]
    },
    {
      title: 'Chili sin carne',
      titleEn: 'Vegetarian Chili',
      description: 'Chili végétarien aux haricots rouges',
      prepTime: 15,
      cookTime: 30,
      difficulty: 2,
      kidsRating: 3,
      kosherCategory: 'parve',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: true,
      vegetarian: true,
      vegan: true,
      category: 'legumineuses',
      mealType: ['lunch', 'dinner'],
      cuisine: 'mexican',
      season: ['fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
      servings: 4,
      budget: 'low',
      isFavorite: false,
      isNovelty: true,
      ingredients: [
        { name: 'Haricots rouges', quantity: 400, unit: 'g', category: 'Épicerie', order: 0 },
        { name: 'Maïs', quantity: 200, unit: 'g', category: 'Épicerie', order: 1 },
        { name: 'Tomates concassées', quantity: 400, unit: 'g', category: 'Épicerie', order: 2 },
        { name: 'Oignons', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 3 },
        { name: 'Épices chili', quantity: 2, unit: 'c. à soupe', category: 'Épicerie', order: 4 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Faire revenir les oignons émincés' },
        { stepNumber: 2, text: 'Ajouter les épices et faire revenir 1 minute' },
        { stepNumber: 3, text: 'Ajouter haricots, maïs et tomates' },
        { stepNumber: 4, text: 'Laisser mijoter 20-25 minutes' }
      ]
    },
    {
      title: 'Gratin dauphinois',
      titleEn: 'Potato Gratin',
      description: 'Gratin de pommes de terre crémeux',
      prepTime: 20,
      cookTime: 50,
      difficulty: 2,
      kidsRating: 4,
      kosherCategory: 'dairy',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: false,
      vegetarian: true,
      vegan: false,
      category: 'accompagnement',
      mealType: ['lunch', 'dinner'],
      cuisine: 'french',
      season: ['fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1588479646686-2858883d6c51?w=800',
      servings: 4,
      budget: 'low',
      isFavorite: true,
      isNovelty: false,
      ingredients: [
        { name: 'Pommes de terre', quantity: 1, unit: 'kg', category: 'Fruits & Légumes', order: 0 },
        { name: 'Crème fraîche', quantity: 300, unit: 'ml', category: 'Produits laitiers', containsLactose: true, order: 1 },
        { name: 'Lait', quantity: 200, unit: 'ml', category: 'Produits laitiers', containsLactose: true, order: 2 },
        { name: 'Ail', quantity: 2, unit: 'gousses', category: 'Fruits & Légumes', order: 3 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Préchauffer le four à 180°C' },
        { stepNumber: 2, text: 'Éplucher et émincer finement les pommes de terre' },
        { stepNumber: 3, text: 'Mélanger crème, lait et ail écrasé' },
        { stepNumber: 4, text: 'Disposer en couches et enfourner 45-50 minutes' }
      ]
    },
    {
      title: 'Sushis maison',
      titleEn: 'Homemade Sushi',
      description: 'Sushis et makis faits maison',
      prepTime: 45,
      cookTime: 20,
      difficulty: 4,
      kidsRating: 5,
      kosherCategory: 'parve',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: true,
      vegetarian: false,
      vegan: false,
      pescatarian: true,
      category: 'poisson',
      mealType: ['dinner'],
      cuisine: 'japanese',
      season: ['spring', 'summer', 'fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      servings: 4,
      budget: 'high',
      isFavorite: false,
      isNovelty: true,
      ingredients: [
        { name: 'Riz à sushi', quantity: 500, unit: 'g', category: 'Épicerie', order: 0 },
        { name: 'Saumon frais', quantity: 300, unit: 'g', category: 'Boucherie', order: 1 },
        { name: 'Feuilles de nori', quantity: 10, unit: 'pièces', category: 'Épicerie', order: 2 },
        { name: 'Avocat', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 3 },
        { name: 'Concombre', quantity: 1, unit: 'pièce', category: 'Fruits & Légumes', order: 4 },
        { name: 'Vinaigre de riz', quantity: 50, unit: 'ml', category: 'Épicerie', order: 5 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Cuire le riz et le mélanger avec le vinaigre' },
        { stepNumber: 2, text: 'Découper le poisson et les légumes en lanières' },
        { stepNumber: 3, text: 'Étaler le riz sur les feuilles de nori' },
        { stepNumber: 4, text: 'Rouler fermement et découper en morceaux' }
      ]
    },
    {
      title: 'Soupe de légumes',
      titleEn: 'Vegetable Soup',
      description: 'Soupe de légumes maison réconfortante',
      prepTime: 10,
      cookTime: 25,
      difficulty: 1,
      kidsRating: 3,
      kosherCategory: 'parve',
      halalFriendly: true,
      glutenFree: true,
      lactoseFree: true,
      vegetarian: true,
      vegan: true,
      category: 'soupe',
      mealType: ['lunch', 'dinner'],
      cuisine: 'french',
      season: ['fall', 'winter'],
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
      servings: 4,
      budget: 'low',
      isFavorite: true,
      isNovelty: false,
      ingredients: [
        { name: 'Carottes', quantity: 3, unit: 'pièces', category: 'Fruits & Légumes', order: 0 },
        { name: 'Poireaux', quantity: 2, unit: 'pièces', category: 'Fruits & Légumes', order: 1 },
        { name: 'Pommes de terre', quantity: 3, unit: 'pièces', category: 'Fruits & Légumes', order: 2 },
        { name: 'Bouillon de légumes', quantity: 1, unit: 'L', category: 'Épicerie', order: 3 }
      ],
      instructions: [
        { stepNumber: 1, text: 'Éplucher et couper tous les légumes' },
        { stepNumber: 2, text: 'Faire revenir dans un peu d\'huile' },
        { stepNumber: 3, text: 'Ajouter le bouillon et laisser mijoter 20 minutes' },
        { stepNumber: 4, text: 'Mixer si désiré et assaisonner' }
      ]
    }
  ];

  // Check if recipes already exist to avoid duplicates
  const existingRecipesCount = await prisma.recipe.count();

  if (existingRecipesCount > 0) {
    console.log('⏭️  Database already has', existingRecipesCount, 'recipes. Skipping recipe seed to avoid duplicates.');
  } else {
    for (const recipeData of recipes) {
      const { ingredients, instructions, ...recipe } = recipeData;

      await prisma.recipe.create({
        data: {
          ...recipe,
          totalTime: recipe.prepTime + recipe.cookTime,
          ingredients: {
            create: ingredients
          },
          instructions: {
            create: instructions
          }
        }
      });
    }

    console.log('✅ Seeded', recipes.length, 'recipes');
  }

  // Seed food components (system components for component-based meals)
  const foodComponents = [
    // PROTEINS
    { name: 'Poulet', nameEn: 'Chicken', nameNl: 'Kip', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: false, kosherCategory: 'meat', shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Bœuf', nameEn: 'Beef', nameNl: 'Rundvlees', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: false, kosherCategory: 'meat', shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Porc', nameEn: 'Pork', nameNl: 'Varkensvlees', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: false, halalFriendly: false, kosherCategory: null, shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Saumon', nameEn: 'Salmon', nameNl: 'Zalm', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Thon', nameEn: 'Tuna', nameNl: 'Tonijn', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Crevettes', nameEn: 'Shrimp', nameNl: 'Garnalen', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: false, vegan: false, pescatarian: true, kosherCategory: null, shoppingCategory: 'meat', seasonality: ['all'] },
    { name: 'Œufs', nameEn: 'Eggs', nameNl: 'Eieren', category: 'PROTEIN', defaultQuantity: 2, unit: 'pièces', vegetarian: true, vegan: false, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'dairy', allergens: ['eggs'], seasonality: ['all'] },
    { name: 'Tofu', nameEn: 'Tofu', nameNl: 'Tofu', category: 'PROTEIN', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Pois chiches', nameEn: 'Chickpeas', nameNl: 'Kikkererwten', category: 'PROTEIN', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Lentilles', nameEn: 'Lentils', nameNl: 'Linzen', category: 'PROTEIN', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Haricots noirs', nameEn: 'Black Beans', nameNl: 'Zwarte bonen', category: 'PROTEIN', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, pescatarian: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },

    // VEGETABLES
    { name: 'Brocoli', nameEn: 'Broccoli', nameNl: 'Broccoli', category: 'VEGETABLE', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter', 'spring'] },
    { name: 'Carottes', nameEn: 'Carrots', nameNl: 'Wortelen', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Haricots verts', nameEn: 'Green Beans', nameNl: 'Sperziebonen', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['spring', 'summer'] },
    { name: 'Courgettes', nameEn: 'Zucchini', nameNl: 'Courgette', category: 'VEGETABLE', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['summer', 'fall'] },
    { name: 'Poivrons', nameEn: 'Bell Peppers', nameNl: 'Paprika', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['summer', 'fall'] },
    { name: 'Tomates', nameEn: 'Tomatoes', nameNl: 'Tomaten', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['summer', 'fall'] },
    { name: 'Épinards', nameEn: 'Spinach', nameNl: 'Spinazie', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['spring', 'fall', 'winter'] },
    { name: 'Chou-fleur', nameEn: 'Cauliflower', nameNl: 'Bloemkool', category: 'VEGETABLE', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter'] },
    { name: 'Champignons', nameEn: 'Mushrooms', nameNl: 'Champignons', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Oignons', nameEn: 'Onions', nameNl: 'Uien', category: 'VEGETABLE', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Poireaux', nameEn: 'Leeks', nameNl: 'Prei', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter', 'spring'] },
    { name: 'Aubergines', nameEn: 'Eggplant', nameNl: 'Aubergine', category: 'VEGETABLE', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['summer', 'fall'] },
    { name: 'Petits pois', nameEn: 'Peas', nameNl: 'Erwten', category: 'VEGETABLE', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['spring', 'summer'] },
    { name: 'Maïs', nameEn: 'Corn', nameNl: 'Maïs', category: 'VEGETABLE', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['summer', 'fall'] },
    { name: 'Chou', nameEn: 'Cabbage', nameNl: 'Kool', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter'] },
    { name: 'Asperges', nameEn: 'Asparagus', nameNl: 'Asperges', category: 'VEGETABLE', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['spring'] },

    // CARBS
    { name: 'Riz blanc', nameEn: 'White Rice', nameNl: 'Witte rijst', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Riz basmati', nameEn: 'Basmati Rice', nameNl: 'Basmati rijst', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Riz complet', nameEn: 'Brown Rice', nameNl: 'Bruine rijst', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Pâtes', nameEn: 'Pasta', nameNl: 'Pasta', category: 'CARB', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, glutenFree: false, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Quinoa', nameEn: 'Quinoa', nameNl: 'Quinoa', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Couscous', nameEn: 'Couscous', nameNl: 'Couscous', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, glutenFree: false, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Pommes de terre', nameEn: 'Potatoes', nameNl: 'Aardappelen', category: 'CARB', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Patates douces', nameEn: 'Sweet Potatoes', nameNl: 'Zoete aardappelen', category: 'CARB', defaultQuantity: 200, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter'] },
    { name: 'Pain', nameEn: 'Bread', nameNl: 'Brood', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, glutenFree: false, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Polenta', nameEn: 'Polenta', nameNl: 'Polenta', category: 'CARB', defaultQuantity: 80, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Nouilles', nameEn: 'Noodles', nameNl: 'Noedels', category: 'CARB', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, glutenFree: false, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },

    // FRUITS
    { name: 'Pommes', nameEn: 'Apples', nameNl: 'Appels', category: 'FRUIT', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall', 'winter'] },
    { name: 'Bananes', nameEn: 'Bananas', nameNl: 'Bananen', category: 'FRUIT', defaultQuantity: 120, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Oranges', nameEn: 'Oranges', nameNl: 'Sinaasappels', category: 'FRUIT', defaultQuantity: 150, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['winter', 'spring'] },
    { name: 'Fraises', nameEn: 'Strawberries', nameNl: 'Aardbeien', category: 'FRUIT', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['spring', 'summer'] },
    { name: 'Raisins', nameEn: 'Grapes', nameNl: 'Druiven', category: 'FRUIT', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['fall'] },
    { name: 'Citrons', nameEn: 'Lemons', nameNl: 'Citroenen', category: 'FRUIT', defaultQuantity: 50, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Avocats', nameEn: 'Avocados', nameNl: 'Avocado\'s', category: 'FRUIT', defaultQuantity: 100, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },

    // SAUCES
    { name: 'Sauce tomate', nameEn: 'Tomato Sauce', nameNl: 'Tomatensaus', category: 'SAUCE', defaultQuantity: 100, unit: 'ml', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Sauce soja', nameEn: 'Soy Sauce', nameNl: 'Sojasaus', category: 'SAUCE', defaultQuantity: 20, unit: 'ml', vegetarian: true, vegan: true, glutenFree: false, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Crème fraîche', nameEn: 'Sour Cream', nameNl: 'Zure room', category: 'SAUCE', defaultQuantity: 50, unit: 'ml', vegetarian: true, vegan: false, lactoseFree: false, kosherCategory: 'dairy', shoppingCategory: 'dairy', allergens: ['milk'], seasonality: ['all'] },
    { name: 'Sauce curry', nameEn: 'Curry Sauce', nameNl: 'Currysaus', category: 'SAUCE', defaultQuantity: 100, unit: 'ml', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Pesto', nameEn: 'Pesto', nameNl: 'Pesto', category: 'SAUCE', defaultQuantity: 50, unit: 'ml', vegetarian: true, vegan: false, kosherCategory: 'dairy', shoppingCategory: 'pantry', seasonality: ['all'] },

    // CONDIMENTS & SPICES
    { name: 'Ail', nameEn: 'Garlic', nameNl: 'Knoflook', category: 'CONDIMENT', defaultQuantity: 10, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Gingembre', nameEn: 'Ginger', nameNl: 'Gember', category: 'CONDIMENT', defaultQuantity: 10, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'produce', seasonality: ['all'] },
    { name: 'Huile d\'olive', nameEn: 'Olive Oil', nameNl: 'Olijfolie', category: 'CONDIMENT', defaultQuantity: 15, unit: 'ml', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Beurre', nameEn: 'Butter', nameNl: 'Boter', category: 'CONDIMENT', defaultQuantity: 15, unit: 'g', vegetarian: true, vegan: false, lactoseFree: false, kosherCategory: 'dairy', shoppingCategory: 'dairy', allergens: ['milk'], seasonality: ['all'] },
    { name: 'Herbes de Provence', nameEn: 'Herbs de Provence', nameNl: 'Provençaalse kruiden', category: 'SPICE', defaultQuantity: 5, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Paprika', nameEn: 'Paprika', nameNl: 'Paprika', category: 'SPICE', defaultQuantity: 5, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Cumin', nameEn: 'Cumin', nameNl: 'Komijn', category: 'SPICE', defaultQuantity: 5, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] },
    { name: 'Curry', nameEn: 'Curry Powder', nameNl: 'Kerrie', category: 'SPICE', defaultQuantity: 5, unit: 'g', vegetarian: true, vegan: true, kosherCategory: 'parve', shoppingCategory: 'pantry', seasonality: ['all'] }
  ];

  const existingComponentsCount = await prisma.foodComponent.count({ where: { isSystemComponent: true } });

  if (existingComponentsCount === 0) {
    // First time seeding - create all components
    for (const component of foodComponents) {
      await prisma.foodComponent.create({
        data: {
          ...component,
          isSystemComponent: true
        }
      });
    }
    console.log('✅ Seeded', foodComponents.length, 'food components');
  } else {
    // Components exist - check if we need to update
    console.log('🔄 System food components exist. Checking for updates...');

    // Update or create each component
    for (const component of foodComponents) {
      const existing = await prisma.foodComponent.findFirst({
        where: {
          name: component.name,
          isSystemComponent: true
        }
      });

      if (existing) {
        // Update existing component
        await prisma.foodComponent.update({
          where: { id: existing.id },
          data: component
        });
      } else {
        // Create new component
        await prisma.foodComponent.create({
          data: {
            ...component,
            isSystemComponent: true
          }
        });
      }
    }
    console.log(`✅ Updated ${foodComponents.length} system food components`);
  }

  // Seed meal schedule templates
  const mealScheduleTemplates = [
    {
      name: 'Full Week',
      description: 'Lunch and dinner for all 7 days (14 meals) - Perfect for families who cook most meals at home',
      isSystem: true,
      schedule: [
        { dayOfWeek: 'MONDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'TUESDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'WEDNESDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'THURSDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'FRIDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'SATURDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'SUNDAY', mealTypes: ['LUNCH', 'DINNER'] }
      ]
    },
    {
      name: 'Standard Work Week',
      description: 'Dinner only on weekdays, lunch and dinner on weekends (9 meals) - Best for working families',
      isSystem: true,
      schedule: [
        { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'WEDNESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'THURSDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'FRIDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'SATURDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'SUNDAY', mealTypes: ['LUNCH', 'DINNER'] }
      ]
    },
    {
      name: 'Weekday Dinners Only',
      description: 'Dinner Monday through Friday only (5 meals) - Minimalist approach for busy families',
      isSystem: true,
      schedule: [
        { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'WEDNESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'THURSDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'FRIDAY', mealTypes: ['DINNER'] }
      ]
    },
    {
      name: 'Weekend Only',
      description: 'Lunch and dinner on Saturday and Sunday (4 meals) - For families who meal prep or eat out during the week',
      isSystem: true,
      schedule: [
        { dayOfWeek: 'SATURDAY', mealTypes: ['LUNCH', 'DINNER'] },
        { dayOfWeek: 'SUNDAY', mealTypes: ['LUNCH', 'DINNER'] }
      ]
    },
    {
      name: 'Flexible Weekly',
      description: 'One dinner per day for the entire week (7 meals) - Flexible scheduling for varied family routines',
      isSystem: true,
      schedule: [
        { dayOfWeek: 'MONDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'TUESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'WEDNESDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'THURSDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'FRIDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'SATURDAY', mealTypes: ['DINNER'] },
        { dayOfWeek: 'SUNDAY', mealTypes: ['DINNER'] }
      ]
    }
  ];

  const existingTemplatesCount = await prisma.mealScheduleTemplate.count({ where: { isSystem: true } });

  if (existingTemplatesCount === 0) {
    // First time seeding - create all templates
    for (const template of mealScheduleTemplates) {
      await prisma.mealScheduleTemplate.create({ data: template });
    }
    console.log('✅ Seeded', mealScheduleTemplates.length, 'meal schedule templates');
  } else {
    // Templates exist - check if we need to update
    console.log('🔄 System templates exist. Checking for updates...');

    // Delete old system templates that are no longer in our list
    const currentTemplateNames = mealScheduleTemplates.map(t => t.name);
    const deleted = await prisma.mealScheduleTemplate.deleteMany({
      where: {
        isSystem: true,
        name: { notIn: currentTemplateNames }
      }
    });

    if (deleted.count > 0) {
      console.log(`   Removed ${deleted.count} outdated system template(s)`);
    }

    // Update or create each template
    for (const template of mealScheduleTemplates) {
      const existing = await prisma.mealScheduleTemplate.findFirst({
        where: {
          name: template.name,
          isSystem: true
        }
      });

      if (existing) {
        // Update existing template
        await prisma.mealScheduleTemplate.update({
          where: { id: existing.id },
          data: {
            description: template.description,
            schedule: template.schedule
          }
        });
      } else {
        // Create new template
        await prisma.mealScheduleTemplate.create({ data: template });
      }
    }
    console.log(`✅ Updated ${mealScheduleTemplates.length} system meal schedule templates`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
