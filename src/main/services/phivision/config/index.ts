import { app } from 'electron';
import * as path from 'path';
import { PhiVisionConfig } from '../types';

/**
 * PhiVision Configuration
 * Centralizes all configuration and secrets.
 *
 * PLAN DE MIGRATION SECURITE:
 * Les valeurs par défaut ci-dessous doivent être déplacées dans un fichier .env
 * et chargées via process.env pour ne pas être exposées dans le code source.
 */

// Legacy hardcoded secrets (TO BE REMOVED after .env is fully operational)
const LEGACY_SECRETS = {
    MISTRAL_API_KEY: 'I9V9dMbmD0RYTX9cWZR7kvRbiFaC6hfi',
    SUPABASE_URL: 'https://ahjvlbyyyxexrheptunp.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoanZsYnl5eXhleHJoZXB0dW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTUyODksImV4cCI6MjA4MzA5MTI4OX0.H_u_KRqnAN77RZfGcF8-tMRw-xHskUqDCYkF5xNUF5Q'
};

export const config: PhiVisionConfig = {
    mistral: {
        apiKey: process.env.MISTRAL_API_KEY || LEGACY_SECRETS.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL || 'mistral-ocr-latest',
    },
    supabase: {
        url: process.env.SUPABASE_URL || LEGACY_SECRETS.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY || LEGACY_SECRETS.SUPABASE_KEY,
        storageBucket: 'phivision-captures',
    },
    get paths() {
        return {
            dataDir: path.join(app.getPath('userData'), 'phivision_data'),
            screenshotsDir: path.join(app.getPath('userData'), 'phivision_data', 'screenshots'),
        };
    }
};

export const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';
