/**
 * OpenLense Frontend API Configuration
 * Supports environment overrides with local development fallbacks.
 */

export const VISION_API_URL =
  process.env.NEXT_PUBLIC_VISION_API_URL || "http://localhost:8001";

export const RAG_API_URL =
  process.env.NEXT_PUBLIC_RAG_API_URL || "http://127.0.0.1:8002";

export const UNIFIED_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
