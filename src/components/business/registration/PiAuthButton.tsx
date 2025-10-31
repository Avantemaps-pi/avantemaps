import React from "react";
import { Button } from "@/components/ui/button";
import { usePiAuth } from "@/hooks/usePiAuth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";

export const PiAuthButton = () => {
  const { loginWithPi, loading } = usePiAuth();
  const { setUser } = useAuth();

  const handleLogin = async () => {
    try {
      const result = await loginWithPi();

      if (!result?.verified || !result?.supabase_token) {
        toast.error(result?.error || "Pi authentication failed.");
        return;
      }

      // ✅ Set Supabase session properly
      const { data: sessionData, error } = await supabase.auth.setSession({
        access_token: result.supabase_token,
        refresh_token: result.supabase_token,
      });

      if (error) {
        console.error("Supabase session error:", error);
        toast.error("Could not create Supabase session.");
        return;
      }

      console.log("✅ Supabase session user:", sessionData?.session?.user?.id);

      // ✅ Update context
      if (result.user) {
        setUser({
          uid: result.user.uid,
          username: result.user.username,
          walletAddress: result.user.wallet_address || "",
          session: sessionData?.session || null,
        });
      }

      toast.success(`Welcome, ${result.user?.username || "User"}!`);
    } catch (err: any) {
      console.error("Pi login error:", err);
      toast.error("Login failed.");
    }
  };

  return (
    <Button
      onClick={handleLogin}
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
