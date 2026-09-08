import PolicyPage, { policyMetadata } from "@/app/components/PolicyPage";

export const metadata = policyMetadata("Terms of Service", "Terms for ClypDat accounts and connected services.");

export default function TermsPage() {
  return <PolicyPage title="Terms of Service" sections={[
    { title: "Using ClypDat", content: <><p>ClypDat is software from ClypLabs. You may use it only if you are at least 13, meet any higher local minimum age, and have a parent or guardian’s permission when you are under 18.</p><p>You are responsible for your account, password, and devices. Keep credentials private and tell us at <a className="text-emerald-300 underline" href="mailto:hi@clypdat.xyz">hi@clypdat.xyz</a> if you believe your account was used without permission.</p></> },
    { title: "Recording and lawful use", content: <><p>Get permission when required before recording people, voices, communications, games, or other content. Follow laws, platform rules, game rules, copyright rules, and the rights of people shown or heard in a recording.</p><p>Do not use ClypDat to harm others, break laws, interfere with services, or access accounts or data without permission.</p></> },
    { title: "Accounts and connected providers", content: <><p>Accounts are optional for local recording. Google, Discord, and Microsoft/Xbox connections are optional account features. Their services remain governed by their own terms and privacy notices.</p><p>You can disconnect a provider or delete your ClypDat account from Account settings. Deleting a ClypDat account removes its stored connections; it does not revoke permissions at an external provider or delete that provider account.</p></> },
    { title: "Service changes and rights", content: <><p>We may change, suspend, or end features when needed for security, maintenance, legal compliance, or service operation. We may suspend accounts that violate these terms.</p><p>Consumer rights that cannot be waived under applicable law remain in place. ClypDat includes open-source software under separate licences; those licences continue to apply to their components.</p></> },
  ]} />;
}
