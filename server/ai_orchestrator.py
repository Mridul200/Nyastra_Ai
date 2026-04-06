import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import json

load_dotenv()

# ─── Full Nyastra AI System Prompt ─────────────────────────────────────────────
NYASTRA_SYSTEM_PROMPT = """You are Nyastra AI, a highly experienced Senior Advocate practicing in the Supreme Court of India with deep expertise in Indian law (IPC, CrPC, CPC, Constitution, and landmark judgments).

Your role is to provide precise, structured, and practical legal assistance suitable for real-world legal use.

RESPONSE STRUCTURE (MANDATORY) — Always respond in this exact format:

### 1. Issue
- Clearly identify the legal issue in the user's query

### 2. Relevant Law
- Mention applicable sections (IPC, CrPC, CPC, Constitution)
- Brief explanation of each

### 3. Case Laws
- Provide 1–3 relevant landmark judgments (if applicable)
- Include court name and the key legal principle established
- NEVER hallucinate fake case laws. If uncertain, say "Based on general legal principles..."

### 4. Legal Analysis
- Apply law to the given situation
- Provide logical reasoning like a courtroom argument

### 5. Conclusion
- Give a clear, direct answer

### 6. Practical Advice
- Suggest next legal steps (filing case, documents, precautions, etc.)

ADVANCED LEGAL MODE — Also include when applicable:
### Risks & Weaknesses
- Identify legal risks or weak points in the case
### Opponent Arguments
- What the opposing lawyer may argue
### Strategic Insight
- Best legal strategy for the user

STRICT RULES:
- Do NOT give vague or generic answers
- Do NOT skip sections in the structure
- Do NOT hallucinate fake case laws
- Always maintain formal legal tone
- Focus exclusively on Indian legal system
- Think like a real courtroom lawyer, not a chatbot
- Respond with authority, clarity, and precision
"""

DRAFTER_SYSTEM_PROMPT = """You are an expert legal drafter for Indian Advocates. Create precise, formal, and court-ready legal documents in the Indian legal tradition.
Use proper legal language, include all standard clauses, and ensure the document is complete and enforceable under Indian law.
Start directly with the document content — no preamble or explanation."""


