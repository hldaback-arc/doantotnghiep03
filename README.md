# Doan3

Personal finance dashboard built with Next.js Pages Router, Prisma, SQL Server, and Zod.

## Setup

1. Install dependencies with `npm install`.
2. Create the SQL Server database by following the section below.
3. Copy `.env.example` to `.env`; keep the SQL Authentication URL or replace it with the Windows Authentication alternative, then set a random `SESSION_SECRET` of at least 32 characters.

`prisma/schema.prisma` is now introspected from the live database and maps its 41 SQL tables. The account, budget, and transaction repositories use the mapped SQL Server columns. Do not run `npm run prisma:migrate` against this manually created database until a Prisma migration baseline has been established.

## Create the SQL Server Database

Open [`database/DoAn3.sql`](database/DoAn3.sql) in SQL Server Management Studio and execute it against a SQL Server 2022+ instance. The script creates the `DoAn3` database, normalized tables for modules 01-06, constraints/indexes, starter finance categories, and internal/CSV source records. It does not drop or overwrite an existing database; run it once for a new database.

The current instance is `DESKTOP-UG5S7R0\SQLEXPRESS`. TCP/IP is currently disabled or has no listener: SSMS/sqlcmd can connect through shared memory, but Prisma needs TCP. In SQL Server Configuration Manager, open **SQL Server Network Configuration → Protocols for SQLEXPRESS**, enable **TCP/IP**, open **TCP/IP Properties → IP Addresses → IPAll**, clear **TCP Dynamic Ports**, and set **TCP Port** to `1433`. Restart the **SQL Server (SQLEXPRESS)** service. Then use the `DESKTOP-UG5S7R0:1433` URL in `.env`. With Windows Authentication, run the app under the same Windows account that has access to SQL Server. Keep the real `.env` local and never commit it.

After starting the app, open `http://localhost:3000/api/health/db`. A successful response confirms that the server and database connection work; it does not yet verify that every application model is mapped to the SQL tables.

The SQL script is based on the complete v3.1 DOCX entity registry. If the SQL schema changes, run `npx prisma db pull` to refresh the Prisma mapping, then generate the client and update repositories/tests for any changed columns.

## Checks

- `npm test` runs module 1 unit tests for money arithmetic, input validation, password hashing, and signed sessions.
- `powershell -ExecutionPolicy Bypass -File tests/module1-db-smoke.ps1` exercises account, profile, category, budget, transaction, report, alert, and soft-delete flows against the configured local app/SQL Server, then cleans up its temporary user.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.

## Module 1 APIs

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET|PATCH /api/profile`
- `GET|POST /api/categories`, `PATCH|DELETE /api/categories/:id`
- `GET|POST /api/budgets`, `PATCH|DELETE /api/budgets/:id`
- `GET /api/budgets/alerts`, `GET|PUT /api/budgets/alerts/settings`
- `GET|POST /api/transactions`, `PATCH|DELETE /api/transactions/:id`
- `GET /api/reports/spending?period=day|week|month|year&date=YYYY-MM-DD`

Financial APIs require the signed HttpOnly session cookie. They derive the user scope from that session rather than accepting a client-provided user ID.# doantotnghiep03
