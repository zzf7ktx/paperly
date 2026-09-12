'use client';

export function DemoDocument() {
  return (
    <article className="pdf-page demo-page" aria-label="Example PDF preview">
      <div className="paper-logo">
        <span>P</span> NORTHLINE
      </div>
      <div className="paper-meta">
        <span>PARTNERSHIP AGREEMENT</span>
        <span>SEPTEMBER 24, 2026</span>
      </div>
      <h1>
        Building what&apos;s next,
        <br />
        together.
      </h1>
      <div className="editable selected" tabIndex={0}>
        A partnership designed for sustainable growth.
      </div>
      <div className="selection-label">Text</div>
      <div className="paper-columns">
        <div>
          <h3>01 — THE VISION</h3>
          <p>
            We believe the best work happens when ambitious people share a clear direction. This agreement
            sets the foundation for a thoughtful, transparent collaboration.
          </p>
        </div>
        <div>
          <h3>02 — OUR COMMITMENT</h3>
          <p>
            Both teams commit to open communication, considered decisions, and outcomes that create lasting
            value for everyone involved.
          </p>
        </div>
      </div>
      <footer>
        <span>Northline Studio × Alpine Works</span>
        <span>01</span>
      </footer>
    </article>
  );
}
