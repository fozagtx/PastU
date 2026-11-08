/** Product mockups for the landing page. Pure markup, made-up data (Maya is a made-up person). */

export function HeroMockup() {
  return (
    <div className="mock" role="img" aria-label="Example: a countdown with a saved sentence from your past self">
      <div className="mockBar" aria-hidden>
        <i /><i /><i />
        <span>Past You</span>
      </div>
      <div className="mockBody">
        <p className="eyebrow">You tried to withdraw early</p>
        <p className="mockQuote">“I’m tired of being one bad month away from panic.”</p>
        <p className="mockCap">You wrote this on January 12, the day you made the promise.</p>
        <div className="mockTimerRow">
          <div>
            <p className="eyebrow">You can withdraw in</p>
            <p className="mockTimer">00:42</p>
          </div>
          <div className="mockBtns" aria-hidden>
            <span className="mockBtn dark">Keep my promise</span>
            <span className="mockBtn">Withdraw</span>
          </div>
        </div>
        <div className="mockBar2" aria-hidden><b style={{ width: "70%" }} /></div>
      </div>
      <div className="floatChip c1" aria-hidden><span className="dot" />400 SUI locked</div>
      <div className="floatChip c2" aria-hidden>Kept for 3 weeks</div>
    </div>
  );
}

export function MomentCards() {
  return (
    <div className="moments">
      <article className="moment">
        <div className="momentArt a1" aria-hidden>
          <div className="vaultCard"><span className="eyebrow">Vault</span><strong>400 SUI</strong><small>locked until Dec 1</small></div>
        </div>
        <h3>1. Lock it</h3>
        <p className="muted">Pick an amount and a date. Write one sentence about why it matters.</p>
      </article>
      <article className="moment">
        <div className="momentArt a2" aria-hidden>
          <div className="ring"><span>00:42</span></div>
        </div>
        <h3>2. Wait</h3>
        <p className="muted">Try to take it out early and a timer you chose starts. Nobody can skip it.</p>
      </article>
      <article className="moment">
        <div className="momentArt a3" aria-hidden>
          <div className="quoteCard">“Mum covered my rent in 2023. I never want to ask again.”<small>You, Feb 2</small></div>
        </div>
        <h3>3. Read your own words</h3>
        <p className="muted">While you wait, you see what you wrote. Then you decide.</p>
      </article>
    </div>
  );
}
