#!/bin/bash

# Generate Strong Secrets and Setup Environment
# Run this script to generate strong random secrets for development

set -e

echo "🔐 Generating Strong Secrets for Environment Variables"
echo "=================================================="
echo ""

# Function to generate random hex string
generate_secret() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

# Generate JWT secrets
echo "🔑 JWT Secrets:"
echo "==============="
ACCESS_SECRET=$(generate_secret)
REFRESH_SECRET=$(generate_secret)

echo "JWT_ACCESS_SECRET=\"$ACCESS_SECRET\""
echo "JWT_REFRESH_SECRET=\"$REFRESH_SECRET\""
echo ""

# Generate additional secrets if needed
echo "💾 Sample .env configuration:"
echo "=============================="
echo ""
cat << EOF
# --- JWT ---
JWT_ACCESS_SECRET="$ACCESS_SECRET"
JWT_REFRESH_SECRET="$REFRESH_SECRET"
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# --- Email Configuration ---
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER="your-mailtrap-user-id"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="noreply@podedeixar.com"

# --- Database ---
DATABASE_URL="postgresql://postgres:root@localhost:5432/auth_db"
DIRECT_URL="postgresql://postgres:root@localhost:5432/auth_db"

# --- Application ---
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000"
EOF

echo ""
echo "✅ Secrets generated successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the JWT secrets above"
echo "2. Update your .env file with the values"
echo "3. Set SMTP credentials from Mailtrap"
echo "4. Run: npm install && npm run start:dev"
echo ""
