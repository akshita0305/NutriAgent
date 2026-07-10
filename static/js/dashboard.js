/**
 * NutriAgent — dashboard.js
 * Profile form, BMI gauge, Macro chart, Water tracker, Calorie analyser
 */

document.addEventListener("DOMContentLoaded", async function () {

  // ── Load saved profile ──────────────────────────────────────────────────
  const saved = await loadProfile();   // null when no profile saved yet
  if (saved && saved.weight) populateForm(saved);

  // ── Profile form submit ─────────────────────────────────────────────────
  document.getElementById("profileForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const profile = getFormValues();
    await saveProfile(profile);
    showToast("Profile saved!", "success");
    await updateDashboard(profile);
  });

  // ── Calorie Analyser ────────────────────────────────────────────────────
  document.getElementById("analyseBtn").addEventListener("click", async function () {
    const meal = document.getElementById("calorieInput").value.trim();
    if (!meal) { showToast("Please enter a meal description.", "warning"); return; }

    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    const result = document.getElementById("calorieResult");
    result.classList.add("d-none");

    try {
      const res  = await fetch("/api/calorie-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal }),
      });
      const data = await res.json();
      result.innerHTML = formatAiText(data.analysis || "No analysis returned.");
      result.classList.remove("d-none");
    } catch {
      showToast("Analysis failed. Check server connection.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-search"></i> Analyse';
    }
  });

  // ── Water tracker ───────────────────────────────────────────────────────
  const cups = document.getElementById("waterCups");
  if (cups) {
    let waterCount = parseInt(localStorage.getItem("waterCount") || "0");
    buildWaterCups(waterCount);

    function buildWaterCups(filled) {
      cups.innerHTML = "";
      for (let i = 0; i < 8; i++) {
        const cup = document.createElement("div");
        cup.className = `water-cup${i < filled ? " filled" : ""}`;
        cup.innerHTML = i < filled ? "💧" : "🥛";
        cup.title     = `${i + 1} glass`;
        cup.addEventListener("click", () => {
          waterCount = (i < waterCount) ? i : i + 1;
          localStorage.setItem("waterCount", waterCount);
          buildWaterCups(waterCount);
          updateWaterUI(waterCount);
        });
        cups.appendChild(cup);
      }
      updateWaterUI(filled);
    }

    function updateWaterUI(count) {
      document.getElementById("waterCount").textContent    = count;
      document.getElementById("waterProgress").style.width = `${(count / 8) * 100}%`;
    }
  }

  // ── Auto-calculate if profile exists ────────────────────────────────────
  if (saved && saved.weight && saved.height) {
    await updateDashboard(saved);
  }

  // ── Helper: populate form fields ────────────────────────────────────────
  function populateForm(p) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set("profileName",     p.name);
    set("profileAge",      p.age);
    set("profileWeight",   p.weight);
    set("profileHeight",   p.height);
    set("profileGender",   p.gender);
    set("profileActivity", p.activity);
    set("profileGoal",     p.goal);
    set("profileDiet",     p.diet_type);
    set("profileHealth",   p.health_conditions);
  }

  function getFormValues() {
    return {
      name             : document.getElementById("profileName").value,
      age              : document.getElementById("profileAge").value,
      weight           : document.getElementById("profileWeight").value,
      height           : document.getElementById("profileHeight").value,
      gender           : document.getElementById("profileGender").value,
      activity         : document.getElementById("profileActivity").value,
      goal             : document.getElementById("profileGoal").value,
      diet_type        : document.getElementById("profileDiet").value,
      health_conditions: document.getElementById("profileHealth").value,
    };
  }

  // ── Update all dashboard widgets ────────────────────────────────────────
  async function updateDashboard(profile) {
    if (!profile.weight || !profile.height) return;

    try {
      const res = await fetch("/api/calculate", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          weight  : parseFloat(profile.weight),
          height  : parseFloat(profile.height),
          age     : parseInt(profile.age) || 30,
          gender  : profile.gender   || "female",
          activity: profile.activity || "moderate",
          goal    : profile.goal     || "maintenance",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      const data = await res.json();

      // Stat cards
      const targetCal = data.target_cal || data.tdee?.maintenance || "—";
      document.getElementById("statCalories").textContent = targetCal + " kcal";
      document.getElementById("statProtein").textContent  = (data.macros?.protein_g || "—") + " g";
      document.getElementById("statCarbs").textContent    = (data.macros?.carbs_g   || "—") + " g";
      document.getElementById("statFat").textContent      = (data.macros?.fat_g     || "—") + " g";

      // BMI gauge
      renderBmiGauge(data.bmi?.bmi, data.bmi?.category, data.bmi?.color);

      // Macro chart
      renderMacroChart(data.macros);

      // Nutrition score
      const score = computeScore(profile, data.bmi);
      document.getElementById("scoreValue").textContent   = score;
      document.getElementById("scoreMessage").textContent = scoreMessage(score);

    } catch (err) {
      showToast("Calculation error: " + err.message, "error");
    }
  }

  // ── BMI SVG Gauge ───────────────────────────────────────────────────────
  function renderBmiGauge(bmi, category, color) {
    const svg = document.getElementById("bmiGaugeSvg");
    if (!svg) return;
    const pct   = Math.min(Math.max((bmi - 10) / 30, 0), 1);
    const angle = -180 + pct * 180;
    const rad   = (angle * Math.PI) / 180;
    const cx=100, cy=100, r=70;
    const x2 = cx + r * Math.cos(rad);
    const y2 = cy + r * Math.sin(rad);

    svg.innerHTML = `
      <!-- Track arc -->
      <path d="M 30 100 A 70 70 0 0 1 170 100" fill="none" stroke="#e2e8f0" stroke-width="14" stroke-linecap="round"/>
      <!-- Value arc -->
      <path d="M 30 100 A 70 70 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"
            fill="none" stroke="${color || "#22c55e"}" stroke-width="14" stroke-linecap="round"/>
      <!-- Needle dot -->
      <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="8" fill="${color || "#22c55e"}"/>
      <!-- Labels -->
      <text x="22" y="115" font-size="10" fill="#94a3b8">10</text>
      <text x="93" y="38"  font-size="10" fill="#94a3b8">25</text>
      <text x="162" y="115" font-size="10" fill="#94a3b8">40</text>
    `;
    document.getElementById("bmiGaugeValue").textContent = bmi || "—";
    document.getElementById("bmiGaugeLabel").textContent = category || "—";
    document.getElementById("bmiGaugeValue").style.color = color || "";
  }

  // ── Macro Donut Chart ───────────────────────────────────────────────────
  let macroChart = null;
  function renderMacroChart(macros) {
    const ctx = document.getElementById("macroChart");
    if (!ctx || !macros) return;
    const data = {
      labels  : ["Protein", "Carbs", "Fat"],
      datasets: [{
        data           : [macros.protein_g, macros.carbs_g, macros.fat_g],
        backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b"],
        borderWidth    : 0,
        hoverOffset    : 6,
      }],
    };
    if (macroChart) macroChart.destroy();
    macroChart = new Chart(ctx, {
      type   : "doughnut",
      data,
      options: {
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels  : { font: { size: 11 }, padding: 12, color: getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#1e293b" },
          },
        },
      },
    });
  }

  // ── Nutrition score ─────────────────────────────────────────────────────
  function computeScore(profile, bmi) {
    let score = 50;
    if (bmi && bmi.category === "Normal weight") score += 20;
    if (profile.diet_type === "vegetarian" || profile.diet_type === "vegan") score += 10;
    if (profile.goal) score += 10;
    if (profile.health_conditions) score += 5;
    return Math.min(score, 100);
  }
  function scoreMessage(score) {
    if (score >= 80) return "Excellent! You have great nutrition awareness. 🌟";
    if (score >= 60) return "Good job! Keep refining your diet. 💪";
    if (score >= 40) return "There's room to improve — NutriBot can help! 🥗";
    return "Let's build a healthier routine together. 🚀";
  }
});
