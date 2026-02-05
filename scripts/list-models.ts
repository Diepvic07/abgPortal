
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No GEMINI_API_KEY found');
        return;
    }

    // We can't use GoogleGenerativeAI helper to list models directly easily, 
    // it's easier to use the raw fetch or googleapis if installed.
    // The library exposes `getGenerativeModel` but not `listModels` on the main class in older versions?
    // Let's check if we can just use the REST API via fetch.

    // Using fetch for list models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Failed to list models:', await response.text());
            return;
        }
        const data = await response.json();
        console.log('Available Models:');
        if (data.models) {
            data.models.forEach((m: any) => {
                if (m.supportedGenerationMethods?.includes('generateContent')) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log('No models returned', data);
        }
    } catch (e) {
        console.error('Error listing models:', e);
    }
}

main();
