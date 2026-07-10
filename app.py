"""
NutriAgent — IBM Watsonx.ai Powered Nutrition Coach
Flask Backend
"""

import os
import json
import math
import logging
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv
from ibm_watsonx_ai import APIClient, Credentials
from ibm_watsonx_ai.foundation_models import ModelInference
from agent_instructions import get_system_prompt, PROMPT_TEMPLATES, AGENT_NAME

# ── Load environment variables ────────────────────────────────────────────────
load_dotenv()

# ── Flask app setup ───────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "nutri-secret-dev-key")
CORS(app)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Watsonx.ai setup ─────────────────────────────────────────────────────────
IBM_API_KEY    = os.getenv("IBM_API_KEY")
IBM_PROJECT_ID = os.getenv("IBM_PROJECT_ID")
IBM_URL        = os.getenv("IBM_WATSONX_URL", "https://au-syd.ml.cloud.ibm.com")
MODEL_ID       = os.getenv("WATSONX_MODEL_ID", "meta-llama/llama-3-3-70b-instruct")

_watsonx_model: ModelInference | None = None


def get_watsonx_model() -> ModelInference:
    """Lazy-initialise and cache the Watsonx ModelInference client."""
    global _watsonx_model
    if _watsonx_model is None:
        if not IBM_API_KEY or not IBM_PROJECT_ID:
            raise ValueError(
                "IBM_API_KEY and IBM_PROJECT_ID must be set in your .env file."
            )
        credentials = Credentials(url=IBM_URL, api_key=IBM_API_KEY)
        client      = APIClient(credentials=credentials, project_id=IBM_PROJECT_ID)
        _watsonx_model = ModelInference(
            model_id   = MODEL_ID,
            api_client = client,
        )
        logger.info("Watsonx ModelInference client initialised — model: %s", MODEL_ID)
    return _watsonx_model


def query_watsonx(user_message: str, profile: dict = None, max_tokens: int = 2048) -> str:
    """
    Send a message to the model via the chat API and return the reply text.
    Uses OpenAI-compatible messages format (system + history + user).
    Pass a higher max_tokens for endpoints that produce long structured output
    (e.g. full meal plans).
    """
    try:
        model      = get_watsonx_model()
        sys_prompt = get_system_prompt(profile)
        history    = session.get("chat_history", [])

        # Build message list: system → alternating history → new user turn
        messages = [{"role": "system", "content": sys_prompt}]
        for turn in history[-6:]:       # keep last 3 exchanges for context
            messages.append({"role": "user",      "content": turn["user"]})
            messages.append({"role": "assistant", "content": turn["bot"]})
        messages.append({"role": "user", "content": user_message})

        result    = model.chat(
            messages = messages,
            params   = {
                "max_tokens" : max_tokens,
                "temperature": 0.7,
                "top_p"      : 0.9,
            },
        )
        bot_reply = result["choices"][0]["message"]["content"].strip()

        # Persist to session history
        history.append({"user": user_message, "bot": bot_reply})
        session["chat_history"] = history[-20:]   # keep last 20 turns
        return bot_reply

    except Exception as exc:
        logger.error("Watsonx query failed: %s", exc)
        return (
            "I'm having trouble connecting to my AI brain right now. "
            "Please check your IBM Watsonx credentials and try again. "
            f"Error: {exc}"
        )


# ── Nutrition utilities ───────────────────────────────────────────────────────
def calculate_bmi(weight_kg: float, height_cm: float) -> dict:
    height_m = height_cm / 100
    bmi      = round(weight_kg / (height_m ** 2), 1)
    if bmi < 18.5:
        category, color = "Underweight", "#3b82f6"
    elif bmi < 25:
        category, color = "Normal weight", "#22c55e"
    elif bmi < 30:
        category, color = "Overweight", "#f59e0b"
    else:
        category, color = "Obese", "#ef4444"
    return {"bmi": bmi, "category": category, "color": color}


