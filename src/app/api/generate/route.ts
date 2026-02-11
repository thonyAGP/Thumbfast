import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import type { OutputMode, GridLayout } from "@/lib/generation-config";

const ALLOWED_MODELS = [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
] as const;

type AllowedModel = (typeof ALLOWED_MODELS)[number];

const MODE_PROMPTS: Record<OutputMode, string> = {
  thumbnail:
    "YouTube thumbnail, 16:9 landscape, bold text, click-worthy, cinematic lighting, high contrast",
  icon: "App icon, square 1:1, minimal, recognizable at small sizes, no text unless requested",
  logo: "Logo design, clean vector-style, scalable, professional, transparent-friendly",
  cartoon:
    "Cartoon/illustrated style, exaggerated features, vivid colors, comic-like",
  avatar:
    "Profile picture, centered face/subject, square 1:1, clean background",
  social: "Social media post, square 1:1, engaging, scroll-stopping",
  banner:
    "Wide banner, 3:1 ratio, horizontal composition, clean with space for overlay",
};

const GRID_PROMPTS: Record<number, string> = {
  2: "Compose the image as a side-by-side split (2 panels).",
  3: "Compose the image as a triptych (3 panels).",
  4: "Compose the image as a 2x2 grid (4 panels/quadrants).",
};

const buildPrompt = (
  userPrompt: string,
  hasExtraImages: boolean,
  hasInspiration: boolean,
  hasPersons: boolean,
  modes: OutputMode[],
  grid: GridLayout,
  blend: boolean,
  model: AllowedModel
) => {
  const parts: string[] = [];
  const isFlash = model === "gemini-2.5-flash-image";

  const modeDescriptions = modes.map((m) => MODE_PROMPTS[m]).join(". ");
  parts.push(
    `You are an expert visual designer. Generate an image with the following style: ${modeDescriptions}.`
  );

  // Flash needs extra explicitness on style expectations
  if (isFlash) {
    parts.push(
      "IMPORTANT: You MUST produce a single, high-quality, finished image. Do NOT return text descriptions, sketches, or placeholder graphics. Output a fully rendered, production-ready image."
    );
    if (modes.includes("thumbnail")) {
      parts.push(
        "The image MUST be in 16:9 landscape format (wider than tall), resembling a real YouTube thumbnail with photorealistic quality, dramatic lighting, and vivid saturated colors."
      );
    }
    if (modes.includes("cartoon")) {
      parts.push(
        "The cartoon style must have clean outlines, cel-shading, vibrant flat colors, and exaggerated proportions like a professional illustration."
      );
    }
    if (modes.includes("logo")) {
      parts.push(
        "The logo must be crisp, centered, with clean geometric shapes and minimal detail. Think professional brand identity, not clip-art."
      );
    }
    if (modes.includes("icon")) {
      parts.push(
        "The icon must be extremely simple, with a single recognizable symbol, solid colors, and no fine details that would be lost at 64x64 pixels."
      );
    }
  }

  parts.push(`\nUser request: ${userPrompt.trim()}`);

  if (hasPersons || hasInspiration || hasExtraImages) {
    parts.push("\nContext about the attached images:");
    if (hasPersons) {
      parts.push(
        "- PERSONS: Photos of real people provided. You MUST include these exact faces/people prominently in the image. Preserve their likeness accurately."
      );
    }
    if (hasInspiration) {
      parts.push(
        "- INSPIRATION: A reference image provided. Match its style, composition, color grading, and layout. Do NOT copy it literally, use it as a visual direction guide."
      );
    }
    if (hasExtraImages) {
      parts.push(
        "- EXTRA IMAGES: Additional visual assets provided. Integrate them naturally into the composition."
      );
    }
  }

  if (grid > 1) {
    parts.push(`\nLayout: ${GRID_PROMPTS[grid]}`);
    if (isFlash) {
      parts.push(
        `The final output MUST be a single image divided into exactly ${grid} distinct visual sections/panels. Do NOT generate ${grid} separate images.`
      );
    }
    if (blend) {
      parts.push(
        "The panels should blend smoothly into each other with seamless transitions and gradients between sections, not hard borders."
      );
    }
  }

  parts.push("\nMandatory requirements:");
  parts.push("- Colors: vibrant, saturated, eye-catching");
  parts.push(
    "- Composition: bold, dramatic, with a clear focal point and visual hierarchy"
  );
  parts.push(
    "- If text is requested, make it large, bold, with strong contrast against the background (use outlines, shadows, or colored backgrounds behind text)"
  );
  parts.push("- Generate a COMPLETE new image, not just overlays or edits");

  // Flash: repeat key constraints at the end for reinforcement
  if (isFlash) {
    parts.push("\nREMINDER: Output exactly ONE finished image. No text-only responses. No wireframes. A real, rendered, high-quality image.");
  }

  return parts.join("\n");
};

export async function POST(req: Request) {
  const password = req.headers.get("x-access-password");
  if (!password || password !== process.env.ACCESS_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    prompt,
    extraImages = [],
    inspirationImages = [],
    personImages = [],
    model,
    modes = ["thumbnail"] as OutputMode[],
    grid = 1 as GridLayout,
    blend = false,
    count = 1,
  } = (await req.json()) as {
    prompt: string;
    extraImages?: string[];
    inspirationImages?: string[];
    personImages?: string[];
    model?: string;
    modes?: OutputMode[];
    grid?: GridLayout;
    blend?: boolean;
    count?: number;
  };

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }

  const imageCount = Math.min(Math.max(1, Math.round(count)), 4);

  const selectedModel: AllowedModel = ALLOWED_MODELS.includes(
    model as AllowedModel
  )
    ? (model as AllowedModel)
    : "gemini-2.5-flash-image";

  const fullPrompt = buildPrompt(
    prompt,
    extraImages.length > 0,
    inspirationImages.length > 0,
    personImages.length > 0,
    modes,
    grid,
    blend,
    selectedModel
  );

  // Order matters: persons first (most important), then inspiration, then extras
  const allImages = [...personImages, ...inspirationImages, ...extraImages];

  const messageContent = [
    { type: "text" as const, text: fullPrompt },
    ...allImages.map((img: string) => ({
      type: "image" as const,
      image: img,
    })),
  ];

  try {
    // Fire N parallel calls — Gemini returns 1 image per call
    const results = await Promise.allSettled(
      Array.from({ length: imageCount }, (_, i) =>
        generateText({
          model: google(selectedModel),
          providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
          },
          messages: [
            {
              role: "user",
              content:
                imageCount > 1
                  ? [
                      ...messageContent,
                      {
                        type: "text" as const,
                        text: `\nThis is variation ${i + 1} of ${imageCount}. Make it visually distinct from other variations.`,
                      },
                    ]
                  : messageContent,
            },
          ],
        })
      )
    );

    const generatedImages: Array<{ data: string; mediaType: string }> = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const file of result.value.files ?? []) {
        if (file.mediaType.startsWith("image/")) {
          generatedImages.push({
            data: file.base64,
            mediaType: file.mediaType,
          });
        }
      }
    }

    return Response.json({ images: generatedImages, model: selectedModel });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
