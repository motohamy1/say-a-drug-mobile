# Medical Knowledge Service

Python-based RAG backend for specialized medical AI responses.

## Setup

```bash
cd backend/medical_knowledge
python -m venv venv
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

## First-time Setup (Download & Process Dataset)

```bash
python setup_knowledge_base.py
```

This will:
1. Download the Medical-Reasoning-SFT-GPT-OSS-120B dataset from HuggingFace
2. Create vector embeddings (~30-60 min depending on hardware)
3. Store in ChromaDB for fast semantic search

## Run the API Server

```bash
uvicorn medical_api:app --host 0.0.0.0 --port 8000 --reload
```

## API Endpoints

- `POST /search` - Search medical knowledge base
- `GET /health` - Health check

## Integration with Node.js Backend

The main `server.js` proxies requests to this Python service.
