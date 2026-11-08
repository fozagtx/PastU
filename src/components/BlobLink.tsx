import { walrusBlobUrl } from "@/lib/client/config";
import { shortId } from "@/lib/client/format";

/** A "receipt": link to the stored Walrus blob. Demo blobs are not real, so they render as plain text. */
export function BlobLink({ blobId, demo }: { blobId?: string; demo?: boolean }) {
  if (!blobId) return null;
  if (demo) return <span className="faint">receipt {shortId(blobId, 4)} (demo)</span>;
  return <a className="faint" href={walrusBlobUrl(blobId)} target="_blank" rel="noreferrer">Walrus receipt {shortId(blobId, 4)}</a>;
}
