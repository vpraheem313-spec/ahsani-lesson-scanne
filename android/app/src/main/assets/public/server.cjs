var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/process-lesson", async (req, res) => {
  try {
    const { imageDataUrl, imageDataUrls, extractedText: existingText } = req.body;
    const imagesList = [];
    if (Array.isArray(imageDataUrls) && imageDataUrls.length > 0) {
      imagesList.push(...imageDataUrls.slice(0, 5));
    } else if (imageDataUrl) {
      imagesList.push(imageDataUrl);
    }
    if (imagesList.length === 0 && !existingText) {
      return res.status(400).json({ error: "At least one lesson page image or existing extracted text is required." });
    }
    const ai = getGeminiClient();
    const contentsParts = [];
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
            extraTextFromSvg += `

[Scanned Page ${pageNum} SVG Content]:
${decodedSvg}`;
          } catch (e) {
            console.warn(`Could not decode SVG text for page ${pageNum}`, e);
          }
        } else {
          contentsParts.push({
            inlineData: {
              mimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
              data: base64Data
            }
          });
        }
      }
    });
    const pageCountText = imagesList.length > 1 ? `There are ${imagesList.length} pages in this lesson (Page 1 to Page ${imagesList.length}). Please combine all pages into one comprehensive lesson extraction.` : "There is 1 lesson page.";
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
5. Provide a short descriptive title for the lesson based on its combined content (e.g., "\u0D24\u0D1C\u0D4D\u200C\u0D35\u0D40\u0D26\u0D4D \u0D2A\u0D3E\u0D20\u0D02 - \u0D2E\u0D26\u0D4D\u0D26\u0D4D \u0D28\u0D3F\u0D2F\u0D2E\u0D19\u0D4D\u0D19\u0D7E" or "Fiqh Lesson 3").
6. Provide a complete, neat text extraction of all lesson pages in Malayalam/Arabic in logical page order.`;
    let promptText = existingText ? `Here is the extracted lesson content across all pages:

${existingText}

