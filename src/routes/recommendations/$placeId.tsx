import { createFileRoute } from "@tanstack/react-router";
import Recommendations from "@/pages/Recommendations";

export const Route = createFileRoute("/recommendations/$placeId")({
  component: Recommendations,
});
