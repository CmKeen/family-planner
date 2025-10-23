# 🍽️ Family Planner - Meal Planning SaaS

A comprehensive family meal planning application with multi-dietary constraint support (Kosher, Halal, Vegetarian, Vegan, Gluten-Free, Lactose-Free), smart weekly menu generation, school menu integration, and collaborative planning features.

## ✨ Features

### MVP Features
- ✅ **Multi-Constraint Dietary Profiles**: Support for Kosher, Halal, Vegetarian, Vegan, Gluten-Free, Lactose-Free, and custom allergies
- ✅ **Smart Weekly Planning**: Auto-generate weekly meal plans with 60-80% favorites + 1-2 new recipes
- ✅ **Express Plan**: Quick planning with favorites only (< 5 min validation)
- ✅ **Recipe Catalog**: Filtered catalog based on family dietary constraints
- ✅ **Recipe Swapping**: Replace meals with compliant alternatives
- ✅ **School Menu Integration**: Import school menus and avoid duplication
- ✅ **Smart Shopping Lists**: Consolidated lists with portion calculations, dietary substitutions, and aisle grouping
- ✅ **PWA Support**: Offline-ready shopping lists
- ✅ **Mobile-First Design**: Optimized for phones, tablets, and desktop
- ✅ **Multi-Language**: French & English support (Dutch in V2)

### V1.5 Features (Collaboration)
- 🔄 Family collaboration with votes, RSVP, and wishes
- 🔄 Guest management and portion recalculation
- 🔄 Cutoff system with delta mode
- 🔄 Notifications and reminders

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL with Prisma ORM
- JWT authentication
- RESTful API

**Frontend:**
- React 18 + TypeScript
- Vite (fast build tool)
- Tailwind CSS (mobile-first styling)
- Radix UI components (accessible)
- Zustand (state management)
- React Query (data fetching)
- PWA support (offline capability)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Installation

1. **Clone the repository**
```bash
cd /home/user/family-planner
```

2. **Install root dependencies**
```bash
npm install
```

3. **Set up the backend**

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/family_planner"
# JWT_SECRET="your-super-secret-key"

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed sample recipes
npm run prisma:seed
```

4. **Set up the frontend**

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# The default API URL is http://localhost:3001/api
```

### Running the Application

#### Option 1: Run everything together (from root)
```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

#### Option 2: Run separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

### Database Management

```bash
cd backend

# Open Prisma Studio (visual database editor)
npm run prisma:studio

# Create a new migration
npm run prisma:migrate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 📱 Key Features Guide

### 1. User Registration & Login
- Create an account with email/password
- Secure JWT-based authentication

### 2. Family Setup
- Create your family profile
- Add family members with roles (admin, parent, member, child)
- Configure dietary profile:
  - Kosher settings (meat/dairy/parve, timing between meals)
  - Halal requirements
  - Vegetarian/Vegan preferences
  - Gluten-free and Lactose-free needs
  - Custom allergies

### 3. Weekly Planning

**Auto-Generate Plan:**
- Click "New Plan" from dashboard
- System generates a balanced week with:
  - 60-80% from your favorite recipes
  - 1-2 new recipes for variety
  - No duplication with school menus
  - Full dietary compliance

**Express Plan:**
- Quick planning with only favorites
- 1 novelty recipe maximum
- Validation in < 5 minutes

**Manual Adjustments:**
- Swap any meal with alternatives
- Lock meals to prevent changes
- Adjust portions per meal
- Mark meals as "external" (restaurant, delivery)

### 4. Recipe Management
- Browse recipe catalog (filtered by your dietary constraints)
- View recipe details (ingredients, instructions, timing)
- Mark recipes as favorites
- Rate recipes after cooking
- Add custom recipes (coming soon)

### 5. Shopping Lists
- Auto-generated from your weekly plan
- Grouped by store aisle/department
- Smart quantity calculation:
  - Adjusts for portions
  - Accounts for guests
  - Deducts from inventory (if tracked)
  - Rounds to packaging sizes
