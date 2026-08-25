/**
 * Fully static. There is no session, no data and nothing user-specific on this screen — it is copy
 * and one input — so it is built to HTML at deploy time and served from disk. This is the first
 * paint every applicant sees, and it costs no server render.
 */
export const prerender = true;
