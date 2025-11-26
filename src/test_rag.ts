import path from "path";
import { ragIngestCommand } from "./commands/rag_ingest";
import { DocumentProcessor } from "./tools/document_processor";
import dotenv from "dotenv";

dotenv.config();

async function testDocumentProcessor() {
  console.log("=== Testing Document Processor ===\n");
  
  const processor = new DocumentProcessor();
  const testPdf = path.join(process.cwd(), "test_pdfs", "comsysF311_2025_M4L28.pdf");
  
  try {
    console.log(`Testing PDF: ${testPdf}`);
    
    // Test page counting
    const pageCount = await processor.countPages(testPdf, ".pdf");
    console.log(`✓ Page count: ${pageCount}`);
    
    if (pageCount > 200) {
      console.log(`⚠ PDF exceeds 200 page limit, will be skipped during ingestion`);
      return;
    }
    
    // Test text extraction
    console.log("Extracting text...");
    const extracted = await processor.extractText(testPdf, ".pdf");
    console.log(`✓ Extracted ${extracted.pages.length} pages`);
    console.log(`✓ Total text length: ${extracted.text.length} characters`);
    console.log(`✓ First 200 chars: ${extracted.text.substring(0, 200)}...`);
    
    return true;
  } catch (error: any) {
    console.error(`✗ Error: ${error.message}`);
    return false;
  }
}

async function testRAGIngestion() {
  console.log("\n=== Testing RAG Ingestion ===\n");
  
  const testFolder = path.join(process.cwd(), "test_pdfs");
  
  try {
    console.log(`Ingesting from: ${testFolder}`);
    const report = await ragIngestCommand(testFolder, "test", false);
    
    console.log("\n=== Ingestion Report ===");
    console.log(`Total files: ${report.totalFiles}`);
    console.log(`Indexed: ${report.indexed}`);
    console.log(`Skipped (page limit): ${report.skippedPageLimit}`);
    console.log(`Skipped (already indexed): ${report.skippedAlreadyIndexed}`);
    console.log(`Failed: ${report.failed}`);
    
    if (report.errors.length > 0) {
      console.log("\nErrors:");
      report.errors.forEach(err => {
        console.log(`  - ${err.file}: ${err.error}`);
      });
    }
    
    return report.indexed > 0;
  } catch (error: any) {
    console.error(`✗ Ingestion failed: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

async function main() {
  console.log("RAG System Test\n");
  console.log("=" .repeat(50));
  
  // Check environment variables
  const requiredVars = ["GEMINI_API_KEY", "CONVEX_URL"];
  const missingVars = requiredVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error(`\n✗ Missing environment variables: ${missingVars.join(", ")}`);
    console.error("Please set these in your .env file");
    return;
  }
  
  console.log("✓ Environment variables configured\n");
  
  // Test document processor
  const processorTest = await testDocumentProcessor();
  if (!processorTest) {
    console.log("\n⚠ Document processor test failed, skipping ingestion test");
    return;
  }
  
  // Test RAG ingestion
  const ingestionTest = await testRAGIngestion();
  
  if (ingestionTest) {
    console.log("\n✓ RAG ingestion test completed successfully!");
  } else {
    console.log("\n⚠ RAG ingestion test had issues - check errors above");
  }
}

main().catch(console.error);

