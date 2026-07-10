/**
 * NutriAgent — family.js
 * Family member CRUD (add / edit / remove), plan generation, healthy swap tool
 */

document.addEventListener("DOMContentLoaded", function () {
  const addMemberBtn      = document.getElementById("addMemberBtn");
  const saveMemberBtn     = document.getElementById("saveMemberBtn");
  const saveEditMemberBtn = document.getElementById("saveEditMemberBtn");
  const generatePlanBtn   = document.getElementById("generateFamilyPlanBtn");
  const familyPlanOutput  = document.getElementById("familyPlanOutput");
  const familyPlanLoading = document.getElementById("familyPlanLoading");
  const familyPlanContent = document.getElementById("familyPlanContent");
  const copyFamilyPlanBtn = document.getElementById("copyFamilyPlanBtn");
  const swapBtn           = document.getElementById("swapBtn");
  const swapInput         = document.getElementById("swapInput");
  const swapResult        = document.getElementById("swapResult");
  const swapLoading       = document.getElementById("swapLoading");
  const addModal          = new bootstrap.Modal(document.getElementById("addMemberModal"));
  const editModal         = new bootstrap.Modal(document.getElementById("editMemberModal"));

  let memberCounter = 10; // start above pre-seeded ids

  // Seed data that matches the pre-rendered HTML cards
  let members = [
    { id:1, name:"Rajesh (Papa)",   age:50, gender:"male",   diet:"non-vegetarian",     goal:"weight loss",        health:"hypertension" },
    { id:2, name:"Sunita (Mummy)",  age:45, gender:"female", diet:"vegetarian",         goal:"maintenance",        health:"PCOD" },
    { id:3, name:"Arjun (Bhai)",    age:18, gender:"male",   diet:"eggetarian",         goal:"muscle gain",        health:"none" },
    { id:4, name:"Priya (Didi)",    age:25, gender:"female", diet:"vegetarian",         goal:"pregnancy nutrition", health:"none" },
  ];

  // ── Open add modal ─────────────────────────────────────────────────────
  addMemberBtn.addEventListener("click", () => addModal.show());

  // ── Save new member ────────────────────────────────────────────────────
  saveMemberBtn.addEventListener("click", function () {
    const name   = document.getElementById("mName").value.trim();
    const age    = parseInt(document.getElementById("mAge").value);
    const gender = document.getElementById("mGender").value;
    const diet   = document.getElementById("mDiet").value;
    const goal   = document.getElementById("mGoal").value;
    const health = document.getElementById("mHealth").value.trim() || "none";

    if (!name || !age) { showToast("Name and age are required.", "warning"); return; }

    memberCounter++;
    const id = memberCounter;
    members.push({ id, name, age, gender, diet, goal, health });
    addMemberCard(id, name, age, gender, diet, goal, health);
    addModal.hide();
    document.getElementById("addMemberForm").reset();
    showToast(`${name} added!`, "success");
  });

  // ── Open edit modal (event delegation on the grid) ─────────────────────
  document.getElementById("familyMembersGrid").addEventListener("click", function (e) {
    // ── Remove ────────────────────────────────────────────────────────────
    const removeBtn = e.target.closest(".remove-member-btn");
    if (removeBtn) {
      const id = parseInt(removeBtn.dataset.id);
      members  = members.filter(m => m.id !== id);
      const el = document.getElementById(`member-${id}`);
      if (el) el.remove();
      showToast("Member removed.", "info");
      return;
    }

    // ── Edit ──────────────────────────────────────────────────────────────
    const editBtn = e.target.closest(".edit-member-btn");
    if (editBtn) {
      const id = parseInt(editBtn.dataset.id);
      const m  = members.find(m => m.id === id);
      if (!m) return;

      document.getElementById("eMemberId").value = id;
      document.getElementById("eName").value     = m.name;
      document.getElementById("eAge").value      = m.age;
      document.getElementById("eGender").value   = m.gender;
      document.getElementById("eDiet").value     = m.diet;
      document.getElementById("eGoal").value     = m.goal;
      document.getElementById("eHealth").value   = m.health === "none" ? "" : m.health;

      editModal.show();
    }
  });

  // ── Save edits ─────────────────────────────────────────────────────────
  saveEditMemberBtn.addEventListener("click", function () {
    const id     = parseInt(document.getElementById("eMemberId").value);
    const name   = document.getElementById("eName").value.trim();
    const age    = parseInt(document.getElementById("eAge").value);
    const gender = document.getElementById("eGender").value;
    const diet   = document.getElementById("eDiet").value;
    const goal   = document.getElementById("eGoal").value;
    const health = document.getElementById("eHealth").value.trim() || "none";

    if (!name || !age) { showToast("Name and age are required.", "warning"); return; }

    // Update in-memory record
    const idx = members.findIndex(m => m.id === id);
    if (idx !== -1) members[idx] = { id, name, age, gender, diet, goal, health };

    // Replace card in DOM
    const col = document.getElementById(`member-${id}`);
    if (col) {
      const avatars = { male:"👨", female:"👩" };
      const avatar  = avatars[gender] || "🧑";
      col.innerHTML = buildCardHTML(id, name, age, gender, diet, goal, health, avatar);
    }

    editModal.hide();
    showToast(`${name} updated!`, "success");
  });

  // ── Add card to DOM ────────────────────────────────────────────────────
  function addMemberCard(id, name, age, gender, diet, goal, health) {
    const avatars = { male:"👨", female:"👩" };
    const avatar  = avatars[gender] || "🧑";
    const grid    = document.getElementById("familyMembersGrid");
    const col     = document.createElement("div");
    col.className = "col-md-6";
    col.id        = `member-${id}`;
    col.innerHTML = buildCardHTML(id, name, age, gender, diet, goal, health, avatar);
    grid.appendChild(col);
  }

  function buildCardHTML(id, name, age, gender, diet, goal, health, avatar) {
    const genderLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
    const healthTag   = health && health !== "none"
      ? `<span class="member-tag">🩺 ${health}</span>` : "";
    return `
      <div class="family-card" data-id="${id}">
        <div class="family-card-header">
          <div class="family-avatar">${avatar}</div>
          <div class="flex-grow-1">
            <h6 class="mb-0">${name}</h6>
            <small class="text-muted">Age ${age} · ${genderLabel} · ${diet}</small>
          </div>
          <button class="btn btn-sm btn-outline-primary rounded-circle edit-member-btn me-1" data-id="${id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger rounded-circle remove-member-btn" data-id="${id}">
            <i class="bi bi-x"></i>
          </button>
        </div>
        <div class="family-card-body">
          <div class="d-flex gap-2 flex-wrap">
            <span class="member-tag">${goalEmoji(goal)} ${goal}</span>
            ${healthTag}
          </div>
        </div>
      </div>`;
  }

  function goalEmoji(goal) {
    const map = {
      "weight loss":"📉", "maintenance":"⚖️", "weight gain":"📈",
      "muscle gain":"💪", "growth":"🌱", "pregnancy nutrition":"🤰", "senior health":"👴"
    };
    return map[goal] || "🎯";
  }

  // ── Generate family plan ───────────────────────────────────────────────
  generatePlanBtn.addEventListener("click", async function () {
    if (!members.length) { showToast("Add at least one family member.", "warning"); return; }

    familyPlanOutput.classList.add("d-none");
    familyPlanLoading.classList.remove("d-none");

    try {
      const res  = await fetch("/api/family-plan", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ members }),
      });
      const data = await res.json();
      familyPlanLoading.classList.add("d-none");
      familyPlanContent.innerHTML = formatAiText(data.plan || "No plan returned.");
      familyPlanOutput.classList.remove("d-none");
      showToast("Family meal plan ready! 👨‍👩‍👧‍👦", "success");
    } catch {
      familyPlanLoading.classList.add("d-none");
      showToast("Failed to generate plan. Check server.", "error");
    }
  });

  // ── Copy family plan ───────────────────────────────────────────────────
  if (copyFamilyPlanBtn) {
    copyFamilyPlanBtn.addEventListener("click", () => {
      copyToClipboard(familyPlanContent.innerText, "Family plan copied!");
    });
  }

  // ── Healthy Swap ───────────────────────────────────────────────────────
  swapBtn.addEventListener("click", doSwap);
  swapInput.addEventListener("keydown", e => { if (e.key === "Enter") doSwap(); });

  async function doSwap() {
    const food = swapInput.value.trim();
    if (!food) { showToast("Enter a food item to swap.", "warning"); return; }

    swapLoading.classList.remove("d-none");
    swapResult.classList.add("d-none");

    try {
      const res  = await fetch("/api/healthy-swap", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ food_item: food }),
      });
      const data = await res.json();
      swapResult.innerHTML = formatAiText(data.swaps || "No suggestions returned.");
      swapResult.classList.remove("d-none");
    } catch {
      showToast("Swap failed. Check server.", "error");
    } finally {
      swapLoading.classList.add("d-none");
    }
  }
});
