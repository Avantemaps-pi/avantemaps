import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { verifyPiAuthentication } from "@/utils/verifyPiAuthentication";
import { toast } from "sonner";

export function usePiAuth() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  // 🔹 Main Pi Login Function
  const loginWithPi = async () => {
    if (!window.Pi) {
      toast.error("Pi Network SDK not available. Please open this in the Pi Browser.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Authenticate with Pi Network SDK
      const scopes = ["username", "payments"];
      const authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);

      if (!authResult) {
        toast.error("No authentication result received from Pi Network.");
        return;
      }

      const { accessToken, user: piUser } = authResult;

      if (!accessToken || !piUser) {
        toast.error("Incomplete authentication result. Please try again.");
        return;
      }

      const uid = piUser.uid;
      const username = piUser.username;

      // Step 2: Verify authentication with your Supabase function
      const verifyResult = await verifyPiAuthentication(accessToken, uid, username);

      if (!verifyResult.verified) {
        toast.error(verifyResult.error || "Verification failed", {
          description: verifyResult.details || "Could not verify Pi credentials.",
        });
        return;
      }

      // Step 3: Exchange token for Supabase session
      const { data, error } = await supabase.auth.signInWithPassword({
        email: `${username}@pi-network.local`,
        password: uid, // lightweight pseudo password for Supabase
      });

      if (error) {
        // If user doesn’t exist — create automatically
        const { data: signupData, error: signupError } = await supabase.auth.signUp({
          email: `${username}@pi-network.local`,
          password: uid,
          options: {
            data: {
              username,
              pi_uid: uid,
              pi_verified: true,
            },
          },
        });

        if (signupError) throw signupError;

        setUser(signupData.user);
        toast.success(`Welcome to Avante Maps, ${username}!`);
      } else {
        setUser(data.user);
        toast.success(`Welcome back, ${username}!`);
      }

    } catch (error: any) {
      console.error("❌ Pi Authentication Error:", error);
      toast.error("Authentication Failed", {
        description:
          error.message ||
          "Unable to verify your Pi Network account. Please try again in the Pi Browser.",
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast("You’ve been signed out.");
  };

  const onIncompletePaymentFound = (payment: any) => {
    console.log("⚠️ Incomplete payment detected:", payment);
    toast.warning("Incomplete Pi payment found — resolving...");
  };

  return {
    loginWithPi,
    logout,
    user,
    loading,
  };
}
