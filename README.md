# MuzAI - Free Music Streaming & AI Generator

A modern music streaming platform with AI music generation capabilities, built for Myanmar users.

## Features

- 🎵 **Free Music Streaming** - Access thousands of free tracks from Jamendo
- 🤖 **AI Music Generation** - Create custom music with AI (powered by Suno AI)
- 🎬 **AI Music Video Generation** - Create singing videos from AI music tracks (powered by Wavespeed AI)
- 💎 **Payment System** - Myanmar-friendly payment options (Bank Transfer, Mobile Money)
- 🌍 **Public Music Feed** - Share and discover community-generated music
- 👤 **User Profiles** - Personal music libraries and preferences
- 🔐 **Admin Panel** - Payment management and order approval system

## Setup Instructions

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Jamendo API (Free Music)
VITE_JAMENDO_CLIENT_ID=17f25733
VITE_JAMENDO_CLIENT_SECRET=3bd8e1c6eccf87b30905717ff535ea54

# Multiple Music AI API Keys (for load distribution)
VITE_MUSIC_AI_API_KEY_1=your_first_api_key
VITE_MUSIC_AI_API_KEY_2=your_second_api_key
VITE_MUSIC_AI_API_KEY_3=your_third_api_key
# ... up to VITE_MUSIC_AI_API_KEY_20

# Wavespeed AI API Key (for video generation)
WAVESPEED_API_KEY=your_wavespeed_api_key
```

### 2. Supabase Edge Functions

Set the same API keys in your Supabase Edge Function environment variables:

```bash
MUSIC_AI_API_KEY_1=your_first_api_key
MUSIC_AI_API_KEY_2=your_second_api_key
MUSIC_AI_API_KEY_3=your_third_api_key
# ... up to MUSIC_AI_API_KEY_20

# Video generation
WAVESPEED_API_KEY=your_wavespeed_api_key
```

### 3. Admin Account

The system automatically assigns admin privileges to `htetnay4u@gmail.com` when they sign up.

## API Key Management

The system supports up to 20 API keys for:
- **Load Distribution**: Requests are automatically rotated across available keys
- **Rate Limit Management**: When one key hits its limit, the system switches to another
- **High Availability**: If one key fails, others continue working
- **Usage Tracking**: Monitor individual key usage and reset times

## Payment System

Supports Myanmar payment methods:
- **Bank Transfer**: KBZ Bank and other local banks
- **Mobile Money**: KBZPay, WavePay, AYAPay
- **Manual Verification**: Admin approval process for all payments

### Video Generation Packs
- **5 Video Pack**: 30,000 MMK
- **Features**: Create singing videos from AI music tracks with custom avatars
- **Quality**: Support for 480p and 720p video generation
- **Duration**: Works with 30-second AI music tracks

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **Music APIs**: Jamendo (free music) + Suno AI (generation)
- **Deployment**: Netlify

## Development

```bash
npm install
npm run dev
```

## Deployment

The app is configured for automatic deployment to Netlify with proper build settings.