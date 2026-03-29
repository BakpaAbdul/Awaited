export const TRUST_PAGES = {
  privacy: {
    title: "Privacy Policy",
    intro:
      "Awaited is built around anonymous scholarship reporting. We keep the data we collect as limited as possible and use it only to run the service, reduce abuse, and moderate community content.",
    sections: [
      {
        heading: "What Awaited collects",
        items: [
          "Anonymous report fields such as scholarship name, country, level, field, outcome dates, notes, and anonymous comments.",
          "Technical anti-abuse data such as CAPTCHA verification results, IP-derived fingerprint hashes, and moderation metadata used to slow spam and repeated abuse.",
          "Moderator account details for authorized admins who sign in to review queued content.",
        ],
      },
      {
        heading: "How Awaited uses that data",
        items: [
          "To publish public scholarship timelines and community signals.",
          "To review, approve, reject, hide, or delete suspicious content.",
          "To secure the service, investigate abuse, and keep the feed usable.",
        ],
      },
      {
        heading: "What you should never post",
        items: [
          "Do not post passport numbers, application IDs, email addresses, phone numbers, bank details, admission documents, or any other personal identifiers.",
          "Do not post information that could expose another applicant without their consent.",
        ],
      },
      {
        heading: "Retention and moderation",
        items: [
          "Approved submissions can remain public until removed by a moderator or the original service policy changes.",
          "Rejected, hidden, and anti-abuse records can be retained for security and moderation purposes.",
        ],
      },
    ],
  },
  community: {
    title: "Community Rules",
    intro:
      "Awaited works only if reports are honest, useful, and safe for other applicants. These rules apply to reports, comments, and scholarship-name submissions.",
    sections: [
      {
        heading: "Post accurate scholarship updates",
        items: [
          "Submit only real updates about your own scholarship process or first-hand experience.",
          "Do not invent outcomes, impersonate committees, or post rumor as fact.",
        ],
      },
      {
        heading: "Protect anonymity",
        items: [
          "Keep posts free of phone numbers, email addresses, usernames, links, or other identifying information.",
          "Do not pressure others to contact you off-platform.",
        ],
      },
      {
        heading: "Respect other applicants",
        items: [
          "No harassment, abuse, discrimination, threats, or mocking of rejected applicants.",
          "No marketing, fundraising, lead generation, or unrelated promotion.",
        ],
      },
      {
        heading: "Moderation outcomes",
        items: [
          "Awaited may queue, reject, hide, or delete posts that look misleading, abusive, or spammy.",
          "Repeat abuse can result in stricter automated filtering or permanent removal of content.",
        ],
      },
    ],
  },
  disclaimer: {
    title: "Community Disclaimer",
    intro:
      "Awaited is a community reporting platform, not an official scholarship authority. Every public result is a user-submitted signal and should be read with caution.",
    sections: [
      {
        heading: "Not official scholarship communication",
        items: [
          "Awaited is not operated by scholarship providers, universities, embassies, or government agencies.",
          "A post on Awaited does not confirm that decisions have officially been released.",
        ],
      },
      {
        heading: "Use Awaited as a signal, not proof",
        items: [
          "Community reports can be incomplete, mistaken, delayed, or malicious even after moderation.",
          "Always verify timelines and eligibility details through the official scholarship website, email, or portal.",
        ],
      },
      {
        heading: "No professional advice",
        items: [
          "Awaited does not provide legal, immigration, financial, or admissions advice.",
          "You remain responsible for your own application decisions and document security.",
        ],
      },
    ],
  },
};
