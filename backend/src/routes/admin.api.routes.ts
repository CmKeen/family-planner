import { Router } from 'express';
import { authenticateAdmin, AdminAuthRequest } from '../middleware/adminAuth';
import { scrapeHelloFreshRecipes } from '../controllers/admin.controller';
import { log } from '../config/logger';

const router = Router();

// All admin API routes require admin authentication
router.use(authenticateAdmin);

// Simple redirect for easier access
router.get('/scraper', (req, res) => {
  res.redirect('/api/admin/scraper-form');
});

// Serve the scraper HTML form
router.get('/scraper-form', (req: AdminAuthRequest, res) => {
  log.info('Admin scraper form accessed', { userId: req.user?.id });
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>HelloFresh Recipe Scraper</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-top: 0;
        }
        .info {
            background: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #555;
        }
        label.required::after {
            content: " *";
            color: #f44336;
        }
        textarea, input[type="text"], select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        textarea {
            min-height: 150px;
            font-family: 'Courier New', monospace;
            resize: vertical;
        }
        button {
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            font-weight: 500;
        }
        button:hover {
            background: #45a049;
        }
        button:disabled {
            background: #cccccc;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 4px;
            display: none;
        }
        .result.success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }
        .result.error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }
        .loading {
            display: inline-block;
            margin-left: 10px;
        }
        .back-link {
            display: inline-block;
            margin-bottom: 20px;
            color: #2196F3;
            text-decoration: none;
        }
        .back-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/admin" class="back-link">← Back to Admin Panel</a>

        <h1>🥘 HelloFresh Recipe Scraper</h1>

        <div class="info">
            <strong>How to use:</strong> Paste one or more HelloFresh recipe URLs below (one per line), select the region, and click "Scrape Recipes". The recipes will be added to your database.
        </div>

        <form id="scraperForm">
            <div class="form-group">
                <label for="urls" class="required">Recipe URLs (one per line)</label>
                <textarea id="urls" name="urls" required placeholder="https://www.hellofresh.com/recipes/crispy-chicken-milanese
https://www.hellofresh.com/recipes/creamy-tuscan-chicken"></textarea>
            </div>

            <div class="form-group">
                <label for="familyId">Family ID (optional)</label>
                <input type="text" id="familyId" name="familyId" placeholder="Leave empty for global recipes">
                <small style="color: #666;">If provided, recipes will be associated with this family</small>
            </div>

            <div class="form-group">
                <label for="region">Region & Language</label>
                <select id="region" name="region">
                    <option value="com">United States (English)</option>
                    <option value="uk">United Kingdom (English)</option>
                    <option value="fr">France (Français)</option>
                    <option value="de">Germany (Deutsch)</option>
                    <option value="au">Australia (English)</option>
                    <option value="ca">Canada (English)</option>
                    <option value="nl">Netherlands (Nederlands)</option>
                    <option value="be-fr">Belgium (Français) 🇧🇪</option>
                    <option value="be-nl">Belgium (Nederlands) 🇧🇪</option>
                    <option value="ie">Ireland (English)</option>
                    <option value="nz">New Zealand (English)</option>
                </select>
            </div>

            <button type="submit" id="submitBtn">
                Scrape Recipes
                <span class="loading" id="loading" style="display: none;">⏳</span>
            </button>
        </form>

        <div id="result" class="result"></div>
    </div>

    <script>
        document.getElementById('scraperForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const formData = new FormData(e.target);
            const urls = formData.get('urls').split('\\n').map(url => url.trim()).filter(url => url);

            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'none';

            // Disable form
            submitBtn.disabled = true;
            loading.style.display = 'inline-block';

            try {
                const response = await fetch('/api/admin/scrape-hellofresh', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        urls,
                        familyId: formData.get('familyId') || undefined,
                        region: formData.get('region')
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.className = 'result success';
                    resultDiv.innerHTML = \`
                        <strong>✅ Success!</strong><br><br>
                        <strong>Total URLs:</strong> \${data.data.totalCount}<br>
                        <strong>Successfully scraped:</strong> \${data.data.successCount}<br>
                        \${data.data.failureCount > 0 ? \`<strong>Failed:</strong> \${data.data.failureCount}<br>\` : ''}
                        <br>
                        <strong>Scraped recipes:</strong>
                        <ul>
                            \${data.data.scrapedRecipes.map(r => \`<li>\${r.title}</li>\`).join('')}
                        </ul>
                    \`;
                    // Clear form on success
                    document.getElementById('urls').value = '';
                } else {
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = \`<strong>❌ Error:</strong> \${data.message || data.error || 'Failed to scrape recipes'}\`;
                }
            } catch (error) {
                resultDiv.className = 'result error';
                resultDiv.innerHTML = \`<strong>❌ Error:</strong> \${error.message}\`;
            } finally {
                submitBtn.disabled = false;
                loading.style.display = 'none';
                resultDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>
  `);
});

// Scraper endpoints
router.post('/scrape-hellofresh', scrapeHelloFreshRecipes);

export default router;
