const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({region: "asia-south1", maxInstances: 10});
const db = getFirestore();

function requireStudent(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please sign in first.");
  return request.auth.uid;
}
function attemptId(uid, quizId) { return uid + "_" + quizId; }

exports.startQuiz = onCall(async (request) => {
  const uid = requireStudent(request);
  const quizId = String(request.data?.quizId || "");
  if (!quizId || quizId.includes("/")) throw new HttpsError("invalid-argument", "Invalid quiz.");
  const userSnap = await db.doc("users/" + uid).get();
  if (!userSnap.exists || userSnap.data().role !== "student") throw new HttpsError("permission-denied", "Student account required.");
  const quizRef = db.doc("quizzes/" + quizId);
  const keyRef = db.doc("quizKeys/" + quizId);
  const attemptRef = db.doc("attempts/" + attemptId(uid, quizId));
  return db.runTransaction(async tx => {
    const [quizSnap, keySnap, attemptSnap] = await Promise.all([tx.get(quizRef), tx.get(keyRef), tx.get(attemptRef)]);
    if (!quizSnap.exists || quizSnap.data().published !== true) throw new HttpsError("not-found", "This quiz is not available.");
    if (!keySnap.exists) throw new HttpsError("failed-precondition", "Answer key is not configured. Contact QCO administration.");
    const quiz = quizSnap.data();
    if (!Array.isArray(quiz.questions) || !quiz.questions.length) throw new HttpsError("failed-precondition", "This quiz has no questions.");
    if (attemptSnap.exists) {
      const old = attemptSnap.data();
      if (old.status === "submitted") throw new HttpsError("already-exists", "You have already submitted this quiz.");
      return {quizId, title: quiz.title || "QCO Quiz", questions: quiz.questions, durationMinutes: old.durationMinutes, startedAt: old.startedAt.toMillis()};
    }
    const durationMinutes = Math.max(1, Math.min(240, Number(quiz.durationMinutes) || 20));
    const startedAt = Timestamp.now();
    tx.create(attemptRef, {uid, quizId, status: "in_progress", startedAt, durationMinutes, questionCount: quiz.questions.length});
    return {quizId, title: quiz.title || "QCO Quiz", questions: quiz.questions, durationMinutes, startedAt: startedAt.toMillis()};
  });
});

exports.submitQuiz = onCall(async (request) => {
  const uid = requireStudent(request);
  const quizId = String(request.data?.quizId || "");
  const answers = request.data?.answers;
  if (!quizId || quizId.includes("/") || !Array.isArray(answers) || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) {
    throw new HttpsError("invalid-argument", "Invalid quiz submission.");
  }
  const userSnap = await db.doc("users/" + uid).get();
  if (!userSnap.exists || userSnap.data().role !== "student") throw new HttpsError("permission-denied", "Student account required.");
  const attemptRef = db.doc("attempts/" + attemptId(uid, quizId));
  const quizRef = db.doc("quizzes/" + quizId);
  const keyRef = db.doc("quizKeys/" + quizId);
  const resultRef = db.doc("results/" + attemptId(uid, quizId));
  return db.runTransaction(async tx => {
    const [attemptSnap, quizSnap, keySnap, resultSnap] = await Promise.all([tx.get(attemptRef), tx.get(quizRef), tx.get(keyRef), tx.get(resultRef)]);
    if (resultSnap.exists || !attemptSnap.exists || attemptSnap.data().status !== "in_progress") throw new HttpsError("already-exists", "This attempt has already been submitted or is unavailable.");
    if (!quizSnap.exists || !keySnap.exists) throw new HttpsError("failed-precondition", "Quiz or answer key is unavailable.");
    const attempt = attemptSnap.data(), quiz = quizSnap.data(), keys = keySnap.data().answers;
    if (!Array.isArray(keys) || answers.length !== keys.length || keys.length !== attempt.questionCount) throw new HttpsError("invalid-argument", "Please answer all questions in the correct quiz.");
    const deadline = attempt.startedAt.toMillis() + attempt.durationMinutes * 60000;
    if (Date.now() > deadline + 5000) throw new HttpsError("deadline-exceeded", "The exam time has ended. Your answers could not be accepted.");
    let correct = 0;
    keys.forEach((key, i) => { if (answers[i] === key) correct++; });
    const score = Math.round(correct / keys.length * 100);
    tx.create(resultRef, {uid, quizId, quizTitle: quiz.title || "QCO Quiz", score, correct, total: keys.length, submittedAt: Timestamp.now()});
    tx.update(attemptRef, {status: "submitted", submittedAt: Timestamp.now(), score});
    return {score, correct, total: keys.length};
  });
});
