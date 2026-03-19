#!/bin/bash

# Create credentials directory
mkdir -p server/google

# Download credentials.json from Google Cloud Console
# Place into server/google/credentials.json
echo "Be sure to enable Google Calendar API in GCP."
echo ""
echo "Steps:"
echo "1. Go to https://console.cloud.google.com/"
echo "2. Create a new project or select existing"
echo "3. Enable Google Calendar API"
echo "4. Create OAuth 2.0 credentials (Desktop app)"
echo "5. Download credentials.json"
echo "6. Place it in server/google/credentials.json"
echo ""
echo "Directory created: server/google/"


