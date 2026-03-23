# How to Find Your App Store Connect API Issuer ID

The Issuer ID is required for using the App Store Connect API key. Here's how to find it:

## Steps to Get Your Issuer ID

1. **Sign in to App Store Connect**
   - Go to: https://appstoreconnect.apple.com
   - Sign in with Apple ID: `devenrathodrd@gmail.com`

2. **Navigate to API Keys**
   - Click on "Users and Access" in the top menu
   - Select "Keys" tab on the left sidebar
   - Or directly go to: https://appstoreconnect.apple.com/access/api

3. **Find Your Issuer ID**
   - The Issuer ID is displayed at the top of the API Keys page
   - It looks like: `69a6de7a-xxxx-47af-e053-5b8c7c11a4d1`
   - Copy this ID - you'll need it for API authentication

4. **Verify Your Key**
   - You should see your key listed: `46CZNG247B`
   - Make sure it shows as "Active"
   - Check that it has the necessary permissions (Admin or App Manager)

## Quick Check via Browser

Open this link while logged in:
https://appstoreconnect.apple.com/access/api

The Issuer ID will be shown right at the top of the page in a blue box.

## Save for Future Use

Once you have the Issuer ID, you can save it in a `.env` file:

```bash
echo "APP_STORE_CONNECT_ISSUER_ID=your-issuer-id-here" >> .env
```

## Why You Need This

The Issuer ID is part of the JWT (JSON Web Token) authentication for App Store Connect API:
- **Key ID**: 46CZNG247B (you have this)
- **Issuer ID**: (you need to get this from App Store Connect)
- **Private Key**: AuthKey_46CZNG247B.p8 (you have this)

All three components are required to authenticate with the API.