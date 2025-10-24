# HelloFresh Recipe Scraper

A powerful tool to scrape recipes from HelloFresh and import them into your Family Planner database, complete with images, ingredients, and instructions.

## Features

- **Complete Recipe Data**: Scrapes title, description, prep/cook times, difficulty, servings
- **Image Download**: Automatically downloads and stores recipe images locally
- **Ingredients Parsing**: Extracts ingredients with quantities and units
- **Step-by-step Instructions**: Captures cooking instructions in order
- **Dietary Tags**: Identifies vegetarian, vegan, gluten-free, and other dietary preferences
- **Multi-region Support**: Works with HelloFresh sites in different countries (.com, .fr, .uk, etc.)
- **Database Integration**: Saves directly to your PostgreSQL database via Prisma

## Installation

Dependencies are already installed if you've run `npm install` in the backend folder. If not:

```bash
cd backend
npm install
```

## Usage

### Basic Usage

Scrape a single recipe:

```bash
npm run scrape-hellofresh -- https://www.hellofresh.com/recipes/your-recipe-url
```

### Scrape Multiple Recipes

You can scrape multiple recipes in one command:

```bash
npm run scrape-hellofresh -- \
  https://www.hellofresh.com/recipes/recipe-1 \
  https://www.hellofresh.com/recipes/recipe-2 \
  https://www.hellofresh.com/recipes/recipe-3
```

### Associate with a Family

To assign recipes to a specific family:

```bash
npm run scrape-hellofresh -- https://www.hellofresh.com/recipes/recipe-url --family-id=YOUR_FAMILY_ID
```

### Different Regions

For HelloFresh sites in different countries:

```bash
# France
npm run scrape-hellofresh -- https://www.hellofresh.fr/recipes/recipe-url --region=fr

# United Kingdom
npm run scrape-hellofresh -- https://www.hellofresh.co.uk/recipes/recipe-url --region=co.uk

# Germany
npm run scrape-hellofresh -- https://www.hellofresh.de/recipes/recipe-url --region=de
```

### Get Help

```bash
npm run scrape-hellofresh -- --help
```

## How It Works

### 1. Data Extraction

The scraper uses two methods to extract recipe data:

1. **JSON-LD Structured Data** (preferred): HelloFresh includes recipe data in JSON-LD format, which is the most reliable source
2. **HTML Parsing** (fallback): If JSON-LD is not available, the scraper parses the HTML content

### 2. Image Download

When a recipe image URL is found:
- The image is downloaded from HelloFresh's CDN
- Saved locally to `backend/public/images/recipes/`
- Filename format: `recipe-name-timestamp.jpg`
- The local path is stored in the database

### 3. Data Mapping

HelloFresh data is mapped to your recipe schema:

| HelloFresh Field | Your Schema Field |
|-----------------|-------------------|
| name | title |
| description | description |
| prepTime | prepTime (parsed from ISO 8601) |
| cookTime | cookTime (parsed from ISO 8601) |
| recipeYield | servings |
| recipeIngredient | ingredients (parsed) |
| recipeInstructions | instructions |
| image | imageUrl (downloaded) |
| keywords | dietary tags |

### 4. Ingredient Parsing

The scraper intelligently parses ingredient strings like:

- "2 cups flour" → `{ name: "flour", quantity: 2, unit: "cup" }`
- "500g chicken breast" → `{ name: "chicken breast", quantity: 500, unit: "g" }`
- "1 tablespoon olive oil" → `{ name: "olive oil", quantity: 1, unit: "tbsp" }`

### 5. Database Storage

Recipes are saved using Prisma with:
- Main recipe data
- Related ingredients (with quantities and categories)
- Step-by-step instructions
- Dietary flags
- Source URL for reference

## Directory Structure

```
backend/
├── src/scripts/
│   └── scrapeHelloFresh.ts      # Main scraper script
├── public/
│   └── images/
│       └── recipes/              # Downloaded recipe images stored here
├── package.json                  # Includes 'scrape-hellofresh' script
└── SCRAPER_README.md            # This file
```

## Output Example

```
🚀 Starting to scrape 2 recipes...

🔍 Scraping recipe: https://www.hellofresh.com/recipes/crispy-chicken-parm
📥 Downloaded image: crispy-chicken-parm-1729759200000.jpg
💾 Saving recipe: Crispy Chicken Parm
✅ Recipe saved with ID: abc123...

🔍 Scraping recipe: https://www.hellofresh.com/recipes/veggie-burrito-bowl
📥 Downloaded image: veggie-burrito-bowl-1729759202000.jpg
💾 Saving recipe: Veggie Burrito Bowl
✅ Recipe saved with ID: def456...

✨ Scraping complete!
   ✅ Success: 2
   ❌ Failed: 0
```

