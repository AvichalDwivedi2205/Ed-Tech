export function repairJsonWithLatex(text: string): any {
    // 1. Remove markdown code blocks
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 2. Remove comments (both // and /* */ style)
    // Remove single-line comments (// ...)
    cleanText = cleanText.replace(/\/\/.*$/gm, "");
    // Remove multi-line comments (/* ... */)
    cleanText = cleanText.replace(/\/\*[\s\S]*?\*\//g, "");
    // Remove trailing comment-like patterns (*//)
    cleanText = cleanText.replace(/\*\/\/\s*/g, "");
    
    cleanText = cleanText.trim();

    // 3. Try parsing directly first
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // console.log("Direct parse failed, attempting repair...");
    }

    // 4. Try to extract JSON array/object if wrapped in text
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/) || cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleanText = jsonMatch[0];
    }

    // 4. Heuristic Repair Strategy
    let fixedText = "";
    let i = 0;
    let inString = false;
    let escapeNext = false;

    while (i < cleanText.length) {
        const char = cleanText[i];

        if (escapeNext) {
            // We're escaping the current character
            fixedText += char;
            escapeNext = false;
            i++;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            fixedText += char;
            i++;
            continue;
        }

        if (char === '\\') {
            // Check next character
            if (i + 1 < cleanText.length) {
                const nextChar = cleanText[i + 1];

                // If it's a valid escape char, leave it alone
                if (['"', '\\', '/', 'b', 'f', 'n', 'r', 't'].includes(nextChar)) {
                    fixedText += char + nextChar;
                    i += 2;
                    continue;
                }

                // If it's 'u', check if it's a unicode sequence \uXXXX
                if (nextChar === 'u') {
                    // Check if next 4 chars are hex
                    const potentialHex = cleanText.substring(i + 2, i + 6);
                    if (/^[0-9a-fA-F]{4}$/.test(potentialHex)) {
                        fixedText += char + nextChar + potentialHex;
                        i += 6;
                        continue;
                    }
                }

                // If we are here, it's an invalid escape sequence (likely LaTeX)
                // Escape the backslash
                fixedText += "\\\\";
                i++; // Don't consume nextChar yet, let loop handle it
                continue;
            } else {
                // Trailing backslash at end of string? Escape it.
                fixedText += "\\\\";
                i++;
                continue;
            }
        }

        // Handle control characters in strings
        if (inString) {
            if (char === '\n') {
                fixedText += "\\n";
                i++;
                continue;
            }
            if (char === '\r') {
                fixedText += "\\r";
                i++;
                continue;
            }
            if (char === '\t') {
                fixedText += "\\t";
                i++;
                continue;
            }
        }

        fixedText += char;
        i++;
    }

    // 5. Try to fix common JSON issues
    // Remove trailing commas before closing brackets/braces
    fixedText = fixedText.replace(/,(\s*[}\]])/g, '$1');
    
    // Try parsing
    try {
        return JSON.parse(fixedText);
    } catch (e: any) {
        // If still failing, try to extract valid blocks from partial JSON
        const errorMatch = e.message?.match(/position (\d+)/);
        if (errorMatch) {
            const pos = parseInt(errorMatch[1]);
            // Try to parse up to the error position
            const truncated = fixedText.substring(0, pos);
            // Find the last complete block
            const lastCompleteBlock = truncated.lastIndexOf('},');
            if (lastCompleteBlock > 0) {
                const partialJson = fixedText.substring(0, lastCompleteBlock + 1) + ']';
                try {
                    const partial = JSON.parse(partialJson);
                    console.warn(`Parsed partial JSON (${partial.length} blocks) due to syntax error at position ${pos}`);
                    return partial;
                } catch (e2) {
                    // Ignore
                }
            }
            
            // Last resort: log the error with context
            const startPos = Math.max(0, pos - 100);
            const endPos = Math.min(fixedText.length, pos + 100);
            const errorContext = fixedText.substring(startPos, endPos);
            console.error(`JSON repair failed at position ${pos}. Error context: ...${errorContext}...`);
        } else {
            console.error(`JSON repair failed: ${e.message}`);
        }
        throw e;
    }
}
