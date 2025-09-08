// Validate required ENV for frontend build/runtime
const api = process.env.VITE_API_BASE_URL || process.env.REACT_APP_VITE_API_BASE_URL || "";
if (!api) {
  console.error("[ENV] Missing VITE_API_BASE_URL. Configure it in CI (Vercel/GitHub) or local environment.");
  process.exit(1);
}
console.log(`[ENV] VITE_API_BASE_URL: ${api}`);

