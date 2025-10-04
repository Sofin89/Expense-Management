💰 ExpenseFlow Pro -  Expense Management System
<div align="center">
https://img.shields.io/badge/ExpenseFlow-Pro-brightgreen
https://img.shields.io/badge/HACKATHON-WINNING-blueviolet
https://img.shields.io/badge/DEMO-LIVE-success
https://img.shields.io/badge/Stack-MERN-important

A production-ready, fully dynamic Expense Management System that wows judges with real-time features and zero static data!

🚀 Live Demo • 📋 Features • 🎯 Why We Win • ⚡ Quick Start • 📸 Demo Video

</div>
🏆 The Ultimate Hackathon Submission
Judges, watch this: The moment you submit the first expense, the entire system comes alive - real-time notifications, live analytics, approval flows, and email triggers. NO FABRICATED DATA. NO STATIC MOCKUPS. Pure dynamic magic!

🎯 Why This Wins Hackathons
Feature	Why Judges Love It
🚀 Zero Static Data	Dashboard starts EMPTY - fills ONLY with real user actions
⚡ Real-time Everything	Live notifications, approvals, analytics updates
🤖 Smart OCR	Receipt scanning that actually works
📧 Complete Email System	SendGrid + SMTP fallback with delivery tracking
🔔 Reminder Engine	Automated nudges for pending approvals
🎨 Stunning UI/UX	Pixel-perfect with smooth animations
🛡️ Enterprise Security	Role-based access, JWT, input validation
🚀 Live Demo
Experience the magic:

Register as new user → Auto-creates company with detected currency

Submit first expense → Watch dashboard come alive

Upload receipt → OCR auto-fills details

Check email → Real notification received

Approve expense → Real-time status update

View analytics → Live charts populate

📋 Killer Features
🎯 Core Functionality
👥 Multi-role System (Admin, Manager, Employee)

💸 Smart Expense Submission with receipt OCR

✅ Configurable Approval Flows (Multi-level, Auto-approve rules)

📊 Real Analytics that populate only with real data

🔔 Live Notifications via Socket.IO

🚀 Advanced Features
🧾 Tesseract.js OCR - Scans receipts and auto-fills forms

📧 SendGrid Email System with fallback to SMTP

⏰ Smart Reminders for pending approvals

💹 Currency Conversion with live exchange rates

📱 Mobile-Responsive PWA-ready design

🛡️ Production Ready
🔐 JWT Authentication with refresh tokens

🎭 Role-based Middleware

📝 Input Validation & Sanitization

🔒 File Upload Security

📈 Winston Logging

⚡ Tech Stack
Frontend:

⚛️ React 18 + Vite (Blazing fast)

🎨 TailwindCSS + Framer Motion

📱 Responsive Design

🔄 Zustand State Management

🌐 Socket.IO Client

Backend:

🟢 Node.js + Express

🍃 MongoDB + Mongoose

🔌 Socket.IO

📧 SendGrid + Nodemailer

🧾 Tesseract.js OCR

⏰ node-cron Scheduler

🎯 Quick Start (5-minute Setup)
Prerequisites
Node.js 16+

MongoDB Atlas or local

SendGrid account (free tier)

 

1. Clone & Setup
bash
# Clone the repository
git clone https://github.com/your-username/expenseflow-pro.git
cd expenseflow-pro

# Install dependencies
npm run setup
2. Environment Configuration
Create .env file:


# Frontend
VITE_API_URL=http://localhost:5000
3. Start the Magic
bash
# Start backend (Port 5000)
npm run server

# Start frontend (Port 3000)  
npm run client

# Or both simultaneously
npm run dev
