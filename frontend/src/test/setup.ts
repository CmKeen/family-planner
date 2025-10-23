import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock translations for testing (French)
const mockTranslations: Record<string, string> = {
  // Days
  'days.monday': 'Lundi',
  'days.tuesday': 'Mardi',
  'days.wednesday': 'Mercredi',
  'days.thursday': 'Jeudi',
  'days.friday': 'Vendredi',
  'days.saturday': 'Samedi',
  'days.sunday': 'Dimanche',

  // Common
  'common.loading': 'Chargement...',
  'common.error': 'Erreur',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.delete': 'Supprimer',
  'common.edit': 'Modifier',
  'common.back': 'Retour',
  'common.close': 'Fermer',
  'common.confirm': 'Confirmer',
  'common.search': 'Rechercher',
  'common.filter': 'Filtrer',
  'common.reset': 'Réinitialiser',
  'common.print': 'Imprimer',

  // Weekly Plan
  'weeklyPlan.title': 'Plan hebdomadaire',
  'weeklyPlan.week': 'Semaine {{number}} - {{year}}',
  'weeklyPlan.loading': 'Chargement du plan...',
  'weeklyPlan.status.draft': 'Brouillon',
  'weeklyPlan.status.validated': 'Validé',
  'weeklyPlan.status.archived': 'Archivé',
  'weeklyPlan.stats.totalTime': 'Temps total',
  'weeklyPlan.stats.favorites': 'Favoris',
  'weeklyPlan.stats.novelties': 'Nouveautés',
  'weeklyPlan.stats.meals': 'Repas',
  'weeklyPlan.mealTypes.lunch': 'Déjeuner',
  'weeklyPlan.mealTypes.dinner': 'Dîner',
  'weeklyPlan.actions.validate': 'Valider le plan',
  'weeklyPlan.actions.validating': 'Validation...',
  'weeklyPlan.actions.viewShoppingList': 'Voir la liste de courses',
  'weeklyPlan.actions.swap': 'Échanger',
  'weeklyPlan.actions.swapping': 'Échange...',
  'weeklyPlan.actions.adjustPortions': 'Portions',
  'weeklyPlan.actions.adjusting': 'Ajustement...',
  'weeklyPlan.actions.lock': 'Verrouiller',
  'weeklyPlan.actions.unlock': 'Déverrouiller',
  'weeklyPlan.dialogs.swapRecipe.title': 'Échanger la recette',
  'weeklyPlan.dialogs.swapRecipe.cancel': 'Annuler',
  'weeklyPlan.dialogs.swapRecipe.confirm': 'Confirmer',
  'weeklyPlan.dialogs.adjustPortions.title': 'Ajuster les portions',
  'weeklyPlan.dialogs.adjustPortions.label': 'Nombre de portions',
  'weeklyPlan.dialogs.adjustPortions.cancel': 'Annuler',
  'weeklyPlan.dialogs.adjustPortions.confirm': 'Confirmer',
  'weeklyPlan.dialogs.validatePlan': 'Valider ce plan hebdomadaire ? Cela générera la liste de courses.',
  'weeklyPlan.portions': '{{count}} portions',
  'weeklyPlan.minutes': '{{count}} min',
  'weeklyPlan.hours': '{{count}}h',

  // Recipes
  'recipes.title': 'Catalogue de recettes',
  'recipes.searchPlaceholder': 'Rechercher une recette...',
  'recipes.loading': 'Chargement des recettes...',
  'recipes.noResults': 'Aucune recette trouvée',
  'recipes.categories.all': 'Toutes',
  'recipes.categories.meats': 'Viandes',
  'recipes.categories.fish': 'Poissons',
  'recipes.categories.pasta': 'Pâtes',
  'recipes.categories.vegetables': 'Légumes',
  'recipes.categories.soups': 'Soupes',
  'recipes.categories.salads': 'Salades',
  'recipes.filters.show': 'Afficher les filtres',
  'recipes.filters.hide': 'Masquer les filtres',
  'recipes.filters.title': 'Filtres',
  'recipes.filters.maxTime': 'Temps maximum (minutes)',
  'recipes.filters.maxTimePlaceholder': 'Ex: 60',
  'recipes.filters.dietary': 'Régimes alimentaires',
  'recipes.filters.vegetarian': 'Végétarien',
  'recipes.filters.vegan': 'Végan',
  'recipes.filters.glutenFree': 'Sans gluten',
  'recipes.filters.kosher': 'Casher',
  'recipes.filters.halal': 'Halal',
  'recipes.filters.reset': 'Réinitialiser les filtres',
  'recipes.card.servings': '{{count}} parts',
  'recipes.card.minutes': '{{count}} min',
  'recipes.card.more': '+{{count}}',
  'recipes.detail.time': 'Temps',
  'recipes.detail.prepTime': 'Prep: {{time}} min',
  'recipes.detail.cookTime': 'Cuisson: {{time}} min',
  'recipes.detail.servings': 'Portions',
  'recipes.detail.ingredients': 'Ingrédients',
  'recipes.detail.instructions': 'Instructions',
  'recipes.kosherCategory': 'Casher {{category}}',

  // Shopping List
  'shoppingList.title': 'Liste de courses',
  'shoppingList.loading': 'Chargement de la liste...',
  'shoppingList.generatedOn': 'Générée le {{date}}',
  'shoppingList.progress.title': 'Progression',
  'shoppingList.progress.items': '{{checked}} sur {{total}} articles',
  'shoppingList.viewModes.byCategory': 'Par catégorie',
  'shoppingList.viewModes.byRecipe': 'Par recette',
  'shoppingList.categories.meats': 'Viandes',
  'shoppingList.categories.fish': 'Poissons',
  'shoppingList.categories.fruitsVegetables': 'Fruits et légumes',
  'shoppingList.categories.dairy': 'Produits laitiers',
  'shoppingList.categories.grocery': 'Épicerie',
  'shoppingList.categories.condiments': 'Condiments',
  'shoppingList.categories.other': 'Autres',
  'shoppingList.forRecipes': 'Pour: {{recipes}}',
  'shoppingList.categoryLabel': 'Catégorie: {{category}}',
  'shoppingList.articles': '{{count}} article',
  'shoppingList.articles_plural': '{{count}} articles',
  'shoppingList.empty': 'Aucun article dans la liste',
  'shoppingList.actions.print': 'Imprimer',
  'shoppingList.actions.back': 'Retour',

  // Language
  'language.fr': 'Français',
  'language.en': 'English',
  'language.switch': 'Changer de langue',
};

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Return mock translation or key with interpolation
      let result = mockTranslations[key] || key;

      if (options && typeof options === 'object') {
        Object.keys(options).forEach(optionKey => {
          result = result.replace(`{{${optionKey}}}`, String(options[optionKey]));
        });
      }

      return result;
    },
    i18n: {
      language: 'fr',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: any) => children,
  I18nextProvider: ({ children }: any) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as any;
