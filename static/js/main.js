/**
 * NutriAgent — main.js
 * Theme toggle, shared utilities, profile loader
 */

// ── Theme Toggle ──────────────────────────────────────────────────────────
(function initTheme() {
  const savedTheme = localStorage.getItem("nutriTheme") || "light";
  document.documentElement.setAttribute("data-bs-theme", savedTheme);
  updateThemeIcon(savedTheme);
})();

function updateThemeIcon(theme) {
  const icon = document.getElementById("themeIcon");
  if (!icon) return;
  icon.className = theme === "dark" ? "bi bi-sun-fill" : "bi bi-moon-stars-fill";
}

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.getElementById("themeToggle");
  if (btn) {
    btn.addEventListener("click", function () {
      const html    = document.documentElement;
      const current = html.getAttribute("data-bs-theme");
      const next    = current === "dark" ? "light" : "dark";
      html.setAttribute("data-bs-theme", next);
      localStorage.setItem("nutriTheme", next);
      updateThemeIcon(next);
    });
  }
});

// ── Profile helpers ───────────────────────────────────────────────────────
async function loadProfile() {
  try {
    const res = await fetch("/api/get-profile");
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveProfile(data) {
  const res = await fetch("/api/save-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}

// ── Format AI text (basic markdown-ish) ──────────────────────────────────
function formatAiText(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/#{1,3}\s(.+)/g, "<strong class='d-block mt-2'>$1</strong>")
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>")
    .replace(/^[-•]\s(.+)/gm, "• $1");
}

// ── Show toast notification ───────────────────────────────────────────────
function showToast(message, type = "success") {
  const id      = "toast-" + Date.now();
  const colors  = { success: "#22c55e", error: "#ef4444", info: "#3b82f6", warning: "#f59e0b" };
  const toast   = document.createElement("div");
  toast.id      = id;
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:${colors[type] || colors.info}; color:#fff;
    padding:.65rem 1.25rem; border-radius:12px; font-size:.875rem;
    box-shadow:0 4px 20px rgba(0,0,0,.25); animation:fadeUp .3s ease;
    max-width:320px; word-break:break-word;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Copy text to clipboard ────────────────────────────────────────────────
function copyToClipboard(text, label = "Copied!") {
  navigator.clipboard.writeText(text).then(() => showToast(label));
}
