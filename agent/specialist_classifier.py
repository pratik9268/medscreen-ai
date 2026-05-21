"""
Phase 3: Specialist Classifier Agent
Takes the structured summary from Phase 1/2 and routes to the right specialist
with confidence score, reasoning, and fallback logic.
"""

import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

# ── Specialty Knowledge Base ──────────────────────────────────────────────────

SPECIALTY_DB = {
    "Cardiologist": {
        "keywords": [
            "chest pain", "chest pressure", "heart palpitations", "shortness of breath",
            "irregular heartbeat", "arm pain", "jaw pain", "sweating", "heart attack",
            "hypertension", "high blood pressure", "edema", "swollen legs", "fainting",
        ],
        "red_flag_keywords": ["chest pain", "heart attack", "palpitations", "fainting"],
        "description": "Heart and cardiovascular system specialist",
    },
    "Neurologist": {
        "keywords": [
            "headache", "migraine", "seizure", "numbness", "tingling", "weakness",
            "dizziness", "vertigo", "memory loss", "confusion", "tremor", "stroke",
            "vision changes", "speech difficulty", "balance problems", "nerve pain",
        ],
        "red_flag_keywords": ["seizure", "stroke", "sudden severe headache", "confusion"],
        "description": "Brain, spine and nervous system specialist",
    },
    "Orthopedic Surgeon": {
        "keywords": [
            "back pain", "joint pain", "bone fracture", "muscle pain", "knee pain",
            "shoulder pain", "hip pain", "arthritis", "sprain", "sports injury",
            "neck pain", "spine", "disc", "sciatica", "limping",
        ],
        "red_flag_keywords": ["fracture", "severe back pain", "inability to walk"],
        "description": "Bones, joints and musculoskeletal system specialist",
    },
    "Gastroenterologist": {
        "keywords": [
            "abdominal pain", "stomach pain", "nausea", "vomiting", "diarrhea",
            "constipation", "bloating", "acid reflux", "heartburn", "blood in stool",
            "weight loss", "difficulty swallowing", "liver", "bowel", "digestive",
        ],
        "red_flag_keywords": ["blood in stool", "severe abdominal pain", "jaundice"],
        "description": "Digestive system and gastrointestinal specialist",
    },
    "Pulmonologist": {
        "keywords": [
            "cough", "breathing difficulty", "shortness of breath", "wheezing",
            "asthma", "bronchitis", "pneumonia", "chest tightness", "coughing blood",
            "sleep apnea", "snoring", "respiratory", "lung", "oxygen",
        ],
        "red_flag_keywords": ["coughing blood", "severe breathing difficulty", "blue lips"],
        "description": "Lungs and respiratory system specialist",
    },
    "Dermatologist": {
        "keywords": [
            "rash", "skin", "acne", "eczema", "psoriasis", "itching", "hives",
            "mole", "lesion", "hair loss", "nail", "wound", "infection", "allergy",
            "burning skin", "discoloration",
        ],
        "red_flag_keywords": ["rapidly spreading rash", "skin infection", "changing mole"],
        "description": "Skin, hair and nail specialist",
    },
    "Psychiatrist": {
        "keywords": [
            "anxiety", "depression", "mood changes", "insomnia", "sleep problems",
            "stress", "panic attack", "hallucinations", "paranoia", "suicidal",
            "mental health", "bipolar", "schizophrenia", "eating disorder", "addiction",
        ],
        "red_flag_keywords": ["suicidal thoughts", "hallucinations", "self harm"],
        "description": "Mental health and psychiatric specialist",
    },
    "ENT Specialist": {
        "keywords": [
            "ear pain", "hearing loss", "tinnitus", "sore throat", "hoarseness",
            "nasal congestion", "sinusitis", "nose bleed", "swallowing difficulty",
            "voice changes", "ear infection", "tonsils", "adenoids", "vertigo",
        ],
        "red_flag_keywords": ["sudden hearing loss", "throat obstruction", "severe nosebleed"],
        "description": "Ear, nose and throat specialist",
    },
    "Ophthalmologist": {
        "keywords": [
            "eye pain", "vision loss", "blurry vision", "double vision", "red eye",
            "eye infection", "floaters", "flashes", "glaucoma", "cataracts",
            "sensitivity to light", "dry eyes", "eye injury", "watery eyes",
        ],
        "red_flag_keywords": ["sudden vision loss", "eye injury", "severe eye pain"],
        "description": "Eye and vision specialist",
    },
    "Endocrinologist": {
        "keywords": [
            "diabetes", "thyroid", "weight gain", "weight loss", "fatigue",
            "excessive thirst", "frequent urination", "hormone", "adrenal",
            "polycystic", "pcos", "insulin", "blood sugar", "metabolism",
        ],
        "red_flag_keywords": ["diabetic emergency", "thyroid storm", "adrenal crisis"],
        "description": "Hormones and endocrine system specialist",
    },
    "Urologist": {
        "keywords": [
            "urinary pain", "frequent urination", "blood in urine", "kidney stones",
            "urinary infection", "uti", "prostate", "bladder", "incontinence",
            "kidney pain", "pelvic pain", "burning urination",
        ],
        "red_flag_keywords": ["blood in urine", "severe kidney pain", "inability to urinate"],
        "description": "Urinary tract and kidney specialist",
    },
    "Emergency Medicine": {
        "keywords": [
            "emergency", "accident", "trauma", "unconscious", "severe bleeding",
            "poisoning", "overdose", "allergic reaction", "anaphylaxis", "shock",
            "severe chest pain", "stroke symptoms", "difficulty breathing",
        ],
        "red_flag_keywords": ["unconscious", "severe bleeding", "anaphylaxis", "stroke"],
        "description": "Emergency and critical care specialist",
    },
    "General Practitioner": {
        "keywords": [
            "fever", "cold", "flu", "general checkup", "vaccination", "fatigue",
            "mild pain", "routine", "prescription", "follow up", "referral",
        ],
        "red_flag_keywords": [],
        "description": "General health and primary care — handles most routine cases",
    },
}

