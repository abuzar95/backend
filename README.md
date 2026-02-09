# Prospect Management Backend

Backend API for Prospect Management System using Express, Prisma, and Supabase PostgreSQL.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file and add your database connection strings:
- DATABASE_URL: Connection pooling URL for Supabase
- DIRECT_URL: Direct connection URL for migrations

3. Generate Prisma Client:
```bash
npm run prisma:generate
```

4. Run database migrations:
```bash
npm run prisma:migrate
```
This will create the `Prospect` table in your Supabase database.

5. Run the server:
```bash
npm run dev
```

The server will run on http://localhost:3001

## Prisma Commands

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/prospects` - Get all prospects
- `GET /api/prospects/user/:userId` - Get prospects by user ID
- `POST /api/prospects` - Create new prospect
- `PUT /api/prospects/:id` - Update prospect
