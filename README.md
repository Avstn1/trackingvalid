# 💈 ShearWork — Mobile App (Expo + React Native)

ShearWork is now a **cross-platform mobile app** built for barbershops and stylists — offering appointment tracking, client insights, and performance analytics in a sleek, data-driven experience built for iOS and Android.

This project uses:
- **React Native + Expo** — for the mobile application  
- **Supabase** — as the backend database and authentication layer  
- **Expo Go** — for rapid development & device testing  
- **EAS (Expo Application Services)** — for production builds & deployment

---

## 🚀 Features

- 🗓️ Appointment scheduling with real-time updates  
- 💬 New & returning client tracking  
- 💵 Revenue summaries and insights  
- 📊 Weekly & monthly performance dashboards  
- 🔐 Authentication powered by Supabase  
- 📱 Cross-platform development via Expo  

---

## 🧑‍💻 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/shearwork-mobile.git
cd shearwork-mobile
```

### 2️⃣ Install dependencies

Make sure you have **Node.js (v18+)** and the **Expo CLI** installed:

```bash
npm install
npm install -g expo-cli
```

### 3️⃣ Set up environment variables

Duplicate the example file:

```bash
cp .env.example .env
```

Add your Supabase configuration:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> 🛡️ **Note:** Never commit `.env` to version control — it contains sensitive keys.

For access to the production Supabase instance, request credentials or project team access from:
- Email: austinkbartolome@gmail.com  
- Email: trackingvalid@gmail.com  

---

## 📱 Running the App

Start the Expo development server:

```bash
npm start
```

Then:
- Scan the QR code with the **Expo Go** app on iOS/Android  
- Or run on a simulator:  
  ```bash
  npm run ios
  npm run android
  ```

Your mobile app will automatically refresh with each save.

---

## 🧩 Project Structure

```
shearwork-mobile/
├── app/                     # Expo Router (navigation, screens)
├── components/              # Reusable UI components
├── hooks/                   # Custom hooks (auth, data fetching, etc.)
├── lib/                     # Supabase client, helpers
├── assets/                  # Images, icons, fonts
├── utils/                   # Shared utilities
│
├── .env                     # Environment variables (ignored by git)
├── .gitignore               # Git ignore rules
├── app.json                 # Expo project config
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript config
└── README.md                # Documentation
```

---

## 🧠 Supabase Setup

If you're connecting to your own Supabase instance:

1. Go to https://supabase.com  
2. Create a new project  
3. Copy your:
   - **Project URL**
   - **Anon Key**
4. Place them inside `.env`

For access to the production database, request permission from the Supabase project admin.

---

## 🔄 Deployment (Future: Using EAS)

When ready to build for TestFlight / Play Store, switch from Expo Go to **EAS builds**.

Example:

```bash
eas build -p ios
eas build -p android
```

Ensure environment variables are configured in:  
**EAS → Project Settings → Environment Variables**

---

## 🧾 Common Commands

| Command | Description |
|----------|--------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run iOS simulator |
| `npm run android` | Run Android emulator |
| `eas build` | Create production builds |
| `npm run lint` | Run ESLint |

---

## 🧑‍🤝‍🧑 Contributing

1. Fork the repo  
2. Create a branch:  
   ```bash
   git checkout -b feature/new-feature
   ```
3. Commit changes  
4. Push and open a Pull Request

Before submitting:
- Run `npm run lint`  
- Double-check no secrets are committed  
- Include screenshots for UI updates  

---

## 🧰 Tech Stack

| Tech | Purpose |
|------|----------|
| Expo + React Native | Mobile app framework |
| Supabase | Database, Auth, API |
| Expo Router | Navigation system |
| NativeWind/Tailwind RN | Styling |
| Recharts alternative | (Victory Native / React Native SVG charts) |
| EAS | Mobile app deployment |

---

## 🌍 Example `.env.example`

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
EXPO_PUBLIC_APP_ENV=development
```

---

## 🛟 Support

If you run into issues:
- Check the Supabase Docs  
- Check Expo & React Native Docs  
- Open a GitHub Issue or contact the maintainer  

---

## 📜 License

MIT License — free to use, modify, and distribute with attribution.

---

### 💬 Questions?

For dev access, issues, or onboarding:  
**Project Maintainer:** austinkbartolome@gmail.com
