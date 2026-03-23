# 🔑 Complete API Key Setup Guide: Apple → Expo/EAS

## Understanding the API Key Flow

```
Apple (App Store Connect) → API Key → Expo/EAS → Upload IPA → App Store
```

The API key is created in **Apple's App Store Connect** and then used by **Expo/EAS** to upload your app on your behalf.

## Step 1: Verify/Create API Key in Apple App Store Connect

### Check if your API key is valid:

1. **Go to App Store Connect**
   - URL: https://appstoreconnect.apple.com
   - Sign in with: `devenrathodrd@gmail.com`

2. **Navigate to API Keys**
   - Click on **"Users and Access"** (top menu)
   - Click on **"Keys"** tab (left sidebar under "Integrations")

3. **Verify Your Existing Key**

   You should see a key with:
   - **Name**: (any name you gave it)
   - **Key ID**: `46CZNG247B`
   - **Issuer ID**: `02eed5af-5c7b-4908-935e-f599c8187596`
   - **Access**: App Manager (minimum) or Admin
   - **Status**: Active

### If the key doesn't exist or needs to be recreated:

1. **Click the "+" button** to generate a new key

2. **Configure the key**:
   - **Name**: "EAS Submit Key" (or any name)
   - **Access**: Choose **"App Manager"** or **"Admin"**

3. **Download the key**:
   - Click **"Generate"**
   - **IMPORTANT**: Download the `.p8` file immediately (you can only download it once!)
   - Save it as: `AuthKey_XXXXXXXXXX.p8` (where X is your Key ID)

4. **Note the details**:
   - **Key ID**: Shows after creation (like `46CZNG247B`)
   - **Issuer ID**: Shows at the top of the keys page (like `02eed5af-5c7b-4908-935e-f599c8187596`)

## Step 2: Place the API Key File

Your current key file location:
```bash
/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8
```

Verify it exists and is valid:
```bash
# Check if file exists
ls -la /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8

# Check if it's a valid private key (should start with "-----BEGIN PRIVATE KEY-----")
head -1 /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8
```

## Step 3: Configure the Apple API Key in Expo/EAS

### Method A: Interactive Configuration (Recommended)

Run this command and follow the prompts:

```bash
cd /home/koh/Documents/DANZ/flowbondtech-danz-app
eas credentials
```

**Follow these prompts:**
```
? Select platform › iOS
? What do you want to do? › Manage your project credentials
? Select a bundle identifier › now.danz

? What do you want to do with App Store Connect API Key?
› Set up an App Store Connect API Key for submitting your app

? Do you want to use an existing API Key?
› Yes, I have an API Key file (.p8)

? Path to your API Key file (.p8):
› /home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8

? API Key ID (found in App Store Connect):
› 46CZNG247B

? Issuer ID (found in App Store Connect):
› 02eed5af-5c7b-4908-935e-f599c8187596

? Save these credentials to your Expo account?
› Yes (this allows future non-interactive submissions)
```

### Method B: Manual Configuration with Environment Variables

Set these environment variables before running EAS:

```bash
# Set Apple API credentials
export EXPO_APPLE_API_KEY_PATH="/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8"
export EXPO_APPLE_API_KEY_ID="46CZNG247B"
export EXPO_APPLE_API_KEY_ISSUER_ID="02eed5af-5c7b-4908-935e-f599c8187596"

# Run submission
cd /home/koh/Documents/DANZ/flowbondtech-danz-app
eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

## Step 4: Test the Connection

After configuration, test with:

```bash
cd /home/koh/Documents/DANZ/flowbondtech-danz-app
eas submit -p ios --path ./application-f5f699b4-1045-450f-ba2f-4bbafd97d07a.ipa
```

## 🔍 Quick Checklist

✅ **In Apple App Store Connect**, you need:
- [ ] API Key created with "App Manager" or "Admin" access
- [ ] Key ID: `46CZNG247B`
- [ ] Issuer ID: `02eed5af-5c7b-4908-935e-f599c8187596`
- [ ] Downloaded `.p8` file

✅ **On your computer**, you need:
- [ ] `.p8` file saved at: `/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8`
- [ ] File is readable (check with `ls -la`)

✅ **In Expo/EAS**, you need:
- [ ] Run `eas credentials` to configure the key
- [ ] Save credentials to Expo account for future use

## Common Issues & Solutions

### Issue: "API Key not authorized"
**Solution**: In App Store Connect, ensure the key has "App Manager" or "Admin" access

### Issue: "Cannot find API key file"
**Solution**: Use absolute path: `/home/koh/Documents/DANZ/AuthKey_46CZNG247B.p8`

### Issue: "Invalid issuer ID"
**Solution**: Copy the exact Issuer ID from App Store Connect (Users and Access → Keys → top of page)

### Issue: "App Store Connect API Keys cannot be set up in non-interactive mode"
**Solution**: Don't use `--non-interactive` flag. Run `eas credentials` in your terminal directly

## 🎯 Summary

The API key flow is:
1. **Apple creates** the API key in App Store Connect
2. **You download** the `.p8` private key file (one-time download)
3. **Expo/EAS uses** this key to authenticate with Apple
4. **Apple accepts** uploads from Expo because it recognizes the key

Think of it like giving Expo a special password (the API key) that Apple recognizes, so Expo can upload apps on your behalf.

Ready to run `eas credentials` to set this up?