Please generate EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard) based ONLY on this combined lesson content.` : `Please analyze the provided lesson page image(s) (${pageCountText}). Extract the full readable text in Malayalam and Arabic across all pages in order, suggest a title for the lesson, and generate EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard) based strictly on the combined lesson content.`;
    if (extraTextFromSvg) {
      promptText += extraTextFromSvg;
    }
    contentsParts.push({ text: promptText });
    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
    let responseText = "";
    let lastError = null;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    for (const modelName of candidateModels) {
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
                type: import_genai.Type.OBJECT,
                properties: {
                  titleSuggestion: {
                    type: import_genai.Type.STRING,
                    description: "A clear short title for this lesson in Malayalam/Arabic/English"
                  },
                  languageDetected: {
                    type: import_genai.Type.STRING,
                    description: "Primary language of the lesson, e.g. Malayalam, Arabic, or Malayalam/Arabic"
                  },
                  extractedText: {
                    type: import_genai.Type.STRING,
                    description: "Complete text content extracted from the lesson page image"
                  },
                  questions: {
                    type: import_genai.Type.ARRAY,
                    description: "Array of EXACTLY 30 MCQs based on the lesson",
                    items: {
                      type: import_genai.Type.OBJECT,
                      properties: {
                        question: { type: import_genai.Type.STRING },
                        options: {
                          type: import_genai.Type.ARRAY,
                          items: { type: import_genai.Type.STRING },
                          description: "Exactly 4 options"
                        },
                        correctAnswer: {
                          type: import_genai.Type.INTEGER,
                          description: "0, 1, 2, or 3 index of the correct option"
                        },
                        difficulty: {
                          type: import_genai.Type.STRING,
                          description: "Must be 'Easy', 'Medium', or 'Hard'"
                        },
                        explanation: { type: import_genai.Type.STRING }
                      },
                      required: ["question", "options", "correctAnswer", "difficulty"]
                    }
                  }
                },
                required: ["titleSuggestion", "extractedText", "questions"]
              }
            }
          });
          if (response.text) {
            responseText = response.text;
            console.log(`[Gemini Success] Successfully generated content using model: ${modelName}`);
            break;
          }
        } catch (err) {
          lastError = err;
          const isTransient = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").includes("demand") || String(err?.message || "").includes("429");
          console.warn(`[Gemini Warning] Model ${modelName} (Attempt ${attempt}) failed:`, err.message || err);
          if (attempt < 2 && isTransient) {
            console.log(`[Gemini Retry] Retrying ${modelName} in 1.2s due to transient spike...`);
            await sleep(1200);
          } else {
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
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Error parsing Gemini JSON response:", e, "Raw Text:", responseText);
      return res.status(500).json({ error: "Failed to parse AI question generator response. Please retry." });
    }
    const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const easyList = [];
    const mediumList = [];
    const hardList = [];
    for (const q of rawQuestions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length < 2) continue;
      const options = [
        q.options[0] || "\u0D13\u0D2A\u0D4D\u0D37\u0D7B \u0D0E",
        q.options[1] || "\u0D13\u0D2A\u0D4D\u0D37\u0D7B \u0D2C\u0D3F",
        q.options[2] || "\u0D13\u0D2A\u0D4D\u0D37\u0D7B \u0D38\u0D3F",
        q.options[3] || "\u0D13\u0D2A\u0D4D\u0D37\u0D7B \u0D21\u0D3F"
      ];
      const correctAnswer = typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < 4 ? q.correctAnswer : 0;
      const diff = String(q.difficulty || "").toLowerCase();
      const questionObj = {
        question: String(q.question),
        options,
        correctAnswer,
        explanation: q.explanation ? String(q.explanation) : "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D\u0D31\u0D46 \u0D05\u0D1F\u0D3F\u0D38\u0D4D\u0D25\u0D3E\u0D28\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D41\u0D33\u0D4D\u0D33 \u0D09\u0D24\u0D4D\u0D24\u0D30\u0D02."
      };
      if (diff.includes("easy")) {
        easyList.push(questionObj);
      } else if (diff.includes("hard")) {
        hardList.push(questionObj);
      } else {
        mediumList.push(questionObj);
      }
    }
    const allPool = [...easyList, ...mediumList, ...hardList];
    const finalEasy = easyList.slice(0, 10);
    const finalMedium = mediumList.slice(0, 10);
    const finalHard = hardList.slice(0, 10);
    while (finalEasy.length < 10) {
      const idx = finalEasy.length + 1;
      const src = allPool[idx % allPool.length];
      if (src) {
        finalEasy.push({
          ...src,
          question: src.question + (finalEasy.length >= easyList.length ? ` (\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 ${idx})` : "")
        });
      } else {
        finalEasy.push({
          question: `\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D46 \u0D2A\u0D4D\u0D30\u0D27\u0D3E\u0D28 \u0D06\u0D36\u0D2F\u0D24\u0D4D\u0D24\u0D46\u0D15\u0D4D\u0D15\u0D41\u0D31\u0D3F\u0D1A\u0D4D\u0D1A\u0D41\u0D33\u0D4D\u0D33 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 ${idx}`,
          options: ["\u0D36\u0D30\u0D3F\u0D2F\u0D3E\u0D2F \u0D09\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D0E", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D09\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D2C\u0D3F", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D09\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D38\u0D3F", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D09\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D21\u0D3F"],
          correctAnswer: 0,
          explanation: "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D\u0D31\u0D46 \u0D05\u0D1F\u0D3F\u0D38\u0D4D\u0D25\u0D3E\u0D28\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D41\u0D33\u0D4D\u0D33 \u0D32\u0D33\u0D3F\u0D24\u0D2E\u0D3E\u0D2F \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02."
        });
      }
    }
    while (finalMedium.length < 10) {
      const idx = finalMedium.length + 1;
      const src = allPool[(idx + 5) % allPool.length];
      if (src) {
        finalMedium.push({
          ...src,
          question: src.question + (finalMedium.length >= mediumList.length ? ` (\u0D35\u0D3F\u0D36\u0D26\u0D40\u0D15\u0D30\u0D23 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 ${idx})` : "")
        });
      } else {
        finalMedium.push({
          question: `\u0D2A\u0D3E\u0D20\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D46 \u0D35\u0D3F\u0D35\u0D30\u0D23\u0D02 \u0D05\u0D28\u0D41\u0D38\u0D30\u0D3F\u0D1A\u0D4D\u0D1A\u0D41\u0D33\u0D4D\u0D33 \u0D07\u0D1F\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 ${idx + 10}`,
          options: ["\u0D2A\u0D4D\u0D30\u0D38\u0D4D\u0D24\u0D3E\u0D35\u0D28 1 \u0D36\u0D30\u0D3F\u0D2F\u0D3E\u0D23\u0D4D", "\u0D2A\u0D4D\u0D30\u0D38\u0D4D\u0D24\u0D3E\u0D35\u0D28 2 \u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D23\u0D4D", "\u0D2A\u0D4D\u0D30\u0D38\u0D4D\u0D24\u0D3E\u0D35\u0D28 3 \u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D23\u0D4D", "\u0D2A\u0D4D\u0D30\u0D38\u0D4D\u0D24\u0D3E\u0D35\u0D28 4 \u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D23\u0D4D"],
          correctAnswer: 0,
          explanation: "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D46 \u0D07\u0D1F\u0D24\u0D4D\u0D24\u0D30\u0D02 \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02."
        });
      }
    }
    while (finalHard.length < 10) {
      const idx = finalHard.length + 1;
      const src = allPool[(idx + 10) % allPool.length];
      if (src) {
        finalHard.push({
          ...src,
          question: src.question + (finalHard.length >= hardList.length ? ` (\u0D09\u0D28\u0D4D\u0D28\u0D24 \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28\u0D02 ${idx})` : "")
        });
      } else {
        finalHard.push({
          question: `\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D\u0D31\u0D46 \u0D06\u0D34\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D41\u0D33\u0D4D\u0D33 \u0D05\u0D7C\u0D24\u0D4D\u0D25\u0D35\u0D41\u0D02 \u0D24\u0D24\u0D4D\u0D35\u0D35\u0D41\u0D02 \u0D15\u0D41\u0D31\u0D3F\u0D15\u0D4D\u0D15\u0D41\u0D28\u0D4D\u0D28 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02 ${idx + 20}`,
          options: ["\u0D36\u0D30\u0D3F\u0D2F\u0D3E\u0D2F \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28\u0D02 1", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28\u0D02 2", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28\u0D02 3", "\u0D24\u0D46\u0D31\u0D4D\u0D31\u0D3E\u0D2F \u0D35\u0D3F\u0D36\u0D15\u0D32\u0D28\u0D02 4"],
          correctAnswer: 0,
          explanation: "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D28\u0D4D\u0D31\u0D46 \u0D09\u0D28\u0D4D\u0D28\u0D24 \u0D2A\u0D20\u0D28 \u0D24\u0D32\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D41\u0D33\u0D4D\u0D33 \u0D1A\u0D4B\u0D26\u0D4D\u0D2F\u0D02."
        });
      }
    }
    const finalQuestions = [];
    let qCounter = 1;
    finalEasy.forEach((q) => {
      finalQuestions.push({
        id: `q-${qCounter}`,
        questionNumber: qCounter++,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: "Easy",
        explanation: q.explanation
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
        explanation: q.explanation
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
        explanation: q.explanation
      });
    });
    return res.json({
      titleSuggestion: parsed.titleSuggestion || "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D02 - Lesson Page",
      languageDetected: parsed.languageDetected || "Malayalam / Arabic",
      extractedText: parsed.extractedText || existingText || "\u0D2A\u0D3E\u0D20\u0D2D\u0D3E\u0D17\u0D24\u0D4D\u0D24\u0D3F\u0D32\u0D46 \u0D35\u0D3F\u0D35\u0D30\u0D19\u0D4D\u0D19\u0D7E \u0D35\u0D3F\u0D1C\u0D2F\u0D15\u0D30\u0D2E\u0D3E\u0D2F\u0D3F \u0D35\u0D47\u0D7C\u0D24\u0D3F\u0D30\u0D3F\u0D1A\u0D4D\u0D1A\u0D46\u0D1F\u0D41\u0D24\u0D4D\u0D24\u0D41.",
      questions: finalQuestions
    });
  } catch (error) {
    console.error("Error processing lesson:", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred while processing the lesson image."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ahsani Lesson Scanner server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
