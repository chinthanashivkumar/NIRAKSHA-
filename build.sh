#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Building React frontend ==="
cd frontend
npm install --include=dev || npm install
npm run build || echo "=== Using committed dist assets ==="
cd ..

echo "=== Build complete! Ready to start NIRAKSHA ==="
