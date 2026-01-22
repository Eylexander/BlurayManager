# Bluray Manager

A modern, Jellyfin-inspired web application for managing your personal Bluray collection. Built with Go backend and Next.js frontend.

## Features

- **Bluray Management**: Add, edit, and organize your movie and TV series collections
- **User System**: Admin, User, and Guest roles with different permissions
- **Internationalization**: Full support for English and French
- **Theme Support**: Dark and light mode with persistent preferences
- **Statistics**: Comprehensive analytics about your collection
- **Tag System**: Organize items with custom tags
- **Search**: Full-text search across your collection
- **Responsive Design**: Beautiful UI that works on all devices

## Architecture

### Backend (Go)
- **Server Package**: REST API routing with Gin
- **API Package**: Request handling and JWT authentication
- **Controller Package**: Business logic layer
- **Datastore Package**: MongoDB database abstraction

### Frontend (Next.js 14)
- **App Router**: Modern Next.js routing
- **TypeScript**: Full type safety
- **Tailwind CSS**: Utility-first styling
- **Zustand**: State management
- **next-intl**: Internationalization
- **next-themes**: Theme management
