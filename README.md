# Rag-System

RAG System Development Plan

1. Objective

The goal is to develop a Retrieval-Augmented Generation (RAG) system focused on a specific domain of PDF document types. The system will:
    
    
      Fine-tune a model to accurately answer questions based on selected PDF documents from a particular topic area.
      
      Integrate defensive prompts.
      
      Compare different models and search methods where appropriate.
      
      Experiment with multiple models and search techniques to optimize performance.
      
      Note: The focus is set on analyzing documents within a specific domain. General dynamic document upload will not be prioritized at this stage.


2. System Architecture

Frontend
    
      React (Web Interface)
      
      Chosen for its superior integration capabilities and extensive documentation support.

Backend

      Python
      
      Selected due to the wide availability of libraries and models for AI and search tasks.
      
      Framework
      
      FastAPI (Flexible and lightweight option for API development.)

Generative AI Models

      GPT-4, LLaMA, Mistral
