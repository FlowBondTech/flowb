"use client";

const FARCASTER_DEEP_LINK = "https://farcaster.xyz/~/mini-apps/launch?domain=flowb-farcaster.netlify.app";
const BASE_DEEP_LINK = "https://base.org/miniapps?url=https://flowb-farcaster.netlify.app";

export function WebLanding() {
  return (
    <div className="web-landing">
      <div className="web-landing-content">
        <div className="web-landing-logo">
          <img src="/icon.png" alt="FlowB" width={80} height={80} style={{ borderRadius: 20 }} />
        </div>

        <h1 className="web-landing-title">FlowB</h1>
        <p className="web-landing-subtitle">
          Coordinate your crew, discover events, and earn points at EthDenver.
        </p>

        <p style={{ fontSize: 13, color: "var(--hint)", marginBottom: 16 }}>
          Open in the app on your phone
        </p>

        <div className="web-landing-buttons">
          <a href={FARCASTER_DEEP_LINK} className="btn btn-primary btn-block web-landing-btn">
            <svg width="20" height="20" viewBox="0 0 1000 1000" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M257.778 155.556H742.222V844.444H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.444H257.778V155.556Z"/>
              <path d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.444H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"/>
              <path d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.444H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"/>
            </svg>
            Open in Warpcast
          </a>

          <a href={BASE_DEEP_LINK} className="btn btn-block web-landing-btn web-landing-btn-base">
            <svg width="20" height="20" viewBox="0 0 111 111" fill="currentColor" style={{ marginRight: 8 }}>
              <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z"/>
            </svg>
            Open in Base App
          </a>
        </div>
      </div>

      <style jsx>{`
        .web-landing {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
        }
        .web-landing-content {
          width: 100%;
          max-width: 380px;
          text-align: center;
        }
        .web-landing-logo {
          margin-bottom: 20px;
        }
        .web-landing-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .web-landing-subtitle {
          font-size: 15px;
          color: var(--hint);
          line-height: 1.5;
          margin-bottom: 32px;
        }
        .web-landing-buttons {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .web-landing-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 600;
          padding: 14px 20px;
          border-radius: var(--radius);
          text-decoration: none;
          transition: opacity 0.15s, transform 0.1s;
          cursor: pointer;
        }
        .web-landing-btn:active {
          transform: scale(0.98);
        }
        .web-landing-btn-base {
          background: #0052FF;
          color: #fff;
          border: none;
        }
        .web-landing-btn-base:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}
