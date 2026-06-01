#!/bin/bash

# InstaGle Bot Setup Script

set -e

echo "🎲 InstaGle Bot Setup"
echo "===================="

# Check Node.js version
check_node() {
  if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
      echo "❌ Node.js 18+ required. Found: $(node -v)"
      exit 1
    fi
    echo "✅ Node.js version: $(node -v)"
  else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
  fi
}

# Install dependencies
install_deps() {
  echo ""
  echo "📦 Installing dependencies..."
  npm install
  echo "✅ Dependencies installed"
}

# Copy environment file
setup_env() {
  if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️ Please edit .env with your credentials"
  else
    echo "✅ .env file exists"
  fi
}

# Start MongoDB (optional)
start_mongo() {
  if command -v docker &> /dev/null; then
    echo ""
    echo "🐳 Checking MongoDB..."
    if docker ps | grep -q instagle-mongo; then
      echo "✅ MongoDB container already running"
    else
      echo "🔧 Starting MongoDB container..."
      docker run -d \
        -p 27017:27017 \
        --name instagle-mongo \
        -e MONGO_INITDB_ROOT_USERNAME=admin \
        -e MONGO_INITDB_ROOT_PASSWORD=password \
        mongo:6
      echo "✅ MongoDB started"
    fi
  else
    echo "⚠️ Docker not found. Please start MongoDB manually"
  fi
}

# Run tests
run_tests() {
  echo ""
  echo "🧪 Running tests..."
  npm test
}

# Main
main() {
  check_node
  install_deps
  setup_env
  
  read -p "Start MongoDB container? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    start_mongo
  fi
  
  read -p "Run tests? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    run_tests
  fi
  
  echo ""
  echo "🎉 Setup complete!"
  echo ""
  echo "Next steps:"
  echo "  1. Edit .env with your Instagram/Meta credentials"
  echo "  2. Run: npm start"
}

main "$@"