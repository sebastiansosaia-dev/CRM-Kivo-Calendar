# KIVO Calendar CRM

A production-ready React CRM for managing appointments (citas), built with Vite, Supabase Realtime, FullCalendar, and n8n webhook integrations.

## Features

- 📅 **Full Calendar** — week/day/month views with responsive mobile layout
- 🔔 **Realtime Notifications** — live badge counts via Supabase `postgres_changes`
- ✅ **Accept / Deny / Reschedule** — webhook-driven flows with mandatory deny reasons
- 📊 **Analytics Dashboard** — monthly trends, status distribution donut chart, top clients
- 💬 **KIVO Assistant** — AI chatbot widget connected to n8n
- 📝 **Team Notes** — realtime collaborative message board
- 🔐 **Role-based Auth** — `jefe` and `empleado` roles via Supabase Auth + profiles table
- 🔔 **Push Notifications** — Service Worker for background browser notifications

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 |
| Routing | react-router-dom v7 |
| Database / Auth / Realtime | Supabase |
| Calendar | FullCalendar v6 |
| Webhooks | n8n |
| Deployment | Vercel |

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/sebastiansosaia-dev/CRM-Kivo-Calendar.git
cd CRM-Kivo-Calendar

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local and add your Supabase URL and Anon Key

# 4. Start the dev server
npm run dev
```

## Deployment on Vercel

1. Import the repository on [Vercel](https://vercel.com)
2. Set the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project settings
3. Vercel will auto-detect the Vite framework and build with `npm run build`

The `vercel.json` rewrite rule ensures all routes are handled by `index.html` for client-side routing.

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |

## Project Structure

```
src/
  components/     # Shared UI components (Layout, DetailModal, ChatbotPanel, Toast...)
  pages/          # Route-level pages (Dashboard, Notificaciones, Analytics...)
  lib/
    supabase.js   # Supabase client initialization
public/
  sw.js           # Service Worker for push notifications
  umbrella_no_bg_clean.png  # KIVO logo
```
