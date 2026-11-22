import styles from "./IncidentPlate.module.css";

export function IncidentPlate({ variant }: { variant: "hero" | "detailA" | "detailB" }) {
  if (variant === "hero") {
    return (
      <div className={styles.console}>
        <div className={styles.folio}><span>AVO / Signal desk</span><span>Illustration 01</span></div>
        <div className={styles.headline}>One missed run.</div>
        <svg className={styles.trace} viewBox="0 0 480 96" role="img" aria-label="Three recorded runs followed by one missed run">
          <path d="M0 68H480 M0 36H480" fill="none" stroke="#54574c" strokeDasharray="1 7" />
          <path d="M0 68H36l7 -12 6 12 6 -42 8 52 6 -10h61l7 -12 6 12 6 -42 8 52 6 -10h62l7 -12 6 12 6 -42 8 52 6 -10h36" fill="none" stroke="#c5ceb7" strokeWidth="2.5" />
          <path d="M295 68H480" fill="none" stroke="#eab15a" strokeWidth="2" strokeDasharray="5 5" />
          <rect x="330" y="9" width="69" height="78" fill="#eab15a" fillOpacity=".1" />
          <path d="M364 17v36m0 22v11" fill="none" stroke="#eab15a" strokeDasharray="3 3" />
          <circle cx="364" cy="68" r="5" stroke="#eab15a" strokeWidth="2" fill="#171b18" />
        </svg>
        <div className={styles.readout}><span>Scheduled report</span><strong>Overdue</strong></div>
        <div className={styles.foot}>Expected execution / sample trace</div>
      </div>
    );
  }

  const incident = variant === "detailA";
  const lines = incident
    ? [["09:00", "Report expected"], ["09:05", "Incident opened"], ["09:08", "Operator acknowledged"]]
    : [["Action", "Retry task"], ["Authority", "Operator request"], ["Receipt", "Command acknowledged"]];
  return (
    <div className={`${styles.record} ${incident ? styles.paper : styles.ink}`}>
      <div className={styles.folio}><span>AVO / {incident ? "Incident log" : "Command desk"}</span><span>{incident ? "01.A" : "01.B"}</span></div>
      <div className={styles.headline}>{incident ? "Incident record" : "Command receipt"}</div>
      <dl className={styles.rows}>{lines.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <div className={styles.foot}>Illustration / sample data</div>
    </div>
  );
}
