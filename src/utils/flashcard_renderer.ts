import { FlashcardSet, Flashcard } from "../types/flashcard_schema";

export function renderFlashcardsToHtml(set: FlashcardSet): string {
    const cardsHtml = set.cards.map((card, index) => renderCard(card, index)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flashcards: ${set.topicName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
    <style>
        :root {
            --primary: #6366f1;
            --primary-dark: #4f46e5;
            --bg: #0f172a;
            --surface: #1e293b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }

        .container {
            width: 100%;
            max-width: 800px;
            padding: 40px 20px;
            text-align: center;
        }

        header {
            margin-bottom: 40px;
        }

        h1 {
            font-size: 2rem;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 10px;
        }

        .meta {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .flashcard-container {
            perspective: 1000px;
            width: 100%;
            height: 400px;
            position: relative;
            margin-bottom: 30px;
        }

        .flashcard {
            width: 100%;
            height: 100%;
            position: absolute;
            transform-style: preserve-3d;
            transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
            cursor: pointer;
        }

        .flashcard.flipped {
            transform: rotateY(180deg);
        }

        .card-face {
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
            box-sizing: border-box;
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .card-front {
            z-index: 2;
        }

        .card-back {
            transform: rotateY(180deg);
            background: #2e3b4e; /* Slightly lighter for back */
        }

        .card-content {
            font-size: 1.5rem;
            font-weight: 500;
            text-align: center;
        }

        .card-label {
            position: absolute;
            top: 20px;
            left: 20px;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--text-muted);
            font-weight: 600;
        }

        .controls {
            display: flex;
            gap: 20px;
            justify-content: center;
            align-items: center;
        }

        .btn {
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn:hover {
            background: var(--primary);
            border-color: var(--primary);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--surface);
            border-color: var(--border);
        }

        .progress {
            margin-top: 20px;
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        /* Hidden storage for card data */
        #card-data {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${set.topicName}</h1>
            <div class="meta">Flashcard Set • ${set.cards.length} Cards</div>
        </header>

        <div class="flashcard-container">
            <div class="flashcard" id="flashcard" onclick="flipCard()">
                <div class="card-face card-front">
                    <div class="card-label">Front</div>
                    <div class="card-content" id="card-front-content">Loading...</div>
                </div>
                <div class="card-face card-back">
                    <div class="card-label">Back</div>
                    <div class="card-content" id="card-back-content">Loading...</div>
                </div>
            </div>
        </div>

        <div class="controls">
            <button class="btn" id="prev-btn" onclick="prevCard()">← Previous</button>
            <button class="btn" id="next-btn" onclick="nextCard()">Next →</button>
        </div>

        <div class="progress" id="progress">Card 1 of ${set.cards.length}</div>
    </div>

    <!-- Store card data as JSON -->
    <script id="card-data" type="application/json">
        ${JSON.stringify(set.cards)}
    </script>

    <script>
        let cards = [];
        let currentIndex = 0;
        const flashcardEl = document.getElementById('flashcard');
        const frontContentEl = document.getElementById('card-front-content');
        const backContentEl = document.getElementById('card-back-content');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const progressEl = document.getElementById('progress');

        function init() {
            try {
                cards = JSON.parse(document.getElementById('card-data').textContent);
                renderCurrentCard();
            } catch (e) {
                console.error("Failed to load cards", e);
                frontContentEl.textContent = "Error loading cards.";
            }
        }

        function renderCurrentCard() {
            const card = cards[currentIndex];
            
            // Reset flip state
            flashcardEl.classList.remove('flipped');

            // Update content with a slight delay to allow flip reset if needed, 
            // but for instant navigation we update immediately.
            frontContentEl.innerHTML = card.front;
            backContentEl.innerHTML = card.back;

            // Update controls
            prevBtn.disabled = currentIndex === 0;
            nextBtn.disabled = currentIndex === cards.length - 1;
            progressEl.textContent = \`Card \${currentIndex + 1} of \${cards.length}\`;

            // Re-render Math
            if (window.renderMathInElement) {
                renderMathInElement(frontContentEl);
                renderMathInElement(backContentEl);
            }
        }

        function flipCard() {
            flashcardEl.classList.toggle('flipped');
        }

        function nextCard() {
            if (currentIndex < cards.length - 1) {
                currentIndex++;
                renderCurrentCard();
            }
        }

        function prevCard() {
            if (currentIndex > 0) {
                currentIndex--;
                renderCurrentCard();
            }
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') nextCard();
            if (e.key === 'ArrowLeft') prevCard();
            if (e.key === ' ' || e.key === 'Enter') flipCard();
        });

        // Initialize on load
        window.addEventListener('DOMContentLoaded', init);
    </script>
</body>
</html>`;
}

function renderCard(card: Flashcard, index: number): string {
    // Helper not strictly needed for the JS-driven approach, but kept for potential static list view
    return "";
}
