# Stripe Products Reference

## Products Created in Stripe

Based on the Stripe export, the following products and lookup keys are configured:

| Product Name | Product ID | Lookup Key | Monthly Price |
|-------------|------------|------------|---------------|
| MyParallel Base Plan | `prod_TWe42QRLZHyPAY` | `base_monthly` | $19.00 |
| Deep Emotional Memory | `prod_TWe41PUQE7OT3f` | `deep_memory` | $6.00 |
| Proactive Random Text Outreach | `prod_TWe4DdcZtNTDrp` | `text_outreach` | $5.00 |
| Email Outreach | `prod_TWe4zgPYpvnOvj` | `email_outreach` | $3.00 |
| Phone Call Outreach | `prod_TWe4bl0TdL5k9u` | `phone_call_outreach` | $12.00 |
| Full Voice AI | `prod_TWe462FEOZ1lhy` | `voice_ai` | $10.00 |
| Custom Voice Clone | `prod_TWe4lJ1y4ZDeCo` | `voice_clone` | $9.00 |
| Multi Companion Slot | `prod_TWe4eQ4INEAVpZ` | `multi_companion` | $7.00 |
| Extended Memory Retention | `prod_TWe4PrhTaGDuQz` | `extended_memory` | $4.00 |

## Code Implementation

The code uses **lookup_key** values to reference prices, which is the correct approach:

- Frontend (`Pricing.tsx`): Uses lookup_key values
- Backend (`backend-server.js`): Looks up prices by lookup_key using `stripe.prices.list({ lookup_keys: [...] })`

## Note

The CSV export shows Product IDs, but the code uses Price lookup_keys. Each product can have multiple prices, and the lookup_key is set on the price object, not the product. The backend code correctly resolves lookup_keys to actual price IDs when creating checkout sessions.

