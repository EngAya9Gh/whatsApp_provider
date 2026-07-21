#!/bin/bash

echo "Starting Deployment..."

# 1. Update source code (uncomment if needed)
# git pull origin main

# 2. Install dependencies for root (backend)
echo "Installing backend dependencies..."
npm install

# 3. Update database schema & generate Prisma client
echo "Updating Database..."
npx prisma generate
npx prisma db push
npx prisma db seed

# 4. Build Client Dashboard
echo "Building Client Dashboard..."
cd dashboard
npm install
npm run build
cd ..

# 5. Build Admin Dashboard
echo "Building Admin Dashboard..."
cd admin-dashboard
npm install
npm run build
cd ..

# 6. Restart Backend Server
echo "Restarting Backend Server..."
# If you are using pm2, uncomment the next line:
# pm2 restart all

echo "Deployment Complete! "
echo "Note: If you run your server manually without PM2, please stop and start it again so it loads the new database schema."
