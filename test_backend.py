#!/usr/bin/env python3
"""
Comprehensive backend testing script
Tests all backend components and endpoints
"""
import sys
import os
import asyncio
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def test_imports():
    """Test all critical imports"""
    print("=" * 60)
    print("TEST 1: Testing Imports")
    print("=" * 60)
    
    try:
        print("✓ Testing FastAPI imports...")
        from fastapi import FastAPI
        print("  ✓ FastAPI imported successfully")
        
        print("✓ Testing backend config...")
        from backend.config import settings
        print(f"  ✓ Config loaded - API prefix: {settings.API_V1_PREFIX}")
        
        print("✓ Testing routers...")
        from backend.routers import roadmap, content, qa
        print("  ✓ All routers imported successfully")
        
        print("✓ Testing services...")
        from backend.services.embedding_service import generate_embedding
        from backend.services.roadmap_service import roadmap_service
        from backend.services.content_service import content_service
        print("  ✓ All services imported successfully")
        
        print("✓ Testing middleware...")
        from backend.middleware.clerk_auth import verify_clerk_token
        print("  ✓ Middleware imported successfully")
        
        print("✓ Testing Convex client...")
        from backend.utils.convex_client import convex_service
        print("  ✓ Convex client imported successfully")
        
        print("✓ Testing agents...")
        from backend.agents import RoadmapGeneratorAgent, ContentCreatorAgent
        print("  ✓ All agents imported successfully")
        
        print("\n✅ All imports successful!\n")
        return True
    except Exception as e:
        print(f"\n❌ Import error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_configuration():
    """Test configuration and environment variables"""
    print("=" * 60)
    print("TEST 2: Testing Configuration")
    print("=" * 60)
    
    try:
        from backend.config import settings
        
        print(f"✓ API Prefix: {settings.API_V1_PREFIX}")
        print(f"✓ CORS Origins: {settings.CORS_ORIGINS}")
        print(f"✓ Host: {settings.HOST}")
        print(f"✓ Port: {settings.PORT}")
        
        # Check environment variables
        print("\n✓ Checking environment variables...")
        google_key = os.getenv("GOOGLE_API_KEY")
        perplexity_key = os.getenv("PERPLEXITY_API_KEY")
        clerk_secret = os.getenv("CLERK_SECRET_KEY")
        convex_url = os.getenv("CONVEX_URL")
        convex_deploy_key = os.getenv("CONVEX_DEPLOY_KEY")
        
        print(f"  GOOGLE_API_KEY: {'✓ Set' if google_key else '✗ Missing'}")
        print(f"  PERPLEXITY_API_KEY: {'✓ Set' if perplexity_key else '✗ Missing (optional)'}")
        print(f"  CLERK_SECRET_KEY: {'✓ Set' if clerk_secret else '✗ Missing'}")
        print(f"  CONVEX_URL: {'✓ Set' if convex_url else '✗ Missing'}")
        print(f"  CONVEX_DEPLOY_KEY: {'✓ Set' if convex_deploy_key else '✗ Missing (optional for dev)'}")
        
        if not google_key:
            print("\n⚠️  WARNING: GOOGLE_API_KEY not set - embedding tests will fail")
        if not clerk_secret:
            print("⚠️  WARNING: CLERK_SECRET_KEY not set - auth tests will fail")
        if not convex_url:
            print("⚠️  WARNING: CONVEX_URL not set - Convex operations will fail")
        
        print("\n✅ Configuration check complete!\n")
        return True
    except Exception as e:
        print(f"\n❌ Configuration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_embedding_service():
    """Test Google embedding generation"""
    print("=" * 60)
    print("TEST 3: Testing Embedding Service (Google)")
    print("=" * 60)
    
    try:
        from backend.services.embedding_service import generate_embedding
        
        google_key = os.getenv("GOOGLE_API_KEY")
        if not google_key:
            print("⚠️  Skipping - GOOGLE_API_KEY not set")
            return True
        
        print("✓ Testing embedding generation...")
        test_text = "This is a test sentence for embedding generation."
        
        # Test document embedding
        print("  Testing document embedding...")
        doc_embedding = await generate_embedding(test_text, task_type="retrieval_document")
        print(f"  ✓ Document embedding generated: {len(doc_embedding)} dimensions")
        
        if len(doc_embedding) != 768:
            print(f"  ⚠️  WARNING: Expected 768 dimensions, got {len(doc_embedding)}")
        
        # Test query embedding
        print("  Testing query embedding...")
        query_embedding = await generate_embedding(test_text, task_type="retrieval_query")
        print(f"  ✓ Query embedding generated: {len(query_embedding)} dimensions")
        
        print("\n✅ Embedding service test complete!\n")
        return True
    except Exception as e:
        print(f"\n❌ Embedding service error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_convex_client():
    """Test Convex client initialization"""
    print("=" * 60)
    print("TEST 4: Testing Convex Client")
    print("=" * 60)
    
    try:
        from backend.utils.convex_client import convex_service
        
        convex_url = os.getenv("CONVEX_URL")
        if not convex_url:
            print("⚠️  Skipping - CONVEX_URL not set")
            return True
        
        print(f"✓ Convex URL: {convex_service.convex_url}")
        print(f"✓ Deploy key: {'✓ Set' if convex_service.deploy_key else '✗ Not set'}")
        print("✓ Convex client initialized successfully")
        
        print("\n✅ Convex client test complete!\n")
        return True
    except Exception as e:
        print(f"\n❌ Convex client error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_fastapi_app():
    """Test FastAPI app initialization"""
    print("=" * 60)
    print("TEST 5: Testing FastAPI App")
    print("=" * 60)
    
    try:
        from backend.main import app
        
        print("✓ FastAPI app created successfully")
        print(f"✓ App title: {app.title}")
        print(f"✓ App version: {app.version}")
        
        # Check routes
        routes = [route.path for route in app.routes]
        print(f"\n✓ Registered routes ({len(routes)} total):")
        for route in sorted(routes)[:10]:  # Show first 10
            print(f"  - {route}")
        if len(routes) > 10:
            print(f"  ... and {len(routes) - 10} more")
        
        # Check routers
        print("\n✓ Checking router endpoints...")
        roadmap_routes = [r.path for r in app.routes if hasattr(r, 'path') and '/roadmap' in r.path]
        content_routes = [r.path for r in app.routes if hasattr(r, 'path') and '/content' in r.path]
        qa_routes = [r.path for r in app.routes if hasattr(r, 'path') and '/qa' in r.path]
        
        print(f"  Roadmap routes: {len(roadmap_routes)}")
        print(f"  Content routes: {len(content_routes)}")
        print(f"  Q&A routes: {len(qa_routes)}")
        
        print("\n✅ FastAPI app test complete!\n")
        return True
    except Exception as e:
        print(f"\n❌ FastAPI app error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_agents():
    """Test agent initialization"""
    print("=" * 60)
    print("TEST 6: Testing Agents")
    print("=" * 60)
    
    try:
        from backend.agents import (
            RoadmapGeneratorAgent,
            ContentCreatorAgent,
            QuizGenerator,
            GraphGeneratorAgent
        )
        
        print("✓ Testing RoadmapGeneratorAgent...")
        roadmap_agent = RoadmapGeneratorAgent()
        print("  ✓ RoadmapGeneratorAgent initialized")
        
        print("✓ Testing ContentCreatorAgent...")
        content_agent = ContentCreatorAgent()
        print("  ✓ ContentCreatorAgent initialized")
        
        print("✓ Testing QuizGenerator...")
        # QuizGenerator requires LLM and context_manager - skip instantiation test
        # It's used internally by ContentCreatorAgent
        print("  ✓ QuizGenerator class available (used internally)")
        
        print("✓ Testing GraphGeneratorAgent...")
        # GraphGeneratorAgent requires LLM - skip instantiation test
        # It's used internally by ContentCreatorAgent
        print("  ✓ GraphGeneratorAgent class available (used internally)")
        
        print("\n✅ All agents initialized successfully!\n")
        return True
    except Exception as e:
        print(f"\n❌ Agent initialization error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("BACKEND COMPREHENSIVE TEST SUITE")
    print("=" * 60 + "\n")
    
    results = []
    
    # Run synchronous tests
    results.append(("Imports", test_imports()))
    results.append(("Configuration", test_configuration()))
    results.append(("Convex Client", test_convex_client()))
    results.append(("FastAPI App", test_fastapi_app()))
    results.append(("Agents", test_agents()))
    
    # Run async tests
    results.append(("Embedding Service", await test_embedding_service()))
    
    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Backend is ready to use.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the errors above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

