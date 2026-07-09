#!/bin/bash
# Campus Blink Quick Start Script

echo "🚀 Campus Blink - Quick Start Setup"
echo "===================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 16+"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo ""

# Frontend
cd frontend && npm install && cd ..
echo "✅ Frontend dependencies installed"

# Backend
cd backend && npm install && cd ..
echo "✅ Backend dependencies installed"

echo ""
echo "SETUP COMPLETE!"
echo ""
echo "To start development:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo "  Browser: Open http://localhost:5173"
echo ""
echo "See SETUP.md for detailed instructions."