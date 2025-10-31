import React from "react";
import { Button } from "@/components/ui/button";
import { usePiAuth } from "@/hooks/usePiAuth";
import { useAuth } from "@/context/auth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const PiAuthButton = () => {
  const { loginWithPi } = usePiAuth();
  const { setUser } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const handlePiLogin = async () => {
    setLoading(true);
    try {
      // Step 1: Authenticate with Pi
      const piResult = await loginWithPi();
      if (!piResult.verified || !piResult.supabase_token || !piResult.user) {
        toast.error(piResult.error || "Pi authentication failed.");
        setLoading(false);
        return;
      }

      // Step 2: Set Supabase session
      const { data, error } = await supabase.auth.setSession(piResult.supabase_token);
      if (error) {
        console.error("Supabase session error:", error);
        toast.error("Failed to create Supabase session. Try again.");
        setLoading(false);
        return;
      }

      // Step 3: Update Auth context
      setUser({
        uid: piResult.user.uid,
        username: piResult.user.username,
        walletAddress: piResult.user.wallet_address || "",
        session: data?.session || null,
      });

      toast.success(`Welcome, ${piResult.user.username}!`);
    } catch (err: any) {
      console.error("Pi login error:", err);
      toast.error(err.message || "Unexpected error during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePiLogin}
      disabled={loading}
      className="bg-[#5a00cc] hover:bg-[#4a00aa] text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Authenticating...
        </>
      ) : (
        "Sign in with Pi Network"
      )}
    </Button>
  );
};
