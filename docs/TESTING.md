# Testing Guide

## Testing Without Authentication

### Option 1: Development Bypass (Easiest)

Add this to your `.env.local` file:

```bash
NODE_ENV=development
DEV_BYPASS_AUTH=true
```

This will allow you to access the dashboard without logging in **only in development mode**. The authentication is still enforced in production.

**⚠️ Warning:** Never set `DEV_BYPASS_AUTH=true` in production!

### Option 2: Create a Test User in Supabase

1. **Go to your Supabase Dashboard:**
   - Visit https://app.supabase.com
   - Select your project
   - Go to Authentication → Users

2. **Create a new user:**
   - Click "Add user" → "Create new user"
   - Enter an email (e.g., `test@example.com`)
   - Enter a password (e.g., `test123456`)
   - Click "Create user"

3. **Login with test credentials:**
   - Email: `test@example.com`
   - Password: `test123456`

### Option 3: Use Supabase Local Development

If you want to test completely locally without a Supabase account:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Start local Supabase:**
   ```bash
   supabase start
   ```

3. **Create a test user via CLI:**
   ```bash
   supabase auth users create --email test@example.com --password test123456
   ```

4. **Update your `.env.local`:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from supabase start output>
   SUPABASE_SERVICE_ROLE_KEY=<get from supabase start output>
   ```

## Testing the Full Flow

### 1. Test Order Creation

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "customer_email": "john@example.com",
    "items": [
      {"name": "Product 1", "quantity": 2, "price": 29.99}
    ],
    "total_amount": 59.98,
    "currency": "usd",
    "delivery_address": "123 Main St, City, State 12345",
    "payment_type": "one_time",
    "payment_method_id": "pm_test_1234567890"
  }'
```

### 2. Test Stripe Webhooks Locally

```bash
# Install Stripe CLI
# Windows: https://stripe.com/docs/stripe-cli
# Mac: brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local Supabase
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook
```

### 3. Test Twilio Calls Locally

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Expose local Supabase
ngrok http 54321

# Use the ngrok URL in Twilio webhook configuration
# Example: https://abc123.ngrok.io/functions/v1/call-handler
```

## Quick Test Checklist

- [ ] Can access dashboard (with bypass or login)
- [ ] Can view orders list
- [ ] Can view order details
- [ ] Can view calls history
- [ ] Real-time updates work (open two browser windows)
- [ ] Create test order via API
- [ ] Stripe webhook receives events
- [ ] Twilio call initiates (if configured)

## Troubleshooting

### "Session not found" error
- Make sure you've created a user in Supabase
- Or enable `DEV_BYPASS_AUTH=true` for development

### "Supabase URL not found" error
- Check your `.env.local` file has `NEXT_PUBLIC_SUPABASE_URL`
- Restart your dev server after changing env variables

### Can't access dashboard
- Check middleware is not blocking you
- Try the development bypass option
- Verify Supabase connection is working

