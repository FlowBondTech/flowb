#!/bin/bash

echo "================================================"
echo "   Apple → Expo API Key Setup & IPA Submission"
echo "================================================"
echo ""
echo "This will help you configure Apple's API key in Expo/EAS"
echo ""

# Check if API key exists
if [ ! -f "/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8" ]; then
    echo "❌ ERROR: API key file not found!"
    echo ""
    echo "Please:"
    echo "1. Go to https://appstoreconnect.apple.com"
    echo "2. Navigate to Users and Access → Keys"
    echo "3. Download your API key"
    echo "4. Save it as: /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
    exit 1
fi

echo "✅ Found Apple API key file"
echo ""
echo "Your Apple App Store Connect credentials:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Key ID:     46CZNG247B"
echo "  Issuer ID:  02eed5af-5c7b-4908-935e-f599c8187596"
echo "  Key File:   /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /home/koh/Documents/DANZ/flowbondtech-danz-app

echo "Now I'll help you configure this Apple API key in Expo."
echo ""
echo "IMPORTANT: You need to run this command INTERACTIVELY in your terminal:"
echo ""
echo "  cd /home/koh/Documents/DANZ/flowbondtech-danz-app"
echo "  eas credentials"
echo ""
echo "When prompted:"
echo "1. Choose: iOS"
echo "2. Choose: now.danz"
echo "3. Choose: Set up App Store Connect API Key"
echo "4. Enter path: /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
echo "5. Enter Key ID: 46CZNG247B"
echo "6. Enter Issuer ID: 02eed5af-5c7b-4908-935e-f599c8187596"
echo "7. Save to Expo account: Yes"
echo ""
echo "After that's done, you can submit your IPA with:"
echo "  eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa"
echo ""
echo "Press Enter to continue..."
read

echo "Opening interactive EAS credentials setup..."
eas credentials