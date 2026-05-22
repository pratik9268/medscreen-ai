# MedScreen AI - Patient Pre-Screening Agent

An AI-powered patient pre-screening system that automates initial health assessments and specialist referrals. The system uses LLM-based agents to collect symptoms, generate reports, and classify patients to appropriate specialists.

## 🌟 Features

### For Patients
- **AI-Powered Symptom Collection**: Chat-based interface to describe symptoms
- **Pre-Screening Assessment**: Automated health evaluation using LLM
- **Appointment Management**: View and manage scheduled appointments
- **Personal Health Profile**: Maintain medical history and information
- **Secure Communication**: End-to-end encrypted chat with system

### For Doctors
- **Patient Queue Management**: View incoming patient referrals
- **Detailed Reports**: AI-generated comprehensive screening reports
- **Appointment Scheduling**: Schedule and manage patient slots
- **Specialist Recommendations**: AI-suggested specialist classifications
- **Dashboard Analytics**: Track patient flow and metrics

### For Administrators
- **System Management**: Manage users, doctors, and appointments
- **Report Archives**: Access historical patient screening reports
- **System Configuration**: Control application settings and parameters
- **Analytics Dashboard**: Monitor system performance and usage

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI 0.115.0
- **LLM Integration**: LangGraph + LangChain with Groq API
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **ORM**: SQLAlchemy 2.0.0
- **Report Generation**: ReportLab 4.0.0
- **Server**: Uvicorn

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.0
- **Styling**: Tailwind CSS 3.4.19 + PostCSS
- **HTTP Client**: Axios 1.16.1
- **Router**: React Router DOM 7.15.1
- **UI Components**: Lucide React Icons, Framer Motion Animations
- **Notifications**: React Hot Toast
- **Date Utilities**: date-fns 4.2.1

### Authentication & Database
- **Auth Provider**: Supabase
- **Database**: PostgreSQL
- **API Keys**: Environment-based configuration

## 📁 Project Structure

```
.
├── backend/
│   ├── agent/                      # AI Agent modules
│   │   ├── symptom_collector.py   # LLM-based symptom collection
│   │   ├── report_generator.py    # PDF report generation
│   │   └── specialist_classifier.py # Specialist recommendation
│   ├── auth_supabase.py           # Supabase authentication
│   ├── database.py                 # Database connection & models
│   ├── models.py                   # Pydantic & SQLAlchemy models
│   ├── routers.py                  # API route handlers
│   ├── server.py                   # FastAPI application entry point
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Environment template
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable React components
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ThemeToggle.jsx
│   │   ├── context/                # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── pages/                  # Page components
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── DoctorAppointments.jsx
│   │   │   ├── DoctorSlots.jsx
│   │   │   ├── PatientDashboard.jsx
│   │   │   ├── PatientChat.jsx
│   │   │   ├── PatientAppointments.jsx
│   │   │   ├── PatientProfile.jsx
│   │   │   └── Unauthorized.jsx
│   │   ├── utils/
│   │   │   └── api.js              # API client utilities
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   └── index.html
│
├── reports/                         # Generated PDF reports
└── README.md
```

## 📋 Prerequisites

- **Python**: 3.9 or higher
- **Node.js**: 16 or higher
- **npm**: 7 or higher
- **Git**: For version control
- **Supabase Account**: For authentication and PostgreSQL database
- **Groq API Key**: For LLM-powered features

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AI_Patient_Pre_Screening_Agent
```

### 2. Backend Setup

#### Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Install Dependencies
```bash
pip install -r requirements.txt
```

#### Configure Environment
```bash
# Copy the example environment file
cp env.example .env

# Edit .env with your configuration
# See Environment Variables section below
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Environment is configured through backend API calls
```

## ⚙️ Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# ── LLM API ──────────────────────────────────────────────
GROQ_API_KEY=your_groq_api_key_here

# ── Supabase Auth ─────────────────────────────────────────
# Get these from Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# ── Database ──────────────────────────────────────────────
# From Supabase Dashboard → Settings → Database → Connection String
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# ── Application ───────────────────────────────────────────
APP_ENV=development
```

### Getting Groq API Key
1. Visit [console.groq.com](https://console.groq.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create and copy your API key

### Getting Supabase Credentials
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. In Project Settings → API, find:
   - `Project URL`
   - `anon/public key` (use in frontend)
   - `service_role key` (keep secret)
4. In Settings → Database, find the PostgreSQL connection string

## 🏃 Running the Application

### Start Backend Server
```bash
# Make sure virtual environment is activated
# From project root directory

uvicorn server:app --reload
```
The API will be available at `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Start Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`

### Production Build (Frontend)
```bash
cd frontend
npm run build
npm run preview
```

## 📚 API Documentation

The backend provides comprehensive API documentation through Swagger UI:

**Endpoint**: `http://localhost:8000/docs`

### Main API Routes
- **Auth**: `/auth/*` - User authentication and registration
- **Patients**: `/patients/*` - Patient profile and data management
- **Doctors**: `/doctors/*` - Doctor appointments and profiles
- **Admin**: `/admin/*` - Administrative operations
- **Appointments**: `/appointments/*` - Appointment scheduling
- **Screening**: `/screening/*` - Pre-screening and report generation

## 🔐 Authentication Flow

1. User signs up/logs in via Supabase Auth
2. Supabase issues JWT token
3. Frontend stores token securely
4. Token sent in Authorization header for API requests
5. Backend validates token with Supabase
6. Role-based access control (RBAC) applied

## 🤖 AI Agent Architecture

### Symptom Collector Agent
- Collects patient symptoms through conversational interface
- Uses LangGraph + Groq LLM
- Maintains context across multi-turn conversations

### Specialist Classifier
- Analyzes collected symptoms
- Recommends appropriate medical specialty
- Uses medical knowledge base

### Report Generator
- Generates comprehensive PDF reports
- Uses ReportLab for document creation
- Includes patient data, symptoms, and recommendations

## 🐛 Troubleshooting

### Backend Issues
- **Module not found**: Ensure virtual environment is activated
- **Database connection failed**: Check DATABASE_URL and network connectivity
- **Groq API error**: Verify GROQ_API_KEY is valid and has quota

### Frontend Issues
- **npm install fails**: Clear cache with `npm cache clean --force`
- **Port 5173 already in use**: Change port in vite.config.js or kill process on port
- **API calls failing**: Ensure backend is running and CORS is configured

### Authentication Issues
- **Token expired**: User needs to log in again
- **Supabase connection failed**: Check SUPABASE_URL and keys
- **CORS errors**: Verify backend CORS middleware configuration

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

[Add your license information here]

## 📧 Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Version**: 0.4.0  
**Last Updated**: May 2026
