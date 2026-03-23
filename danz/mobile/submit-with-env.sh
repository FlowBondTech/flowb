#!/bin/bash

# EAS Submit with Environment Variables
echo "======================================"
echo "   Configuring EAS API Keys"
echo "======================================"

# Set the API key environment variables
export EXPO_APPLE_API_KEY_PATH="/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
export EXPO_APPLE_API_KEY_ID="46CZNG247B"
export EXPO_APPLE_API_KEY_ISSUER_ID="02eed5af-5c7b-4908-935e-f599c8187596"
export EAS_BUILD_AUTOCOMMIT_CLEAR_CACHE=1

echo ""
echo "✅ Environment variables set:"
echo "   API Key ID: $EXPO_APPLE_API_KEY_ID"
echo "   Issuer ID: $EXPO_APPLE_API_KEY_ISSUER_ID"
echo "   Key Path: $EXPO_APPLE_API_KEY_PATH"
echo ""

# Check if the key file exists
if [ ! -f "$EXPO_APPLE_API_KEY_PATH" ]; then
    echo "❌ Error: API key file not found at $EXPO_APPLE_API_KEY_PATH"
    exit 1
fi

echo "✅ API key file found"
echo ""

# Change to project directory
cd /home/koh/Documents/DANZ/flowbondtech-danz-app

echo "Attempting to submit IPA to App Store Connect..."
echo "================================================"
echo ""

# Try submission with environment variables
eas submit -p ios \
  --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa \
  --verbose

echo ""
echo "If this fails with 'App Store Connect API Keys cannot be set up in non-interactive mode',"
echo "please run this command manually in your terminal:"
echo ""
echo "cd /home/koh/Documents/DANZ/flowbondtech-danz-app"
echo "eas credentials"
echo ""
echo "Then follow the interactive prompts to set up the API key."