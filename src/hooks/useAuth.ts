/**
 * Re-export useAuth from AuthContext for convenience.
 * This allows importing from either:
 *   - import { useAuth } from "@/hooks/useAuth"
 *   - import { useAuth } from "@/contexts/AuthContext"
 */
export { useAuth } from "@/contexts/AuthContext";
export type { AuthContextType } from "@/contexts/AuthContext";
