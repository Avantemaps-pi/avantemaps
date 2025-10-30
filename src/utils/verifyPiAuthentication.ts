export async function verifyPiAuthentication(
  accessToken: string,
  uid: string,
  username: string
): Promise<{ verified: boolean; error?: string; details?: string }> {
  try {
    // 🔹 Call your Supabase Edge Function to verify Pi authentication
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/verify-pi-auth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ uid, username }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data?.verified) {
      return {
        verified: false,
        error: "Verification failed",
        details: data?.error || "Invalid Pi credentials or token",
      };
    }

    return { verified: true };
  } catch (error: any) {
    console.error("❌ verifyPiAuthentication error:", error);
    return {
      verified: false,
      error: "Verification request failed",
      details: error.message,
    };
  }
}
