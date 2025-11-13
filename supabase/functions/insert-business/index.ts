import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formSchema, FormValues } from "@/components/business/registration/formSchema";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Hook: useBusinessRegistration
 * Handles all logic for business registration flow.
 */
export const useBusinessRegistration = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<string | null>(null);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessTypes: [],
      mondayClosed: false,
      tuesdayClosed: false,
      wednesdayClosed: false,
      thursdayClosed: false,
      fridayClosed: false,
      saturdayClosed: false,
      sundayClosed: false,
    },
  });

  /**
   * Fetch current user and their subscription.
   * Ensures only authenticated users can register a business.
   */
  const fetchUserData = async () => {
    try {
      setIsLoadingUser(true);
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        toast.error("You must be logged in to register your business.");
        return;
      }

      setUserId(data.user.id);

      // Fetch subscription from 'users' table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("subscription")
        .eq("id", data.user.id)
        .maybeSingle();

      if (userError) throw userError;
      if (userData?.subscription) setSubscription(userData.subscription);
    } catch (err) {
      console.error("❌ Error fetching user data:", err);
      toast.error("Failed to load user information.");
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Immediately fetch user when hook mounts
  useState(() => {
    fetchUserData();
  });

  /**
   * Handle form submission and call Edge Function securely.
   */
  const onSubmit = async (values: FormValues) => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Build payload
      const payload = {
        user_id: userId,
        subscription: subscription ?? "Free",
        business_name: values.businessName,
        business_types: values.businessTypes,
        business_description: values.businessDescription,
        contact_email: values.email,
        phone_number: values.phone,
        website: values.website || null,
        pi_wallet_address: values.piWalletAddress,
        address: {
          street: values.streetAddress,
          apartment: values.apartment,
          city: values.city,
          state: values.state,
          zip_code: values.zipCode,
          country: values.country,
        },
        hours: {
          monday: values.mondayClosed
            ? { closed: true }
            : { open: values.mondayOpen, close: values.mondayClose },
          tuesday: values.tuesdayClosed
            ? { closed: true }
            : { open: values.tuesdayOpen, close: values.tuesdayClose },
          wednesday: values.wednesdayClosed
            ? { closed: true }
            : { open: values.wednesdayOpen, close: values.wednesdayClose },
          thursday: values.thursdayClosed
            ? { closed: true }
            : { open: values.thursdayOpen, close: values.thursdayClose },
          friday: values.fridayClosed
            ? { closed: true }
            : { open: values.fridayOpen, close: values.fridayClose },
          saturday: values.saturdayClosed
            ? { closed: true }
            : { open: values.saturdayOpen, close: values.saturdayClose },
          sunday: values.sundayClosed
            ? { closed: true }
            : { open: values.sundayOpen, close: values.sundayClose },
        },
        owner: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      };

      // Retrieve current session JWT for Edge Function auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        toast.error("Authentication token missing. Please re-login.");
        return;
      }

      // Call Edge Function
      const { data, error } = await supabase.functions.invoke("insert-business", {
        body: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (error) {
        console.error("❌ Error inserting business:", error);
        toast.error("Failed to register business. Please try again.");
        return;
      }

      toast.success("✅ Business registered successfully!");
      form.reset();
      navigate("/dashboard");

    } catch (err) {
      console.error("❌ Unexpected error during business registration:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    onSubmit,
    isSubmitting,
    isLoadingUser,
    userId,
    subscription,
  };
};
