// Deterministic paywall-link filter. Runs after any AI stage that produces
// article body content (drafting, revision rewrites) as a belt-and-suspenders
// safety net. Even with strong prompt guidance, models sometimes slip in a
// link to Forbes or WSJ because the research brief included one and nothing
// deterministic was stopping it.
//
// The filter replaces `[text](paywalled-url)` with plain `text` (the link
// text stays, just the URL goes). Removing the whole phrase would disrupt
// the prose; keeping the link text preserves the attribution the model
// wanted to make while removing the broken click experience.

// Domains known to hide most or all content behind a subscribe wall.
// Ordered roughly by how often they show up in research results for the
// ICP's topics. This is a blocklist, not a full taxonomy — some of these
// domains have freely-accessible pages too, but preserving those edge cases
// isn't worth the risk of the user clicking into a subscribe prompt.
const PAYWALLED_DOMAINS: RegExp[] = [
  /(^|\.)forbes\.com$/i,
  /(^|\.)wsj\.com$/i,          // Wall Street Journal
  /(^|\.)nytimes\.com$/i,
  /(^|\.)bloomberg\.com$/i,
  /(^|\.)ft\.com$/i,           // Financial Times
  /(^|\.)hbr\.org$/i,          // Harvard Business Review
  /(^|\.)theatlantic\.com$/i,
  /(^|\.)economist\.com$/i,
  /(^|\.)businessinsider\.com$/i,
  /(^|\.)wired\.com$/i,
  /(^|\.)newyorker\.com$/i,
  /(^|\.)washingtonpost\.com$/i,
  /(^|\.)latimes\.com$/i,
  /(^|\.)vanityfair\.com$/i,
  /(^|\.)theinformation\.com$/i,
  /(^|\.)seekingalpha\.com$/i,
  /(^|\.)barrons\.com$/i,
  /(^|\.)marketwatch\.com$/i,  // shared paywall with WSJ
  /(^|\.)fortune\.com$/i,
  /(^|\.)axios\.com\/pro/i,    // Axios Pro (the rest of Axios is free)
  // Medium members-only posts: /*-[hash] URLs under medium.com are usually
  // member-only. This regex is imperfect (catches some free posts too) but
  // erring on the safe side is the right call.
  /(^|\.)medium\.com$/i,
];

// Returns true if the URL points to a paywalled domain.
export function isPaywalledUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PAYWALLED_DOMAINS.some((pattern) => pattern.test(hostname));
  } catch {
    // Malformed URL — not our job to flag it here
    return false;
  }
}

// Strip paywalled links from a markdown article body. Each occurrence of
// `[text](paywalled-url)` becomes just `text` (plain text, no link). Logs
// a warning per strip so we can see which sources are being filtered.
//
// Leaves non-paywalled links untouched. Leaves image syntax (`![...]()`)
// untouched since images aren't hyperlinks a reader clicks into a paywall.
export function stripPaywalledLinks(body: string): { body: string; strippedUrls: string[] } {
  const strippedUrls: string[] = [];

  // Match `[text](url)` but not `![alt](url)` by requiring the char before
  // the opening bracket is NOT a `!`. JavaScript RegExp lookbehind is widely
  // supported in Node 18+, which the sandbox uses.
  const linkPattern = /(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

  const cleaned = body.replace(linkPattern, (match, linkText: string, url: string) => {
    if (isPaywalledUrl(url)) {
      strippedUrls.push(url);
      // Preserve the link text as plain prose. This keeps the attribution
      // visible ("according to Forbes") while removing the broken click.
      return linkText;
    }
    return match;
  });

  if (strippedUrls.length > 0) {
    console.warn(`[paywall] Stripped ${strippedUrls.length} paywalled link(s):`, strippedUrls);
  }

  return { body: cleaned, strippedUrls };
}
