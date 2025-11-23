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

    // 4. (Removed aggressive regex extraction to avoid discarding content)


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
        // 6. Robust Array Extraction Strategy
        // If the expected output is an array, we can try to extract individual objects
        // This handles missing commas, early array closures, and extra text between objects

        const objects: any[] = [];
        let braceCount = 0;
        let startIndex = -1;
        let foundObject = false;

        // We only care about top-level objects
        for (let j = 0; j < fixedText.length; j++) {
            const char = fixedText[j];

            if (char === '{') {
                if (braceCount === 0) {
                    startIndex = j;
                }
                braceCount++;
            } else if (char === '}') {
                braceCount--;
                if (braceCount === 0 && startIndex !== -1) {
                    // Found a complete object string
                    const jsonStr = fixedText.substring(startIndex, j + 1);
                    try {
                        const obj = JSON.parse(jsonStr);
                        objects.push(obj);
                        foundObject = true;
                    } catch (parseErr) {
                        // Try to repair this individual object recursively (without infinite loop)
                        // Simple try: just ignore it or try basic fix
                        try {
                            // Very basic fix for the individual object
                            const fixedObjStr = jsonStr.replace(/\\([^"\\/bfnrtu])/g, "\\\\$1");
                            const obj = JSON.parse(fixedObjStr);
                            objects.push(obj);
                            foundObject = true;
                        } catch (e2) {
                            console.warn(`Failed to parse extracted object at index ${startIndex}:`, e2);
                        }
                    }
                    startIndex = -1;
                }
            }
        }

        if (foundObject) {
            console.log(`Recovered ${objects.length} objects from malformed JSON.`);
            return objects;
        }

        // If still failing and we didn't find any objects, fall back to partial parsing
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