def calculate_tdee(weight_kg: float, height_cm: float, age: int,
                   gender: str, activity: str) -> dict:
    """Harris-Benedict BMR + activity multiplier."""
    if gender.lower() == "male":
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)

    multipliers = {
        "sedentary"  : 1.2,
        "light"      : 1.375,
        "moderate"   : 1.55,
        "active"     : 1.725,
        "very_active": 1.9,
    }
    multiplier = multipliers.get(activity.lower(), 1.55)
    tdee       = round(bmr * multiplier)
    return {
        "bmr"         : round(bmr),
        "tdee"        : tdee,
        "weight_loss" : tdee - 500,
        "weight_gain" : tdee + 500,
        "maintenance" : tdee,
    }


def calculate_macros(calories: int, goal: str) -> dict:
    """Return macro split in grams based on goal."""
    splits = {
        "weight_loss"  : (0.35, 0.40, 0.25),   # protein, carbs, fat
        "weight_gain"  : (0.30, 0.50, 0.20),
        "muscle_build" : (0.35, 0.45, 0.20),
        "maintenance"  : (0.25, 0.50, 0.25),
    }
    p_ratio, c_ratio, f_ratio = splits.get(goal, splits["maintenance"])
    return {
        "protein_g": round((calories * p_ratio) / 4),
        "carbs_g"  : round((calories * c_ratio) / 4),
        "fat_g"    : round((calories * f_ratio) / 9),
    }


# ── Routes ────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html", agent_name=AGENT_NAME)


@app.route("/chat")
def chat_page():
    return render_template("chat.html", agent_name=AGENT_NAME)


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", agent_name=AGENT_NAME)


@app.route("/meal-plan")
def meal_plan():
    return render_template("meal_plan.html", agent_name=AGENT_NAME)


@app.route("/bmi")
def bmi_page():
    return render_template("bmi.html", agent_name=AGENT_NAME)


@app.route("/family")
def family_page():
    return render_template("family.html", agent_name=AGENT_NAME)


# ── API endpoints ─────────────────────────────────────────────────────────────
@app.route("/api/chat", methods=["POST"])
def api_chat():
    data    = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    profile = data.get("profile") or session.get("profile")

    if not message:
        return jsonify({"error": "Message cannot be empty."}), 400

    response = query_watsonx(message, profile)
    return jsonify({"reply": response, "agent": AGENT_NAME})


@app.route("/api/clear-history", methods=["POST"])
def clear_history():
    session.pop("chat_history", None)
    return jsonify({"status": "cleared"})


