"""
Phase 1: Conversational Symptom Collector Agent
Uses LangGraph for stateful conversation flow with in-session memory.
"""

import os
import json
from typing import Annotated, TypedDict, Literal
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


# ── State ────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]   # Full conversation history
    collected_symptoms: list[str]              # Symptoms identified so far
    follow_up_count: int                       # How many follow-ups asked
    is_complete: bool                          # Ready to hand off to Phase 2
    patient_summary: dict                      # Structured summary when done
    quick_replies: list[str]                   # Clickable options for frontend


# ── LLM Setup ────────────────────────────────────────────────────────────────

llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)

SYSTEM_PROMPT = """You are a compassionate AI medical pre-screening assistant.
Your job is to collect detailed symptom information from patients through natural conversation.

Guidelines:
- Be warm, empathetic, and professional at all times
- Ask ONE follow-up question at a time — never overwhelm the patient
- Probe deeper: duration, severity (1-10), location, triggers, associated symptoms
- Watch for red flags: chest pain, difficulty breathing, severe headache, numbness
- Once you have sufficient info (typically 4-6 exchanges), summarize what you've learned

After EVERY message, include a <quick_replies> block with 3-5 short clickable options relevant to your question.
These help patients answer faster — but they can always type their own answer too.

Examples of good quick replies per question type:
- Location: ["Head", "Chest", "Abdomen", "Back", "Limbs"]
- Severity: ["Mild (1-3)", "Moderate (4-6)", "Severe (7-9)", "Unbearable (10)"]
- Duration: ["Today only", "2-3 days", "About a week", "More than a week"]
- Other symptoms: ["Nausea", "Fever", "Fatigue", "Dizziness", "None"]
- Yes/No: ["Yes", "No", "Not sure"]

Always place quick_replies BEFORE symptom_data, at the very end of your visible message:
<quick_replies>["option1", "option2", "option3"]</quick_replies>

Then the hidden data block:
<symptom_data>
{
  "symptoms": ["list", "of", "symptoms"],
  "duration": "how long",
  "severity": 0-10,
  "red_flags": true/false,
  "ready_for_report": true/false
}
</symptom_data>

Start by warmly greeting the patient and asking what brings them in today."""


# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_response(content: str) -> tuple[str, list[str], dict]:
    """Extract clean message, quick replies, and symptom data from LLM response."""
    quick_replies = []
    symptom_data = {}

    if "<quick_replies>" in content:
        try:
            qr_str = content.split("<quick_replies>")[1].split("</quick_replies>")[0]
            quick_replies = json.loads(qr_str.strip())
            content = content.split("<quick_replies>")[0].strip()
        except (json.JSONDecodeError, IndexError):
            pass

    if "<symptom_data>" in content:
        try:
            sd_str = content.split("<symptom_data>")[1].split("</symptom_data>")[0]
            symptom_data = json.loads(sd_str.strip())
            content = content.split("<symptom_data>")[0].strip()
        except (json.JSONDecodeError, IndexError):
            pass

    return content.strip(), quick_replies, symptom_data


# ── Nodes ────────────────────────────────────────────────────────────────────

def chat_node(state: AgentState) -> AgentState:
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.invoke(messages)
    clean_content, quick_replies, symptom_data = parse_response(response.content)
    clean_response = AIMessage(content=clean_content)
    new_symptoms = symptom_data.get("symptoms", [])
    is_complete = symptom_data.get("ready_for_report", False)
    if state["follow_up_count"] >= 8:
        is_complete = True
    return {
        **state,
        "messages": [clean_response],
        "collected_symptoms": list(set(state["collected_symptoms"] + new_symptoms)),
        "follow_up_count": state["follow_up_count"] + 1,
        "is_complete": is_complete,
        "quick_replies": quick_replies,
    }


def summary_node(state: AgentState) -> AgentState:
    summary_prompt = f"""Based on this conversation, produce a structured patient pre-screening summary as JSON.

Conversation history:
{chr(10).join([f"{m.type.upper()}: {m.content}" for m in state["messages"]])}

Return ONLY valid JSON with no extra text:
{{
  "chief_complaint": "main reason for visit",
  "symptoms": ["symptom1", "symptom2"],
  "duration": "how long symptoms present",
  "severity": 1,
  "associated_symptoms": ["any", "related", "symptoms"],
  "red_flags": ["any urgent symptoms or none"],
  "patient_history_hints": "anything mentioned about history/medications",
  "recommended_specialist": "GP/Cardiologist/Neurologist/etc",
  "urgency": "routine/urgent/emergency"
}}"""
    response = llm.invoke([HumanMessage(content=summary_prompt)])
    try:
        clean = response.content.strip().strip("```json").strip("```").strip()
        summary = json.loads(clean)
    except json.JSONDecodeError:
        summary = {"raw": response.content, "error": "Could not parse structured summary"}
    return {**state, "patient_summary": summary, "quick_replies": []}


# ── Router ────────────────────────────────────────────────────────────────────

def should_continue(state: AgentState) -> Literal["chat", "summary"]:
    if state["is_complete"]:
        return "summary"
    return "chat"


# ── Graph ────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)
    graph.add_node("chat", chat_node)
    graph.add_node("summary", summary_node)
    graph.set_entry_point("chat")
    graph.add_conditional_edges("chat", should_continue, {"chat": END, "summary": "summary"})
    graph.add_edge("summary", END)
    return graph.compile()


# ── Session Runner ────────────────────────────────────────────────────────────

class SymptomCollectorSession:
    def __init__(self):
        self.graph = build_graph()
        self.state: AgentState = {
            "messages": [],
            "collected_symptoms": [],
            "follow_up_count": 0,
            "is_complete": False,
            "patient_summary": {},
            "quick_replies": [],
        }
        self._run_agent()

    def _run_agent(self, user_input: str | None = None):
        if user_input:
            self.state["messages"].append(HumanMessage(content=user_input))
        self.state = self.graph.invoke(self.state)

    def chat(self, user_input: str) -> tuple[str, bool, list[str]]:
        """Returns (reply, is_complete, quick_replies)."""
        self._run_agent(user_input)
        last_ai = next(
            (m for m in reversed(self.state["messages"]) if isinstance(m, AIMessage)), None
        )
        reply = last_ai.content if last_ai else "I'm sorry, something went wrong."
        return reply, self.state["is_complete"], self.state["quick_replies"]

    def get_greeting(self) -> tuple[str, list[str]]:
        """Returns (greeting, quick_replies)."""
        last_ai = next(
            (m for m in reversed(self.state["messages"]) if isinstance(m, AIMessage)), None
        )
        return (
            last_ai.content if last_ai else "Hello! How can I help you today?",
            self.state["quick_replies"],
        )

    def get_summary(self) -> dict:
        return self.state.get("patient_summary", {})

    def get_symptoms(self) -> list[str]:
        return self.state["collected_symptoms"]
