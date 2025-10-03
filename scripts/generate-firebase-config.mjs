import { existsSync, readFileSync, writeFileSync } from 'node:fs'

if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf8')
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return
    }
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      return
    }
    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  })
}

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error('Missing environment variable: ' + key)
  }
}

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  vapidKey: process.env.VITE_FIREBASE_VAPID_KEY || '',
}

const output = 'self.firebaseConfig = ' + JSON.stringify(config, null, 2) + '\n'

writeFileSync('public/firebase-config.js', output, { encoding: 'utf8' })
console.log('Generated public/firebase-config.js')
