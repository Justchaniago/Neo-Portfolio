import { useState } from "react";
import styles from "./RetailStudy.module.css";

const voucherStates = [
  { label: "Guest entry", slip: "One spin", status: "Registration is complete. Play the visitor's turn.", action: "Spin the sample wheel" },
  { label: "Cashier copy", slip: "Buy 1, get 1", status: "The guest won a buy-one-get-one offer. Accept the sample voucher as the cashier.", action: "Mark voucher redeemed" },
  { label: "Counter record", slip: "Redeemed", status: "Claim recorded. The voucher is used; the guest's entry stays spent.", action: "Start another example" },
] as const;

export function SpinCounter() {
  const [step, setStep] = useState(0);
  const state = voucherStates[step];
  return (
    <>
      <div className={styles.counterVisual} data-spun={step > 0}>
        <div className={styles.wheelMount} aria-hidden="true">
          <div className={styles.wheel} />
          <span className={styles.hub}>GC</span>
        </div>
        <div className={styles.slip}>
          <span className={styles.micro}>{state.label}</span>
          <strong>{state.slip}</strong>
          <span className={styles.stub}>SPECIMEN / {String(step + 1).padStart(2, "0")}</span>
        </div>
      </div>
      <p role="status" className={styles.feedback}>{state.status}</p>
      <button className={styles.action} type="button" onClick={() => setStep(current => (current + 1) % voucherStates.length)}>
        {state.action}<span aria-hidden="true">→</span>
      </button>
    </>
  );
}

const PASS_LIMIT = 30;
const DAILY_LIMIT = 10;
const SAMPLE_ORDER = 2;
const freshPass = { day: 1, today: 0, used: 0 };

export function PassCounter() {
  const [visit, setVisit] = useState(freshPass);
  const balance = PASS_LIMIT - visit.used;
  const availableToday = Math.min(balance, DAILY_LIMIT - visit.today);
  const step = () => {
    setVisit(previous => {
      if (previous.used === PASS_LIMIT) return freshPass;
      if (previous.today === DAILY_LIMIT) return { ...previous, day: previous.day + 1, today: 0 };
      return { ...previous, today: previous.today + SAMPLE_ORDER, used: previous.used + SAMPLE_ORDER };
    });
  };
  return (
    <>
      <div className={styles.passBook}>
        <div className={styles.passBalance}>
          <span className={styles.micro}>Member balance</span>
          <strong>{balance}<small> / {PASS_LIMIT}</small></strong>
        </div>
        <div className={styles.punches} aria-hidden="true">
          {Array.from({ length: PASS_LIMIT }, (_, i) => <i key={i} data-used={i < visit.used} />)}
        </div>
      </div>
      <p role="status" className={styles.feedback}>
        {balance === 0 ? "Pass complete. All 30 cups have been claimed." :
          `Day ${visit.day}: ${availableToday ? `${availableToday} cups available today` : "daily limit reached"}. ${balance} left on the pass.`}
      </p>
      <div className={styles.actions}>
        <button className={styles.action} type="button" onClick={step}>
          {balance === 0 ? "Start a fresh pass" : availableToday === 0 ? "Start next sample day" : "Record a 2-cup visit"}
          <span aria-hidden="true">→</span>
        </button>
        <button className={styles.quiet} type="button" onClick={() => setVisit(freshPass)}>Reset</button>
      </div>
    </>
  );
}
