#!/bin/bash

echo "Starting Deployment..."

# 1. Update source code
git pull origin main

# 2. Install dependencies for root (backend)
echo "Installing backend dependencies..."
npm install

# 3. Update database schema & generate Prisma client
echo "Updating Database..."
npx prisma generate
# Use migrate deploy (safe for production — never drops data, uses migration files)
npx prisma migrate deploy

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
pm2 restart all

echo "Deployment Complete! ✅"
