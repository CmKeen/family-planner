# Development Environment Troubleshooting

## Hot Reload Not Working (Windows + Docker)

### Symptom
- You edit files but changes don't appear in the browser
- Error messages reference old code/line numbers that don't exist anymore
- Browser cache clearing doesn't help

### Root Cause
On Windows with WSL2, Docker volume mounts sometimes don't trigger file system events properly, so Vite's file watcher doesn't detect changes.

### Solution Implemented
We've configured Vite to use **polling** instead of native file watching in `vite.config.ts`:

```typescript
server: {
  watch: {
    usePolling: true,  // Poll for file changes instead of using native watchers
    interval: 100      // Check every 100ms
  }
}
```

### If Hot Reload Still Doesn't Work

**Option 1: Restart the frontend container**
```bash
docker-compose -f docker-compose.dev.yml restart frontend
```

**Option 2: Rebuild the container (nuclear option)**
```bash
# Stop and remove the container
docker-compose -f docker-compose.dev.yml stop frontend
docker-compose -f docker-compose.dev.yml rm -f frontend

# Rebuild without cache
docker-compose -f docker-compose.dev.yml build --no-cache frontend

# Start it
docker-compose -f docker-compose.dev.yml up -d frontend
```

**Option 3: Check if the container has your changes**
```bash
# View a specific file in the container
docker exec family-planner-frontend-dev cat /app/src/pages/DashboardPage.tsx | head -50

# Search for specific code
docker exec family-planner-frontend-dev sh -c "grep -n 'your search term' /app/src/pages/YourFile.tsx"
```

---

## Browser Service Worker Issues

### Symptom
- Old JavaScript code is served even after clearing cache
- Hard refresh (Ctrl+Shift+R) doesn't help
- Error messages reference code that no longer exists

### Root Cause
PWA service workers cache JavaScript bundles aggressively and can survive hard refreshes.

### Solution Implemented
We've disabled PWA in development mode in `vite.config.ts`:

```typescript
plugins: [
  react(),
  ...(mode !== 'development' ? [VitePWA({...})] : [])
]
```

### Manual Fix (if needed)

1. Open DevTools (F12)
2. Go to **Application** tab
3. Under **Service Workers**, click **Unregister** for all workers
4. Under **Cache Storage**, right-click and **Delete** all caches
5. Under **Storage**, click **Clear site data** (check all boxes)
6. Close browser completely and reopen

---

## Quick Checklist for "My Changes Aren't Showing"

1. ✅ **Is the dev server running?**
   ```bash
   docker logs family-planner-frontend-dev --tail 20
   # Should see: "VITE v5.x.x ready in XXXms"
   ```

2. ✅ **Are my changes in the container?**
   ```bash
   docker exec family-planner-frontend-dev cat /app/src/path/to/file.tsx
   ```

3. ✅ **Is my browser caching old code?**
   - Try Incognito/Private mode
   - Check Application tab → Service Workers
   - Clear all site data

4. ✅ **Is Vite detecting file changes?**
   - Look at terminal logs for "[vite] hmr update" messages
   - If not, restart container: `docker-compose -f docker-compose.dev.yml restart frontend`

5. ✅ **Last resort: Nuclear rebuild**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up --build
   ```

---

## Performance Note

File polling (`usePolling: true`) uses more CPU than native file watching. If your laptop fans are loud or CPU usage is high, you can:

1. Increase the `interval` to 500ms (slower updates, less CPU)
2. Disable polling and manually restart the container after making changes
3. Use WSL2 filesystem directly (put project in `\\wsl$\Ubuntu\home\...`) for better performance

---

## Backend Hot Reload

The backend uses `nodemon` which works better with Docker volumes. If backend changes aren't reflected:

```bash
docker logs family-planner-backend-dev --tail 50
# Should see "[nodemon] restarting..." messages

# If not, restart:
docker-compose -f docker-compose.dev.yml restart backend
```
