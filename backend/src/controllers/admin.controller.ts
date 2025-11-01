import { Response } from 'express';
import { z } from 'zod';
import { HelloFreshScraper } from '../scripts/scrapeHelloFresh.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AdminAuthRequest } from '../middleware/adminAuth.js';

// Validation schema for scraping request
const scrapeRequestSchema = z.object({
  urls: z.array(z.string().url('Invalid URL format')).min(1, 'At least one URL is required'),
  familyId: z.string().optional(),
  region: z.enum(['com', 'fr', 'uk', 'de', 'au', 'ca', 'nl', 'be', 'be-fr', 'be-nl', 'ie', 'nz']).optional().default('com'),
});

/**
 * Scrape HelloFresh recipes and save to database
 * POST /api/admin/scrape-hellofresh
 */
export const scrapeHelloFreshRecipes = asyncHandler(
  async (req: AdminAuthRequest, res: Response) => {
    // Validate request body
    const validationResult = scrapeRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new AppError(
        'Invalid request data: ' + validationResult.error.errors.map(e => e.message).join(', '),
        400
      );
    }

    const { urls, familyId, region } = validationResult.data;

    // Initialize scraper
    const scraper = new HelloFreshScraper(region);

    try {
      await scraper.init();

      // Scrape the recipes
      const results = await scraper.scrapeRecipes(urls, familyId);

      res.json({
        success: true,
        message: `Successfully scraped ${results.successCount} out of ${results.totalCount} recipes`,
        data: {
          totalCount: results.totalCount,
          successCount: results.successCount,
          failureCount: results.failureCount,
          scrapedRecipes: results.scrapedRecipes.map(recipe => ({
            title: recipe.title,
            sourceUrl: recipe.sourceUrl,
          })),
        },
      });
    } catch (error) {
      throw new AppError(
        `Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500
      );
    }
  }
);
