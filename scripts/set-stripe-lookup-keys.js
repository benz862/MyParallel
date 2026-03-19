import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

// Map of product names to lookup keys
const PRICE_LOOKUP_KEYS = {
  'MyParallel Base Plan - Monthly': 'base_monthly',
  'Deep Emotional Memory - Monthly': 'deep_memory',
  'Proactive Random Text Outreach - Monthly': 'text_outreach',
  'Email Outreach - Monthly': 'email_outreach',
  'Phone Call Outreach - Monthly': 'phone_call_outreach',
  'Full Voice AI - Monthly': 'voice_ai',
  'Custom Voice Clone - Monthly': 'voice_clone',
  'Multi Companion Slot - Monthly': 'multi_companion',
  'Extended Memory Retention - Monthly': 'extended_memory',
};

async function setLookupKeys() {
  console.log('🔍 Finding all products and prices...\n');

  try {
    // Get all products
    const products = await stripe.products.list({ limit: 100 });
    
    console.log(`Found ${products.data.length} products\n`);

    for (const product of products.data) {
      // Get prices for this product
      const prices = await stripe.prices.list({
        product: product.id,
        limit: 100,
      });

      for (const price of prices.data) {
        const lookupKey = PRICE_LOOKUP_KEYS[product.name];
        
        if (lookupKey) {
          console.log(`📦 Product: ${product.name}`);
          console.log(`   Price ID: ${price.id}`);
          console.log(`   Current lookup_key: ${price.lookup_key || '(none)'}`);
          console.log(`   Target lookup_key: ${lookupKey}`);

          if (price.lookup_key !== lookupKey) {
            try {
              await stripe.prices.update(price.id, {
                lookup_key: lookupKey,
              });
              console.log(`   ✅ Updated lookup_key to: ${lookupKey}\n`);
            } catch (error) {
              console.error(`   ❌ Error updating: ${error.message}\n`);
            }
          } else {
            console.log(`   ✅ Already set correctly\n`);
          }
        }
      }
    }

    console.log('✨ Done! All lookup keys have been set.');
    console.log('\n💡 If some prices couldn\'t be updated, you may need to create new prices with lookup_keys set from the start.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setLookupKeys();


