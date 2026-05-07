import { addUser } from "./api.js";

/* ── Tab switching ── */
function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.classList.toggle("active", b.id === "tab-" + tab);
    b.setAttribute("aria-selected", b.id === "tab-" + tab);
  });
  document.querySelectorAll(".form-panel").forEach((p) => {
    p.classList.toggle("visible", p.id === "panel-" + tab);
  });
}

/* ── Password strength meter ── */
function checkStrength(val) {
  const bars = [s1, s2, s3, s4];
  const label = document.getElementById("strength-label");
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  const levels = ["", "weak", "fair", "fair", "good"];
  const names = ["", "Weak", "Fair", "Good", "Strong"];
  bars.forEach((b, i) => {
    b.className = i < score ? levels[score] : "";
  });
  label.textContent = val.length ? names[score] : "";
}

/* ── Client-side signup validation ── */
function validateSignup() {
  const err = document.getElementById("signup-error");
  const pw = document.getElementById("reg-password").value;
  const cf = document.getElementById("reg-confirm").value;
  if (pw !== cf) {
    err.textContent = "Passwords do not match.";
    err.style.display = "block";
    document.getElementById("reg-confirm").focus();
    return false;
  }
  if (pw.length < 8) {
    err.textContent = "Password must be at least 8 characters.";
    err.style.display = "block";
    document.getElementById("reg-password").focus();
    return false;
  }
  err.style.display = "none";
  return true;
}

document.querySelector("#tab-signin").addEventListener("click", () => {
  switchTab("signin");
});

document.querySelector("#tab-signup").addEventListener("click", () => {
  switchTab("signup");
});

document.querySelector("#reg-password").addEventListener("input", (e) => {
  checkStrength(e.target.value);
});

document.querySelector("#signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  validateSignup();
  const username = e.target.querySelector("#reg-username").value;
  const email = e.target.querySelector("#reg-email").value;
  const password = e.target.querySelector("#reg-password").value;
  console.log(await addUser(username, email, password));
  e.target.reset();
  location.reload();
});
