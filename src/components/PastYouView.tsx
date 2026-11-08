import type { ReactNode } from "react";
import type { PastYouDTO } from "@/lib/types";
import { fmtDate, triggerLabel } from "@/lib/client/format";
import { BlobLink } from "./BlobLink";
import s from "./PastYouView.module.css";

/**
 * The heart of the app: the user's own words first, large; counts small below.
 * Re-keyed per attempt so the content visibly fades to the new ordering.
 */
export function PastYouView({ dto, demo = false, children }: { dto: PastYouDTO; demo?: boolean; children?: ReactNode }) {
  if (dto.emergency) {
    return (
      <section key={`e${dto.attemptNumber}`} className={`${s.wrap} fade-in`} aria-label="Emergency">
        <p className="eyebrow">Emergency</p>
        <p className={s.calm}>This is an emergency exit. No persuasion, just the timer.</p>
        <div className={s.after}>{children}</div>
      </section>
    );
  }
  const [first, ...rest] = dto.quotes;
  return (
    <section key={`a${dto.attemptNumber}`} className={s.wrap} aria-label="Past You">
      <p className={`eyebrow ${s.step} fade-in`}>Attempt {dto.attemptNumber} · {triggerLabel[dto.trigger] ?? dto.trigger}</p>

      {first ? (
        <figure className={`${s.hero} fade-in`} style={{ animationDelay: ".1s" }}>
          <blockquote className={`big-serif ${s.heroQuote}`}>“{first.text}”</blockquote>
          <figcaption className={s.cap}>
            <span>You wrote this on {fmtDate(first.date)}.</span> <span className={s.tpl}>{first.template}</span>
            <div className={s.counts}>
              shown {first.stats.shown} · held {first.stats.held} · regretted {first.stats.regretted} <BlobLink blobId={first.blobId} demo={demo} />
            </div>
          </figcaption>
        </figure>
      ) : (
        <p className="big-serif fade-in">You haven’t written anything yet, so this one is quiet.</p>
      )}

      {children && <div className={`${s.after} fade-in`} style={{ animationDelay: ".3s" }}>{children}</div>}

      {rest.length > 0 && (
        <details className={s.more}>
          <summary>More of your words ({rest.length})</summary>
        <ol className={s.rest}>
          {rest.map((q, i) => (
            <li key={q.reasonId} className="fade-in" style={{ animationDelay: `${0.35 + i * 0.2}s` }}>
              <p className={s.restQuote}>“{q.text}”</p>
              <p className="faint">{fmtDate(q.date)} · {q.template} <BlobLink blobId={q.blobId} demo={demo} /></p>
            </li>
          ))}
        </ol>
        </details>
      )}

      {dto.history.length > 0 && (
        <details className={`${s.more} ${s.history}`}>
          <summary>Times before ({dto.history.length})</summary>
          <ul>
            {dto.history.map((h) => (
              <li key={h.number}>
                <span className="faint">{fmtDate(h.at)} · {triggerLabel[h.trigger] ?? h.trigger}</span>
                <p>“{h.urge}”</p>
                <p className="muted">
                  {h.result === "held" ? "You held." : h.result === "exited" ? "You withdrew." : "Still open."}
                  {h.felt === "fine" ? " Looking back, it felt fine." : h.felt === "regret" ? " Looking back, it felt like a mistake." : ""}
                  {h.finding ? ` ${h.finding}` : ""} <BlobLink blobId={h.blobId} demo={demo} />
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className={`faint ${s.src}`}>Ordered by {dto.orderSource === "llm" ? "a model, from your own history" : "simple rules, from your own history"}. Only your words are ever shown.</p>
    </section>
  );
}
