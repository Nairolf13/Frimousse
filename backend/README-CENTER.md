Center model migration and backfill

Steps to apply the new Center model and backfill existing data (run in backend folder):

1. Update prisma client and generate migration:

   - Update schema already committed.
   - Run:

     npx prisma migrate dev --name add-center
     npx prisma generate

2. Run backfill (creates a default center and associates existing records):

   node ./scripts/backfillCenters.js

3. Restart the backend server.

Notes:
- This script assigns all existing records to a single default center. If you need per-record mapping, modify the script accordingly before running.
- Ensure you have a database backup before running migrations or backfill.
