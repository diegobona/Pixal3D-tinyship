# AGENTS.md

## Overview

Database layer using Drizzle ORM with PostgreSQL. Provides type-safe data access for authentication, users, orders, subscriptions, and sessions with comprehensive schema definitions and management commands.

## Setup Commands

```bash
# Check database connection
pnpm db:check

# Generate migration files
pnpm db:generate

# Push schema to database
pnpm db:push

# Apply migrations
pnpm db:migrate

# Launch Drizzle Studio (visual interface)
pnpm db:studio

# Seed test data
pnpm db:seed
```

## Code Style

- Drizzle ORM with PostgreSQL backend
- Text-based primary keys (UUID format recommended)
- Numeric fields as strings for precision (e.g., `amount: "100"`)
- Automatic timestamps (`createdAt`, `updatedAt`)
- Foreign key relationships with proper constraints
- JSON metadata fields for extensibility

## Usage Examples

### Basic Queries

```typescript
import { db, user, account, session, subscription, order } from "@libs/database";
import { eq, and, desc } from "drizzle-orm";

// Find user by email
const userResult = await db.select()
  .from(user)
  .where(eq(user.email, "user@example.com"));

// Get user's accounts
const userAccounts = await db.select()
  .from(account)
  .where(eq(account.userId, userResult[0].id));

// Get active subscriptions
const activeSubscriptions = await db.select()
  .from(subscription)
  .where(and(
    eq(subscription.userId, userId),
    eq(subscription.status, "active")
  ));
```

### Create Records

```typescript
// Create subscription
await db.insert(subscription).values({
  id: "sub_" + crypto.randomUUID(),
  userId: userResult[0].id,
  planId: "monthly", // Must match config.payment.plans
  status: "active",
  paymentType: "one_time",
  periodStart: new Date(),
  periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});

// Create order
await db.insert(order).values({
  id: "ord_" + crypto.randomUUID(),
  userId: userResult[0].id,
  amount: "100", // String for numeric precision
  currency: "CNY",
  planId: "monthly",
  provider: "wechat",
  status: "pending"
});
```

### Complex Queries

```typescript
// Get user with orders and subscriptions
const userWithData = await db.select({
  user: user,
  orders: order,
  subscriptions: subscription
})
.from(user)
.leftJoin(order, eq(user.id, order.userId))
.leftJoin(subscription, eq(user.id, subscription.userId))
.where(eq(user.id, userId));

// Recent orders
const recentOrders = await db.select()
  .from(order)
  .where(eq(order.userId, userId))
  .orderBy(desc(order.createdAt))
  .limit(10);
```

## Common Tasks

### Schema Structure

**Users Table**:
- Basic info: `id`, `name`, `email`, `image`
- Auth: `emailVerified`, `phoneNumber`, `phoneNumberVerified`
- Roles: `role` (admin/user)
- Payment: `stripeCustomerId`, `creemCustomerId`
- Admin: `banned`, `banReason`, `banExpires`

**Orders Table**:
- Amount: `amount` (numeric as string), `currency`
- Status: `pending`, `paid`, `failed`, `refunded`, `canceled`
- Providers: `wechat`, `stripe`, `creem`

**Subscriptions Table**:
- Plan: `planId` (matches `config.payment.plans`)
- Status: `active`, `canceled`, `past_due`, `unpaid`, `trialing`
- Payment: `one_time`, `recurring`

### Database Management

```bash
# Development workflow
pnpm db:check          # Verify connection
pnpm db:generate       # Create migration files
pnpm db:push           # Apply schema changes
pnpm db:studio         # Visual database browser

# Production workflow
pnpm db:migrate        # Apply migrations safely
pnpm db:seed          # Add test data
```

### Environment Configuration

```env
# Required in .env
DATABASE_URL="postgresql://username:password@localhost:5432/tinyship"
```

## Testing Instructions

```bash
# Test database connection
pnpm db:check

# Verify schema integrity
pnpm db:generate  # Should not create new migrations

# Test with Drizzle Studio
pnpm db:studio
# 1. Browse tables in browser (https://local.drizzle.studio)
# 2. Check relationships
# 3. Verify data types and constraints

# Test queries
# 1. Create test user
# 2. Create associated orders/subscriptions
# 3. Verify foreign key relationships work
```

## Troubleshooting

### Connection Issues
- Verify `DATABASE_URL` format in `.env`
- Check PostgreSQL server is running
- Ensure database exists and user has permissions

### Schema Errors
- Run `pnpm db:generate` after schema changes
- Use `pnpm db:push` for development
- Use `pnpm db:migrate` for production

### Data Type Issues
- Use strings for `amount` fields: `"100"` not `100`
- Use UUID format for IDs: `"sub_" + crypto.randomUUID()`
- Ensure `planId` matches `config.payment.plans` keys

### Migration Problems
- Check for conflicting schema changes
- Review generated migration files before applying
- Backup database before running migrations in production

## Architecture Notes

- **ORM**: Drizzle for type-safe queries and schema management
- **Database**: PostgreSQL for reliability and ACID compliance
- **Schema**: Modular design with separate files per domain
- **Keys**: Text-based primary keys for flexibility
- **Relationships**: Proper foreign key constraints
- **Precision**: Numeric amounts as strings to avoid floating-point issues
- **Metadata**: JSON fields for extensible data storage
- **Timestamps**: Automatic tracking with `createdAt`/`updatedAt`
- **Integration**: Used extensively in auth, payment, and user management APIs
