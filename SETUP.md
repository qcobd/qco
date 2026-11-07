# QCO Portal Setup

## 1. Create and configure Firebase
1. Open https://console.firebase.google.com/ and create a Firebase project.
2. Add a Web App and copy its Firebase configuration.
3. Replace the placeholder values in `firebase-config.js`.
4. In Authentication → Sign-in method, enable **Email/Password**.
5. Create a Cloud Firestore database.
6. Open Firestore Rules, paste the contents of `firestore.rules`, and publish.

## 2. Publish with GitHub Pages
In the repository, open Settings → Pages. Select **Deploy from a branch**, choose `main` and `/ (root)`, then Save. Wait for the Pages URL to become available.

## 3. Student registration
Open `login.html`. Students can create accounts with their name, email and password. New accounts are assigned the `student` role by the registration code and Firestore rules.

## 4. Create the first administrator safely
1. Register the intended administrator account through `login.html`.
2. In Firebase Console → Firestore Database → `users`, find the document whose ID is that account's Firebase Authentication UID.
3. Change only its `role` field from `student` to `admin`.
4. The administrator can now sign in at `admin.html`.

Never put an admin password, service-account key, or private key in website code. Do not let users choose their own role during registration.

## 5. Portal pages
- `login.html`: open student registration and student login
- `student.html`: personal student dashboard
- `admin.html`: role-checked administrator login and dashboard

## Important current scope
This first portal version includes authentication, role checks, student directory, published-quiz listing and a student's results summary. Quiz authoring, timed quiz attempts, automatic scoring, competition scheduling, certificates and a full admin management interface are planned next. Do not publish real quiz answer keys in public documents or client-readable data. For high-stakes competitions, move scoring and answer validation to a trusted server-side environment (for example, Cloud Functions) before launch.
