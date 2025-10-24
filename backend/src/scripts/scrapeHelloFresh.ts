import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();

interface ScrapedRecipe {
  title: string;
  description: string;
  prepTime: number;
  cookTime: number;
  difficulty: number;
  servings: number;
  category: string;
  cuisine?: string;
  imageUrl?: string;
  sourceUrl: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    text: string;
    duration?: number;
  }>;
  dietaryTags: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    lactoseFree: boolean;
    pescatarian: boolean;
  };
}

/**
 * HelloFresh Recipe Scraper
 *
 * This scraper fetches recipes from HelloFresh and saves them to the database.
 * It handles:
 * - Recipe metadata (title, description, times, difficulty)
 * - Ingredients with quantities
 * - Step-by-step instructions
 * - Images (downloads and stores locally or uses URLs)
 * - Dietary tags
 */
class HelloFreshScraper {
  private baseUrl: string;
  private imageDir: string;

  constructor(region: string = 'com') {
    // HelloFresh has regional sites: .com (US), .fr (France), .co.uk (UK), etc.
    this.baseUrl = `https://www.hellofresh.${region}`;
    this.imageDir = path.join(process.cwd(), 'public', 'images', 'recipes');
  }

  /**
   * Initialize the scraper (create image directory if needed)
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.imageDir, { recursive: true });
      console.log(`📁 Image directory ready: ${this.imageDir}`);
    } catch (error) {
      console.error('Failed to create image directory:', error);
    }
  }

  /**
   * Scrape a single recipe by URL
   */
  async scrapeRecipe(recipeUrl: string): Promise<ScrapedRecipe | null> {
    try {
      console.log(`🔍 Scraping recipe: ${recipeUrl}`);

      const response = await axios.get(recipeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      // Try to extract JSON-LD structured data first (most reliable)
      const jsonLd = this.extractJsonLd($);
      if (jsonLd) {
        return this.parseJsonLdRecipe(jsonLd, recipeUrl);
      }

      // Fallback to HTML parsing
      return this.parseHtmlRecipe($, recipeUrl);

    } catch (error: any) {
      console.error(`❌ Failed to scrape ${recipeUrl}:`, error.message);
      return null;
    }
  }

  /**
   * Extract JSON-LD structured data from page
   */
  private extractJsonLd($: cheerio.Root): any {
    const scriptTags = $('script[type="application/ld+json"]');

    for (let i = 0; i < scriptTags.length; i++) {
      try {
        const jsonData = JSON.parse($(scriptTags[i]).html() || '');
        if (jsonData['@type'] === 'Recipe' || jsonData.recipeCategory) {
          return jsonData;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * Parse recipe from JSON-LD structured data
   */
  private parseJsonLdRecipe(data: any, sourceUrl: string): ScrapedRecipe {
    const ingredients = (data.recipeIngredient || []).map((ing: string, index: number) => {
      return this.parseIngredient(ing, index);
    });

    const instructions = (data.recipeInstructions || []).map((instruction: any, index: number) => {
      const text = typeof instruction === 'string'
        ? instruction
        : instruction.text || instruction.name || '';

      return {
        stepNumber: index + 1,
        text: text.trim(),
      };
    });

    const prepTime = this.parseIsoDuration(data.prepTime) || 15;
    const cookTime = this.parseIsoDuration(data.cookTime) || 30;

    return {
      title: data.name || 'Untitled Recipe',
      description: data.description || '',
      prepTime,
      cookTime,
      difficulty: 2, // Default medium difficulty
      servings: parseInt(data.recipeYield) || 4,
      category: this.categorizeRecipe(data.recipeCategory || data.keywords || ''),
      cuisine: this.extractCuisine(data.recipeCuisine || ''),
      imageUrl: data.image?.url || data.image || undefined,
      sourceUrl,
      ingredients,
      instructions,
      dietaryTags: this.extractDietaryTags(data.keywords || data.suitableForDiet || ''),
    };
  }

  /**
   * Parse recipe from HTML (fallback method)
   */
  private parseHtmlRecipe($: cheerio.Root, sourceUrl: string): ScrapedRecipe {
    // This is a generic HTML parser - may need adjustment based on actual HelloFresh HTML structure
    const title = $('h1').first().text().trim() ||
                  $('[data-test-id="recipe-title"]').text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  'Untitled Recipe';

    const description = $('meta[property="og:description"]').attr('content') ||
                       $('[data-test-id="recipe-description"]').text().trim() ||
                       '';

    const imageUrl = $('meta[property="og:image"]').attr('content') ||
                    $('img[data-test-id="recipe-image"]').attr('src') ||
                    '';

    // Extract ingredients
    const ingredients: ScrapedRecipe['ingredients'] = [];
    $('[data-test-id*="ingredient"], .ingredient, [class*="ingredient"]').each((index, el) => {
      const text = $(el).text().trim();
      if (text) {
        ingredients.push(this.parseIngredient(text, index));
      }
    });

    // Extract instructions
    const instructions: ScrapedRecipe['instructions'] = [];
    $('[data-test-id*="instruction"], .instruction, [class*="step"]').each((index, el) => {
      const text = $(el).text().trim();
      if (text) {
        instructions.push({
          stepNumber: index + 1,
          text,
        });
      }
    });

    return {
      title,
      description,
      prepTime: 15,
      cookTime: 30,
      difficulty: 2,
      servings: 4,
      category: 'main',
      imageUrl: imageUrl || undefined,
      sourceUrl,
      ingredients: ingredients.length > 0 ? ingredients : this.getDefaultIngredients(),
      instructions: instructions.length > 0 ? instructions : this.getDefaultInstructions(),
      dietaryTags: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        lactoseFree: false,
        pescatarian: false,
      },
    };
  }

  /**
   * Parse ISO 8601 duration (e.g., "PT15M" = 15 minutes)
   */
  private parseIsoDuration(duration: string | undefined): number {
    if (!duration) return 0;

    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');

    return hours * 60 + minutes;
  }

  /**
   * Parse ingredient string into structured data
   */
  private parseIngredient(ingredientText: string, index: number): ScrapedRecipe['ingredients'][0] {
    // Try to extract quantity and unit
    // Examples: "2 cups flour", "500g chicken", "1 tablespoon olive oil"
    const match = ingredientText.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);

    if (match) {
      const quantity = this.parseQuantity(match[1]);
      const unit = this.normalizeUnit(match[2] || 'piece');
      const name = match[3].trim();

      return {
        name,
        quantity,
        unit,
        category: this.categorizeIngredient(name),
      };
    }

    // No quantity found, treat as whole item
    return {
      name: ingredientText,
      quantity: 1,
      unit: 'piece',
      category: this.categorizeIngredient(ingredientText),
    };
  }

  /**
   * Convert fraction or decimal string to number
   */
  private parseQuantity(quantityStr: string): number {
    if (quantityStr.includes('/')) {
      const [num, denom] = quantityStr.split('/').map(parseFloat);
      return num / denom;
    }
    return parseFloat(quantityStr);
  }

  /**
   * Normalize unit names
   */
  private normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      'cup': 'cup',
      'cups': 'cup',
      'tablespoon': 'tbsp',
      'tablespoons': 'tbsp',
      'tbsp': 'tbsp',
      'teaspoon': 'tsp',
      'teaspoons': 'tsp',
      'tsp': 'tsp',
      'gram': 'g',
      'grams': 'g',
      'g': 'g',
      'kilogram': 'kg',
      'kg': 'kg',
      'milliliter': 'ml',
      'ml': 'ml',
      'liter': 'L',
      'l': 'L',
      'oz': 'oz',
      'ounce': 'oz',
      'lb': 'lb',
      'pound': 'lb',
      'piece': 'piece',
      'pieces': 'piece',
    };

    return unitMap[unit.toLowerCase()] || unit;
  }

  /**
   * Categorize ingredient
   */
  private categorizeIngredient(name: string): string {
    const nameLower = name.toLowerCase();

    if (nameLower.match(/chicken|beef|pork|lamb|turkey|meat/)) return 'meat';
    if (nameLower.match(/fish|salmon|tuna|shrimp|seafood/)) return 'seafood';
    if (nameLower.match(/milk|cheese|cream|butter|yogurt/)) return 'dairy';
    if (nameLower.match(/tomato|onion|garlic|pepper|carrot|potato|lettuce|vegetable/)) return 'produce';
    if (nameLower.match(/flour|sugar|salt|pepper|spice|oil|vinegar/)) return 'pantry';
    if (nameLower.match(/pasta|rice|bread|grain/)) return 'grain';

    return 'other';
  }

  /**
   * Categorize recipe based on keywords
   */
  private categorizeRecipe(keywords: string | string[]): string {
    const keywordStr = Array.isArray(keywords) ? keywords.join(' ').toLowerCase() : keywords.toLowerCase();

    if (keywordStr.match(/chicken|poultry/)) return 'chicken';
    if (keywordStr.match(/beef|steak/)) return 'beef';
    if (keywordStr.match(/fish|seafood/)) return 'fish';
    if (keywordStr.match(/pasta/)) return 'pasta';
    if (keywordStr.match(/soup|stew/)) return 'soup';
    if (keywordStr.match(/salad/)) return 'salad';
    if (keywordStr.match(/vegetable/)) return 'vegetable';

    return 'main';
  }

  /**
   * Extract cuisine type
   */
  private extractCuisine(cuisine: string | string[]): string | undefined {
    const cuisineStr = Array.isArray(cuisine) ? cuisine[0] : cuisine;
    if (!cuisineStr) return undefined;

    const cuisineLower = cuisineStr.toLowerCase();

    if (cuisineLower.match(/italian/)) return 'italian';
    if (cuisineLower.match(/french/)) return 'french';
    if (cuisineLower.match(/asian|chinese|japanese|thai/)) return 'asian';
    if (cuisineLower.match(/mexican/)) return 'mexican';
    if (cuisineLower.match(/indian/)) return 'indian';
    if (cuisineLower.match(/mediterranean/)) return 'mediterranean';

    return cuisineLower;
  }

  /**
   * Extract dietary tags from keywords
   */
  private extractDietaryTags(keywords: string | string[]): ScrapedRecipe['dietaryTags'] {
    const keywordStr = Array.isArray(keywords) ? keywords.join(' ').toLowerCase() : keywords.toLowerCase();

    return {
      vegetarian: keywordStr.includes('vegetarian'),
      vegan: keywordStr.includes('vegan'),
      glutenFree: keywordStr.includes('gluten free') || keywordStr.includes('gluten-free'),
      lactoseFree: keywordStr.includes('lactose free') || keywordStr.includes('dairy free'),
      pescatarian: keywordStr.includes('pescatarian') || keywordStr.includes('fish'),
    };
  }

  /**
   * Download image and save locally
   */
  async downloadImage(imageUrl: string, recipeName: string): Promise<string | null> {
    try {
      const fileName = `${recipeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.jpg`;
      const filePath = path.join(this.imageDir, fileName);

      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 30000,
      });

      await pipeline(response.data, createWriteStream(filePath));

      console.log(`📥 Downloaded image: ${fileName}`);
      return `/images/recipes/${fileName}`;
    } catch (error: any) {
      console.error(`❌ Failed to download image:`, error.message);
      return null;
    }
  }

  /**
   * Save recipe to database
   */
  async saveRecipe(scrapedRecipe: ScrapedRecipe, familyId?: string): Promise<void> {
    try {
      console.log(`💾 Saving recipe: ${scrapedRecipe.title}`);

      // Download image if URL is provided
      let localImageUrl = scrapedRecipe.imageUrl;
      if (scrapedRecipe.imageUrl && scrapedRecipe.imageUrl.startsWith('http')) {
        const downloaded = await this.downloadImage(scrapedRecipe.imageUrl, scrapedRecipe.title);
        if (downloaded) {
          localImageUrl = downloaded;
        }
      }

      const recipe = await prisma.recipe.create({
        data: {
          title: scrapedRecipe.title,
          description: scrapedRecipe.description,
          prepTime: scrapedRecipe.prepTime,
          cookTime: scrapedRecipe.cookTime,
          totalTime: scrapedRecipe.prepTime + scrapedRecipe.cookTime,
          difficulty: scrapedRecipe.difficulty,
          servings: scrapedRecipe.servings,
          category: scrapedRecipe.category,
          cuisine: scrapedRecipe.cuisine,
          imageUrl: localImageUrl,
          sourceUrl: scrapedRecipe.sourceUrl,
          source: 'imported',
          mealType: ['lunch', 'dinner'], // Default meal types
          vegetarian: scrapedRecipe.dietaryTags.vegetarian,
          vegan: scrapedRecipe.dietaryTags.vegan,
          glutenFree: scrapedRecipe.dietaryTags.glutenFree,
          lactoseFree: scrapedRecipe.dietaryTags.lactoseFree,
          pescatarian: scrapedRecipe.dietaryTags.pescatarian,
          familyId: familyId || null,
          ingredients: {
            create: scrapedRecipe.ingredients.map((ing, index) => ({
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category,
              order: index,
            })),
          },
          instructions: {
            create: scrapedRecipe.instructions.map((inst) => ({
              stepNumber: inst.stepNumber,
              text: inst.text,
              duration: inst.duration,
            })),
          },
        },
      });

      console.log(`✅ Recipe saved with ID: ${recipe.id}`);
    } catch (error: any) {
      console.error(`❌ Failed to save recipe:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape multiple recipes from a list of URLs
   */
  async scrapeRecipes(urls: string[], familyId?: string): Promise<void> {
    console.log(`\n🚀 Starting to scrape ${urls.length} recipes...\n`);

    let successCount = 0;
    let failCount = 0;

    for (const url of urls) {
      try {
        const recipe = await this.scrapeRecipe(url);

        if (recipe) {
          await this.saveRecipe(recipe, familyId);
          successCount++;
        } else {
          failCount++;
        }

        // Be nice to the server - wait between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        failCount++;
        console.error(`❌ Error processing ${url}:`, error);
      }
    }

    console.log(`\n✨ Scraping complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}\n`);
  }

  /**
   * Default ingredients if scraping fails
   */
  private getDefaultIngredients(): ScrapedRecipe['ingredients'] {
    return [
      { name: 'Main ingredient', quantity: 1, unit: 'piece', category: 'other' }
    ];
  }

  /**
   * Default instructions if scraping fails
   */
  private getDefaultInstructions(): ScrapedRecipe['instructions'] {
    return [
      { stepNumber: 1, text: 'Follow package instructions or refer to source URL' }
    ];
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
HelloFresh Recipe Scraper
=========================

Usage:
  npm run scrape-hellofresh -- <recipe-url-1> [recipe-url-2] ... [--family-id=<id>] [--region=<region>]

Options:
  --family-id=<id>    Optional: Associate recipes with a specific family
  --region=<region>   Optional: HelloFresh region (com, fr, uk, etc.) Default: com

Examples:
  npm run scrape-hellofresh -- https://www.hellofresh.com/recipes/recipe-id-1
  npm run scrape-hellofresh -- https://www.hellofresh.com/recipes/recipe-1 https://www.hellofresh.com/recipes/recipe-2
  npm run scrape-hellofresh -- https://www.hellofresh.fr/recipes/recipe-1 --region=fr
  npm run scrape-hellofresh -- https://www.hellofresh.com/recipes/recipe-1 --family-id=abc123

Note: This scraper respects HelloFresh's content and should only be used for personal use.
    `);
    process.exit(0);
  }

  // Parse arguments
  const urls: string[] = [];
  let familyId: string | undefined;
  let region = 'com';

  for (const arg of args) {
    if (arg.startsWith('--family-id=')) {
      familyId = arg.split('=')[1];
    } else if (arg.startsWith('--region=')) {
      region = arg.split('=')[1];
    } else if (arg.startsWith('http')) {
      urls.push(arg);
    }
  }

  if (urls.length === 0) {
    console.error('❌ Error: Please provide at least one recipe URL');
    process.exit(1);
  }

  const scraper = new HelloFreshScraper(region);
  await scraper.init();

  try {
    await scraper.scrapeRecipes(urls, familyId);
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HelloFreshScraper, ScrapedRecipe };
