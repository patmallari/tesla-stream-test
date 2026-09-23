// A handful of hosts are well documented to send X-Frame-Options / CSP
// frame-ancestors headers that refuse embedding on every normal page —
// Google in particular sets this across all of google.com. This list is
// necessarily incomplete (there's no registry of who blocks framing, and
// it can change), so treat it as "definitely skip these," not "everything
// else is safe." The escape hatch in WebViewPanel exists for everything
// this list doesn't catch.
const BLOCKED_HOSTS = [
  "google.com",
  "youtube.com",
  "netflix.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "amazon.com",
];

// A few well-known URL shapes are *specifically designed* to be embedded
// and are exempt even though their host is otherwise in the blocked list —
// e.g. Google's Maps "output=embed" trick and YouTube's /embed/ player URLs.
const EMBED_FRIENDLY_PATTERNS = [/[?&]output=embed(&|$)/i, /youtube\.com\/embed\//i];

function hostMatches(hostname, blockedHost) {
  return hostname === blockedHost || hostname.endsWith(`.${blockedHost}`);
}

/**
 * Best-effort guess at whether a URL will refuse to load in an iframe.
 * `true` means "skip the box, navigate directly instead" — not a claim
 * that framing is impossible for every other URL.
 */
export function likelyBlocksFraming(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    return false; // not a valid absolute URL — let the iframe itself report the problem
  }

  if (EMBED_FRIENDLY_PATTERNS.some((re) => re.test(url.href))) return false;
  return BLOCKED_HOSTS.some((host) => hostMatches(url.hostname, host));
}