- Dietary substitutions suggested automatically
- Offline-capable (PWA)
- Check off items as you shop

### 6. School Menu Integration
- Add school lunch menus manually
- System automatically avoids serving similar foods at dinner
- Anti-duplication by food category

## 🗂️ Project Structure

```
family-planner/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.ts             # Sample data
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API routes
│   │   ├── middleware/         # Auth, error handling
│   │   ├── lib/                # Prisma client
│   │   ├── utils/              # Helper functions
│   │   └── index.ts            # Server entry point
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/             # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── stores/             # Zustand state management
│   │   ├── lib/                # API client, utilities
│   │   ├── App.tsx             # Main app with routing
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── package.json                # Root package (scripts)
└── README.md
```

## 🎨 Design System

The application uses a custom design system built on Tailwind CSS:

- **Mobile-First**: All components are optimized for mobile devices first
- **Touch-Friendly**: Minimum 44x44px touch targets
- **Accessible**: Built with Radix UI for WCAG 2.2 AA compliance
- **Responsive**: Adapts seamlessly from phone to desktop
- **Dark Mode Support**: Automatic theme switching

**Color Palette:**
- Primary: Green (#22c55e) - Represents freshness and health
- Secondary: Slate grays for neutral backgrounds
- Semantic colors for success, warning, error states

## 🔒 Security

- **Authentication**: JWT with HTTP-only cookies
- **Password**: Bcrypt hashing with salt
- **CORS**: Configured for frontend origin only
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection**: Protected via Prisma ORM
- **RGPD Compliant**: Data stored in EU, user consent, export/deletion capabilities

## 📊 Database Schema

Key entities:
- **User**: Account credentials and preferences
- **Family**: Family unit with dietary profile
- **FamilyMember**: Family members with roles and portion factors
- **Recipe**: Recipes with ingredients, instructions, and dietary tags
- **WeeklyPlan**: Weekly meal plans with status
- **Meal**: Individual meals within a plan
- **ShoppingList**: Generated shopping lists with items
- **SchoolMenu**: Imported school menus

## 🧪 Testing

```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

## 📦 Building for Production

```bash
# Build everything
npm run build

# Or build individually
cd backend && npm run build
cd frontend && npm run build
```

## 🚀 Deployment

### Backend Deployment (e.g., Railway, Render, Heroku)

1. Set environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `JWT_SECRET`: Strong secret key
   - `NODE_ENV=production`
   - `CORS_ORIGIN`: Your frontend URL

2. Run migrations:
```bash
npx prisma migrate deploy
```

3. Start server:
```bash
npm start
```

### Frontend Deployment (e.g., Vercel, Netlify)

1. Set environment variable:
   - `VITE_API_URL`: Your backend API URL

2. Build:
```bash
npm run build
```

3. Deploy the `dist` folder

## 🌍 Internationalization

The app supports multiple languages:
- French (fr)
- English (en)
- Dutch (nl) - Coming in V2

To add translations, edit files in `frontend/src/i18n/`

## 🛣️ Roadmap

### V1.0 (Current - MVP)
- ✅ Core meal planning features
- ✅ Multi-dietary constraints
- ✅ Shopping list generation
- ✅ School menu integration
- ✅ Mobile-first design

### V1.5 (Q2 2025)
- 🔄 Family collaboration features
- 🔄 RSVP and guest management
- 🔄 Voting on meals
- 🔄 Wish list
- 🔄 Notifications

### V2.0 (Q3 2025)
- 📋 Grocery store integrations
- 📋 Dutch language support
- 📋 Hebrew calendar integration
- 📋 Passover planning
- 📋 Weather-based suggestions
- 📋 Gamification

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 💬 Support

For support, please:
- Open an issue on GitHub
- Email: support@familyplanner.com (if applicable)

## 👥 Authors

Created with ❤️ for families who want to simplify meal planning while respecting dietary needs.

---

**Happy Planning! 🍽️**
