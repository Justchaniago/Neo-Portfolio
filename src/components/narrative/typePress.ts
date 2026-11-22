const unit = (n: number) => Math.min(1, Math.max(0, n));
const ease = (n: number) => n * n * (3 - 2 * n);

export function typePress(story: HTMLElement) {
  const head = story.querySelector<HTMLElement>("[data-type-press]")!;
  const belts = Array.from(story.querySelectorAll<HTMLElement>("[data-type-belt]"));
  const beats = Array.from(story.querySelectorAll<HTMLElement>("[data-type-beat]"));
  const carriage = story.querySelector<HTMLElement>("[data-type-carriage]")!;
  let marks: number[] = [], last = -1;

  function reset() {
    marks = [];
    last = -1;
    delete story.dataset.pressLive;
    for (const part of [...belts, carriage]) part.style.removeProperty("transform");
  }

  return {
    measure(origin: number, view: number, live: boolean) {
      if (!live) { reset(); return; }
      story.dataset.pressLive = "";
      const beside = getComputedStyle(story).display === "grid";
      const headBottom = parseFloat(getComputedStyle(head).top) + head.offsetHeight;
      // At large text sizes, prefer printed words to pinning over the reading area.
      if (headBottom > view || (!beside && view - headBottom < 150)) { reset(); return; }
      const readingLine = beside ? view * 0.52 : (view + headBottom) / 2;
      marks = beats.map(beat => {
        const box = beat.getBoundingClientRect();
        return box.top + origin + box.height / 2 - readingLine;
      });
      last = -1;
    },
    draw(y: number) {
      if (!marks.length) return;
      const leg = y < marks[1] ? 0 : 1;
      const progress = unit((y - marks[leg]) / Math.max(1, marks[leg + 1] - marks[leg]));
      const sweep = unit((progress - 0.17) / 0.65);
      if (last === leg + sweep) return;
      last = leg + sweep;
      belts.forEach((belt, i) => {
        // The carriage prints left-to-right, then returns right-to-left for DONE.
        const order = (leg ? belts.length - 1 - i : i) / (belts.length - 1);
        const turn = ease(unit((sweep - order * 0.44) / 0.56));
        belt.style.transform = `translate3d(0,${(-100 * (leg + turn)).toFixed(3)}%,0)`;
      });
      carriage.style.transform = `translateX(${(300 * ease(leg ? 1 - sweep : sweep)).toFixed(3)}%)`;
    },
    reset,
  };
}
