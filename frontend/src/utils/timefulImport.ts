const blockedImportHostnamePattern =
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.|0\.0\.0\.0|localhost$|\[?::1\]?)/

export function isBlockedTimefulImportUrl(
  urlString: string,
  currentHostname: string
): boolean {
  try {
    const hostname = new URL(urlString).hostname

    return hostname === currentHostname || blockedImportHostnamePattern.test(hostname)
  } catch {
    return false
  }
}
