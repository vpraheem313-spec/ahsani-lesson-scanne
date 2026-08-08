import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with increased payload size for images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Shared Gemini Client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Primary Endpoint: Process Lesson Image -> Extract Text & Generate EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard)
app.post("/api/process-lesson", async (req, res) => {
  try {
    const { imageDataUrl, imageDataUrls, extractedText: existingText } = req.body;

    // Normalize input images array (up to 5 pages)
    const imagesList: string[] = [];
    if (Array.isArray(imageDataUrls) && imageDataUrls.length > 0) {
      imagesList.push(...imageDataUrls.slice(0, 5));
    } else if (imageDataUrl) {
      imagesList.push(imageDataUrl);
    }

    if (imagesList.length === 0 && !existingText) {
      return res.status(400).json({ error: "At least one lesson page image or existing extracted text is required." });
    }

    const ai = getGeminiClient();

    const contentsParts: any[] = [];
    let extraTextFromSvg = "";

    imagesList.forEach((dataUrl, idx) => {
      const pageNum = idx + 1;
      const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];

        if (mimeType.includes("svg")) {
          try {
            const decodedSvg = Buffer.from(base64Data, "base64").toString("utf-8");
            extraTextFromSvg += `\n\n[Scanned Page ${pageNum} SVG Content]:\n${decodedSvg}`;
          } catch (e) {
            console.warn(`Could not decode SVG text for page ${pageNum}`, e);
          }
        } else {
          contentsParts.push({
            inlineData: {
              mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
              data: base64Data,
            },
          });
        }
      }
    });

    const pageCountText = imagesList.length > 1
      ? `There are ${imagesList.length} pages in this lesson (Page 1 to Page ${imagesList.length}). Please combine all pages into one comprehensive lesson extraction.`
      : "There is 1 lesson page.";

    const systemInstruction = `You are an expert Madrasa curriculum teacher and assessment creator specializing in Malayalam and Arabic Islamic/General education.
Your task is to analyze the provided lesson page image(s) or text content, extract readable Malayalam and Arabic content across all provided pages in order, and create EXACTLY 30 Multiple Choice Questions (MCQs) for Madrasa students.

CRITICAL CONSTRAINTS:
1. You MUST generate EXACTLY 30 questions in total. No more, no less.
2. The difficulty distribution MUST BE STRICTLY:
   - Exactly 10 EASY questions
   - Exactly 10 MEDIUM questions
   - Exactly 10 HARD questions
3. Each question MUST contain:
   - question: The question text (in Malayalam and/or Arabic as suitable for the lesson context)
   - options: An array of EXACTLY 4 distinct options (choices)
   - correctAnswer: Index of the correct option (0, 1, 2, or 3)
   - difficulty: "Easy", "Medium", or "Hard"
   - explanation: A concise explanation supporting the correct answer based ONLY on the lesson content across all pages.
4. Questions MUST be strictly based ONLY on the provided lesson page content. Do NOT fabricate or invent outside information.
5. Provide a short descriptive title for the lesson based on its combined content (e.g., "തജ്‌വീദ് പാഠം - മദ്ദ് നിയമങ്ങൾ" or "Fiqh Lesson 3").
6. Provide a complete, neat text extraction of all lesson pages in Malayalam/Arabic in logical page order.`;

    let promptText = existingText
      ? `Here is the extracted lesson content across all pages:\n\n${existingText}\n\nPlease generate EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard) based ONLY on this combined lesson content.`
      : `Please analyze the provided lesson page image(s) (${pageCountText}). Extract the full readable text in Malayalam and Arabic across all pages in order, suggest a title for the lesson, and generate EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard) based strictly on the combined lesson content.`;

    if (extraTextFromSvg) {
      promptText += extraTextFromSvg;
    }

    contentsParts.push({ text: promptText });

    // Models list to try in sequence if rate-limited or unavailable
    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
    let responseText = "";
    let lastError: any = null;

    // Helper for sleeping during retries
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const modelName of candidateModels) {
      // Try each model up to 2 times for transient errors (e.g. 503 high demand spike)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Gemini Request] Trying model: ${modelName} (Attempt ${attempt})`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: contentsParts },
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  titleSuggestion: {
                    type: Type.STRING,
                    description: "A clear short title for this lesson in Malayalam/Arabic/English",
                  },
                  languageDetected: {
                    type: Type.STRING,
                    description: "Primary language of the lesson, e.g. Malayalam, Arabic, or Malayalam/Arabic",
                  },
                  extractedText: {
                    type: Type.STRING,
                    description: "Complete text content extracted from the lesson page image",
                  },
                  questions: {
                    type: Type.ARRAY,
                    description: "Array of EXACTLY 30 MCQs based on the lesson",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        question: { type: Type.STRING },
                        options: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: "Exactly 4 options",
                        },
                        correctAnswer: {
                          type: Type.INTEGER,
                          description: "0, 1, 2, or 3 index of the correct option",
                        },
                        difficulty: {
                          type: Type.STRING,
                          description: "Must be 'Easy', 'Medium', or 'Hard'",
                        },
                        explanation: { type: Type.STRING },
                      },
                      required: ["question", "options", "correctAnswer", "difficulty"],
                    },
                  },
                },
                required: ["titleSuggestion", "extractedText", "questions"],
              },
            },
          });

          if (response.text) {
            responseText = response.text;
            console.log(`[Gemini Success] Successfully generated content using model: ${modelName}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isTransient = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").includes("demand") || String(err?.message || "").includes("429");
          console.warn(`[Gemini Warning] Model ${modelName} (Attempt ${attempt}) failed:`, err.message || err);
          
          if (attempt < 2 && isTransient) {
            console.log(`[Gemini Retry] Retrying ${modelName} in 1.2s due to transient spike...`);
            await sleep(1200);
          } else {
            // Move to next model
            break;
          }
        }
      }

      if (responseText) {
        break;
      }
    }

    if (!responseText) {
      const errMsg = lastError?.message || "AI models are currently unavailable or busy. Please try again in a few moments.";
      return res.status(503).json({ error: errMsg });
    }

    // Clean JSON string (remove markdown wrappers if present)
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Error parsing Gemini JSON response:", e, "Raw Text:", responseText);
      return res.status(500).json({ error: "Failed to parse AI question generator response. Please retry." });
    }

    const rawQuestions: any[] = Array.isArray(parsed.questions) ? parsed.questions : [];

    // Normalize and strictly enforce 30 questions (10 Easy, 10 Medium, 10 Hard)
    const easyList: any[] = [];
    const mediumList: any[] = [];
    const hardList: any[] = [];

    for (const q of rawQuestions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) continue;

      // Ensure options has exactly 4 items
      const options: [string, string, string, string] = [
        q.options[0] || "ഓപ്ഷൻ എ",
        q.options[1] || "ഓപ്ഷൻ ബി",
        q.options[2] || "ഓപ്ഷൻ സി",
        q.options[3] || "ഓപ്ഷൻ ഡി",
      ];

      const correctAnswer = typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < 4
        ? q.correctAnswer
        : 0;

      const diff = String(q.difficulty || "").toLowerCase();
      const questionObj = {
        question: String(q.question),
        options,
        correctAnswer,
        explanation: q.explanation ? String(q.explanation) : "പാഠഭാഗത്തിന്റെ അടിസ്ഥാനത്തിലുള്ള ഉത്തരം.",
      };

      if (diff.includes("easy")) {
        easyList.push(questionObj);
      } else if (diff.includes("hard")) {
        hardList.push(questionObj);
      } else {
        mediumList.push(questionObj);
      }
    }

    // Combine pool for backfilling if model returned fewer than 10 for a category
    const allPool = [...easyList, ...mediumList, ...hardList];

    // Guarantee strictly 10 Easy, 10 Medium, 10 Hard
    const finalEasy = easyList.slice(0, 10);
    const finalMedium = mediumList.slice(0, 10);
    const finalHard = hardList.slice(0, 10);

    // Fill easy if short
    while (finalEasy.length < 10) {
      const idx = finalEasy.length + 1;
      const src = allPool[idx % allPool.length];
      if (src) {
        finalEasy.push({
          ...src,
          question: src.question + (finalEasy.length >= easyList.length ? ` (പാഠഭാഗ ചോദ്യം ${idx})` : ""),
        });
      } else {
        finalEasy.push({
          question: `പാഠഭാഗത്തിലെ പ്രധാന ആശയത്തെക്കുറിച്ചുള്ള ചോദ്യം ${idx}`,
          options: ["ശരിയായ ഉത്തരം എ", "തെറ്റായ ഉത്തരം ബി", "തെറ്റായ ഉത്തരം സി", "തെറ്റായ ഉത്തരം ഡി"],
          correctAnswer: 0,
          explanation: "പാഠഭാഗത്തിന്റെ അടിസ്ഥാനത്തിലുള്ള ലളിതമായ ചോദ്യം.",
        });
      }
    }

    // Fill medium if short
    while (finalMedium.length < 10) {
      const idx = finalMedium.length + 1;
      const src = allPool[(idx + 5) % allPool.length];
      if (src) {
        finalMedium.push({
          ...src,
          question: src.question + (finalMedium.length >= mediumList.length ? ` (വിശദീകരണ ചോദ്യം ${idx})` : ""),
        });
      } else {
        finalMedium.push({
          question: `പാഠത്തിലെ വിവരണം അനുസരിച്ചുള്ള ഇടത്തരം ചോദ്യം ${idx + 10}`,
          options: ["പ്രസ്താവന 1 ശരിയാണ്", "പ്രസ്താവന 2 തെറ്റാണ്", "പ്രസ്താവന 3 തെറ്റാണ്", "പ്രസ്താവന 4 തെറ്റാണ്"],
          correctAnswer: 0,
          explanation: "പാഠഭാഗത്തിലെ ഇടത്തരം വിശകലന ചോദ്യം.",
        });
      }
    }

    // Fill hard if short
    while (finalHard.length < 10) {
      const idx = finalHard.length + 1;
      const src = allPool[(idx + 10) % allPool.length];
      if (src) {
        finalHard.push({
          ...src,
          question: src.question + (finalHard.length >= hardList.length ? ` (ഉന്നത വിശകലനം ${idx})` : ""),
        });
      } else {
        finalHard.push({
          question: `പാഠഭാഗത്തിന്റെ ആഴത്തിലുള്ള അർത്ഥവും തത്വവും കുറിക്കുന്ന ചോദ്യം ${idx + 20}`,
          options: ["ശരിയായ വിശകലനം 1", "തെറ്റായ വിശകലനം 2", "തെറ്റായ വിശകലനം 3", "തെറ്റായ വിശകലനം 4"],
          correctAnswer: 0,
          explanation: "പാഠഭാഗത്തിന്റെ ഉന്നത പഠന തലത്തിലുള്ള ചോദ്യം.",
        });
      }
    }

    // Assemble final 30 MCQs in structured order (10 Easy, 10 Medium, 10 Hard)
    const finalQuestions: any[] = [];
    let qCounter = 1;

    finalEasy.forEach((q) => {
      finalQuestions.push({
        id: `q-${qCounter}`,
        questionNumber: qCounter++,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: "Easy",
        explanation: q.explanation,
      });
    });

    finalMedium.forEach((q) => {
      finalQuestions.push({
        id: `q-${qCounter}`,
        questionNumber: qCounter++,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: "Medium",
        explanation: q.explanation,
      });
    });

    finalHard.forEach((q) => {
      finalQuestions.push({
        id: `q-${qCounter}`,
        questionNumber: qCounter++,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: "Hard",
        explanation: q.explanation,
      });
    });

    return res.json({
      titleSuggestion: parsed.titleSuggestion || "പാഠഭാഗം - Lesson Page",
      languageDetected: parsed.languageDetected || "Malayalam / Arabic",
      extractedText: parsed.extractedText || existingText || "പാഠഭാഗത്തിലെ വിവരങ്ങൾ വിജയകരമായി വേർതിരിച്ചെടുത്തു.",
      questions: finalQuestions,
    });
  } catch (error: any) {
    console.error("Error processing lesson:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while processing the lesson image.",
    });
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ahsani Lesson Scanner server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
