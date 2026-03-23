#!/bin/bash

# App Store Connect API Submission Script
API_KEY_ID="46CZNG247B"
ISSUER_ID="02eed5af-5c7b-4908-935e-f599c8187596"
API_KEY_PATH="../AuthKey_46CZNG247B.p8"
IPA_PATH="./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa"

echo "======================================"
echo "   Submitting IPA via API"
echo "======================================"
echo ""
echo "IPA File: $(basename $IPA_PATH)"
echo "API Key ID: $API_KEY_ID"
echo "Issuer ID: $ISSUER_ID"
echo ""

# Check if xcrun is available (macOS only)
if command -v xcrun &> /dev/null; then
    echo "Using xcrun altool for submission..."
    xcrun altool --upload-app \
        --type ios \
        --file "$IPA_PATH" \
        --apiKey "$API_KEY_ID" \
        --apiIssuer "$ISSUER_ID" \
        --apiKeyPath "$API_KEY_PATH"
else
    echo "xcrun not available on Linux."
    echo ""
    echo "Alternative: Please use one of these methods:"
    echo ""
    echo "1. Transfer the IPA to a Mac and run:"
    echo "   xcrun altool --upload-app --type ios --file application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa \\"
    echo "     --apiKey $API_KEY_ID --apiIssuer $ISSUER_ID"
    echo ""
    echo "2. Use Transporter app on macOS"
    echo ""
    echo "3. Use fastlane (if installed):"
    echo "   fastlane deliver --ipa $IPA_PATH"
    echo ""
    echo "4. Manual upload via App Store Connect website:"
    echo "   - Go to https://appstoreconnect.apple.com"
    echo "   - Navigate to your app"
    echo "   - Go to TestFlight or App Store tab"
    echo "   - Upload the IPA"
fi