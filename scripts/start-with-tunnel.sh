#!/bin/bash

# Start application with SSH tunnel
# This script starts the SSH tunnel and then the application

set -e

echo "🚀 Starting application with SSH tunnel..."

# Check if we're using SSH tunnel (check for SSH environment variables)
if [ -n "$SSH_KEY" ] && [ -n "$SSH_HOST" ] && [ -n "$SSH_USER" ]; then
    echo "📡 SSH tunnel configuration detected"
    
    # Start SSH tunnel in background
    echo "🔌 Starting SSH tunnel..."
    ./scripts/setup-ssh-tunnel.sh &
    TUNNEL_PID=$!
    
    # Wait for tunnel to be ready (with retries)
    echo "⏳ Waiting for SSH tunnel to be ready..."
    MAX_WAIT=30
    WAIT_COUNT=0
    TUNNEL_READY=false
    
    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        if pgrep -f "ssh.*55432:localhost:5432" > /dev/null; then
            # Test if port is actually listening
            if nc -z localhost 55432 2>/dev/null || timeout 1 bash -c "echo > /dev/tcp/localhost/55432" 2>/dev/null; then
                TUNNEL_READY=true
                break
            fi
        fi
        sleep 1
        WAIT_COUNT=$((WAIT_COUNT + 1))
        echo "   Waiting... ($WAIT_COUNT/$MAX_WAIT)"
    done
    
    if [ "$TUNNEL_READY" = false ]; then
        echo "❌ ERROR: SSH tunnel failed to start after ${MAX_WAIT} seconds"
        kill $TUNNEL_PID 2>/dev/null || true
        exit 1
    fi
    
    echo "✅ SSH tunnel is ready on port 55432"
else
    echo "ℹ️  No SSH tunnel configuration found, connecting directly to database"
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application
echo "🚀 Starting Node.js application..."
exec npm start

