/**
 * NutriAgent — chat.js
 * Full chat page functionality: send/receive, history, export, sidebar topics
 */

document.addEventListener("DOMContentLoaded", async function () {
  const chatMessages  = document.getElementById("chatMessages");
  const chatInput     = document.getElementById("chatInput");
  const sendBtn       = document.getElementById("sendBtn");
  const typingInd     = document.getElementById("typingIndicator");
  const clearBtn      = document.getElementById("clearChatBtn");
  const exportBtn     = document.getElementById("exportChatBtn");
  const charCount     = document.getElementById("charCount");
  const suggestions   = document.querySelectorAll(".chip-btn");
  const sidebarTopics = document.querySelectorAll(".sidebar-topic-btn");
  const profileSummary= document.getElementById("profileSummary");

  let profile = await loadProfile();
  if (profile && profile.name) {
    profileSummary.innerHTML = `
      <div class="mb-1"><strong>${profile.name}</strong></div>
      <div class="small text-muted">
        ${profile.age ? profile.age + " yrs · " : ""}
        ${profile.gender || ""} · ${profile.diet_type || ""}<br>
        Goal: ${profile.goal || "—"}
      </div>
      <a href="/dashboard" class="btn btn-outline-success btn-sm w-100 rounded-pill mt-2">Edit Profile</a>
    `;
  }

  // ── Auto-resize textarea ──────────────────────────────────────────────
  chatInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
    charCount.textContent = `${this.value.length} / 500`;
  });

  // ── Send on Enter (Shift+Enter = newline) ─────────────────────────────
  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);

  // ── Chip / topic buttons ──────────────────────────────────────────────
  suggestions.forEach(btn => {
    btn.addEventListener("click", () => {
      chatInput.value = btn.dataset.msg || btn.dataset.topic || "";
      sendMessage();
    });
  });
  sidebarTopics.forEach(btn => {
    btn.addEventListener("click", () => {
      chatInput.value = `Tell me about: ${btn.dataset.topic}`;
      sendMessage();
    });
  });

  // ── Clear chat ────────────────────────────────────────────────────────
  clearBtn.addEventListener("click", async function () {
    if (!confirm("Clear chat history?")) return;
    await fetch("/api/clear-history", { method: "POST" });
    // Remove all messages except the welcome message (first one)
    const msgs = chatMessages.querySelectorAll(".message");
    msgs.forEach((m, i) => { if (i > 0) m.remove(); });
    showToast("Chat cleared.", "info");
  });

  // ── Export chat ───────────────────────────────────────────────────────
  exportBtn.addEventListener("click", function () {
    const msgs  = chatMessages.querySelectorAll(".message");
    let export_ = "NutriAgent Chat Export\n" + "=".repeat(40) + "\n\n";
    msgs.forEach(msg => {
      const isUser = msg.classList.contains("user-message");
      const text   = msg.querySelector(".msg-bubble")?.innerText || "";
      export_ += (isUser ? "You: " : "NutriBot: ") + text.trim() + "\n\n";
    });
    const blob = new Blob([export_], { type: "text/plain" });
    const a    = document.createElement("a");
    a.href     = URL.createObjectURL(blob);
    a.download = "nutriagent-chat.txt";
    a.click();
    showToast("Chat exported!", "success");
  });

  // ── Core send function ────────────────────────────────────────────────
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || text.length > 500) return;

    // Append user bubble
    appendMessage(text, "user");
    chatInput.value = "";
    chatInput.style.height = "auto";
    charCount.textContent = "0 / 500";

    // Hide suggestions after first real message
    const suggs = document.getElementById("chatSuggestions");
    if (suggs) suggs.style.display = "none";

    // Show typing indicator
    typingInd.classList.remove("d-none");
    scrollToBottom();

    try {
      const res  = await fetch("/api/chat", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ message: text, profile }),
      });
      const data = await res.json();
      typingInd.classList.add("d-none");
      appendMessage(data.reply || "Sorry, I couldn't get a response.", "bot");
    } catch (err) {
      typingInd.classList.add("d-none");
      appendMessage("⚠️ Connection error. Please check your Watsonx credentials.", "bot");
    }
  }

  function appendMessage(text, role) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role === "user" ? "user-message" : "bot-message"}`;
    wrapper.innerHTML = `
      <span class="msg-avatar">${role === "user" ? "🧑" : "🤖"}</span>
      <div class="msg-bubble">${formatAiText(text)}</div>
    `;
    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
