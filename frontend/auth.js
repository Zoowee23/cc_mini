/* ── Auth logic (localStorage-based) ── */

const USERS_KEY = 'soc_users';
const SESSION_KEY = 'soc_session';

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function showErr(msg) {
  const el = document.getElementById('authError');
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}

function hideErr() {
  document.getElementById('authError')?.classList.remove('show');
}

function showSuccess(msg) {
  const el = document.getElementById('authSuccess');
  if (!el) return;
  el.textContent = '✓ ' + msg;
  el.classList.add('show');
}

function setLoading(btnId, loaderId, on) {
  const btn = document.getElementById(btnId);
  const loader = document.getElementById(loaderId);
  if (!btn || !loader) return;
  btn.disabled = on;
  loader.classList.toggle('show', on);
}

// ── Password strength ────────────────────────────────────────────────────────
const pwInput = document.getElementById('signupPassword');
if (pwInput) {
  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    const bar = document.getElementById('pwStrengthBar');
    const label = document.getElementById('pwStrengthLabel');
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { pct: '0%',   color: 'transparent', text: '' },
      { pct: '25%',  color: '#ff2d55',     text: 'WEAK' },
      { pct: '50%',  color: '#ff8c00',     text: 'FAIR' },
      { pct: '75%',  color: '#ffd700',     text: 'GOOD' },
      { pct: '100%', color: '#00ff88',     text: 'STRONG' },
    ];
    const lvl = val.length === 0 ? levels[0] : levels[score] || levels[1];
    bar.style.width = lvl.pct;
    bar.style.background = lvl.color;
    label.textContent = lvl.text;
    label.style.color = lvl.color;
  });
}

// ── Toggle password visibility ───────────────────────────────────────────────
document.getElementById('togglePw')?.addEventListener('click', () => {
  const input = document.getElementById('loginPassword') || document.getElementById('signupPassword');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
});

// ── Login ────────────────────────────────────────────────────────────────────
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErr();
  setLoading('loginBtn', 'loginLoader', true);

  await delay(600); // simulate network

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === btoa(password));

  if (!user) {
    showErr('Invalid email or password.');
    setLoading('loginBtn', 'loginLoader', false);
    return;
  }

  setSession(user);
  window.location.href = 'index.html';
});

// ── Signup ───────────────────────────────────────────────────────────────────
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErr();
  setLoading('signupBtn', 'signupLoader', true);

  await delay(600);

  const name     = document.getElementById('signupName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const confirm  = document.getElementById('signupConfirm').value;

  if (password !== confirm) {
    showErr('Passwords do not match.');
    setLoading('signupBtn', 'signupLoader', false);
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showErr('An account with this email already exists.');
    setLoading('signupBtn', 'signupLoader', false);
    return;
  }

  users.push({ name, email, password: btoa(password) });
  saveUsers(users);
  setLoading('signupBtn', 'signupLoader', false);
  showSuccess('Account created! Redirecting to login...');
  setTimeout(() => window.location.href = 'login.html', 1500);
});

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
