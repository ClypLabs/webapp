import PolicyPage, { policyMetadata } from "@/app/components/PolicyPage";

export const metadata = policyMetadata("Cookie Notice", "Cookies and website measurement used by ClypDat.");

export default function CookiesPage() {
  return <PolicyPage title="Cookie Notice" sections={[
    { title: "Authentication cookies", content: <p>ClypDat uses cookies only when you use an account. Better Auth sets session and sign-in-flow cookies so the service can keep you signed in and protect sign-in requests. These cookies are necessary for the account feature. Signing out clears the session cookie.</p> },
    { title: "Website measurement", content: <><p>This site loads Vercel Web Analytics and Vercel Speed Insights. Web Analytics records page views, referrer, broad location, browser, operating system, device type, and performance context. This project does not send custom analytics events.</p><p>Vercel states that Web Analytics does not use cookies. It creates a request-derived visitor hash that resets after one day and is not used to track visitors across websites. Speed Insights sends page performance measurements to Vercel. Neither feature is used for advertising.</p></> },
    { title: "Managing cookies", content: <p>You can clear or block cookies in your browser settings. Blocking necessary ClypDat cookies prevents account sign-in from working. Browser privacy tools can also block Vercel measurement requests. Contact <a className="text-emerald-300 underline" href="mailto:hi@clypdat.xyz">hi@clypdat.xyz</a> with questions about this notice.</p> },
  ]} />;
}
