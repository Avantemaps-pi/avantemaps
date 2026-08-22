import { createFileRoute } from "@tanstack/react-router";
import RegisteredBusiness from "@/pages/RegisteredBusiness";

export const Route = createFileRoute("/registered-business")({
  component: RegisteredBusiness,
});
