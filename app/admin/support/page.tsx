import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { currentAdminId } from "@/app/lib/admin";
import Ambience from "@/app/components/Ambience";
import SupportInbox from "./SupportInbox";
import { listSupportReports, type SupportReport } from "@/app/lib/support";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Diagnostic inbox - ClypDat", robots: { index: false, follow: false } };

export default async function SupportPage() {
  if (!(await currentAdminId(await headers()))) notFound();
  let reports: SupportReport[] = [];
  let error = "";
  try { reports = await listSupportReports(); }
  catch { error = "Inbox unavailable. Try again shortly."; }
  return <><Ambience layout="admin" /><SupportInbox initialReports={reports} initialError={error} /></>;
}
