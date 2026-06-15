/* ═══════════════════════════════════════════════════════════════
   FIREBASE CONFIGURATION
   1. Go to console.firebase.google.com → your project → Project Settings
   2. Under "Your apps" click the web app (</>)
   3. Copy the firebaseConfig object values below
   ═══════════════════════════════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey:            "REPLACE_WITH_YOUR_API_KEY",
  authDomain:        "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId:         "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket:     "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId:             "REPLACE_WITH_YOUR_APP_ID"
};

/* ═══════════════════════════════════════════════════════════════
   SHARED AUTH UTILITIES
   Included on every page via <script src="firebase-config.js">
   after the Firebase SDK scripts.
   ═══════════════════════════════════════════════════════════════ */

// Initialize Firebase (idempotent — safe to call multiple times)
function initFirebase() {
  if (typeof firebase === 'undefined') return null;
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  return firebase;
}

// Returns the current signed-in user, or null
function getCurrentUser() {
  var fb = initFirebase();
  return fb ? fb.auth().currentUser : null;
}

// Subscribe to auth state changes
function onAuthStateChanged(cb) {
  var fb = initFirebase();
  if (fb) fb.auth().onAuthStateChanged(cb);
}

// Sign out and redirect to login
function signOut(redirectTo) {
  var fb = initFirebase();
  if (!fb) return;
  fb.auth().signOut().then(function() {
    window.location.href = redirectTo || 'login.html';
  });
}

/* ── Subscription helpers ── */

// Get the user's subscription doc from Firestore
function getSubscription(uid, cb) {
  var fb = initFirebase();
  if (!fb || !uid) { cb(null); return; }
  fb.firestore().collection('subscriptions').doc(uid).get()
    .then(function(doc) { cb(doc.exists ? doc.data() : null); })
    .catch(function() { cb(null); });
}

// Write/update subscription status (called from success page)
function setSubscription(uid, data) {
  var fb = initFirebase();
  if (!fb || !uid) return Promise.reject('No Firebase or UID');
  return fb.firestore().collection('subscriptions').doc(uid).set(data, { merge: true });
}

// Check if a subscription object represents an active plan
function isActive(sub) {
  if (!sub) return false;
  if (sub.status !== 'active') return false;
  if (sub.currentPeriodEnd) {
    var exp = sub.currentPeriodEnd.toDate ? sub.currentPeriodEnd.toDate() : new Date(sub.currentPeriodEnd);
    if (exp < new Date()) return false;
  }
  return true;
}

/* ══════════════════════════════════════════════════════════════
   AUTH GUARD
   Call guardPage() at the top of any page that requires a
   signed-in, active subscriber.
   ══════════════════════════════════════════════════════════════ */
function guardPage() {
  initFirebase();
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
      return;
    }
    getSubscription(user.uid, function(sub) {
      if (!isActive(sub)) {
        window.location.href = 'checkout.html?reason=subscribe';
      }
    });
  });
}

/* ── Nav helpers ── */

// Update nav CTA based on auth state (call after DOM ready)
function updateNavAuth() {
  onAuthStateChanged(function(user) {
    var ctaEl = document.getElementById('navCta');
    if (!ctaEl) return;
    if (user) {
      ctaEl.textContent = 'My Dashboard →';
      ctaEl.href = 'dashboard.html';
    } else {
      ctaEl.textContent = 'Get Started →';
      ctaEl.href = 'checkout.html';
    }
  });
}
