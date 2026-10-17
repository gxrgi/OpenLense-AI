# OpenLense Frontend 🎨

The modern web user interface for **OpenLense**, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Radix UI**.

---

## ⚡ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) / [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks & Zustand

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env.local
```

Default variables:
```env
NEXT_PUBLIC_VISION_API_URL=http://localhost:8001
NEXT_PUBLIC_RAG_API_URL=http://127.0.0.1:8002
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 📁 Directory Structure

```
frontend/
├── app/
│   ├── conversation-objects/   # Photo upload, camera capture & object persona chat
│   ├── chat-document/          # Document upload & RAG retrieval interface
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout & font configurations
│   └── globals.css             # Tailwind & theme variables
├── components/                 # Reusable React components
│   ├── camera-capture.tsx      # Live webcam snapshot module
│   ├── chat-interface.tsx      # Document RAG Q&A chat
│   ├── document-upload.tsx     # Drag-and-drop document uploader
│   ├── entity-selection.tsx    # Detected object selector
│   ├── image-upload.tsx        # Image file upload module
│   ├── multi-entity-chat.tsx   # Multi-character persona chat room
│   └── ui/                     # Radix UI primitive components
├── lib/
│   ├── config.ts               # Environment API URLs
│   ├── api.ts                  # API client helpers
│   └── utils.ts                # Class merging & utility functions
└── public/                     # Static assets & SVG icons
```

---

## 📦 Production Build

```bash
npm run build
npm start
```
