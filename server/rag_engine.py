import os
from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

class RagEngine:
    def __init__(self, persist_directory: str = "./db/chroma"):
        self.persist_directory = persist_directory
        self.vector_db = None

        # Ensure directory exists
        if not os.path.exists(persist_directory):
            os.makedirs(persist_directory)

        # Use free local HuggingFace embeddings by default.
        # Falls back to OpenAI if OPENAI_API_KEY is present.
        self._init_embeddings()

    def _init_embeddings(self):
        """Initialize embeddings — prefers free local model, falls back to OpenAI."""
        openai_key = os.getenv("OPENAI_API_KEY")
        try:
            if openai_key:
                from langchain_openai import OpenAIEmbeddings
                self.embeddings = OpenAIEmbeddings(api_key=openai_key)
                print("RAG: Using OpenAI embeddings.")
            else:
                raise ValueError("No OpenAI key — using local embeddings.")
        except Exception:
            from langchain_huggingface import HuggingFaceEmbeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            print("RAG: Using local HuggingFace embeddings (all-MiniLM-L6-v2).")

    def load_db(self):
        """Load existing Chroma DB. Handles empty/non-existent DB gracefully."""
        try:
            from langchain_community.vectorstores import Chroma
            self.vector_db = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings
            )
        except Exception as e:
            print(f"RAG: Could not load Chroma DB ({e}). Will create on first document add.")
            self.vector_db = None

    def add_documents(self, documents: List[Document]):
        from langchain_community.vectorstores import Chroma
        # Fixed: chunk_overlap (not chunk_offset)
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(documents)

        if self.vector_db is None:
            self.vector_db = Chroma.from_documents(
                documents=chunks,
                embedding=self.embeddings,
                persist_directory=self.persist_directory
            )
        else:
            self.vector_db.add_documents(chunks)

    def search(self, query: str, k: int = 3):
        if self.vector_db is None:
            self.load_db()
        if self.vector_db is None:
            return []
        try:
            return self.vector_db.similarity_search(query, k=k)
        except Exception as e:
            print(f"RAG search error: {e}")
            return []

    def get_context_text(self, query: str, k: int = 3) -> str:
        results = self.search(query, k=k)
        if not results:
            return ""
        return "\n\n".join([doc.page_content for doc in results])
