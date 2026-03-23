#!/bin/bash

# DANZ App Store Submission Script
# This script submits the IPA to App Store Connect using EAS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IPA_FILE="application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa"
API_KEY_PATH="../AuthKey_46CZNG247B.p8"
API_KEY_ID="46CZNG247B"

echo -e "${GREEN}=====================================${NC}"
echo -e "${GREEN}   DANZ App Store Submission Tool    ${NC}"
echo -e "${GREEN}=====================================${NC}"
echo ""

# Check if IPA exists
if [ ! -f "$IPA_FILE" ]; then
    echo -e "${RED}Error: IPA file not found: $IPA_FILE${NC}"
    echo "Available IPA files:"
    ls -la *.ipa 2>/dev/null || echo "No IPA files found"
    exit 1
fi

# Check if API key exists
if [ ! -f "$API_KEY_PATH" ]; then
    echo -e "${YELLOW}Warning: API key not found at $API_KEY_PATH${NC}"
    echo "EAS will use the credentials from your Expo account instead."
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}Error: EAS CLI is not installed${NC}"
    echo "Install it with: npm install -g eas-cli"
    exit 1
fi

# Check EAS login status
echo -e "${YELLOW}Checking EAS login status...${NC}"
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}You need to log in to EAS first${NC}"
    eas login
fi

# Display submission details
echo ""
echo -e "${GREEN}Submission Details:${NC}"
echo "  IPA File: $IPA_FILE ($(du -h $IPA_FILE | cut -f1))"
echo "  Bundle ID: now.danz"
echo "  App Store ID: 6751524027"
echo "  Team ID: BH2A3MJ4CK"
echo ""

# Confirm submission
read -p "Do you want to submit this IPA to App Store Connect? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Submission cancelled${NC}"
    exit 0
fi

# Submit using EAS
echo ""
echo -e "${GREEN}Submitting to App Store Connect...${NC}"
echo "This may take a few minutes depending on your internet connection."
echo ""

# Try with production profile first (uses eas.json configuration)
if eas submit -p ios --profile production --path "./$IPA_FILE"; then
    echo ""
    echo -e "${GREEN}✅ Success! Your app has been submitted to App Store Connect.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Wait 10-30 minutes for processing"
    echo "2. Check your email (devenrathodrd@gmail.com) for confirmation"
    echo "3. Sign in to App Store Connect to:"
    echo "   - View your build in TestFlight"
    echo "   - Add testers for beta testing"
    echo "   - Submit for App Store review when ready"
    echo ""
    echo "App Store Connect: https://appstoreconnect.apple.com"
else
    echo ""
    echo -e "${RED}Submission failed. Common solutions:${NC}"
    echo "1. Verify your Expo account has access to this project"
    echo "2. Check if the API key needs to be renewed"
    echo "3. Ensure the bundle ID matches App Store Connect"
    echo "4. Try running: eas build:list --platform ios"
    echo ""
    echo "For manual submission, see APP_STORE_SUBMISSION_GUIDE.md"
    exit 1
fi