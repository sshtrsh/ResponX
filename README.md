# Crime Mapping System

A complete municipal incident reporting and command center system. This repository contains both a React Native mobile application for residents and a web-based dispatch/admin dashboard.

## Overview

The Crime Mapping System allows residents to report incidents (fires, accidents, crimes) from their phones, complete with photos and precise location data. Barangay admins and city police can view, triage, and manage these reports in real-time through a centralized web dashboard, featuring live maps, clustered incident data, and automated Standard Operating Procedures (SOPs).

## Architecture

This project is a monorepo containing two applications:

1.  **Mobile App (`/app`)**: Built with React Native & Expo. Designed for residents to submit reports, receive broadcast announcements, and track their case history.
2.  **Admin Web (`/admin-web`)**: Built with React, Vite, and Tailwind CSS. Designed for dispatchers and administrators to manage incidents and view analytics.

Both applications share a common backend powered by **Supabase** for Authentication, PostgreSQL Database, and Storage (for evidence photos).

---

## Prerequisites

Before starting, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v18 or newer recommended)
*   [npm](https://www.npmjs.com/) (comes with Node.js)
*   A [Supabase](https://supabase.com/) project (Free tier is sufficient for development)

---

## 🚀 Getting Started

### 1. Database Setup (Supabase)

1.  Create a new project in your Supabase dashboard.
2.  Navigate to the **SQL Editor** in Supabase.
3.  Execute the provided database setup scripts in order:
    *   First, run the schema setup: `database_fix.sql`
    *   Then, apply security rules: `supabase_rls_policies.sql`

### 2. Environment Variables

You need to connect both the mobile app and the web dashboard to your Supabase instance.

**For the Mobile App (Root Directory):**
Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**For the Admin Web (`/admin-web`):**
Create a `.env` file inside the `admin-web/` directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Running the Mobile App

From the root directory of the project:

```bash
# Install dependencies
npm install

# Start the Expo development server
npm start
```
*Use the Expo Go app on your phone, or an Android/iOS emulator to preview the app.*

### 4. Running the Admin Dashboard

Open a new terminal window and navigate to the admin directory:

```bash
# Move to the admin-web directory
cd admin-web

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```
*The dashboard will typically be available at `http://localhost:5173`.*

---

## Default Roles & Testing

When first setting up the system, you will need an admin account to access the dashboard.
To create a Super Admin:
1. Register a new account via the mobile app.
2. Go to your Supabase dashboard > Table Editor > `profiles`.
3. Change the `role` for your user from `resident` to `super_admin`.
4. You can now log into the web dashboard at `http://localhost:5173`.

Available Roles:
*   `super_admin`: Full system access, user management.
*   `police_admin`: City-wide view of all incidents.
*   `barangay_admin`: Restricted to incidents within their specific barangay.
*   `resident`: Mobile app users only.

## Production Build

To build the Admin Dashboard for production:
```bash
cd admin-web
npm run build
```

To build the Mobile App for production, refer to the [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/).
