import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_WRITE_MAX_AGE_MS, currentAdmin, reauthMethods } from "@/app/lib/admin";
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
  const admin = await currentAdmin(await headers());
  if (!admin) notFound();
  return (
    <NoticeAdmin signedInAt={admin.signedInAt} writeWindowMs={ADMIN_WRITE_MAX_AGE_MS}
      email={admin.email} methods={await reauthMethods(admin.id)} />
  );
}
