import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Ambience from "@/app/components/Ambience";
import { currentAdminId } from "@/app/lib/admin";
import NoticeAdmin from "./NoticeAdmin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin - ClypDat",
  robots: { index: false, follow: false },
};

// Non-admins, signed out included, get the site's ordinary 404. Every API call
// the page makes checks again on its own (app/api/admin/*), so rendering this is
// not what grants anything.
export default async function AdminPage() {
  if (!(await currentAdminId(await headers()))) notFound();
  return (
    <>
      {/* Same atmosphere as the rest of the site, lit from different corners. */}
      <Ambience layout="admin" />
      <NoticeAdmin />
    </>
  );
}
