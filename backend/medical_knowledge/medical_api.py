"""
FastAPI server for Medical Knowledge Base search.

Provides semantic search over the medical reasoning dataset
for RAG (Retrieval-Augmented Generation).
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import chromadb
from sentence_transformers import SentenceTransformer
import os

# Configuration
COLLECTION_NAME = "medical_knowledge"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_PERSIST_DIR = "./chroma_db"

# Initialize FastAPI
app = FastAPI(
    title="Medical Knowledge API",
    description="Semantic search over medical reasoning dataset",
    version="1.0.0"
)

# CORS - allow requests from mobile app and Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (loaded on startup)
model: Optional[SentenceTransformer] = None
collection: Optional[chromadb.Collection] = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


class SearchResult(BaseModel):
    question: str
    answer: str
    relevance_score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_found: int


@app.on_event("startup")
async def startup():
    """Load model and ChromaDB on startup."""
    global model, collection
    
    print("Loading embedding model...")
    model = SentenceTransformer(EMBEDDING_MODEL)
    
    print("Connecting to ChromaDB...")
    if not os.path.exists(CHROMA_PERSIST_DIR):
        raise RuntimeError(
            f"ChromaDB not found at {CHROMA_PERSIST_DIR}. "
            "Please run setup_knowledge_base.py first."
        )
    
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    collection = client.get_collection(COLLECTION_NAME)
    
    count = collection.count()
    print(f"✓ Medical knowledge base ready with {count} entries")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    if collection is None:
        return {"status": "error", "message": "Knowledge base not loaded"}
    
    return {
        "status": "healthy",
        "service": "medical-knowledge-api",
        "entries": collection.count()
    }


@app.post("/search", response_model=SearchResponse)
async def search_medical_knowledge(request: SearchRequest):
    """
    Search the medical knowledge base for relevant information.
    
    Uses semantic similarity to find the most relevant medical Q&A pairs.
    """
    if collection is None or model is None:
        raise HTTPException(status_code=503, detail="Knowledge base not ready")
    
    if not request.query or len(request.query) < 3:
        raise HTTPException(status_code=400, detail="Query too short")
    
    # Create embedding for the query
    query_embedding = model.encode([request.query])
    
    # Search ChromaDB
    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=request.top_k,
        include=["documents", "metadatas", "distances"]
    )
    
    # Format results
    search_results = []
    if results and results["documents"] and results["documents"][0]:
        for i, (doc, meta, dist) in enumerate(zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        )):
            # Convert distance to similarity score (0-1)
            # ChromaDB returns L2 distance, lower = more similar
            similarity = max(0, 1 - (dist / 2))
            
            search_results.append(SearchResult(
                question=meta.get("question", "Unknown"),
                answer=doc,
                relevance_score=round(similarity, 3)
            ))
    
    return SearchResponse(
        query=request.query,
        results=search_results,
        total_found=len(search_results)
    )


@app.get("/search")
async def search_get(query: str, top_k: int = 3):
    """GET endpoint for easier testing."""
    return await search_medical_knowledge(SearchRequest(query=query, top_k=top_k))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
