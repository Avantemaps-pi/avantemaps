import { createFileRoute } from "@tanstack/react-router";
import VerificationInfo from "@/pages/VerificationInfo";

export const Route = createFileRoute("/verification-info")({
  component: VerificationInfo,
});
