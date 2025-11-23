import { Quiz, Question } from "../types/quiz_schema";

export function renderQuizToHtml(quiz: Quiz): string {
    const questionsHtml = quiz.questions.map((q, index) => renderQuestion(q, index)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quiz: ${quiz.topicName}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body);"></script>
    <style>
        :root {
            --primary: #3b82f6;
            --primary-dark: #2563eb;
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-highlight: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        header {
            margin-bottom: 60px;
            text-align: center;
            border-bottom: 1px solid var(--border);
            padding-bottom: 40px;
        }

        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(to right, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }

        .meta {
            color: var(--text-muted);
            font-size: 0.9rem;
        }

        .question-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .question-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
        }

        .q-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .q-badges {
            display: flex;
            gap: 8px;
        }

        .badge {
            font-size: 0.75rem;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .badge.easy { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .badge.hard { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        
        .badge.mcq { background: rgba(59, 130, 246, 0.2); color: var(--primary); }
        .badge.short { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }
        .badge.long { background: rgba(236, 72, 153, 0.2); color: #ec4899; }

        .q-text {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 20px;
        }

        .options {
            display: grid;
            gap: 10px;
            margin-bottom: 20px;
        }

        .option {
            background: var(--surface-highlight);
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid transparent;
        }

        .option:hover {
            background: #475569;
        }

        .answer-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--border);
            display: none;
        }

        .answer-section.visible {
            display: block;
            animation: fadeIn 0.3s ease;
        }

        .btn-reveal {
            background: var(--primary);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }

        .btn-reveal:hover {
            background: var(--primary-dark);
        }

        .correct-answer {
            font-weight: 700;
            color: var(--success);
            margin-bottom: 8px;
        }

        .explanation {
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>${quiz.topicName}</h1>
            <div class="meta">Generated Quiz • ${quiz.questions.length} Questions • ${new Date(quiz.createdAt).toLocaleDateString()}</div>
        </header>

        <div class="questions-list">
            ${questionsHtml}
        </div>
    </div>

    <script>
        function toggleAnswer(id) {
            const el = document.getElementById('ans-' + id);
            const btn = document.getElementById('btn-' + id);
            if (el.classList.contains('visible')) {
                el.classList.remove('visible');
                btn.textContent = 'Show Answer';
            } else {
                el.classList.add('visible');
                btn.textContent = 'Hide Answer';
            }
        }
    </script>
</body>
</html>`;
}

function renderQuestion(q: Question, index: number): string {
    const difficultyClass = q.difficulty.toLowerCase();
    const typeClass = q.type === 'MCQ' ? 'mcq' : q.type === 'ShortAnswer' ? 'short' : 'long';

    let contentHtml = '';

    if (q.type === 'MCQ' && q.options) {
        contentHtml += `<div class="options">
            ${q.options.map((opt, i) => `
                <div class="option">
                    <span style="opacity: 0.5; margin-right: 8px;">${String.fromCharCode(65 + i)}.</span> ${opt}
                </div>
            `).join('')}
        </div>`;
    }

    return `
    <div class="question-card">
        <div class="q-header">
            <div class="q-badges">
                <span class="badge ${difficultyClass}">${q.difficulty}</span>
                <span class="badge ${typeClass}">${q.type.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>
            <span style="color: var(--text-muted); font-size: 0.9rem;">Q${index + 1}</span>
        </div>
        
        <div class="q-text">
            ${q.question}
        </div>

        ${contentHtml}

        <button id="btn-${q.id}" class="btn-reveal" onclick="toggleAnswer('${q.id}')">Show Answer</button>

        <div id="ans-${q.id}" class="answer-section">
            <div class="correct-answer">Answer: ${q.correctAnswer}</div>
            <div class="explanation">
                <strong>Explanation:</strong><br>
                ${q.explanation}
            </div>
            ${q.source ? `<div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">Source: ${q.source}</div>` : ''}
        </div>
    </div>`;
}
