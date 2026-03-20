# App Store Submission Guide for DANZ App

## Overview
This guide provides multiple methods to submit your DANZ app IPA to the App Store. You have all the necessary components ready:

- **IPA File**: `application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa` (29MB)
- **App Store Connect API Key**: `AuthKey_46CZNG247B.p8` (located in parent directory)
- **App ID**: `6751524027`
- **Bundle ID**: `now.danz`
- **Apple Team ID**: `BH2A3MJ4CK`

## Method 1: EAS Submit (Recommended - Works on Linux)

Since this is an Expo project with EAS already configured, this is the easiest method and works directly from your Linux system.

### Prerequisites
- EAS CLI is already installed (verified at `/home/koh/.nvm/versions/node/v22.16.0/bin/eas`)
- You're already logged in to your Expo account

### Steps to Submit

1. **Ensure you're in the project directory:**
```bash
cd /home/koh/Documents/DANZ/flowbondtech-danz-app
```

2. **Submit the IPA using EAS:**
```bash
eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

3. **Alternative: Use the production profile (uses configuration from eas.json):**
```bash
eas submit -p ios --profile production --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

4. **If you need to specify the API key manually:**
```bash
eas submit -p ios \
  --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa \
  --api-key-path ../AuthKey_46CZNG247B.p8 \
  --api-key-id 46CZNG247B \
  --api-key-issuer-id YOUR_ISSUER_ID
```

### What Happens Next
- EAS will upload your IPA to App Store Connect
- The app will be available in TestFlight within 10-30 minutes
- You'll receive an email when processing is complete
- You can then submit for App Store review through App Store Connect

## Method 2: App Store Connect API (Direct from Linux)

If you prefer not to use EAS, you can use the App Store Connect API directly with tools like `altool` alternatives or custom scripts.

### Using fastlane (Ruby-based)

1. **Install fastlane:**
```bash
sudo gem install fastlane
```

2. **Create a fastlane configuration:**
```bash
mkdir -p fastlane
cat > fastlane/Fastfile << 'EOF'
lane :submit_to_app_store do
  api_key = app_store_connect_api_key(
    key_id: "46CZNG247B",
    issuer_id: "YOUR_ISSUER_ID", # You'll need to get this from App Store Connect
    key_filepath: "../AuthKey_46CZNG247B.p8"
  )

  upload_to_testflight(
    api_key: api_key,
    ipa: "./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa",
    skip_submission: false,
    skip_waiting_for_build_processing: true
  )
end
EOF
```

3. **Run fastlane:**
```bash
fastlane submit_to_app_store
```

### Using curl with App Store Connect API

For direct API access, you'll need the Issuer ID from App Store Connect:

1. **Create a JWT token generator script:**
```bash
cat > generate_jwt.py << 'EOF'
import jwt
import time
import json

# Configuration
KEY_ID = "46CZNG247B"
ISSUER_ID = "YOUR_ISSUER_ID"  # Get from App Store Connect
KEY_FILE = "../AuthKey_46CZNG247B.p8"

# Read the private key
with open(KEY_FILE, 'r') as f:
    private_key = f.read()

# Create JWT
header = {
    "alg": "ES256",
    "kid": KEY_ID,
    "typ": "JWT"
}

payload = {
    "iss": ISSUER_ID,
    "exp": int(time.time()) + 20 * 60,  # 20 minutes
    "aud": "appstoreconnect-v1"
}

token = jwt.encode(payload, private_key, algorithm="ES256", headers=header)
print(token)
EOF
```

2. **Use the token to upload via API** (Note: This requires additional tooling for multipart uploads)

## Method 3: Using Transporter (Requires macOS)

If you have access to a Mac machine, you can transfer the IPA and use Apple's Transporter app:

### On Linux (current machine):
1. **Transfer the IPA and API key to a Mac:**
```bash
# Using scp (replace MAC_USER and MAC_IP with your Mac's details)
scp application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa MAC_USER@MAC_IP:~/Desktop/
scp ../AuthKey_46CZNG247B.p8 MAC_USER@MAC_IP:~/Desktop/
```

### On macOS:
1. **Download Transporter from the Mac App Store** (free)

2. **Open Transporter and sign in** with Apple ID: `devenrathodrd@gmail.com`

3. **Drag and drop the IPA file** into Transporter

4. **Click "Deliver"** to upload to App Store Connect

## Method 4: Manual Upload via App Store Connect

1. **Access App Store Connect:**
   - Go to https://appstoreconnect.apple.com
   - Sign in with Apple ID: `devenrathodrd@gmail.com`

2. **Navigate to your app:**
   - My Apps → DANZ (App ID: 6751524027)

3. **Upload build:**
   - Unfortunately, direct IPA upload through the web interface isn't supported
   - You'll need to use one of the other methods above

## Important Information

### App Store Connect Credentials
- **Apple ID**: devenrathodrd@gmail.com
- **App Store Connect App ID**: 6751524027
- **Bundle Identifier**: now.danz
- **Team ID**: BH2A3MJ4CK

### API Key Details
- **Key ID**: 46CZNG247B
- **Key File**: `AuthKey_46CZNG247B.p8`
- **Issuer ID**: You need to get this from App Store Connect:
  1. Sign in to App Store Connect
  2. Go to Users and Access → Keys
  3. The Issuer ID is shown at the top of the page

### Pre-Submission Checklist

Before submitting, ensure:
- [ ] App version and build number are correct in `app.config.js`
- [ ] All required app metadata is prepared in App Store Connect
- [ ] Screenshots for all required device sizes are ready
- [ ] App description, keywords, and category are set
- [ ] Privacy policy URL is provided
- [ ] Support URL is provided
- [ ] App icon meets Apple's requirements (1024x1024)

### Post-Submission Steps

1. **TestFlight Testing:**
   - Once uploaded, the build will be available in TestFlight
   - Add internal and external testers
   - Gather feedback before App Store submission

2. **App Store Review Submission:**
   - In App Store Connect, select your build
   - Fill in "What's New in This Version"
   - Submit for review
   - Review typically takes 24-48 hours

## Troubleshooting

### Common Issues and Solutions

1. **"Invalid IPA" error:**
   - Ensure the IPA was built with the Production profile
   - Verify the bundle identifier matches App Store Connect

2. **Authentication failures:**
   - Verify the API key hasn't expired
   - Ensure the key has proper permissions in App Store Connect

3. **EAS submit fails:**
   - Run `eas whoami` to verify you're logged in
   - Check `eas build:list` to see your builds
   - Ensure your Expo account has access to the project

4. **Missing Issuer ID:**
   - Sign in to App Store Connect
   - Navigate to Users and Access → Keys
   - Copy the Issuer ID from the top of the page

## Quick Start Script

Here's a one-liner to submit using EAS (recommended):

```bash
cd /home/koh/Documents/DANZ/flowbondtech-danz-app && \
eas submit -p ios --profile production --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

## Support

- **EAS Documentation**: https://docs.expo.dev/submit/introduction/
- **App Store Connect Help**: https://developer.apple.com/help/app-store-connect/
- **Fastlane Docs**: https://docs.fastlane.tools/