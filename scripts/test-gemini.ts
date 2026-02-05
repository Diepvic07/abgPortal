import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No GEMINI_API_KEY found');
        return;
    }

    console.log('Key loaded:', key.substring(0, 8) + '...');

    const genAI = new GoogleGenerativeAI(key);

    const modelsToTry = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-flash-latest', 'gemini-pro-latest'];

    for (const modelName of modelsToTry) {
        try {
            console.log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say hello');
            console.log(`SUCCESS with ${modelName}:`, result.response.text());
            return; // Exit on first success
        } catch (error: any) {
            console.error(`FAILED ${modelName}:`, error.message.split('\n')[0]);
        }
    }
    console.error('All models failed.');
}

main();
