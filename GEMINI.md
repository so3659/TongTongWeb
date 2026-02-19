# TongTongWeb (동아리 인원들을 위한 웹사이트)

A community-driven web application designed for club members to interact, share information, and manage club-related activities.

## Project Overview

- **Purpose:** A comprehensive platform for club members featuring a bulletin board, messaging system, calendar, and club management tools.
- **Tech Stack:**
  - **Frontend:** React 18 (Vite), TypeScript (inferred from config, though mostly .jsx used), Tailwind CSS.
  - **Backend:** Supabase (Authentication, PostgreSQL Database, Storage).
  - **Libraries:**
    - `react-router-dom`: Routing.
    - `framer-motion`: Animations and transitions.
    - `@supabase/supabase-js`: Backend integration.
    - `date-fns`: Date formatting.
    - `react-calendar`: Schedule management.
    - `@heroicons/react`: UI icons.
    - `@vercel/analytics`: Usage tracking.

## Building and Running

### Prerequisites
- Node.js installed.
- Supabase project configured.

### Commands
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev` (runs at `localhost:5173`)
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
- **Preview Production Build:** `npm run preview`

## Project Structure

- `src/`: Main source code.
  - `components/`: Reusable UI components.
    - `layout/`: Navbar, Footer, etc.
    - `features/`: Feature-specific components like `MessageModal`.
    - `board/`: Components related to the bulletin board.
  - `context/`: React Context for global state (`AuthContext`, `BlockContext`).
  - `pages/`: Page-level components (Home, Board, Notifications, etc.).
  - `lib/`: External service clients (`supabaseClient.js`).
  - `styles/`: Global and specific stylesheets.
  - `assets/`: Static assets like images and audio.
- `dbStruc.sql`: Reference for the database schema (Tables: profiles, posts, comments, notifications, messages, etc.).
- `vite.config.js`: Configuration for Vite, including `@` path alias for `src/`.

## Development Conventions

- **State Management:** Use React Context for global state (Auth, Blocks) and local `useState` for component-specific state.
- **API Interaction:** Interact with Supabase directly via the `supabase` client. Prefer Supabase RPCs for complex operations (e.g., `increment_view_count`).
- **Styling:** Use Tailwind CSS for most styling. Follow the established color palette (e.g., `brand-600`).
- **Anonymity:** Support anonymous posts, comments, and messages. Ensure `is_anonymous` flags are respected across the UI.
- **Path Aliases:** Use `@/` to reference the `src` directory (e.g., `import { supabase } from '@/lib/supabaseClient'`).
- **Modals:** Use the standard `MessageModal` for initiating chats.
- **Validation:** Always verify user session via `AuthContext` before performing protected actions.
