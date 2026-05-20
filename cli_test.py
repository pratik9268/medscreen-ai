"""
CLI test runner — chat with the symptom collector in your terminal.
Usage: python cli_test.py
Requires: ANTHROPIC_API_KEY set in environment
"""

import os
import json
from agent.symptom_collector import SymptomCollectorSession


def print_divider():
    print("\n" + "─" * 60 + "\n")


def main():
    print_divider()
    print("  🏥  AI Patient Pre-Screening Agent — Phase 1 Test")
    print("  Type your symptoms. Type 'quit' to exit early.")
    print_divider()

    if not os.getenv("GROQ_API_KEY"):
        print("⚠️  GROQ_API_KEY not set. Export it before running.\n")
        return

    print("Starting session...\n")
    session = SymptomCollectorSession()

    # Show greeting
    greeting = session.get_greeting()
    print(f"🤖 Agent: {greeting}\n")

    while True:
        user_input = input("👤 You: ").strip()
        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit", "q"):
            print("\nSession ended early.")
            break

        reply, is_complete = session.chat(user_input)
        print(f"\n🤖 Agent: {reply}\n")

        if session.get_symptoms():
            print(f"   [Symptoms detected so far: {', '.join(session.get_symptoms())}]")

        if is_complete:
            print_divider()
            print("✅ Symptom collection complete! Generating structured summary...\n")
            summary = session.get_summary()
            print(json.dumps(summary, indent=2))
            print_divider()
            print("➡️  Ready to pass to Phase 2: Report Generator")
            break


if __name__ == "__main__":
    main()
