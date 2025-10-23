# 🐳 Docker Setup Guide

## Quick Start with Docker

The easiest way to run the Family Planner application is using Docker Compose.

### Prerequisites

- Docker Desktop (includes Docker and Docker Compose)
  - [Download for Mac](https://www.docker.com/products/docker-desktop/)
  - [Download for Windows](https://www.docker.com/products/docker-desktop/)
  - [Download for Linux](https://docs.docker.com/desktop/install/linux-install/)

### Production Deployment

Run the full production build:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database**: localhost:5432

### Development Mode (with hot reload)

For active development with file watching and hot reload:

```bash
# Build and start development environment
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

Development servers:
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:3001 (with nodemon/tsx watch)
- **Database**: localhost:5432

### Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Restart a specific service
docker-compose restart backend

# Access database shell
docker-compose exec postgres psql -U familyplanner -d family_planner

# Run Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio

# Run migrations manually
docker-compose exec backend npx prisma migrate deploy

# Reseed database
docker-compose exec backend npx prisma db seed
```

### Database Connection

The application uses PostgreSQL with the following credentials (development):

```
Host: localhost
Port: 5432
Database: family_planner
Username: familyplanner
Password: familyplanner123
```

**⚠️ Change these credentials for production!**

### Troubleshooting

#### Port already in use
If you get an error about ports being in use:

```bash
# Check what's using the port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # Database

# Kill the process or change ports in docker-compose.yml
```

#### Database connection errors
```bash
# Recreate database
docker-compose down -v
docker-compose up --build
```

#### Frontend can't reach backend
- Check CORS_ORIGIN in docker-compose.yml matches your frontend URL
- Check VITE_API_URL in frontend environment

#### View container status
```bash
docker-compose ps
```

### Production Considerations

Before deploying to production:

1. **Change all secrets** in docker-compose.yml:
   - JWT_SECRET
   - POSTGRES_PASSWORD
   - POSTGRES_USER

2. **Set NODE_ENV=production**

3. **Configure proper domains**:
   - Update CORS_ORIGIN to your production domain
   - Update APP_URL

4. **Use environment files**:
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit with production values

   # Use with docker-compose
   docker-compose --env-file .env up
   ```

5. **Set up SSL/TLS** (use nginx or a reverse proxy)

6. **Configure backups** for PostgreSQL data volume

7. **Set resource limits** in docker-compose.yml:
   ```yaml
   services:
     backend:
       deploy:
         resources:
           limits:
             cpus: '0.5'
             memory: 512M
   ```

### Cloud Deployment

#### Docker Hub
```bash
# Tag images
docker tag family-planner-backend:latest yourusername/family-planner-backend:latest
docker tag family-planner-frontend:latest yourusername/family-planner-frontend:latest

# Push to Docker Hub
docker push yourusername/family-planner-backend:latest
docker push yourusername/family-planner-frontend:latest
```

#### Deploy to Cloud Platforms

- **Railway**: Connect GitHub repo and deploy
- **Render**: Connect repo, set as Docker deployment
- **DigitalOcean App Platform**: Use Dockerfile deployment
- **AWS ECS/Fargate**: Use provided Dockerfiles
- **Google Cloud Run**: Deploy containerized apps

### Health Checks

The application includes health check endpoints:

- Backend: `http://localhost:3001/health`
- Database: Automatic health check in docker-compose

### Next Steps

1. Access the frontend at http://localhost:3000 (production) or http://localhost:5173 (dev)
2. Register a new account
3. Create your family profile
4. Start planning meals!

### Database Schema

To view or modify the database schema:

```bash
# Open Prisma Studio (visual database editor)
docker-compose exec backend npx prisma studio

# This opens a web interface at http://localhost:5555
```

## Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Restart services: `docker-compose restart`
3. Full reset: `docker-compose down -v && docker-compose up --build`
