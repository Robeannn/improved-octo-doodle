export default {
  async fetch(request, env) {

    // Allow CORS from any origin (your GitHub Pages site)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
    }

    const { title, author, genre, color } = body;

    if (!title) {
      return new Response("Missing title", { status: 400, headers: corsHeaders });
    }

    // Build a prompt tailored to book spine art
    const prompt = buildPrompt(title, author, genre, color);

    try {
      // Call Cloudflare Workers AI - Flux 1 Schnell
      const response = await env.AI.run(
        "@cf/black-forest-labs/flux-1-schnell",
        {
          prompt,
          num_steps: 8,      // 4–8 is the sweet spot for schnell
          width: 128,        // Narrow — spine proportions (128×512)
          height: 512,
        }
      );

      // Response is a ReadableStream of the raw image bytes (PNG)
      return new Response(response, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400",
        },
      });

    } catch (err) {
      console.error("AI error:", err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
};

function buildPrompt(title, author, genre, color) {
  // Map genre to visual style keywords
  const genreStyles = {
    "fantasy":       "ornate gold runes, arcane symbols, magical glowing sigils, dark mystical",
    "epic fantasy":  "ornate gold runes, dragon scales, arcane symbols, dark mystical atmosphere",
    "sci-fi":        "circuit patterns, stars, geometric neon lines, futuristic holographic",
    "cosy sci-fi":   "soft planets, warm stars, gentle cosmic nebula, friendly space",
    "dystopia":      "cracked concrete texture, harsh red sky, industrial grime, oppressive",
    "horror":        "dripping shadows, bone texture, gothic decay, dark tendrils",
    "literary fiction": "minimal elegant lines, subtle watercolour wash, refined typographic",
    "dark academia": "aged parchment, ink patterns, classical architecture silhouette, candlelight",
    "romance":       "soft floral watercolour, delicate petals, warm golden light",
    "thriller":      "sharp diagonal lines, dark shadows, tension, monochromatic stark",
    "mystery":       "fog, silhouettes, moonlight, magnifying glass motif, noir atmosphere",
    "historical":    "antique map textures, aged gold leaf, classical engravings, sepia",
    "biography":     "clean portrait silhouette, clean lines, classic engraving style",
  };

  const g = (genre || "").toLowerCase();
  let styleHint = "elegant abstract patterns, rich textures";
  for (const [key, val] of Object.entries(genreStyles)) {
    if (g.includes(key)) { styleHint = val; break; }
  }

  // Derive a colour mood from the hex
  let colorMood = "deep rich colours";
  if (color) {
    const r = parseInt(color.slice(1,3),16);
    const g2 = parseInt(color.slice(3,5),16);
    const b = parseInt(color.slice(5,7),16);
    if (r > g2 && r > b) colorMood = "deep crimson and gold tones";
    else if (b > r && b > g2) colorMood = "deep navy and silver tones";
    else if (g2 > r && g2 > b) colorMood = "deep forest green and gold tones";
    else if (r > 100 && b > 100) colorMood = "deep purple and gold tones";
    else colorMood = "dark moody tones with metallic accents";
  }

  return [
    `Book spine cover art for "${title}" by ${author || "unknown author"}.`,
    `Genre: ${genre || "fiction"}.`,
    `Style: ${styleHint}.`,
    `Colour palette: ${colorMood}.`,
    "Vertical orientation, tall and narrow, ornate decorative design.",
    "No text, no letters, no words. Pure visual pattern and illustration.",
    "Rich detailed texture, high contrast, dramatic lighting.",
    "Painterly, professional book cover art quality.",
  ].join(" ");
}
