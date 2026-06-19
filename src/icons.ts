import type { DashboardLink } from "./config";

export type ResolvedIcon =
  | { kind: "image"; src: string }
  | { kind: "text"; value: string }
  | { kind: "emoji"; value: string };

export function resolveIcon(link: DashboardLink): ResolvedIcon {
  const icon = link.icon?.trim();

  if (!icon) {
    return { kind: "text", value: initialsFor(link.title) };
  }

  if (icon.startsWith("emoji:")) {
    return { kind: "emoji", value: icon.slice("emoji:".length).trim() || "*" };
  }

  if (icon.startsWith("initials:")) {
    return { kind: "text", value: icon.slice("initials:".length).trim() || initialsFor(link.title) };
  }

  if (icon.startsWith("url:")) {
    return { kind: "image", src: icon.slice("url:".length).trim() };
  }

  if (isUrl(icon)) {
    return { kind: "image", src: icon };
  }

  const dashboardIcon = icon.startsWith("dashboard:") ? icon.slice("dashboard:".length) : icon;
  const { slug, format } = normalizeDashboardIcon(dashboardIcon);

  if (!slug) {
    return { kind: "text", value: initialsFor(link.title) };
  }

  return {
    kind: "image",
    src: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${format}/${slug}.${format}`,
  };
}

export function initialsFor(title: string) {
  const words = title
    .replace(/https?:\/\//, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:image/");
}

function normalizeDashboardIcon(value: string) {
  const trimmed = value.trim().toLowerCase();
  const format = trimmed.endsWith(".png") ? "png" : "svg";
  const slug = trimmed
    .replace(/\.(svg|png)$/i, "")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return { slug, format };
}
