import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function listModels() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await res.json();
  data.models.forEach(model => {
    if (model.name.includes("flash") || model.name.includes("live") || model.name.includes("bidi")) {
        console.log(model.name, model.supportedGenerationMethods);
    }
  });
}
listModels();
