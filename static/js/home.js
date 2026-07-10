/**
 * NutriAgent — home.js
 * Quick chat on the homepage
 */

document.addEventListener("DOMContentLoaded", function () {
  const quickInput   = document.getElementById("quickInput");
  const quickSendBtn = document.getElementById("quickSendBtn");
  const quickMsgs    = document.getElementById("quickChatMessages");
  const chipBtns     = document.querySelectorAll(".chip-btn");

  if (!quickInput) return;   // guard if not on home page

  chipBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      quickInput.value = btn.dataset.msg || "";
      sendQuickMessage();
    });
  });

  quickSendBtn.addEventListener("click", sendQuickMessage);
  quickInput.addEventListener("keydown", e => {
    if (e.key === "Enter") { e.preventDefault(); sendQuickMessage(); }
  });

  async function sendQuickMessage() {
    const text = quickInput.value.trim();
    if (!text) return;

    appendQuick(text, "user");
    quickInput.value = "";

    const loadingEl = document.createElement("div");
    loadingEl.className  = "message bot-message";
    loadingEl.innerHTML  = `<span class="msg-avatar">🤖</span><div class="msg-bubble"><span class="dot-anim"></span><span class="dot-anim"></span><span class="dot-anim"></span></div>`;
    quickMsgs.appendChild(loadingEl);
    quickMsgs.scrollTop = quickMsgs.scrollHeight;

    try {
      const res  = await fetch("/api/chat", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ message: text }),
      });
      const data = await res.json();
      loadingEl.remove();
      appendQuick(data.reply || "Sorry, I couldn't get a response.", "bot");
    } catch {
      loadingEl.remove();
      appendQuick("⚠️ Connection error. Please check server.", "bot");
    }
  }

  function appendQuick(text, role) {
    const el = document.createElement("div");
    el.className = `message ${role === "user" ? "user-message" : "bot-message"}`;
    el.innerHTML = `
      <span class="msg-avatar">${role === "user" ? "🧑" : "🤖"}</span>
      <div class="msg-bubble">${formatAiText(text)}</div>
    `;
    quickMsgs.appendChild(el);
    quickMsgs.scrollTop = quickMsgs.scrollHeight;
  }
});
