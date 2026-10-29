# Firebase phone OTP — setup (real SMS chalu karna)

Abhi default me **dev OTP** chalta hai (code screen par dikh jaata hai, SMS nahi jaata) — kyunki
Firebase config set nahi hai. Neeche 6 step me asli SMS OTP chalu ho jaayega.

## 1. Firebase project banao

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → naam `noor-clothing`.
2. Google Analytics optional hai (skip kar sakte hain).

## 2. Web app register karo

1. Project home → **</> (Web)** icon → App nickname: `noor-web` → **Register app**.
2. Screen par `firebaseConfig` object milega — uski values copy kar lein:

```js
{
  apiKey: "AIza…",
  authDomain: "noor-clothing.firebaseapp.com",
  projectId: "noor-clothing",
  storageBucket: "noor-clothing.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
}
```

## 3. Phone sign-in enable karo

1. Console → **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Phone** → Enable → Save.
3. **Settings → Authorized domains** me add karein: `localhost`, `noorclothing.onrender.com`,
   `noor-ethnic-wear.vercel.app`, aur aapka asli domain (`noorethnicwear.in`).

> SMS quota: Blaze plan par hi zyada SMS milte hain. Free (Spark) plan me limited quota hota hai —
> testing ke liye kaafi hai, live traffic par Blaze + budget alert lagayein.

## 4. Env vars set karo (hosting dashboard me, repo me nahi)

| Key | Value | Kahan |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` | storefront (Render/Vercel) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` | storefront |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` | storefront |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` | storefront |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | storefront |
| `FIREBASE_API_KEY` | same `apiKey` (server-side verify) | storefront (**Sensitive**) |
| `FIREBASE_PROJECT_ID` | `projectId` | storefront |
| `OTP_DEV_MODE` | `off` | storefront |
| `OTP_TOKEN_SECRET` | `openssl rand -hex 32` | storefront (**Sensitive**) |
| `REQUIRE_PHONE_OTP` | `1` | storefront |

Render: service → **Environment** → Add Environment Variable → Save (service redeploy hoga).
Vercel: **Settings → Environment Variables** → `NEXT_PUBLIC_*` = plain, baaki = **Sensitive** →
phir **Redeploy** (Next.js `NEXT_PUBLIC_*` ko build ke waqt inline karta hai, isliye redeploy zaroori).

## 5. Verify

1. Site kholiye → checkout → phone number daaliye → **Send OTP**.
2. Asli SMS aana chahiye (dev mode me code screen par dikhta tha — ab nahi dikhega).
3. Galat code → `401`; sahi code → checkout aage badhega aur order ke saath `phoneToken` jaayega.

## 6. Troubleshooting

| Problem | Wajah / fix |
| --- | --- |
| `auth/invalid-app-credential` | domain Authorized domains me nahi hai |
| `auth/billing-not-enabled` | Blaze plan enable karein (SMS ke liye) ya test numbers add karein |
| SMS nahi aaya | Firebase Console → Authentication → **Users** me phone dikh raha hai? Quota check karein |
| Site par abhi bhi dev code dikh raha hai | `NEXT_PUBLIC_FIREBASE_*` build ke waqt set nahi the — redeploy karein |
| Order kehti hai "phone verify karein" | `OTP_TOKEN_SECRET` badal gaya hai (deploy par) — ek hi value fix rakhein |

Kotlin/Android/iOS app bhi chahiye to usi project me platform add karke `google-services.json` /
`GoogleService-Info.plist` use karein — backend same rehta hai.
