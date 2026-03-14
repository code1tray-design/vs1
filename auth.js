// ============================================================
//  auth.js — MINDCLASH  |  Credentials + Google Sheets Logging
//
//  WHY IT WASN'T LOGGING BEFORE:
//  Using fetch with mode:"no-cors" + Content-Type:"application/json"
//  triggers a CORS preflight that browsers block silently.
//  Fix: send data via GET query params — no preflight needed,
//  Apps Script handles it with doGet(e), works every time.
//
//  Google Sheet columns written on every Sign In:
//    A: Timestamp  |  B: Name  |  C: Roll Number  |  D: Status
//
//  ── APPS SCRIPT CODE (paste this, then redeploy) ────────────
//
//    function doGet(e) {
//      try {
//        var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
//        sheet.appendRow([
//          e.parameter.timestamp,
//          e.parameter.name,
//          e.parameter.rollNumber,
//          e.parameter.status
//        ]);
//        return ContentService
//          .createTextOutput(JSON.stringify({ result: "success" }))
//          .setMimeType(ContentService.MimeType.JSON);
//      } catch(err) {
//        return ContentService
//          .createTextOutput(JSON.stringify({ result: "error", message: err.toString() }))
//          .setMimeType(ContentService.MimeType.JSON);
//      }
//    }
//
//  Deploy settings:
//    Execute as  → Me
//    Who can access → Anyone
//  ⚠️  After changing the script, always click
//      "Deploy → Manage Deployments → ✏️ Edit → New Version → Deploy"
//      The URL stays the same but the code updates.
// ============================================================


// ============================================================
//  ⚠️  PASTE YOUR WEB APP URL HERE
// ============================================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzF41Fq9vgSqu60c4y9qarGYSNUdXL45FjZNN8mBqg6eK_rgWb14bNh3tL4oOhUYvBM/exec";
// e.g. "https://script.google.com/macros/s/AKfycbx.../exec"


// ============================================================
//  CREDENTIALS STORE
//  Add every valid { name, roll } pair below.
//  name  — must match exactly what the student types (case-insensitive)
//  roll  — must match exactly what the student types (case-insensitive)
// ============================================================
const USERS = [
  { name: "Rahul Sharma",   roll: "MC2024001" },
  { name: "Priya Singh",    roll: "MC2024002" },
  { name: "Arjun Mehta",    roll: "MC2024003" },
  // ── add more students below ──
  // { name: "Student Name", roll: "RollNumber" },
];


// ============================================================
//  GOOGLE SHEETS LOGGER  (GET-based — works without CORS issues)
// ============================================================
async function logToSheet({ name, rollNumber, status }) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.startsWith("YOUR_")) {
    console.warn("⚠️  MINDCLASH: Paste your Apps Script URL into APPS_SCRIPT_URL in auth.js");
    return;
  }

  // Build query string — GET params, no preflight, no CORS block
  const params = new URLSearchParams({
    timestamp:  new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    name:       name       || "—",
    rollNumber: rollNumber || "—",
    status:     status     || "—",
  });

  try {
    // Using an <img> tag trick as the most reliable no-CORS GET method
    // (fetch with no-cors on GET also works but swallows errors silently)
    const url = APPS_SCRIPT_URL + "?" + params.toString();

    await fetch(url, { method: "GET", mode: "no-cors" });
    console.log("✅ Logged to Sheet:", Object.fromEntries(params));
  } catch (err) {
    console.error("❌ Sheet log failed:", err);
  }
}


// ============================================================
//  VALIDATION  — checks name + roll number together
// ============================================================
function validateUser(name, rollNumber) {
  const match = USERS.find(
    u =>
      u.name.trim().toLowerCase() === name.trim().toLowerCase() &&
      u.roll.trim().toLowerCase() === rollNumber.trim().toLowerCase()
  );
  if (match) return { success: true };
  return {
    success: false,
    message: "Name and roll number don't match our records. Please check and try again.",
  };
}


// ============================================================
//  SESSION HELPERS
// ============================================================
const SESSION_KEY = "mindclash_session";

function saveSession(name, rollNumber) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, roll: rollNumber, ts: Date.now() }));
}
function getSession() {
  return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}


// ============================================================
//  MAIN LOGIN HANDLER  — called from index.html → onSignIn()
// ============================================================
async function handleLogin(name, rollNumber) {

  // 1. Validate
  const result = validateUser(name, rollNumber);

  // 2. Log to Sheet regardless of success/failure
  await logToSheet({
    name,
    rollNumber,
    status: result.success ? "✅ Success" : "❌ Failed",
  });

  // 3. Respond
  if (result.success) {
    saveSession(name, rollNumber);

    // Store identity for location_tester.html to use in denied-access logs
    sessionStorage.setItem('mindclash_pending', JSON.stringify({ name, roll: rollNumber }));

    // ⚠️  Redirect to location check first — it will forward to dashboard on success
    window.location.href = "location_tester.html";
    return { success: true };
  }

  return { success: false, message: result.message };
}


// Expose to global scope
window.MindClashAuth = { handleLogin, getSession, clearSession };
