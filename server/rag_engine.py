import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class RagEngine:
    def __init__(self, persist_directory: str = "./db/chroma"):
        self.persist_directory = persist_directory
        self.vector_db = None
        self.embeddings = None

        # Ensure directory exists
        if not os.path.exists(persist_directory):
            try:
                os.makedirs(persist_directory)
            except Exception:
                pass

    def _init_embeddings(self):
        """Lazy load embeddings only when needed to save startup RAM."""
        if self.embeddings is not None:
            return

        openai_key = os.getenv("OPENAI_API_KEY")
        try:
            if openai_key:
                from langchain_openai import OpenAIEmbeddings
                self.embeddings = OpenAIEmbeddings(api_key=openai_key)
                print("RAG: Using lightweight OpenAI API embeddings.")
            else:
                raise ValueError("No OpenAI key.")
        except Exception:
            # Fallback to local HuggingFace — ONLY if we really have to
            # This is the memory-heavy part!
            try:
                print("RAG: Loading local embedding model (Memory intensive)...")
                from langchain_huggingface import HuggingFaceEmbeddings
                self.embeddings = HuggingFaceEmbeddings(
                    model_name="all-MiniLM-L6-v2",
                    model_kwargs={"device": "cpu"},
                    encode_kwargs={"normalize_embeddings": True},
                )
                print("RAG: Local model loaded successfully.")
            except Exception as e:
                print(f"RAG ERROR: Could not load embedding model due to memory: {e}")
                self.embeddings = None

    def load_db(self):
        """Load Chroma DB lazily."""
        if self.vector_db is not None:
            return
        
        self._init_embeddings()
        if not self.embeddings:
            return

        try:
            from langchain_community.vectorstores import Chroma
            self.vector_db = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings
            )
        except Exception as e:
            print(f"RAG: Could not load Chroma DB ({e})")
            self.vector_db = None

    def add_documents(self, documents):
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_community.vectorstores import Chroma
        
        self._init_embeddings()
        if not self.embeddings:
            print("RAG: Cannot add documents - Embedding model not loaded.")
            return

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
