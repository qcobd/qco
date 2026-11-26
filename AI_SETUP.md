# QCO AI Question Studio — one-time setup

The QCO website and AI Question Studio are in the repository. AI generation needs a one-time Firebase Console setup before it can run.

## 1. Enable Firebase AI Logic

1. Open the [QCO Firebase Console](https://console.firebase.google.com/project/qco-9a7a7/overview).
2. Open **AI Services → AI Logic**.
3. Select **Get started**.
4. Choose **Gemini Developer API**. This is the recommended starting provider and offers a no-cost usage tier, subject to Google's current quotas and terms.
5. Complete the guided setup.

Official guide: https://firebase.google.com/docs/ai-logic/get-started

## 2. Configure App Check for the QCO website

Firebase AI Logic uses App Check to protect requests. QCO's web app uses the reCAPTCHA Enterprise provider.

1. In Google Cloud Console, select the QCO project and create a **Web** reCAPTCHA Enterprise key for the domain `qcobd.github.io`. Use a score-based key; do not enable a checkbox challenge.
2. In Firebase Console, open **Security → App Check**.
3. Register the QCO web app with the reCAPTCHA Enterprise key.
4. Copy the public site key (not a secret key).
5. Open `ai-config.js` in this repository and replace `ADD_RECAPTCHA_ENTERPRISE_SITE_KEY_HERE` with that site key.
6. Commit the change and wait for GitHub Pages to deploy.

Official guide: https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider

The App Check site key is a public web key. Never put a reCAPTCHA secret key or any private API credential in this repository.

## 3. Test the generator

1. Open https://qcobd.github.io/qco/admin.html
2. Sign in with an approved QCO administrator account.
3. Open **QCO AI Question Studio**.
4. Choose subject, class, language, difficulty and number of questions.
5. Generate questions, review every question and correct answer, then save as a draft or publish.

The generator uses Gemini 4 Hydrogen through Firebase AI Logic. Questions are AI-generated and must be reviewed by an administrator before a formal competition. AI can make mistakes.

## Notes

- Student-facing quizzes use the existing QCO Firestore quiz and answer-key structure.
- Answer keys are stored in the admin-only `quizKeys` collection.
- Never expose answer keys in student-visible documents.
- AI generation is not activated until the Firebase Console and App Check steps above are completed.
- reCAPTCHA Enterprise has a no-cost assessment quota; usage above the current free quota may incur charges. Check Google's current pricing before increasing traffic.
