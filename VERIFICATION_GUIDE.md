# Chrome DevTools MCP Verification Guide

**CRITICAL: You MUST verify your work using Chrome DevTools MCP before marking tasks complete.**

## What is Chrome MCP?

Chrome MCP (Model Context Protocol) allows AI assistants to:
- Navigate web applications
- Take screenshots and snapshots
- Interact with UI elements
- Verify functionality
- Check console errors
- Monitor network requests

## Verification Workflow (MANDATORY)

After implementing ANY feature:

### 1. START
```bash
docker-compose -f docker-compose.dev.yml up
# Wait for services to be ready
```

### 2. NAVIGATE
- Use Chrome MCP to navigate to feature
- Take snapshot of page state

### 3. INTERACT
- Click buttons
- Fill forms
- Submit data
- Verify responses

### 4. VERIFY
- Screenshot before/after states
- Check console for errors
- Verify network requests (status codes, payloads)
- Confirm UI updates correctly

### 5. TEST LANGUAGES
- Switch to French → verify
- Switch to English → verify
- Switch to Dutch → verify

### 6. DOCUMENT
- Screenshot working feature
- Note any issues found
- Confirm all acceptance criteria met

## Example: Verifying Create Recipe Feature

```typescript
// Step 1: Navigate to recipes page
await mcp.navigate('http://localhost:5173/recipes');
await mcp.takeSnapshot();

// Step 2: Open create dialog
await mcp.click('[data-testid="create-recipe-button"]');
await mcp.takeSnapshot();

// Step 3: Fill form
await mcp.fill('[name="title"]', 'Test Recipe');
await mcp.fill('[name="prepTime"]', '15');
await mcp.fill('[name="cookTime"]', '30');

// Step 4: Submit
await mcp.click('[type="submit"]');
await mcp.waitFor('Test Recipe');

// Step 5: Verify
await mcp.takeSnapshot();

// Step 6: Check console
const consoleErrors = await mcp.listConsoleMessages({ types: ['error'] });
// Should be empty!

// Step 7: Check network
const requests = await mcp.listNetworkRequests();
const createRequest = requests.find(r => r.url.includes('/api/recipes'));
// Verify: POST /api/recipes → 201 Created

// Step 8: Test translations
await mcp.click('[data-testid="language-switcher"]');
await mcp.click('[data-language="en"]');
await mcp.takeSnapshot();
```

## Verification Checklist

Before marking ANY task complete:
- [ ] Feature works in browser (Chrome MCP verified)
- [ ] No console errors
- [ ] Network requests succeed (2xx status codes)
- [ ] UI updates correctly
- [ ] Works in French
- [ ] Works in English
- [ ] Works in Dutch
- [ ] Mobile responsive (test viewport resize)
- [ ] Error cases handled gracefully
- [ ] Loading states display correctly

## What to Verify

### Backend Features
- ✓ API endpoints return correct status codes
- ✓ Response data matches expected schema
- ✓ Database records created/updated correctly
- ✓ Authentication/authorization working
- ✓ Error messages translated
- ✓ Rate limiting enforced

### Frontend Features
- ✓ Page renders without errors
- ✓ Forms submit successfully
- ✓ Validation messages display
- ✓ Loading spinners show during requests
- ✓ Success/error toasts appear
- ✓ Data refreshes after mutations
- ✓ All text translated
- ✓ Images load
- ✓ Responsive design works

## Chrome MCP Commands Reference

### Navigation
```typescript
mcp.navigate(url)
mcp.navigate_page_history('back' | 'forward')
```

### Interaction
```typescript
mcp.click(selector)
mcp.fill(selector, value)
mcp.fill_form([{ selector, value }, ...])
mcp.hover(selector)
```

### Observation
```typescript
mcp.take_snapshot()
mcp.take_screenshot()
mcp.list_console_messages()
mcp.list_network_requests()
mcp.get_network_request(requestId)
```

### Waiting
```typescript
mcp.wait_for(text, timeout)
```

### Inspection
```typescript
mcp.evaluate_script(functionString)
```
