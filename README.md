# Server Hub Optimised

A modern, full-stack social platform built with Next.js that allows users to create, join, and manage servers with real-time communication, events, and community features.

## 🚀 Features

### 🔐 Authentication & Security
- **NextAuth.js Integration** - Secure authentication with email/password and OAuth providers (Google, GitHub)
- **Two-Factor Authentication (2FA)** - Enhanced security with authenticator app support and backup codes
- **Email Verification** - OTP-based email verification for account creation
- **Role-Based Access Control** - Admin, Moderator, Member, and Visitor roles

### 🌐 Server Management
- **Create & Join Servers** - Community-focused server creation with custom categories
- **Server Discovery** - Browse and search servers by category
- **Member Management** - Advanced role management and permissions
- **Private & Public Servers** - Control server visibility and access

### 💬 Real-Time Communication
- **Socket.io Integration** - Real-time messaging and notifications
- **Group Channels** - Text channels within servers for organized discussions
- **Direct Messaging** - Private conversations between users
- **Chat Interface** - Modern, responsive chat experience

### 📅 Event System
- **Event Creation** - Create and manage server events with rich details
- **Event Media** - Photo and video uploads for events
- **Event Comments** - Community engagement with likes and comments
- **Event Types** - Gaming, social, educational, and custom event categories

### 📢 Announcements & Notifications
- **Server Announcements** - Important updates with like and comment features
- **Real-Time Notifications** - In-app notification system with read/unread status
- **Notification Settings** - Granular control over notification preferences

### 🎨 User Experience
- **Modern UI/UX** - Built with shadcn/ui components and Tailwind CSS
- **Dark/Light Mode** - Theme customization with next-themes
- **Responsive Design** - Mobile-first approach with adaptive layouts
- **Accessibility** - WCAG compliant with proper ARIA labels

### ⚙️ Advanced Features
- **File Uploads** - Vercel Blob integration for images and media
- **Email System** - Nodemailer integration for transactional emails
- **Search & Discovery** - Advanced search functionality across content
- **User Profiles** - Customizable profiles with bio and status
- **Server Analytics** - Member activity and engagement insights

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Reusable UI components
- **Radix UI** - Headless UI primitives
- **React Hook Form** - Form management with Zod validation
- **Lucide React** - Modern icon library

### Backend & Database
- **Prisma** - Type-safe ORM with MongoDB
- **MongoDB** - NoSQL database for scalable data storage
- **NextAuth.js** - Authentication solution
- **Socket.io** - Real-time bidirectional communication

### Infrastructure & Services
- **Vercel** - Deployment and hosting
- **Vercel Blob** - File storage solution
- **Nodemailer** - Email delivery service
- **QR Code Generation** - For 2FA setup

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd server-hub-optimised
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Environment Setup**
```bash
cp sample.env .env.local
```

Configure the following environment variables:
```env
# Database
DATABASE_URL="your-mongodb-connection-string"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Email Configuration
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@yourdomain.com"

# File Storage
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

4. **Database Setup**
```bash
npx prisma generate
npx prisma db push
```

5. **Run the development server**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── servers/       # Server management
│   │   ├── notifications/ # Notification system
│   │   ├── users/         # User management
│   │   └── ...
│   ├── auth/              # Authentication pages
│   ├── server/            # Server pages
│   ├── group/             # Group pages
│   └── settings/          # User settings
├── components/            # Reusable components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/                  # Utility libraries
│   ├── auth.ts           # Authentication config
│   ├── prisma.ts         # Database client
│   ├── utils.ts          # Utility functions
│   └── socket-client.ts  # Socket.io client
└── hooks/                # Custom React hooks
```

## 🚀 Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run prisma:generate # Generate Prisma client
npx prisma studio       # Open Prisma Studio
npx prisma db push      # Push schema changes

# Code Quality
npm run lint            # Run ESLint
npm run type-check      # TypeScript type checking
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/verify-email` - Email verification
- `GET /api/auth/2fa/setup` - 2FA setup
- `POST /api/auth/2fa/verify` - 2FA verification

### Servers
- `GET /api/servers` - List servers
- `POST /api/servers` - Create server
- `GET /api/servers/[id]` - Get server details
- `PUT /api/servers/[id]` - Update server
- `DELETE /api/servers/[id]` - Delete server

### Events
- `GET /api/servers/[id]/events` - List server events
- `POST /api/servers/[id]/events` - Create event
- `GET /api/events/[id]` - Get event details

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/mark-all-read` - Mark all as read

## 🔒 Security Features

- **Input Validation** - Zod schema validation on all forms
- **SQL Injection Prevention** - Prisma ORM with parameterized queries
- **CSRF Protection** - Built-in NextAuth.js CSRF protection
- **Rate Limiting** - API route protection against abuse
- **Secure Headers** - Security headers via Next.js middleware
- **Environment Variables** - Sensitive data stored securely

## 🌟 Key Features Implementation

### Real-Time Updates
The application uses Socket.io for real-time features:
- Live chat messaging
- Instant notifications
- Real-time member presence
- Live event updates

### File Upload System
Integrated with Vercel Blob for:
- Server banners and avatars
- Event photos and videos
- User profile images
- Optimized image handling

### Notification System
Comprehensive notification system with:
- In-app notifications
- Email notifications
- Push notification support
- Granular notification preferences

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on every push

### Manual Deployment
```bash
npm run build
npm start
```

Make sure to configure all environment variables in your production environment.

---

**Built with ❤️ using Next.js, TypeScript, and modern web technologies.**