# ── LLM Setup ─────────────────────────────────────────────────────────────────

_llm = None

def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1)
    return _llm


# ── Rule-based Pre-scorer ──────────────────────────────────────────────────────

def rule_based_scores(summary: dict) -> dict[str, float]:
    """
    Fast keyword matching to get initial scores before LLM refinement.
    Returns specialist → score (0.0 to 1.0).
    """
    all_text = " ".join([
        summary.get("chief_complaint", ""),
        " ".join(summary.get("symptoms", [])),
        " ".join(summary.get("associated_symptoms", [])),
        " ".join(summary.get("red_flags", [])),
        summary.get("patient_history_hints", ""),
    ]).lower()

    scores = {}
    for specialty, data in SPECIALTY_DB.items():
        keyword_hits   = sum(1 for k in data["keywords"]        if k in all_text)
        red_flag_hits  = sum(1 for k in data["red_flag_keywords"] if k in all_text)
        total_keywords = max(len(data["keywords"]), 1)

        score = (keyword_hits / total_keywords) + (red_flag_hits * 0.3)
        if score > 0:
            scores[specialty] = round(min(score, 1.0), 3)

    # Emergency override — if urgency is emergency, boost Emergency Medicine
    if summary.get("urgency") == "emergency":
        scores["Emergency Medicine"] = max(scores.get("Emergency Medicine", 0), 0.85)

    return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))


# ── LLM Classifier ────────────────────────────────────────────────────────────

CLASSIFIER_SYSTEM = """You are a senior medical triage specialist.
Your job is to analyze a patient pre-screening summary and recommend the most appropriate specialist.

You will be given:
1. The patient's structured summary
2. Rule-based scores from a keyword matcher (use as a hint, not gospel)

Your task:
- Pick the BEST specialist for this patient's primary complaint
- Pick a SECONDARY specialist if symptoms span multiple systems
- Give a confidence score (0.0 to 1.0) for your primary recommendation
- Write clear reasoning a doctor can read in 10 seconds
- If urgency is "emergency", always recommend Emergency Medicine as primary

Return ONLY valid JSON, no extra text:
{
  "primary_specialist": "Specialist Name",
  "primary_confidence": 0.92,
  "secondary_specialist": "Specialist Name or null",
  "reasoning": "One or two sentence clinical reasoning for the doctor",
  "urgency_flag": "routine / urgent / emergency",
  "see_doctor_within": "immediately / 24 hours / 48 hours / 1 week / routine appointment",
  "rule_based_top3": ["top 3 from keyword matcher for transparency"]
}"""


def llm_classify(summary: dict, rule_scores: dict[str, float]) -> dict:
    top3 = list(rule_scores.keys())[:3]

    prompt = f"""Patient Summary:
{json.dumps(summary, indent=2)}

Rule-based keyword scores (top matches):
{json.dumps(dict(list(rule_scores.items())[:6]), indent=2)}

Now produce the specialist classification JSON."""

    response = get_llm().invoke([
        SystemMessage(content=CLASSIFIER_SYSTEM),
        HumanMessage(content=prompt),
    ])

    try:
        clean = response.content.strip().strip("```json").strip("```").strip()
        result = json.loads(clean)
        result["rule_based_top3"] = result.get("rule_based_top3", top3)
        return result
    except json.JSONDecodeError:
        # Fallback if LLM gives bad JSON
        primary = top3[0] if top3 else "General Practitioner"
        return {
            "primary_specialist": primary,
            "primary_confidence": 0.6,
            "secondary_specialist": top3[1] if len(top3) > 1 else None,
            "reasoning": "Classification based on keyword analysis. Please review manually.",
            "urgency_flag": summary.get("urgency", "routine"),
            "see_doctor_within": "routine appointment",
            "rule_based_top3": top3,
        }


# ── Main Classifier Function ──────────────────────────────────────────────────

def classify_specialist(summary: dict) -> dict:
    """
    Full classification pipeline:
    1. Rule-based keyword scoring
    2. LLM refinement and reasoning
    3. Returns complete classification result
    """
    # Step 1: Rule-based scores
    rule_scores = rule_based_scores(summary)

    # Step 2: LLM classification
    classification = llm_classify(summary, rule_scores)

    # Step 3: Enrich with specialty description
    primary = classification.get("primary_specialist", "General Practitioner")
    secondary = classification.get("secondary_specialist")

    classification["primary_description"] = SPECIALTY_DB.get(
        primary, {}
    ).get("description", "Medical specialist")

    if secondary and secondary in SPECIALTY_DB:
        classification["secondary_description"] = SPECIALTY_DB[secondary]["description"]
    else:
        classification["secondary_description"] = None

    # Step 4: Add full rule scores for transparency
    classification["all_rule_scores"] = rule_scores

    return classification
