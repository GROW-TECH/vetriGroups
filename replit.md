# Construction ERP Mobile Application

## Overview

A Construction ERP (Enterprise Resource Planning) mobile application built with React Native and Expo, designed for construction industry workforce management. The app provides role-based dashboards for administrators, engineers, clients, and vendors to manage attendance, materials, clients, projects, and appointments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React Native with Expo SDK 54, using the new architecture. The app uses a stack-based navigation pattern with modals for specific interactions like file viewing and forms.

**Navigation Structure**:
- Stack-only navigation using `@react-navigation/native-stack`
- No bottom tabs - all navigation flows from Login → Dashboard → Module screens
- Modals used for camera, file picker, and form overlays

**State Management**:
- React Context API for global state (AuthContext for authentication, DataContext for application data)
- TanStack React Query for server state management and API calls
- AsyncStorage for persistent local storage of user session and app data

**Design System**:
- Custom theming with light/dark mode support via `useTheme` hook
- Role-based color coding (Admin: purple, Engineer: blue, Client: green, Vendor: red)
- Consistent spacing scale using dp units (xs:4, sm:8, md:12, lg:16, xl:24, 2xl:32)
- Reanimated for smooth animations on button presses and card interactions

**Key Components**:
- `ThemedView` and `ThemedText` for consistent styling
- `Button` and `Card` with spring animations
- `KeyboardAwareScrollViewCompat` for cross-platform keyboard handling
- `ErrorBoundary` for graceful error handling

### Backend Architecture

**Server**: Express.js with TypeScript, designed to serve both API endpoints and static assets.

**Database**: PostgreSQL with Drizzle ORM. Schema defined in `shared/schema.ts` using drizzle-zod for validation.

**API Structure**: RESTful API with routes prefixed by `/api`. Currently configured with CORS support for Replit domains.

**Storage Layer**: Abstract `IStorage` interface with `MemStorage` implementation for development. Can be swapped for database-backed storage.

### Authentication

**Pattern**: Role-based instant login without credentials. Users select their role (Admin, Engineer, Client, Vendor) and gain immediate access to role-appropriate features.

**Persistence**: User session stored in AsyncStorage under `@construction_erp_user` key.

**Role Permissions**:
- Admin/Engineer: Full access to attendance, materials, clients, employees
- Client: View projects, files, payments, appointments
- Vendor: Limited view of relevant modules

### Data Flow

1. User authenticates via role selection → stored in AuthContext and AsyncStorage
2. Dashboard displays role-appropriate cards from `DASHBOARD_CARDS` constant
3. Module screens fetch/update data via DataContext which syncs to AsyncStorage
4. API calls go through TanStack Query with `apiRequest` helper for consistent error handling

### Build Configuration

**Development**: Dual server setup - Expo packager for mobile, Express for API
- `expo:dev`: Runs Expo with Replit proxy configuration
- `server:dev`: Runs Express API server with tsx

**Production**: Static export with esbuild bundling
- `expo:static:build`: Builds static web bundle
- `server:build`: Bundles server with esbuild
- `server:prod`: Runs production server

### Path Aliases

- `@/` → `./client/` (React Native app code)
- `@shared/` → `./shared/` (Shared types and schema)

## External Dependencies

### Core Framework
- **Expo SDK 54**: React Native development platform with managed workflow
- **React Native 0.81**: Core mobile framework with new architecture enabled

### Navigation & UI
- **React Navigation 7**: Native stack navigator for screen transitions
- **React Native Reanimated 4**: Smooth animations and gestures
- **Expo Linear Gradient**: Gradient backgrounds on login screen

### Device Features
- **Expo Camera**: Face scan attendance capture
- **Expo Image Picker**: Photo upload for employee enrollment and project files
- **Expo Local Authentication**: Fingerprint/biometric attendance verification
- **Expo Document Picker**: Agreement and plan file uploads

### Data & Storage
- **AsyncStorage**: Local persistent storage for offline-first data
- **Drizzle ORM + PostgreSQL**: Server-side database (requires DATABASE_URL environment variable)
- **TanStack React Query**: API state management and caching

### Server
- **Express.js**: REST API server
- **http-proxy-middleware**: Development proxy for Expo
- **pg**: PostgreSQL client driver

## Supplier Notification System

When placing a new material order, the app automatically sends notifications to the supplier:

### Features
1. **Automated Voice Call (Tamil)**: Calls the supplier with order details spoken in Tamil
2. **WhatsApp Message**: Sends a formatted order notification via WhatsApp

### Configuration (Environment Variables)
The notification system requires the following environment variables:

**For Voice Calls (Twilio)**:
- `TWILIO_ACCOUNT_SID`: Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Twilio Auth Token
- `TWILIO_PHONE_NUMBER`: Twilio phone number (with country code)

**For WhatsApp (Meta Business API)**:
- `WHATSAPP_PHONE_NUMBER_ID`: WhatsApp Business Phone Number ID
- `WHATSAPP_ACCESS_TOKEN`: WhatsApp Business API Access Token

### API Endpoints
- `GET /api/notifications/config` - Check notification services configuration status
- `POST /api/notifications/send-order-notification` - Send supplier notification
- `GET /api/notifications/voice-twiml` - TwiML response for voice calls

### Tamil Message Format
The voice call message is in Tamil:
"வணக்கம் [Supplier Name], புதிய ஆர்டர் வந்துள்ளது. [Material] - [Quantity] [Unit], மொத்த தொகை ரூ.[Amount]. திட்டம்: [Project]. தயவுசெய்து உறுதிப்படுத்தவும்."

Translation: "Hello [Supplier Name], a new order has arrived. [Material] - [Quantity] [Unit], total amount Rs.[Amount]. Project: [Project]. Please confirm."

### Important Notes
- Without API credentials configured, notifications are logged but not sent
- The app shows a preview of what would be sent when APIs are not configured
- Supplier phone numbers are taken from the Vendor records in the app

### Tamil Voice Limitation
Twilio does not natively support Tamil (ta-IN) text-to-speech. The current implementation uses Hindi (hi-IN) voice (Polly.Aditi) which can read Tamil script but with Hindi pronunciation. For authentic Tamil voice:
1. **Option A**: Pre-record Tamil audio files for common order scenarios
2. **Option B**: Use Google Cloud Text-to-Speech API (supports Tamil) to generate audio, then host and play via Twilio's `<Play>` verb
3. **Option C**: Use a third-party Tamil TTS service