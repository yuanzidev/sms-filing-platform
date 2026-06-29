import { createFileRoute } from "@tanstack/react-router";
import { RolesPage } from "@/features/roles";

export const Route = createFileRoute("/_authenticated/users/roles")({
    component: RolesPage,
}); 