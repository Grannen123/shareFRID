/**
 * Login Page for Grannfrid CRM
 *
 * Supports Microsoft SSO authentication.
 */

import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { isMicrosoftAuthConfigured } from "@/lib/auth-config";

export function Login() {
  const {
    isAuthenticated,
    isLoading,
    login,
    loginWithMicrosoft,
    error,
    isDevMode,
  } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const location = useLocation();

  // Redirect if already authenticated
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleMicrosoftLogin = async () => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await loginWithMicrosoft();
    } catch (err) {
      setLocalError("Inloggning misslyckades. Försök igen.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingIn(true);
    setLocalError(null);
    try {
      await login();
    } catch (err) {
      setLocalError("Demo-inloggning misslyckades.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const displayError = localError || error;
  const isMicrosoftConfigured = isMicrosoftAuthConfigured();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary-100">
            <Building2 className="h-8 w-8 text-primary-600" />
          </div>
          <CardTitle className="text-2xl">Välkommen till Grannfrid</CardTitle>
          <p className="text-gray-500">
            Logga in för att komma åt CRM-systemet
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {!isMicrosoftConfigured && (
            <div className="flex items-center gap-2 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                Microsoft-inloggning är inte konfigurerad. Lägg till
                VITE_MICROSOFT_CLIENT_ID och VITE_MICROSOFT_TENANT_ID i
                .env.local
              </span>
            </div>
          )}

          <Button
            onClick={handleMicrosoftLogin}
            disabled={isLoggingIn || !isMicrosoftConfigured}
            className="w-full"
            size="lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loggar in...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-5 w-5"
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10 0H0V10H10V0Z" fill="#F25022" />
                  <path d="M21 0H11V10H21V0Z" fill="#7FBA00" />
                  <path d="M10 11H0V21H10V11Z" fill="#00A4EF" />
                  <path d="M21 11H11V21H21V11Z" fill="#FFB900" />
                </svg>
                Logga in med Microsoft
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">
                {isDevMode ? "Demo-läge" : "För demo-ändamål"}
              </span>
            </div>
          </div>

          {isDevMode && (
            <Button
              onClick={handleDemoLogin}
              disabled={isLoggingIn}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loggar in...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-5 w-5" />
                  Demo-inloggning
                </>
              )}
            </Button>
          )}

          <p className="text-center text-xs text-gray-500">
            Grannfrid CRM för bostadskonsulter i Sverige.
            {!isDevMode && (
              <>
                <br />
                Kontakta administratören om du har problem med inloggningen.
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
