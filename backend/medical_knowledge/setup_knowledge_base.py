"""
Setup script for the Medical Knowledge Base.

This script:
1. Downloads the Medical-Reasoning-SFT-GPT-OSS-120B dataset from HuggingFace
2. Creates vector embeddings using a medical-specialized model
3. Stores embeddings in ChromaDB for fast semantic search

Run once before starting the API server.
"""

import os
import sys
from typing import List, Dict
import chromadb
from chromadb.config import Settings
from datasets import load_dataset
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import json

# Configuration
COLLECTION_NAME = "medical_knowledge"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # Free, fast, good quality
CHROMA_PERSIST_DIR = "./chroma_db"
BATCH_SIZE = 100  # Process in batches to manage memory
MAX_SAMPLES = 50000  # Start with subset for faster setup (can increase later)


def setup_embedding_model() -> SentenceTransformer:
    """Load the embedding model."""
    print(f"Loading embedding model: {EMBEDDING_MODEL}")
    model = SentenceTransformer(EMBEDDING_MODEL)
    return model


def setup_chromadb() -> chromadb.Collection:
    """Initialize ChromaDB with persistent storage."""
    print(f"Setting up ChromaDB at: {CHROMA_PERSIST_DIR}")
    
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    
    # Delete existing collection if it exists (for fresh setup)
    try:
        client.delete_collection(COLLECTION_NAME)
        print(f"Deleted existing collection: {COLLECTION_NAME}")
    except:
        pass
    
    collection = client.create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Medical reasoning Q&A pairs from OpenMed dataset"}
    )
    
    return collection


def extract_qa_pairs(sample: Dict) -> tuple:
    """Extract question and answer from a dataset sample."""
    messages = sample.get("messages", [])
    
    question = ""
    answer = ""
    
    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")
        
        if role == "user" and not question:
            question = content
        elif role == "assistant" and not answer:
            # Remove thinking tags if present
            if "<think>" in content:
                # Extract content after </think>
                parts = content.split("</think>")
                if len(parts) > 1:
                    answer = parts[-1].strip()
                else:
                    answer = content
            else:
                answer = content
    
    return question, answer


def process_dataset(
    collection: chromadb.Collection,
    model: SentenceTransformer,
    max_samples: int = MAX_SAMPLES
):
    """Download dataset and create embeddings."""
    print("Loading Medical-Reasoning-SFT-GPT-OSS-120B dataset from HuggingFace...")
    print("(This may take a few minutes on first run)")
    
    dataset = load_dataset(
        "OpenMed/Medical-Reasoning-SFT-GPT-OSS-120B",
        split="train",
        streaming=True  # Stream to manage memory
    )
    
    questions = []
    answers = []
    ids = []
    metadatas = []
    
    print(f"\nProcessing up to {max_samples} samples...")
    
    sample_count = 0
    for sample in tqdm(dataset, total=max_samples, desc="Processing samples"):
        if sample_count >= max_samples:
            break
            
        question, answer = extract_qa_pairs(sample)
        
        if question and answer and len(question) > 20:
            questions.append(question)
            answers.append(answer)
            ids.append(f"med_{sample_count}")
            metadatas.append({
                "question": question[:500],  # Store truncated for metadata
                "answer_preview": answer[:1000] if len(answer) > 1000 else answer,
                "full_answer_length": len(answer)
            })
            sample_count += 1
            
            # Process in batches
            if len(questions) >= BATCH_SIZE:
                print(f"\nEmbedding batch of {len(questions)} samples...")
                embeddings = model.encode(questions, show_progress_bar=False)
                
                collection.add(
                    ids=ids,
                    embeddings=embeddings.tolist(),
                    documents=answers,
                    metadatas=metadatas
                )
                
                # Reset batch
                questions = []
                answers = []
                ids = []
                metadatas = []
    
    # Process remaining samples
    if questions:
        print(f"\nEmbedding final batch of {len(questions)} samples...")
        embeddings = model.encode(questions, show_progress_bar=False)
        
        collection.add(
            ids=ids,
            embeddings=embeddings.tolist(),
            documents=answers,
            metadatas=metadatas
        )
    
    print(f"\n✓ Successfully processed {sample_count} medical Q&A pairs")
    print(f"✓ Embeddings stored in: {CHROMA_PERSIST_DIR}")


def verify_setup(collection: chromadb.Collection, model: SentenceTransformer):
    """Test the knowledge base with a sample query."""
    print("\n--- Verification Test ---")
    
    test_query = "What are the symptoms of diabetes?"
    print(f"Test query: {test_query}")
    
    query_embedding = model.encode([test_query])
    
    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=2
    )
    
    if results and results["documents"]:
        print(f"\n✓ Found {len(results['documents'][0])} relevant results")
        print(f"Preview of first result: {results['documents'][0][0][:200]}...")
    else:
        print("✗ No results found - something may be wrong")


def main():
    """Main setup function."""
    print("=" * 60)
    print("Medical Knowledge Base Setup")
    print("=" * 60)
    print()
    
    # Check if already set up
    if os.path.exists(CHROMA_PERSIST_DIR):
        response = input("ChromaDB already exists. Rebuild? (y/N): ").strip().lower()
        if response != 'y':
            print("Keeping existing database. Exiting.")
            return
    
    # Setup components
    model = setup_embedding_model()
    collection = setup_chromadb()
    
    # Process dataset
    process_dataset(collection, model)
    
    # Verify
    verify_setup(collection, model)
    
    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print("\nNext step: Start the API server with:")
    print("  uvicorn medical_api:app --host 0.0.0.0 --port 8000 --reload")


if __name__ == "__main__":
    main()
