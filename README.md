# 🥗 NutriAgent — AI-Powered Nutrition Coach

> **IBM Watsonx.ai · Llama · Flask · Bootstrap 5**

A full-stack AI nutrition web application powered by **IBM Watsonx.ai** with the **Llama** language model. Features a beautiful responsive UI with dark mode, chat interface, nutrition dashboard, meal planner, BMI calculator, and family diet profiles — all specialised for **Indian cuisine** and holistic wellness.

---

## 📁 Project Structure

```
NutriAgent/
├── app.py                    # Flask backend + API routes
├── agent_instructions.py     # ⭐ AGENT CUSTOMISATION — edit this!
├── requirements.txt
├── .env.example              # Copy to .env and fill credentials
├── .gitignore
├── templates/
│   ├── base.html             # Navbar, footer, theme toggle
│   ├── index.html            # Home / hero page
│   ├── chat.html             # AI chat interface
│   ├── dashboard.html        # Nutrition dashboard
│   ├── meal_plan.html        # Meal planner
│   ├── bmi.html              # BMI & TDEE calculator
│   └── family.html           # Family profiles & plans
└── static/
    ├── css/
    │   └── style.css         # Custom CSS + dark mode + animations
    └── js/
        ├── main.js           # Theme, utilities, toast, profile
        ├── home.js           # Homepage quick chat
        ├── chat.js           # Full chat page
        ├── dashboard.js      # Dashboard widgets
        ├── bmi.js            # BMI results & charts
        ├── meal_plan.js      # Meal plan generator
        └── family.js         # Family profiles & swap tool
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.10+
- IBM Cloud account
- IBM Watsonx.ai project (with Llama model access)

### 2. Clone / Setup

```bash
# Clone or unzip the project
cd NutriAgent

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Credentials

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and fill in your IBM Cloud details:

```env
IBM_API_KEY=your_ibm_cloud_api_key_here
IBM_PROJECT_ID=your_watsonx_project_id_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=a-random-long-secret-string
FLASK_ENV=development
```

**How to get credentials:**
1. Log in to [cloud.ibm.com](https://cloud.ibm.com)
2. Go to **Manage → Access (IAM) → API keys** → Create an API key
3. Open [dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
4. Create a new **Watsonx.ai project** (or open an existing one)
5. Copy the **Project ID** from the project settings URL

### 5. Run the Application

```bash
python app.py
```

Visit: **http://localhost:5000**

---

## ✏️ Customising the AI Agent

All agent behaviour is controlled in a single file: **`agent_instructions.py`**

| Section | What to change |
|---------|----------------|
| `AGENT_PERSONA` | Agent name, tone, personality |
| `DIET_SPECIALIZATIONS` | Add/remove diet types the agent handles |
| `INDIAN_FOOD_PREFERENCES` | Regional cuisines, superfoods, seasonal produce |
| `SAFETY_RULES` | Medical disclaimers, calorie limits, safety guardrails |
| `RESPONSE_FORMAT_RULES` | Output format, section headers, word count |
| `FAMILY_PROFILE_RULES` | Multi-member meal planning behaviour |
| `PROMPT_TEMPLATES` | Pre-built prompt templates for each feature |
| `get_system_prompt()` | How user profile is injected into every AI call |

**Example: Change the agent's diet focus**

```python
# In agent_instructions.py → DIET_SPECIALIZATIONS
DIET_SPECIALIZATIONS = """
You specialise exclusively in South Indian vegetarian cuisine and Ayurvedic nutrition.
...
"""
```

---

## 🌐 Pages & Features

| Page | URL | Features |
|------|-----|----------|
| Home | `/` | Hero, features, quick chat, testimonials |
| Chat | `/chat` | Full AI chat with history, sidebar topics, export |
| Dashboard | `/dashboard` | Profile, BMI gauge, macro donut chart, water tracker, calorie analyser |
| Meal Plan | `/meal-plan` | AI-generated personalized meal plan with loading steps |
| BMI | `/bmi` | BMI + TDEE + macro breakdown + AI personalised advice |
| Family | `/family` | Member profiles, family plan generation, healthy food swap |

---

## 🔌 API Reference

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | `{message, profile}` | Chat with NutriBot |
| POST | `/api/bmi` | `{weight, height, age, gender, activity, goal}` | BMI + TDEE + AI advice |
| POST | `/api/meal-plan` | `{profile, calories}` | Generate meal plan |
| POST | `/api/calorie-analysis` | `{meal}` | Analyse a meal |
| POST | `/api/family-plan` | `{members:[]}` | Family meal plan |
| POST | `/api/healthy-swap` | `{food_item}` | Suggest healthy alternatives |
| POST | `/api/recipe` | `{dish_name}` | Get a healthy recipe |
| POST | `/api/save-profile` | `{...profile}` | Save user profile to session |
| GET  | `/api/get-profile` | — | Load saved profile |
| POST | `/api/clear-history` | — | Clear chat history |
| GET  | `/api/health` | — | Health check |

---

## ☁️ Deployment

### Option A — Gunicorn (Linux / macOS)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Option B — IBM Code Engine

```bash
# Build image (requires Docker)
docker build -t nutriagent .

# Or deploy directly
ibmcloud ce app create \
  --name nutriagent \
  --image nutriagent \
  --env-from-secret nutriagent-secrets \
  --port 5000
```

### Option C — IBM Cloud Foundry

```bash
ibmcloud login
ibmcloud target --cf
ibmcloud cf push nutriagent -m 512M
```

Set environment variables in the IBM Cloud console under **Runtime → Environment variables**.

### Option D — Docker

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```

```bash
docker build -t nutriagent .
docker run -p 5000:5000 --env-file .env nutriagent
```

---

## 🔒 Security Notes

- Never commit `.env` to version control (it's in `.gitignore`)
- Rotate your IBM API key periodically
- Use a strong random `FLASK_SECRET_KEY` in production
- Set `FLASK_ENV=production` for deployment
- Consider adding Flask-Login for multi-user authentication in production

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `IBM_API_KEY not set` | Copy `.env.example` to `.env` and fill credentials |
| `Project not found` | Verify `IBM_PROJECT_ID` from Watsonx.ai project URL |
| `Model not available` | Try `ibm/granite-7b-instruct` or `ibm/granite-3b-code-instruct` |
| Chat returns errors | Check `/api/health` endpoint for server status |
| Dark mode not persisting | Enable cookies/localStorage in browser settings |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | IBM Watsonx.ai — llama-3-3-70b-instruct |
| Backend | Python 3.11 · Flask 3.0 · Flask-CORS |
| Frontend | Bootstrap 5.3 · Bootstrap Icons · Chart.js 4 |
| Config | python-dotenv |
| Deploy | Gunicorn / IBM Code Engine / Docker |

---

## 📄 License

MIT License — free to use, modify, and deploy for personal or commercial projects.

---

*Built with ❤️ for Indian nutrition and wellness — powered by IBM Watsonx.ai Llama models.*
