import PolicyPage, { policyMetadata } from "@/app/components/PolicyPage";

export const metadata = policyMetadata("Privacy Policy", "How ClypLabs handles ClypDat account and connected-service data.");

export default function PrivacyPage() {
  return <PolicyPage title="Privacy Policy" sections={[
    { title: "Scope", content: <p>This policy covers ClypDat accounts and cloud-connected features operated by ClypLabs. Recordings saved on your device stay local to that device. We do not upload or store local recordings through the account service.</p> },
    { title: "Data we process", content: <><p>Account records include name, email address, account identifier, sign-in method, sessions, and account timestamps. Service logs can include IP address, browser or device details, request details, and error information.</p><p>For Google and Discord connections, we store the provider account record needed for sign-in. For Xbox, we store Xbox identifiers such as gamertag and XUID, optional activity data, and an encrypted refresh token so ClypDat can refresh the connection without sending Microsoft credentials to the browser.</p></> },
    { title: "Why and where", content: <p>We use this data to operate accounts, sign-in, linked providers, Xbox activity, security, and support. ClypDat is hosted using Vercel and a managed Postgres database. Vercel Analytics receives site usage information. We do not sell personal data or use it for targeted advertising.</p> },
    { title: "Retention and deletion", content: <><p>Account data and stored connections remain while your account exists. Deleting your account removes its user, sessions, authentication accounts, and stored Xbox connection from live service databases. Local recordings, and your Google, Discord, and Microsoft accounts, remain intact.</p><p>Backups and hosting logs can retain data after live deletion under their normal rotation and retention processes. Contact <a className="text-emerald-300 underline" href="mailto:hi@clypdat.xyz">hi@clypdat.xyz</a> for privacy requests or account-deletion help.</p></> },
  ]} />;
}
