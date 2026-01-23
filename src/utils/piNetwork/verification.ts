/**
 * Pi Network – verification utilities
 * Works with patched core.ts authentication flow.
 */

import { supabase } from "@/integrations/supabase/client";
import { secureLog } from "@/utils/secureLogger";
import { SUPABASE_CONFIG, getSupabaseFunctionsUrl } from "@/config/supabase";

export interface VerificationResult {
  verified: boolean;
  supabaseToken?: string | null;
  refreshToken?: string | null;
  error?: string;
  details?: string;
  traceId?: string;
}

/**
 * Verifies a Pi authentication result against your Supabase Function.
 * Includes automatic fallback if supabase.functions.invoke fails.
 */
export const verifyPiAuthentication = async (
  accessToken: string,
  uid: string,
  username: string,
  testMode: boolean = false
): Promise<VerificationResult> => {
  try {
    const sanitizedUid = uid.trim();
    const sanitizedUsername = username.trim();

    secureLog.info(
      `Verifying Pi authentication for user: ${sanitizedUsername}${testMode ? " (TEST MODE)" : ""}`
    );

    const payload = {
      accessToken,
      uid: sanitizedUid,
      username: sanitizedUsername,
    };

    // -----------------------------
    // Primary Attempt — Supabase Invoke
    // -----------------------------
    let data: any = null;
    let error: any = null;

    try {
      const functionName = testMode
        ? "verify-pi-auth?test=true"
        : "verify-pi-auth";

      const result = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      data = result.data;
      error = result.error;

      if (error) {
        secureLog.error("Supabase invoke error", {
          status: error?.status,
          msg: error?.message,
        });
      }
    } catch (invokeException) {
      secureLog.error("Supabase invoke threw exception", invokeException);
      error = invokeException;
    }

    // -------------------------------------
    // Fallback — Direct Fetch (when invoke fails)
    // -------------------------------------
    if (error && !data) {
      secureLog.info("FALLBACK MODE: Trying direct fetch to Supabase Function...");

      try {
        const baseUrl = `${getSupabaseFunctionsUrl()}/verify-pi-auth`;
        const url = testMode ? `${baseUrl}?test=true` : baseUrl;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          secureLog.error("Fallback fetch failed", {
            status: response.status,
            body: text.substring(0, 200),
          });

          error = { status: response.status, message: text };
        } else {
          data = await response.json();
          error = null;
          secureLog.info("Fallback fetch succeeded.");
        }
      } catch (fallbackException) {
        secureLog.error("Fallback fetch threw exception", fallbackException);
      }
    }

    // -----------------------------
    // Handle Failure
    // -----------------------------
    if (error) {
      const status = error?.status ?? 500;

      let msg = "Verification failed";
      let detail = `Server returned HTTP ${status}`;

      switch (status) {
        case 401:
          msg = "Invalid authentication token";
          detail =
            "Your Pi session likely expired. Please open Avante Maps inside the Pi Browser.";
          break;

        case 403:
          msg = "Authentication mismatch";
          detail = "The credentials received from Pi were not valid.";
          break;

        case 502:
        case 503:
          msg = "Pi Network is temporarily unavailable";
          detail = "Please try again shortly.";
          break;

        case 500:
          msg = "Backend verification error";
          detail = "An unexpected error occurred verifying your credentials.";
          break;
      }

      return {
        verified: false,
        error: msg,
        details: detail,
      };
    }

    // -----------------------------
    // Handle Success
    // -----------------------------
    if (data?.verified) {
      secureLog.info("Pi authentication verified successfully", {
        traceId: data?.traceId,
      });

      return {
        verified: true,
        supabaseToken: data.supabase_token ?? data.supabaseToken ?? null,
        refreshToken: data.refresh_token ?? data.refreshToken ?? null,
        traceId: data.traceId,
      };
    }

    return {
      verified: false,
      error: data?.error || "Verification failed",
      details: data?.details || "Unknown verification issue",
      traceId: data?.traceId,
    };
  } catch (unexpectedError: any) {
    secureLog.error("Unexpected error verifying Pi authentication", unexpectedError);

    return {
      verified: false,
      error: "Network error",
      details: unexpectedError?.message || "Unexpected verification error",
    };
  }
};

/**
 * Convert internal auth errors → helpful user messages.
 */
export const getDetailedAuthError = (
  error: any
): { message: string; userMessage: string } => {
  if (!error) {
    return {
      message: "Unknown authentication error",
      userMessage: "Authentication failed. Please try again.",
    };
  }

  const msg =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : JSON.stringify(error);

  const lower = msg.toLowerCase();

  if (lower.includes("timeout"))
    return {
      message: msg,
      userMessage: "The request timed out. Please check your connection.",
    };

  if (lower.includes("network") || lower.includes("fetch"))
    return {
      message: msg,
      userMessage:
        "Network error. Ensure you are connected to the internet and retry.",
    };

  if (
    lower.includes("pi sdk") ||
    lower.includes("sdk not available") ||
    lower.includes("pi is not defined")
  )
    return {
      message: msg,
      userMessage: "Pi SDK is unavailable. Please open this inside Pi Browser.",
    };

  if (lower.includes("cancel"))
    return {
      message: msg,
      userMessage: "You cancelled the login request.",
    };

  if (lower.includes("invalid") || lower.includes("expired"))
    return {
      message: msg,
      userMessage:
        "Your Pi session expired. Open the app again inside Pi Browser.",
    };

  return {
    message: msg,
    userMessage: msg,
  };
};
