import { createFileRoute } from "@tanstack/react-router";
import Registration from "@/pages/Registration";

export const Route = createFileRoute("/registration")({
  component: Registration,
});
