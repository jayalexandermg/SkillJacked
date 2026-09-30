/**
 * Rows saved before core stored canonical links kept the URL exactly as
 * pasted, including YouTube's `si` share-tracking parameter, which identifies
 * whoever copied the link. Strip it wherever a stored link is shown.
 */
export function cleanSourceUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('si');
    return parsed.toString();
  } catch {
    return url;
  }
}
