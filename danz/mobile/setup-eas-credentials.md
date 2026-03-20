# 🔧 Setting Up EAS with App Store Connect API Keys

## Current Status
- ✅ Logged into EAS as: kohio
- ✅ API Key File: `AuthKey_46CZNG247B.p8`
- ✅ Key ID: `46CZNG247B`
- ✅ Issuer ID: `02eed5af-5c7b-4908-935e-f599c8187596`
- ❌ EAS needs to be configured to use these credentials

## Step-by-Step Fix

### Step 1: Run EAS Credentials Setup
```bash
cd /home/koh/Documents/DANZ/flowbondtech-danz-app
eas credentials
```

### Step 2: Follow Interactive Prompts
When the menu appears, select:
1. **Platform**: `iOS`
2. **What do you want to do?**: Select `Manage credentials`
3. **Bundle Identifier**: `now.danz`

### Step 3: Configure App Store Connect API Key
When asked about App Store Connect API Key:
1. Select: **"Use an existing App Store Connect API Key"** (if available)
   OR
   Select: **"Set up an App Store Connect API Key"** (if starting fresh)

2. If setting up new, provide:
   - **Key Path**: `../AuthKey_46CZNG247B.p8` (or full path: `/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8`)
   - **Key ID**: `46CZNG247B`
   - **Issuer ID**: `02eed5af-5c7b-4908-935e-f599c8187596`

### Step 4: Save Credentials to EAS Servers
The system will ask: "Would you like to save these credentials to EAS servers?"
- Answer: **Yes** (This allows non-interactive submissions later)

### Step 5: Test the Configuration
After setup, test with:
```bash
eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

## Alternative: Manual Configuration

### Option A: Create Local Credentials File
Create `~/.eas/credentials.json`:
```json
{
  "ios": {
    "now.danz": {
      "appleTeamId": "BH2A3MJ4CK",
      "appleId": "devenrathodrd@gmail.com",
      "ascAppId": "6751524027",
      "ascApiKey": {
        "keyIdentifier": "46CZNG247B",
        "issuerIdentifier": "02eed5af-5c7b-4908-935e-f599c8187596",
        "keyPath": "/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
      }
    }
  }
}
```

### Option B: Use Environment Variables
Set these before running EAS:
```bash
export EAS_BUILD_AUTOCOMMIT_CLEAR_CACHE=1
export EXPO_APPLE_API_KEY_PATH="/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
export EXPO_APPLE_API_KEY_ID="46CZNG247B"
export EXPO_APPLE_API_KEY_ISSUER_ID="02eed5af-5c7b-4908-935e-f599c8187596"

eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

## Common Issues & Solutions

### Issue 1: "App Store Connect API Keys cannot be set up in non-interactive mode"
**Solution**: Don't use `--non-interactive` flag. Run the command in an interactive terminal.

### Issue 2: "Input is required, but stdin is not readable"
**Solution**: Make sure you're running in an interactive terminal (not through a script or CI/CD)

### Issue 3: Key file not found
**Solution**: Use absolute path: `/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8`

### Issue 4: Authentication failed
**Solution**: Verify the Issuer ID and Key ID match exactly what's in App Store Connect

## Quick Verification Commands

Check if API key file is readable:
```bash
ls -la /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8
cat /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8 | head -1
# Should show: -----BEGIN PRIVATE KEY-----
```

Check EAS project config:
```bash
cat eas.json | grep -A 5 submit
```

## Next Steps After Fixing

1. Once credentials are configured, submission becomes simple:
   ```bash
   eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
   ```

2. For future builds, you can submit directly after building:
   ```bash
   eas build --platform ios --auto-submit
   ```

3. Monitor submission status:
   ```bash
   eas build:list --platform ios
   ```

## Need More Help?

- EAS Documentation: https://docs.expo.dev/submit/introduction/
- App Store Connect API: https://developer.apple.com/documentation/appstoreconnectapi
- EAS Submit Issues: https://github.com/expo/eas-cli/issues