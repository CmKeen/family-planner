import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, existsSync } from 'fs';
import { pipeline } from 'stream/promises';

const prisma = new PrismaClient();

/**
 * Script to fix recipes with broken image links
 *
 * This script will:
 * 1. Find all recipes with imageUrl values
 * 2. Check if the image files exist on disk
 * 3. For missing images:
 *    - If we have a source URL with an image, re-download it
 *    - Otherwise, clear the imageUrl field
 */

interface RecipeWithImage {
  id: string;
  title: string;
  imageUrl: string | null;
  sourceUrl: string | null;
}

async function downloadImage(imageUrl: string, recipeName: string, imageDir: string): Promise<string | null> {
  try {
    const fileName = `${recipeName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}.jpg`;
    const filePath = path.join(imageDir, fileName);

    console.log(`  📥 Downloading image for: ${recipeName}`);

    const response = await axios.get(imageUrl, {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    await pipeline(response.data, createWriteStream(filePath));
    console.log(`  ✅ Downloaded: ${fileName}`);

    return `/images/recipes/${fileName}`;
  } catch (error: any) {
    console.error(`  ❌ Failed to download image:`, error.message);
    return null;
  }
}

async function getImageUrlFromSource(sourceUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    // Try to find image URL in meta tags
    const ogImageMatch = response.data.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    if (ogImageMatch) {
      return ogImageMatch[1];
    }

    // Try to find JSON-LD structured data
    const jsonLdMatch = response.data.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/is);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.image?.url) return jsonData.image.url;
        if (jsonData.image && typeof jsonData.image === 'string') return jsonData.image;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return null;
  } catch (error: any) {
    console.error(`  ⚠️  Could not fetch source URL:`, error.message);
    return null;
  }
}

async function fixBrokenImages() {
  console.log('\n🔧 Starting broken image fix process...\n');

  const imageDir = path.join(process.cwd(), 'public', 'images', 'recipes');

  // Ensure directory exists
  await fs.mkdir(imageDir, { recursive: true });

  // Find all recipes with imageUrl
  const recipes = await prisma.recipe.findMany({
    where: {
      imageUrl: {
        not: null
      }
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      sourceUrl: true
    }
  }) as RecipeWithImage[];

  console.log(`📊 Found ${recipes.length} recipes with image URLs\n`);

  let fixedCount = 0;
  let clearedCount = 0;
  let alreadyExistsCount = 0;
  let failedCount = 0;

  for (const recipe of recipes) {
    console.log(`\n🔍 Checking: ${recipe.title}`);
    console.log(`   Image URL: ${recipe.imageUrl}`);

    // Check if image file exists
    if (recipe.imageUrl && recipe.imageUrl.startsWith('/images/recipes/')) {
      const fileName = recipe.imageUrl.replace('/images/recipes/', '');
      const filePath = path.join(imageDir, fileName);

      if (existsSync(filePath)) {
        console.log(`   ✅ Image file exists`);
        alreadyExistsCount++;
        continue;
      }

      console.log(`   ⚠️  Image file missing: ${fileName}`);

      // Try to re-download the image
      if (recipe.sourceUrl) {
        console.log(`   🔍 Trying to fetch image from source URL...`);
        const imageUrl = await getImageUrlFromSource(recipe.sourceUrl);

        if (imageUrl) {
          const newImagePath = await downloadImage(imageUrl, recipe.title, imageDir);

          if (newImagePath) {
            await prisma.recipe.update({
              where: { id: recipe.id },
              data: { imageUrl: newImagePath }
            });
            console.log(`   ✅ Updated recipe with new image`);
            fixedCount++;
            continue;
          }
        }
      }

      // If we couldn't re-download, clear the imageUrl
      console.log(`   🧹 Clearing broken image URL`);
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { imageUrl: null }
      });
      clearedCount++;

    } else if (recipe.imageUrl && recipe.imageUrl.startsWith('http')) {
      // External URL - download it
      console.log(`   📥 Downloading external image...`);
      const newImagePath = await downloadImage(recipe.imageUrl, recipe.title, imageDir);

      if (newImagePath) {
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: { imageUrl: newImagePath }
        });
        console.log(`   ✅ Downloaded and updated`);
        fixedCount++;
      } else {
        console.log(`   ❌ Failed to download`);
        failedCount++;
      }
    }
  }

  console.log(`\n✨ Broken image fix complete!`);
  console.log(`   ✅ Already exist: ${alreadyExistsCount}`);
  console.log(`   🔧 Fixed (re-downloaded): ${fixedCount}`);
  console.log(`   🧹 Cleared (couldn't fix): ${clearedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   📊 Total processed: ${recipes.length}\n`);
}

// Run if called directly
async function main() {
  try {
    await fixBrokenImages();
  } catch (error) {
    console.error('❌ Error fixing broken images:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export { fixBrokenImages };
