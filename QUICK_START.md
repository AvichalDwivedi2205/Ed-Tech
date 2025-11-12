# Quick Start Guide - Content Creator Agent

## Setup

1. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set Environment Variables:**
   ```bash
   export GOOGLE_API_KEY="your_google_api_key"
   export PERPLEXITY_API_KEY="your_perplexity_api_key"
   export TAVILY_API_KEY="your_tavily_api_key"  # Optional
   ```

   Or create a `.env` file:
   ```
   GOOGLE_API_KEY=your_key
   PERPLEXITY_API_KEY=your_key
   TAVILY_API_KEY=your_key
   ```

## Run the Application

```bash
streamlit run app_content.py
```

## Test with sample.json

1. Open the Streamlit app (usually at http://localhost:8501)
2. In the sidebar, click "Choose roadmap JSON file"
3. Upload `sample.json`
4. Click "🚀 Generate Content for Subtopic1"
5. Wait for generation to complete (watch progress bar)
6. View the generated content in the scrollable container

## What to Expect

### Generation Process:
- Progress bar showing generation status
- Status messages for each step:
  - Loading roadmap
  - Loading context
  - Researching content (scraping trusted sources, finding videos/articles)
  - Generating content
  - Generating graphs
  - Generating quiz
  - Saving context

### Generated Content Should Include:
- **Comprehensive text** (>2000 characters typically)
- **LaTeX equations** (displayed with $$...$$)
- **Solved examples** (2-3 per topic with step-by-step solutions)
- **Video links** (from Perplexity search)
- **Article links** (from Perplexity search)
- **Graphs/charts** (Python code for visualization)
- **Quiz questions** (5 questions per subtopic)

### Display Features:
- Content statistics (characters, words, reading time)
- Full scrollable content view
- Content element counts (equations, examples, sections)
- Download buttons for content and quiz

## Troubleshooting

### Content Still Truncated?
1. Model is set to `gemini-2.5-flash` by default
2. Check API quotas/limits
3. Look at error messages in Streamlit

### Tools Not Working?
1. Verify API keys are set correctly
2. Check network connectivity
3. Run test script: `python test_tools.py` (requires venv activation)

### Generation Fails?
1. Check error details in the expandable error section
2. Verify roadmap JSON is valid
3. Check API key permissions

## Model Options

The default model is `gemini-2.5-flash` for fast and efficient generation. 
In `content_agent.py`, you can change the model if needed:
- `gemini-2.5-flash` - Fast and efficient (default)
- `gemini-1.5-pro` - Best quality, longer outputs (slower)
- `gemini-2.0-flash-exp` - Fast, good quality

## File Structure

After generation, you'll find:
```
generated_content/
├── Subtopic1/
│   ├── content.md          # Full generated content
│   ├── quiz.json          # Quiz questions
│   └── graphs/
│       └── graph_1.py    # Graph code
├── Subtopic2/
│   └── ...
└── mega_quiz.json        # Final comprehensive quiz
```

