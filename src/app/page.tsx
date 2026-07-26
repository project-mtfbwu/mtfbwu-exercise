import { redirect } from "next/navigation";
import { ROUTES } from "@/shared/config/constants";

/** Home redirects to Today — the flat-lay board home. */
export default function HomePage() {
  redirect(ROUTES.today);
}
