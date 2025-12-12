#!/bin/bash

# SSH Tunnel Setup Script for Railway
# This script establishes and maintains an SSH tunnel to the database server

set -e

echo "🔌 Setting up SSH tunnel to database server..."

# Check if required environment variables are set
if [ -z "$SSH_KEY" ]; then
    echo "❌ ERROR: SSH_KEY environment variable is not set"
    exit 1
fi

if [ -z "$SSH_HOST" ]; then
    echo "❌ ERROR: SSH_HOST environment variable is not set"
    exit 1
fi

if [ -z "$SSH_USER" ]; then
    echo "❌ ERROR: SSH_USER environment variable is not set"
    exit 1
fi

# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Write SSH key to file
echo "$SSH_KEY" > ~/.ssh/etl-mumbai.pem
chmod 600 ~/.ssh/etl-mumbai.pem

# Add SSH host to known_hosts (optional, for security)
ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null || true

# Set up SSH config for better connection management
cat > ~/.ssh/config << EOF
Host db-tunnel
    HostName $SSH_HOST
    User $SSH_USER
    IdentityFile ~/.ssh/etl-mumbai.pem
    StrictHostKeyChecking no
    UserKnownHostsFile ~/.ssh/known_hosts
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
EOF

chmod 600 ~/.ssh/config

echo "✅ SSH configuration complete"

# Start SSH tunnel in background
echo "🚀 Starting SSH tunnel: localhost:55432 -> $SSH_HOST:5432"

# Use autossh if available, otherwise use ssh with keepalive
if command -v autossh &> /dev/null; then
    echo "Using autossh for persistent connection..."
    autossh -M 0 -f -N \
        -L 55432:localhost:5432 \
        -o "ServerAliveInterval=60" \
        -o "ServerAliveCountMax=3" \
        -o "ExitOnForwardFailure=yes" \
        db-tunnel
else
    echo "Using ssh with keepalive..."
    ssh -f -N \
        -L 55432:localhost:5432 \
        -o "ServerAliveInterval=60" \
        -o "ServerAliveCountMax=3" \
        -o "ExitOnForwardFailure=yes" \
        db-tunnel
fi

# Wait a moment for tunnel to establish
sleep 2

# Verify tunnel is running
if pgrep -f "ssh.*55432:localhost:5432" > /dev/null; then
    echo "✅ SSH tunnel is active on port 55432"
else
    echo "❌ ERROR: SSH tunnel failed to start"
    exit 1
fi

# Keep script running and monitor tunnel
echo "📡 Monitoring SSH tunnel..."
while true; do
    if ! pgrep -f "ssh.*55432:localhost:5432" > /dev/null; then
        echo "⚠️  SSH tunnel disconnected, attempting to reconnect..."
        ssh -f -N \
            -L 55432:localhost:5432 \
            -o "ServerAliveInterval=60" \
            -o "ServerAliveCountMax=3" \
            -o "ExitOnForwardFailure=yes" \
            db-tunnel
        sleep 2
    fi
    sleep 10
done