## Finding Recipe URLs

### Method 1: Browse HelloFresh Website

1. Go to https://www.hellofresh.com/recipes
2. Browse or search for recipes
3. Click on a recipe
4. Copy the URL from your browser
5. Use that URL with the scraper

### Method 2: Using the HelloFresh API (Advanced)

HelloFresh has an API that you can explore to find recipe IDs programmatically. This is more advanced and may require additional development.

## Troubleshooting

### Scraping Fails

If scraping fails, it could be due to:

1. **Network Issues**: HelloFresh servers might be slow or blocked
2. **Page Structure Changed**: HelloFresh may have updated their website
3. **Rate Limiting**: Too many requests too quickly (the scraper waits 2 seconds between recipes)

**Solution**: Check the error message and try again. The scraper will continue with other recipes even if one fails.

### Images Not Downloading

If images fail to download:

1. **Check Permissions**: Ensure `backend/public/images/recipes/` is writable
2. **Network Issues**: Image CDN might be slow or blocked
3. **Invalid URL**: The image URL might be malformed

**Solution**: The recipe will still be saved without the image, and you can add images manually later.

### No Ingredients/Instructions Found

If the scraper can't extract ingredients or instructions:

1. **Page Format Changed**: HelloFresh updated their structure
2. **Recipe Type**: Some pages might not be actual recipes (e.g., articles)

**Solution**: Default placeholders are added. You can edit the recipe in the database or admin panel.

## Rate Limiting & Best Practices

- The scraper waits 2 seconds between each recipe to be respectful to HelloFresh servers
- Don't scrape hundreds of recipes at once
- Consider scraping in batches (e.g., 10-20 recipes at a time)
- This tool is for personal use only

## Extending the Scraper

### Add Custom Parsing

Edit `src/scripts/scrapeHelloFresh.ts` and modify these methods:

- `parseJsonLdRecipe()`: Customize how JSON-LD data is parsed
- `parseHtmlRecipe()`: Customize HTML parsing
- `categorizeIngredient()`: Add more ingredient categories
- `categorizeRecipe()`: Add more recipe categories

### Add Support for Other Sites

You can extend this scraper to work with other recipe websites by:

1. Creating a new scraper class (e.g., `BluApronScraper`)
2. Implementing the same core methods
3. Adjusting the parsing logic for the new site

## API Integration

If you want to expose scraping via API:

1. Create a new endpoint in `src/routes/`
2. Import `HelloFreshScraper`
3. Call scraper methods from the endpoint
4. Return results to the client

Example:

```typescript
import { HelloFreshScraper } from '../scripts/scrapeHelloFresh.js';

router.post('/import-recipe', async (req, res) => {
  const { url, familyId } = req.body;
  const scraper = new HelloFreshScraper();
  await scraper.init();

  const recipe = await scraper.scrapeRecipe(url);
  if (recipe) {
    await scraper.saveRecipe(recipe, familyId);
    res.json({ success: true, recipe });
  } else {
    res.status(400).json({ success: false, error: 'Failed to scrape recipe' });
  }
});
```

## Database Schema

Scraped recipes are stored with the following structure:

### Recipe Table
- title, description
- prepTime, cookTime, totalTime
- difficulty (1-5)
- servings
- category, cuisine
- imageUrl (local path)
- sourceUrl (original HelloFresh URL)
- dietary flags (vegetarian, vegan, glutenFree, etc.)

### Ingredients Table (Related)
- name
- quantity
- unit
- category

### Instructions Table (Related)
- stepNumber
- text
- duration (optional)

## Legal & Ethics

- This scraper is for **personal use only**
- HelloFresh recipes are copyrighted content
- Be respectful of HelloFresh's servers (don't spam requests)
- Consider HelloFresh's Terms of Service
- Images belong to HelloFresh

## Support

If you encounter issues:

1. Check this README for troubleshooting
2. Review the console output for error messages
3. Verify the recipe URL is correct
4. Ensure the database is running and accessible

## Future Enhancements

Potential improvements:

- [ ] Bulk import from HelloFresh recipe list pages
- [ ] Support for video tutorials
- [ ] Nutrition information extraction
- [ ] Auto-translation for multi-language support
- [ ] Recipe deduplication (avoid importing same recipe twice)
- [ ] Scheduled scraping (cron job)
- [ ] Web UI for selecting recipes to import

---

Happy scraping! Enjoy building your recipe database.
