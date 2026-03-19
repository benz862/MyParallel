import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

const productId = process.argv[2] || 'prod_TWh9rHCcD4JV8e';

async function checkProduct() {
  try {
    console.log(`🔍 Checking product: ${productId}\n`);

    // Get product
    const product = await stripe.products.retrieve(productId);
    console.log('📦 Product Details:');
    console.log(`   Name: ${product.name}`);
    console.log(`   Description: ${product.description || '(none)'}`);
    console.log(`   Active: ${product.active}`);
    console.log(`   Created: ${new Date(product.created * 1000).toLocaleString()}\n`);

    // Get prices for this product
    const prices = await stripe.prices.list({
      product: productId,
      limit: 100,
    });

    console.log(`💰 Prices (${prices.data.length}):\n`);

    for (const price of prices.data) {
      console.log(`   Price ID: ${price.id}`);
      console.log(`   Amount: $${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
      console.log(`   Recurring: ${price.recurring ? `${price.recurring.interval}` : 'One-time'}`);
      console.log(`   Active: ${price.active}`);
      console.log(`   Lookup Key: ${price.lookup_key || '❌ NOT SET'}`);
      console.log(`   Metadata:`, price.metadata);
      console.log('');
    }

    // Check if any price has the expected lookup_key
    const expectedLookupKey = 'base_monthly';
    const hasLookupKey = prices.data.some(p => p.lookup_key === expectedLookupKey);
    
    if (hasLookupKey) {
      console.log(`✅ Found price with lookup_key: ${expectedLookupKey}`);
    } else {
      console.log(`❌ No price found with lookup_key: ${expectedLookupKey}`);
      console.log('\n💡 To set lookup_key, you need to create a NEW price with the lookup_key set during creation.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.error('   Make sure the product ID is correct and you have access to it.');
    }
    process.exit(1);
  }
}

checkProduct();