@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    """Pure-math endpoint — BMI, TDEE, macros. No AI call, returns instantly."""
    data = request.get_json(silent=True) or {}
    try:
        weight   = float(data["weight"])
        height   = float(data["height"])
        age      = int(data.get("age", 25))
        gender   = data.get("gender", "female")
        activity = data.get("activity", "moderate")
        goal     = data.get("goal", "maintenance")
    except (KeyError, ValueError, TypeError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    bmi_data   = calculate_bmi(weight, height)
    tdee_data  = calculate_tdee(weight, height, age, gender, activity)
    target_cal = tdee_data.get(goal.replace("-", "_"), tdee_data["maintenance"])
    macros     = calculate_macros(target_cal, goal.replace("-", "_"))

    return jsonify({
        "bmi"       : bmi_data,
        "tdee"      : tdee_data,
        "macros"    : macros,
        "target_cal": target_cal,
    })


@app.route("/api/bmi", methods=["POST"])
def api_bmi():
    """Full BMI endpoint with AI advice — used by the dedicated BMI page."""
    data = request.get_json(silent=True) or {}
    try:
        weight   = float(data["weight"])
        height   = float(data["height"])
        age      = int(data.get("age", 25))
        gender   = data.get("gender", "female")
        activity = data.get("activity", "moderate")
        goal     = data.get("goal", "maintenance")
    except (KeyError, ValueError, TypeError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    bmi_data   = calculate_bmi(weight, height)
    tdee_data  = calculate_tdee(weight, height, age, gender, activity)
    target_cal = tdee_data.get(goal.replace("-", "_"), tdee_data["maintenance"])
    macros     = calculate_macros(target_cal, goal.replace("-", "_"))

    prompt = PROMPT_TEMPLATES["bmi_advice"].format(
        bmi=bmi_data["bmi"], category=bmi_data["category"],
        age=age, gender=gender
    )
    ai_advice = query_watsonx(prompt, {"age": age, "gender": gender, "goal": goal})

    return jsonify({
        "bmi"       : bmi_data,
        "tdee"      : tdee_data,
        "macros"    : macros,
        "target_cal": target_cal,
        "ai_advice" : ai_advice,
    })


@app.route("/api/meal-plan", methods=["POST"])
def api_meal_plan():
    data = request.get_json(silent=True) or {}
    profile  = data.get("profile", {})
    calories = data.get("calories", 2000)
    prompt   = PROMPT_TEMPLATES["daily_meal_plan"].format(
        calories=calories,
        age     =profile.get("age", 30),
        gender  =profile.get("gender", "female"),
        goal    =profile.get("goal", "maintenance"),
        diet_type=profile.get("diet_type", "vegetarian"),
    )
    plan = query_watsonx(prompt, profile, max_tokens=4096)
    return jsonify({"plan": plan})


@app.route("/api/calorie-analysis", methods=["POST"])
def api_calorie_analysis():
    data = request.get_json(silent=True) or {}
    meal = (data.get("meal") or "").strip()
    if not meal:
        return jsonify({"error": "Meal description is required."}), 400
    prompt   = PROMPT_TEMPLATES["calorie_analysis"].format(meal=meal)
    analysis = query_watsonx(prompt, max_tokens=2048)
    return jsonify({"analysis": analysis})


@app.route("/api/family-plan", methods=["POST"])
def api_family_plan():
    data    = request.get_json(silent=True) or {}
    members = data.get("members", [])
    if not members:
        return jsonify({"error": "At least one family member is required."}), 400
    members_str = "; ".join(
        f"{m.get('name', 'Member')} ({m.get('age', '?')} yrs, {m.get('gender', '?')}, {m.get('diet', 'veg')})"
        for m in members
    )
    prompt = PROMPT_TEMPLATES["family_plan"].format(members=members_str)
    plan   = query_watsonx(prompt, max_tokens=4096)
    return jsonify({"plan": plan})


@app.route("/api/healthy-swap", methods=["POST"])
def api_healthy_swap():
    data      = request.get_json(silent=True) or {}
    food_item = (data.get("food_item") or "").strip()
    if not food_item:
        return jsonify({"error": "Food item is required."}), 400
    prompt = PROMPT_TEMPLATES["healthy_swap"].format(food_item=food_item)
    result = query_watsonx(prompt)
    return jsonify({"swaps": result})


@app.route("/api/recipe", methods=["POST"])
def api_recipe():
    data      = request.get_json(silent=True) or {}
    dish_name = (data.get("dish_name") or "").strip()
    if not dish_name:
        return jsonify({"error": "Dish name is required."}), 400
    prompt = PROMPT_TEMPLATES["recipe"].format(dish_name=dish_name)
    result = query_watsonx(prompt)
    return jsonify({"recipe": result})


@app.route("/api/save-profile", methods=["POST"])
def save_profile():
    data = request.get_json(silent=True) or {}
    session["profile"] = data
    return jsonify({"status": "saved", "profile": data})


@app.route("/api/get-profile")
def get_profile():
    profile = session.get("profile")
    if not profile:
        return jsonify(None)
    return jsonify(profile)


@app.route("/api/health")
def health_check():
    return jsonify({"status": "ok", "agent": AGENT_NAME, "model": MODEL_ID})


# ── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port  = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    logger.info("Starting %s on port %d (debug=%s)", AGENT_NAME, port, debug)
    app.run(host="0.0.0.0", port=port, debug=debug)