class LlmOrchestrator:
    def __init__(self):
        self._clients = {}
        self._init_clients()

    def _init_clients(self):
        """Initialize only the clients whose API keys are present."""
        if os.getenv("OPENAI_API_KEY"):
            try:
                from openai import OpenAI
                self._clients["openai"] = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                print("LLM: OpenAI client initialized.")
            except Exception as e:
                print(f"LLM: OpenAI init failed: {e}")

        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                self._clients["anthropic"] = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
                print("LLM: Anthropic client initialized.")
            except Exception as e:
                print(f"LLM: Anthropic init failed: {e}")

        if os.getenv("GROQ_API_KEY"):
            try:
                from groq import Groq
                self._clients["groq"] = Groq(api_key=os.getenv("GROQ_API_KEY"))
                print("LLM: Groq client initialized.")
            except Exception as e:
                print(f"LLM: Groq init failed: {e}")

        gemini_key = os.getenv("VITE_GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                self._clients["gemini"] = genai.GenerativeModel("gemini-1.5-flash")
                print("LLM: Gemini client initialized.")
            except Exception as e:
                print(f"LLM: Gemini init failed: {e}")

    def get_available_providers(self) -> List[str]:
        return list(self._clients.keys())

    def web_search(self, query: str, max_results: int = 5) -> str:
        """Perform a real-time web search for legal news/precedents."""
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                results = list(ddgs.text(f"Indian law legal {query} site:indiankanoon.org OR site:sci.gov.in OR site:barandbench.com", max_results=max_results))
                if not results:
                    results = list(ddgs.text(f"Indian legal {query}", max_results=max_results))
                if not results:
                    return "No recent web search results found."

                context = "Recent Web Search Results:\n"
                for i, r in enumerate(results, 1):
                    context += f"{i}. **{r['title']}**: {r['body']}\nSource: {r['href']}\n\n"
                return context
        except Exception as e:
            return f"Search failed: {str(e)}"

    async def chat_openai(self, prompt: str, system_prompt: str = NYASTRA_SYSTEM_PROMPT) -> str:
        client = self._clients.get("openai")
        if not client:
            raise ValueError("OpenAI not configured.")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content

    async def chat_claude(self, prompt: str, system_prompt: str = NYASTRA_SYSTEM_PROMPT) -> str:
        client = self._clients.get("anthropic")
        if not client:
            raise ValueError("Anthropic not configured.")
        response = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )
        return response.content[0].text

    async def chat_groq(self, prompt: str, system_prompt: str = NYASTRA_SYSTEM_PROMPT) -> str:
        client = self._clients.get("groq")
        if not client:
            raise ValueError("Groq not configured.")
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    async def chat_gemini(self, prompt: str, system_prompt: str = NYASTRA_SYSTEM_PROMPT) -> str:
        client = self._clients.get("gemini")
        if not client:
            raise ValueError("Gemini not configured.")
        response = client.generate_content(f"{system_prompt}\n\nUser: {prompt}")
        return response.text

    def _get_best_available_provider(self, preferred: str) -> Optional[str]:
        """Return the best available provider, with smart fallback."""
        priority = [preferred, "groq", "gemini", "openai", "anthropic"]
        for p in priority:
            if p in self._clients:
                return p
        return None

    async def ask_legal_question(self, question: str, provider: str = "groq") -> str:
        if not self._clients:
            return (
                "⚖️ **Nyastra AI — Disconnected**\n\n"
                "No AI providers are configured. To enable Nyastra AI:\n\n"
                "**Free options (recommended):**\n"
                "1. **Groq** (Free): Get key at https://console.groq.com → add to `.env` as `GROQ_API_KEY`\n"
                "2. **Google Gemini** (Free): Get key at https://aistudio.google.com → add as `VITE_GEMINI_API_KEY`\n\n"
                "After adding a key, restart the backend: `uvicorn main:app --reload`"
            )

        best = self._get_best_available_provider(provider)
        if not best:
            return f"Provider '{provider}' is not available. Available: {', '.join(self.get_available_providers())}"

        dispatch = {
            "openai": self.chat_openai,
            "claude": self.chat_claude,
            "groq": self.chat_groq,
            "gemini": self.chat_gemini,
        }

        fn = dispatch.get(best)
        if not fn:
            return f"Unknown provider: {best}"

        return await fn(question)

    async def draft_legal_document(self, doc_type: str, data: dict) -> str:
        """Draft a legal document using the best available provider."""
        prompt = (
            f"Draft a formal {doc_type} based on the following details:\n"
            f"{json.dumps(data, indent=2)}\n\n"
            "Requirements:\n"
            "- Use professional Indian legal formatting\n"
            "- Include all standard clauses applicable under Indian law\n"
            "- Use formal legal terminology\n"
            "- Ensure all parties, addresses, and specific terms are correctly referenced\n"
            "- Include jurisdiction, governing law, and dispute resolution clauses\n"
            "- Start directly with the document — no preamble"
        )

        best = self._get_best_available_provider("openai")
        if not best:
            raise ValueError("No AI provider configured for document drafting.")

        dispatch = {
            "openai": lambda p: self.chat_openai(p, DRAFTER_SYSTEM_PROMPT),
            "claude": lambda p: self.chat_claude(p, DRAFTER_SYSTEM_PROMPT),
            "groq": lambda p: self.chat_groq(p, DRAFTER_SYSTEM_PROMPT),
            "gemini": lambda p: self.chat_gemini(p, DRAFTER_SYSTEM_PROMPT),
        }

        return await dispatch[best](prompt)
