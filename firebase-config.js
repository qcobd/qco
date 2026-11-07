// QCO Firebase configuration
// Replace these placeholder values with your own Firebase Web App config.
// Firebase Console → Project settings → Your apps → SDK setup and configuration.
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
export const firebaseConfigured = !Object.values(firebaseConfig).some(value => value.startsWith("YOUR_"));