import styles from "./LabsDispatch.module.css";

const beats = [
  { word: "SEND", title: "A booking lands.", copy: "Someone hits send on your website. Who checks the calendar? Who tells the team? If a person copies that booking into three places, I want to see all three." },
  { word: "SYNC", title: "Enter it once.", copy: "I connect the form to the calendar. If the team needs its own queue, I build one. An AI draft can help with a messy request; the person who knows the customer still decides what to send." },
  { word: "DONE", title: "Hand it over.", copy: "I ask the person at the counter to move a booking. Does the old slot open up? Does the team see the new time? If they can do it without calling me, the build is ready." },
] as const;

export function LabsDispatch() {
  return <div className={styles.story} id="after-send" data-cut-story data-press-live="">
    <div className={styles.press} data-type-press>
      <h3>What happens after you hit send?</h3>
      <div className={styles.machine} aria-hidden="true">
        <div className={styles.slots} data-type-roller>
          {Array.from(beats[0].word, (_, i) => (
            <div key={i} className={styles.slot}>
              <div className={styles.belt} data-type-belt>
                {beats.map(({ word }) => <span key={word}>{word[i]}</span>)}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.rail} data-type-rail><i data-type-carriage /></div>
      </div>
    </div>
    <ol className={styles.beats}>
      {beats.map(({ word, title, copy }) => <li key={word} data-type-beat>
        <span className={styles.imprint} aria-hidden="true">{word}</span>
        <h4>{title}</h4>
        <p>{copy}</p>
      </li>)}
    </ol>
  </div>;
}
