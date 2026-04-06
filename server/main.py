from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Nyastra AI Legal Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Safe startup: import and init everything with graceful error handling ───────
try:
    from ai_orchestrator import LlmOrchestrator
    orchestrator = LlmOrchestrator()
except Exception as e:
    print(f"WARN: AI Orchestrator failed to init: {e}")
    orchestrator = None

try:
    from rag_engine import RagEngine
    rag_engine = RagEngine()
except Exception as e:
    print(f"WARN: RAG Engine failed to init: {e}")
    rag_engine = None

try:
    from document_gen import DocumentGenerator
    doc_gen = DocumentGenerator()
except Exception as e:
    print(f"WARN: Document Generator failed to init: {e}")
    doc_gen = None

try:
    from legal_data import IndianKanoonFetcher
    kanoon = IndianKanoonFetcher(api_token=os.getenv("INDIAN_KANOON_API_KEY"))
except Exception as e:
    print(f"WARN: Indian Kanoon fetcher failed to init: {e}")
    kanoon = None


# ── Request / Response Models ──────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    provider: Optional[str] = "groq"
    use_rag: Optional[bool] = True
    use_search: Optional[bool] = False

class ChatResponse(BaseModel):
    response: str
    provider: str
    context_used: bool
    search_used: bool

class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 5

class DocRequest(BaseModel):
    doc_type: str
    content: str
    title: str = "Legal Document"
    format: str = "docx"


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Nyastra AI Backend is running.",
    }

@app.get("/health")
async def health():
    """Returns the live status of each AI provider."""
    providers = orchestrator.get_available_providers() if orchestrator else []
    return {
        "status": "online",
        "providers": {
            "groq": "groq" in providers,
            "gemini": "gemini" in providers,
            "openai": "openai" in providers,
            "claude": "anthropic" in providers,
        },
        "rag": rag_engine is not None,
        "doc_gen": doc_gen is not None,
        "indian_kanoon": bool(os.getenv("INDIAN_KANOON_API_KEY")),
    }

@app.post("/web-search")
async def web_search(request: SearchRequest):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="AI Orchestrator not initialized.")
    try:
        results = orchestrator.web_search(request.query, request.max_results)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not orchestrator:
        raise HTTPException(status_code=503, detail="AI Orchestrator not initialized. Please set an API key in .env and restart.")
    try:
        context = ""
        context_used = False
        search_used = False

        if request.use_rag and rag_engine:
            context = rag_engine.get_context_text(request.message)
            if context:
                context_used = True

        if request.use_search:
            search_context = orchestrator.web_search(request.message)
            context = (context + "\n\n" + search_context) if context else search_context
            search_used = True

        full_prompt = (
            f"Legal Context (from database & web):\n{context}\n\nAdvocate's Question: {request.message}"
            if context else request.message
        )

        response = await orchestrator.ask_legal_question(
            question=full_prompt,
            provider=request.provider
        )

        # Determine which provider was actually used
        used_provider = request.provider
        available = orchestrator.get_available_providers()
        if request.provider not in available and available:
            used_provider = available[0]

        return ChatResponse(
            response=response,
            provider=used_provider,
            context_used=context_used,
            search_used=search_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-document")
async def generate_document(request: DocRequest):
    if not doc_gen:
        raise HTTPException(status_code=503, detail="Document Generator not initialized.")
    try:
        filename = f"nyastra_doc_{os.urandom(4).hex()}"
        if request.format == "docx":
            path = doc_gen.generate_docx(filename, request.content, request.title)
        else:
            path = doc_gen.generate_pdf(filename, request.content, request.title)
        return {"status": "success", "file_path": path, "filename": os.path.basename(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/draft-legal-document")
async def draft_legal_document(request: Request, doc_type: str, format: str = "docx"):
    if not orchestrator or not doc_gen:
        raise HTTPException(status_code=503, detail="AI Orchestrator or Document Generator not initialized.")
    try:
        data = await request.json()
        content = await orchestrator.draft_legal_document(doc_type, data)

        filename = f"nyastra_ai_draft_{os.urandom(4).hex()}"
        if format == "docx":
            path = doc_gen.generate_docx(filename, content, f"{doc_type}")
            media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        else:
            path = doc_gen.generate_pdf(filename, content, f"{doc_type}")
            media_type = "application/pdf"

        return FileResponse(
            path,
            filename=f"{doc_type.replace(' ', '_')}.{format}",
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/search-cases")
async def search_cases(query: str):
    """Search Indian Kanoon or fall back to DuckDuckGo."""
    # Try Indian Kanoon first if token exists
    if kanoon and os.getenv("INDIAN_KANOON_API_KEY"):
        try:
            results = await kanoon.search_cases(query)
            if results:
                return {"results": results, "source": "indiankanoon"}
        except Exception:
            pass

    # Fallback: DuckDuckGo web search targeting Indian legal sources
    if orchestrator:
        search_results = orchestrator.web_search(f"{query} judgment", max_results=8)
        return {"results": search_results, "source": "web"}

    return {"results": [], "source": "none"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
