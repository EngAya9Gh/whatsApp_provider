#!/bin/bash
# Manual deploy on the server: the same steps as the GitHub deploy (.github/workflows/deploy.yml).
set -e

echo "Starting Deployment..."

# 1. Update source code
git pull origin main

# 2. Backend dependencies
echo "Installing backend dependencies..."
npm install

# 3. Database (see prisma/README.md): fix repeated ticket numbers, then db push
echo "Updating Database..."
node prisma/scripts/fix-ticket-numbers.js
npx prisma db push
npx prisma generate

# 4. Client dashboard
echo "Building Client Dashboard..."
cd dashboard
npm install
npm run build
cd ..

# 5. Admin dashboard, served from the client dashboard at /admin
echo "Building Admin Dashboard..."
cd admin-dashboard
npm install
npm run build
rm -rf ../dashboard/dist/admin
cp -r dist ../dashboard/dist/admin
cd ..

# 6. Restart (the worker process only if it was started from ecosystem.config.js)
echo "Restarting Backend Server..."
# The API and the background worker as two processes (ecosystem.config.js): starts what is missing,
# restarts the rest with its PROCESS_ROLE
pm2 startOrRestart ecosystem.config.js --update-env
pm2 save

echo "Deployment Complete! ✅"
