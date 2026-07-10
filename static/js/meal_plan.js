/**
 * NutriAgent — meal_plan.js
 * Meal plan generator with loading animation steps
 */

document.addEventListener("DOMContentLoaded", function () {
  const form        = document.getElementById("mealPlanForm");
  const placeholder = document.getElementById("mealPlanPlaceholder");
  const output      = document.getElementById("mealPlanOutput");
  const loading     = document.getElementById("planLoading");
  const planContent = document.getElementById("planContent");
  const calInput    = document.getElementById("mpCalories");
  const calRange    = document.getElementById("mpCaloriesRange");
  const copyBtn     = document.getElementById("copyPlanBtn");
  const chatBtn     = document.getElementById("chatAboutPlanBtn");

  // ── Sync range slider ─────────────────────────────────────────────
  if (calRange && calInput) {
    calRange.addEventListener("input", () => { calInput.value = calRange.value; });
    calInput.addEventListener("input", () => { calRange.value = calInput.value; });
  }

  // ── Form submit ───────────────────────────────────────────────────
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const profile = {
      age      : document.getElementById("mpAge").value,
      gender   : document.getElementById("mpGender").value,
      goal     : document.getElementById("mpGoal").value,
      diet_type: document.getElementById("mpDiet").value,
      special  : document.getElementById("mpSpecial").value,
    };
    const calories = parseInt(calInput.value) || 1800;

    placeholder.classList.add("d-none");
    output.classList.add("d-none");
    loading.classList.remove("d-none");

    animateLoadingSteps();

    try {
      const res  = await fetch("/api/meal-plan", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ profile, calories }),
      });
      const data = await res.json();

      loading.classList.add("d-none");
      output.classList.remove("d-none");

      planContent.innerHTML = formatAiText(data.plan || "No plan returned.");

      showToast("Meal plan generated! 🍽️", "success");
    } catch {
      loading.classList.add("d-none");
      placeholder.classList.remove("d-none");
      showToast("Failed to generate plan. Check server.", "error");
    }
  });

  // ── Loading step animation ────────────────────────────────────────
  function animateLoadingSteps() {
    const steps = ["step1", "step2", "step3", "step4"];
    steps.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("active");
    });
    steps.forEach((id, i) => {
      setTimeout(() => {
        steps.forEach(sid => {
          const el = document.getElementById(sid);
          if (el) el.classList.remove("active");
        });
        const el = document.getElementById(id);
        if (el) el.classList.add("active");
      }, i * 1800);
    });
  }

  // ── Copy plan ─────────────────────────────────────────────────────
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text = planContent.innerText || "";
      copyToClipboard(text, "Meal plan copied to clipboard!");
    });
  }

  // ── Discuss with NutriBot ─────────────────────────────────────────
  if (chatBtn) {
    chatBtn.addEventListener("click", () => {
      const plan = planContent.innerText.slice(0, 300);
      sessionStorage.setItem("prefillChat", `I have this meal plan: "${plan}…" — can you give me more tips?`);
      window.location.href = "/chat";
    });
  }
});
