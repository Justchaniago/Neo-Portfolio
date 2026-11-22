type ProjectBase = {
  slug: string;
  number: string;
  title: string;
  category: string;
  product: string;
  focus: string;
  year?: string;
  summary: string;
  deliverables: readonly string[];
  stack: readonly string[];
  accent: string;
  accentSoft: string;
  repository?: string;
  upstream?: string;
  workflowHeading: string;
  workflow: readonly { step: string; description: string }[];
};

export type RetailProject = ProjectBase & {
  visualKind: "wheel" | "pass";
  retail: {
    headline: readonly [string, string];
    dateline: string;
    rule: readonly [string, string];
    briefTitle: string;
    brief: string;
    invitation: string;
    liveUrl: string;
    screenshots: readonly [RetailScreen, ...RetailScreen[]];
  };
};

type RetailScreen = {
  src: string;
  label: string;
  alt: string;
  width: number;
  height: number;
  sample?: boolean;
};

export type StandardProject = ProjectBase & {
  visualKind: "incident" | "film" | "workspace";
  retail?: never;
  chapters: readonly { index: string; heading: string; body: string }[];
};

export type ProjectItem = RetailProject | StandardProject;

export const PROJECTS: readonly ProjectItem[] = [
  {
    slug: "neo-avo",
    number: "01",
    title: "Neo-AVO",
    category: "Agent operations",
    product: "Autonomous Virtual Office",
    focus: "Monitoring & incident response",
    year: "2026",
    summary: "When a scheduled job goes quiet, what should happen next? Neo-AVO gives operators one place to trace the failure, choose a response, and check whether it worked.",
    deliverables: ["Incident monitoring", "Telegram alerts", "Operator commands"],
    stack: ["Next.js", "TypeScript", "PostgreSQL", "Drizzle ORM"],
    accent: "#ce9038",
    accentSoft: "#f4e5cc",
    visualKind: "incident",
    repository: "https://github.com/Justchaniago/Neo-AVO",
    workflowHeading: "Incident lifecycle",
    workflow: [
      { step: "Open", description: "A failure or overdue run opens an incident." },
      { step: "Acknowledged", description: "An operator has seen the incident. The job still needs attention." },
      { step: "Resolved", description: "Recovery evidence or an explicit operator decision closes the record." },
    ],
    chapters: [
      {
        index: "01",
        heading: "The run that never arrived",
        body: "A failed report can leave an error. A report that never starts leaves nothing to read. Neo-AVO tracks expected runs alongside the events agents actually send, so a missed execution can surface as an incident rather than an empty dashboard.",
      },
      {
        index: "02",
        heading: "One failure, one thread",
        body: "If the same task fails again in the same project and environment, the operator should not have to piece together a second case. Matching failures reuse the unresolved incident. Telegram brings the alert to the operator; the dashboard keeps the record.",
      },
      {
        index: "03",
        heading: "A suggestion is not a command",
        body: "An AI recommendation cannot restart a worker. An operator must request a supported action, such as retrying a task. Each command carries an identity, a scope, and an expiry. Acknowledgement records receipt; completion records the outcome. They are deliberately not the same thing.",
      },
    ],
  },
  {
    slug: "gong-cha-spin",
    number: "02",
    title: "Gong Cha Spin",
    category: "In-store activation",
    product: "Gong Cha Spin",
    focus: "Grand opening at Central Park",
    summary: "Scan the flyer at Central Park, spin for a reward, then take the voucher to the counter. Gong Cha's opening-day campaign fits on a guest's phone, right down to the code the cashier needs.",
    deliverables: ["Mobile campaign & opt-in form", "Prize wheel & voucher issuance", "Cashier scanner", "Campaign admin"],
    stack: ["Next.js", "TypeScript", "Supabase"],
    accent: "#b63949",
    accentSoft: "#f2dadd",
    visualKind: "wheel",
    repository: "https://github.com/Justchaniago/gongcha-spin-centralpark",
    retail: {
      headline: ["From flyer", "to first sip."],
      dateline: "07 Nov 2026 / Central Park Mall",
      rule: ["01", "spin per entry"],
      briefTitle: "What happens after the wheel stops?",
      brief: "A guest wants to know what they won. A cashier needs to know whether it has already been claimed. The same voucher answers both questions: it shows the offer on the guest's phone and gives staff a unique code to check before they serve it.",
      invitation: "Planning a launch that starts on a phone and ends in store?",
      liveUrl: "https://gongcha-spin-centralpark.vercel.app",
      screenshots: [
        { label: "Prize wheel", src: "/projects/gong-cha-spin/wheel-sample.webp", width: 748, height: 1060, sample: true, alt: "Product wheel with four offers, including buy one get one, rendered locally for a demo guest." },
        { label: "Poster", src: "/projects/gong-cha-spin/mobile.webp", width: 780, height: 1688, alt: "Live mobile landing page: two illustrated tea cups and a Get your voucher button." },
        { label: "Entry form", src: "/projects/gong-cha-spin/desktop.webp", width: 1440, height: 900, alt: "Live desktop page: opening-day artwork beside the registration form and consent checkbox." },
      ],
    },
    workflowHeading: "Try a sample spin",
    workflow: [
      { step: "Let the flyer do the inviting.", description: "The QR opens a branded registration page. A visitor gives their name, WhatsApp number and email, and consents before they play." },
      { step: "Make one spin mean one spin.", description: "Each WhatsApp number and email gets one entry. The reward is tied to a unique voucher, not just the wheel animation." },
      { step: "Finish where the drink is served.", description: "Staff scan the voucher and confirm redemption. The campaign has a record of the claim as well as the original win." },
    ],
  },
  {
    slug: "vimax",
    number: "03",
    title: "ViMax",
    category: "Video workflow adaptation",
    product: "ViMax",
    focus: "Project-specific adaptation",
    summary: "From a written idea to a sequence of shots. This project adapts HKUDS/ViMax to a project-specific video production workflow.",
    deliverables: ["Storyboard", "Render", "Review"],
    stack: ["Python", "TypeScript", "Vite"],
    accent: "#248b87",
    accentSoft: "#d7ece9",
    visualKind: "film",
    repository: "https://github.com/Justchaniago/ViMax",
    upstream: "https://github.com/HKUDS/ViMax",
    workflowHeading: "Video production workflow",
    workflow: [
      { step: "Storyboard", description: "HKUDS/ViMax provides baseline script and storyboard workflows." },
      { step: "Render", description: "The baseline video workflow turns the storyboard into generated output." },
      { step: "Review", description: "Chaniago's contribution is project-specific adaptation and refinements." },
    ],
    chapters: [
      {
        index: "01",
        heading: "From idea to storyboard",
        body: "HKUDS/ViMax provides baseline script and storyboard workflows that take a written idea toward a sequence of shots.",
      },
      {
        index: "02",
        heading: "Render the sequence",
        body: "The baseline video workflow follows the storyboard with generated video output, connecting the writing and shot-planning stages.",
      },
      {
        index: "03",
        heading: "A project-specific adaptation",
        body: "Chaniago's contribution is limited to project-specific adaptation and refinements. The baseline script, storyboard, and video workflows are from HKUDS/ViMax.",
      },
    ],
  },
  {
    slug: "gong-cha-vip",
    number: "04",
    title: "Gong Cha VIP",
    category: "Digital membership",
    product: "Gong Cha VIP",
    focus: "Central Park rewards program",
    summary: "A Gong Cha prize made for repeat visits. Members bring the same pass each time; staff scan a fresh code, record the cups and see what's left for the next visit.",
    deliverables: ["Invite & pass activation", "Member pass with rotating QR", "Staff verification", "Cup limits & redemption history", "Program admin"],
    stack: ["Next.js", "TypeScript", "Supabase"],
    accent: "#976235",
    accentSoft: "#eee2d4",
    visualKind: "pass",
    retail: {
      headline: ["Thirty cups.", "One pass."],
      dateline: "12 Nov – 31 Dec 2026 / Central Park Mall",
      rule: ["30", "cups per pass"],
      briefTitle: "A prize that remembers the last visit.",
      brief: "The one-month prize covered thirty Medium drinks, not one purchase. On a return visit, staff needed two answers: is this pass current, and how many cups can this member claim today? A paper stamp card couldn't answer both.",
      invitation: "Designing a reward people come back to use?",
      liveUrl: "https://gongcha-vip-pass.vercel.app",
      screenshots: [
        { label: "Member pass", src: "/projects/gong-cha-vip/pass-sample.webp", width: 732, height: 1218, sample: true, alt: "Member pass rendered with demo data: a sample QR, 28 cups left on the pass and 8 left for the day." },
        { label: "Phone login", src: "/projects/gong-cha-vip/mobile.webp", width: 780, height: 1688, alt: "Live VIP sign-in on a phone, with username or WhatsApp number and password fields." },
        { label: "Web login", src: "/projects/gong-cha-vip/desktop.webp", width: 1440, height: 900, alt: "Live desktop sign-in for Gong Cha's one-month pass." },
      ],
    },
    workflowHeading: "Try a sample visit",
    workflow: [
      { step: "Invite once. Bring it back.", description: "A WhatsApp invitation opens the pass in a browser. Members set a password and can return with their username or WhatsApp number." },
      { step: "Check the code on the phone.", description: "The QR refreshes every 60 seconds. An expired code prompts a fresh scan, and the cashier confirms with a staff PIN." },
      { step: "Keep two balances, not two lists.", description: "Each claim counts against both the 10-cup daily limit and the 30-cup pass. Staff get a reference for the transaction; members can see their redemption history." },
    ],
  },
  {
    slug: "gong-cha-workspace",
    number: "05",
    title: "Gong Cha Workspace",
    category: "Architecture study",
    product: "Gong Cha member ecosystem",
    focus: "Mobile app, service layer & admin",
    summary: "A map of the Gong Cha member ecosystem: what belongs in the mobile app, what the service layer owns, and what the store team manages on the web.",
    deliverables: ["Mobile app architecture", "FastAPI service layer", "Next.js admin"],
    stack: ["React Native", "Expo", "FastAPI", "Next.js admin"],
    accent: "#446f97",
    accentSoft: "#dbe5ee",
    visualKind: "workspace",
    workflowHeading: "Documented architecture",
    chapters: [
      {
        index: "01",
        heading: "Member experience on mobile",
        body: "The documented mobile app uses React Native and Expo as the member-facing layer.",
      },
      {
        index: "02",
        heading: "Separate the service layer",
        body: "FastAPI is the documented backend, distinct from both the member app and the store team's web workspace.",
      },
      {
        index: "03",
        heading: "A web workspace for stores",
        body: "The documented admin uses Next.js. This case study presents the member ecosystem as an architecture and documentation study.",
      },
    ],
    workflow: [
      { step: "Mobile app", description: "React Native and Expo are the documented member-app layer." },
      { step: "Service layer", description: "FastAPI is the documented backend layer." },
      { step: "Admin web", description: "Next.js is the documented web admin layer for the store team." },
    ],
  },
];

export const PROJECT_COUNT = String(PROJECTS.length).padStart(2, "0");

export function getProjectBySlug(slug: string) {
  const index = PROJECTS.findIndex((project) => project.slug === slug);
  if (index < 0) return null;
  return { project: PROJECTS[index], index };
}
