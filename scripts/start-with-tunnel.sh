#!/bin/bash

# Start application with SSH tunnel
# This script starts the SSH tunnel and then the application

set -e

echo "🚀 Starting application with SSH tunnel..."

# Start SSH tunnel in background
./scripts/setup-ssh-tunnel.sh &
TUNNEL_PID=$!

# Wait for tunnel to be ready
echo "⏳ Waiting for SSH tunnel to be ready..."
sleep 5

# Check if tunnel is active
if ! pgrep -f "ssh.*55432:localhost:5432" > /dev/null; then
    echo "❌ ERROR: SSH tunnel failed to start"
    kill $TUNNEL_PID 2>/dev/null || true
    exit 1
fi

echo "✅ SSH tunnel is ready"

# Start the application
echo "🚀 Starting Node.js application..."
exec npm start

