export function repairJsonWithLatex(text: string): any {
    // 1. Remove markdown code blocks
    let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // 2. Try parsing directly first
    try {
        return JSON.parse(cleanText);
    } catch (e) {
        // console.log("Direct parse failed, attempting repair...");
    }

    // 3. Heuristic Repair Strategy
    // The most common issue is single backslashes in LaTeX strings (e.g. "\lambda") 
    // which are invalid in JSON strings (should be "\\lambda").

    // We want to replace single backslashes with double backslashes, 
    // BUT NOT if they are already escaped (\\) or part of a valid escape sequence (\n, \t, \", etc).

    // Valid JSON escape sequences: \" \\ \/ \b \f \n \r \t \uXXXX
    // We want to preserve these.
    // We want to escape everything else.

    let fixedText = "";
    let i = 0;
    while (i < cleanText.length) {
        const char = cleanText[i];

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
            }
        } else {
            fixedText += char;
            i++;
        }
    }

    try {
        return JSON.parse(fixedText);
    } catch (e) {
        // console.error("Repair failed", e);
        // console.log("Original text snippet:", cleanText.substring(0, 200));
        // console.log("Fixed text snippet:", fixedText.substring(0, 200));
        throw e;
    }
}
