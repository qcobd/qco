# QCO — Quiz Competition Organization

Official website: https://qcobd.github.io/qco/

## Project
A responsive quiz competition platform with Firebase Authentication, student dashboard, administrator dashboard, HTML-based exam publishing, timed student examinations and result review.

## Admin HTML Exam Studio
1. Sign in at https://qcobd.github.io/qco/admin.html with an approved administrator account.
2. Paste an HTML document containing one root element with `data-qco-exam`.
3. Set `data-title`, `data-description`, `data-duration` (minutes) and `data-total-marks` on the root element.
4. Add each MCQ as an element with `data-question`, `data-correct` (0–3 or A–D), optional `data-marks`, a question heading, and exactly four `data-option` elements.
5. Choose **Validate & Preview**, correct any errors, then **Publish Examination**.
6. Copy the unique link shown after publishing, or use **Exam link** in the Admin Quiz Library.

The pasted HTML is parsed as data only. Scripts, styles, event handlers and embedded active content are not executed or stored. Questions are stored in `quizzes`; correct answers and marks are stored separately in the admin-only `quizKeys` collection.

## Student exam flow
Students open the unique exam link and sign in with a QCO student account. The examination is timed, answers are submitted to Firestore, and an administrator reviews and publishes the result.

## Technology
- HTML, CSS and JavaScript
- Firebase Authentication
- Cloud Firestore
- GitHub Pages
