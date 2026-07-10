/**
 * NutriAgent — bmi.js
 * BMI form, results, macro chart, AI advice
 */

document.addEventListener("DOMContentLoaded", function () {
  const form        = document.getElementById("bmiForm");
  const results     = document.getElementById("bmiResults");
  const placeholder = document.getElementById("bmiPlaceholder");

  // ── BMI form submit ─────────────────────────────────────────────────
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const weight   = parseFloat(document.getElementById("bmiWeight").value);
    const height   = parseFloat(document.getElementById("bmiHeight").value);
    const age      = parseInt(document.getElementById("bmiAge").value);
    const gender   = document.querySelector('input[name="bmiGender"]:checked')?.value || "female";
    const activity = document.getElementById("bmiActivity").value;
    const goal     = document.getElementById("bmiGoal").value;

    if (!weight || !height) { showToast("Enter weight and height.", "warning"); return; }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Calculating…';

    try {
      const res  = await fetch("/api/bmi", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({ weight, height, age, gender, activity, goal }),
      });
      const data = await res.json();
      placeholder.classList.add("d-none");
      results.classList.remove("d-none");
      renderResults(data);
    } catch {
      showToast("Calculation failed. Check server connection.", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-calculator me-2"></i>Calculate';
    }
  });

  // ── Render results ──────────────────────────────────────────────────
  function renderResults(data) {
    const { bmi, tdee, macros, ai_advice } = data;

    // BMI
    document.getElementById("bmiValue").textContent    = bmi.bmi;
    document.getElementById("bmiValue").style.color    = bmi.color;
    document.getElementById("bmiBadge").textContent    = bmi.category;
    document.getElementById("bmiBadge").style.background = bmi.color + "22";
    document.getElementById("bmiBadge").style.color    = bmi.color;
    document.getElementById("bmiBadge").style.border   = `1px solid ${bmi.color}44`;

    // TDEE
    document.getElementById("bmrValue").textContent  = tdee.bmr.toLocaleString();
    document.getElementById("tdeeValue").textContent = tdee.tdee.toLocaleString();

    // Goal calories
    document.getElementById("lossTarget").textContent    = tdee.weight_loss.toLocaleString();
    document.getElementById("maintainTarget").textContent= tdee.maintenance.toLocaleString();
    document.getElementById("gainTarget").textContent    = tdee.weight_gain.toLocaleString();

    // Macro chart
    renderMacroChart(macros);

    // Macro bars
    const bars = document.getElementById("macroBars");
    if (bars) {
      bars.innerHTML = `
        ${macroBar("Protein", macros.protein_g, "g", "#22c55e", 35)}
        ${macroBar("Carbohydrates", macros.carbs_g, "g", "#3b82f6", 50)}
        ${macroBar("Fats", macros.fat_g, "g", "#f59e0b", 25)}
      `;
    }

    // AI advice
    const aiLoading = document.getElementById("aiAdviceLoading");
    const aiContent = document.getElementById("aiAdviceContent");
    if (aiLoading) aiLoading.classList.add("d-none");
    if (aiContent) {
      aiContent.classList.remove("d-none");
      aiContent.innerHTML = formatAiText(ai_advice || "No advice returned.");
    }
  }

  function macroBar(label, value, unit, color, pct) {
    return `
      <div class="macro-bar-item">
        <label><span>${label}</span><span style="color:${color}">${value}${unit}</span></label>
        <div class="progress" style="height:8px">
          <div class="progress-bar" style="width:${pct}%;background:${color}" role="progressbar"></div>
        </div>
      </div>`;
  }

  // ── Macro donut chart ───────────────────────────────────────────────
  let macroChart = null;
  function renderMacroChart(macros) {
    const ctx = document.getElementById("bmiMacroChart");
    if (!ctx || !macros) return;
    if (macroChart) macroChart.destroy();
    macroChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels  : ["Protein", "Carbs", "Fat"],
        datasets: [{
          data           : [macros.protein_g, macros.carbs_g, macros.fat_g],
          backgroundColor: ["#22c55e", "#3b82f6", "#f59e0b"],
          borderWidth    : 0,
        }],
      },
      options: {
        cutout : "65%",
        plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
      },
    });
  }
});
