"use client";

// The traps page: every Vietnamese Learner Trap as a card, filtered by Part, by
// unit, or down to the ones this learner has actually got wrong.

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/context/lang";
import { cn } from "@/lib/utils";
import type { PartId, Syllabus, Trap } from "@/lib/grammar/types";
import TrapCard from "./TrapCard";
import { useWrongTraps } from "./progress";
import { PART } from "./tokens";

interface Props {
  traps: Trap[];
  syllabus: Syllabus;
}

const CHIP = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
const CHIP_OFF =
  "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

export default function TrapsExplorer({ traps, syllabus }: Props) {
  const { t, pick } = useLang();
  const params = useSearchParams();
  const { ids: wrongIds } = useWrongTraps();

  const [part, setPart] = useState<PartId | "all">("all");
  const [unitNumber, setUnitNumber] = useState<number | "all">("all");
  const [onlyMine, setOnlyMine] = useState(params?.get("mine") === "1");

  const allUnits = useMemo(() => syllabus.parts.flatMap((p) => p.units), [syllabus]);
  const partOfUnit = useMemo(() => {
    const map = new Map<number, PartId>();

    for (const p of syllabus.parts) {
      for (const unit of p.units) map.set(unit.number, p.id);
    }

    return map;
  }, [syllabus]);

  const unitsInFilter = part === "all" ? allUnits : allUnits.filter((unit) => partOfUnit.get(unit.number) === part);

  const shown = traps.filter((trap) => {
    if (onlyMine && !wrongIds.includes(trap.id)) return false;

    if (part !== "all" && !trap.units.some((number) => partOfUnit.get(number) === part)) return false;

    if (unitNumber !== "all" && !trap.units.includes(unitNumber)) return false;

    return true;
  });

  const unitTitle = (number: number) => allUnits.find((unit) => unit.number === number)?.title ?? "";

  return (
    <div className="max-w-4xl space-y-6 pb-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Vietnamese Learner Traps</h1>
        <p className="mt-1 text-sm italic text-zinc-500 dark:text-zinc-400">Lỗi thường gặp của người Việt</p>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{t("grammar.traps.subtitle")}</p>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setPart("all");
              setUnitNumber("all");
            }}
            aria-pressed={part === "all"}
            className={cn(CHIP, part === "all" ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : CHIP_OFF)}
          >
            {pick("Tất cả các phần", "All parts")}
          </button>

          {syllabus.parts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPart(p.id);
                setUnitNumber("all");
              }}
              aria-pressed={part === p.id}
              data-testid={`trap-part-${p.id}`}
              className={cn(CHIP, part === p.id ? cn(PART[p.id].block, "border-transparent") : CHIP_OFF)}
            >
              Part {p.id}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <span className="sr-only">{t("grammar.traps.filterAll")}</span>
            <select
              value={unitNumber === "all" ? "all" : String(unitNumber)}
              onChange={(event) =>
                setUnitNumber(event.target.value === "all" ? "all" : Number(event.target.value))
              }
              data-testid="trap-unit-select"
              className="input w-auto py-1.5 text-sm"
            >
              <option value="all">{t("grammar.traps.filterAll")}</option>

              {unitsInFilter.map((unit) => (
                <option key={unit.id} value={unit.number}>
                  {unit.number}. {unit.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(event) => setOnlyMine(event.target.checked)}
              data-testid="trap-only-mine"
              className="h-4 w-4 accent-rose-600"
            />
            {t("grammar.traps.onlyMine")} ({wrongIds.length})
          </label>
        </div>

        <p data-testid="trap-count" className="text-sm text-zinc-500 dark:text-zinc-400">
          {shown.length} / {traps.length}
        </p>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("grammar.traps.none")}</p>
      ) : (
        <div className="space-y-3">
          {shown.map((trap) => (
            <TrapCard
              key={trap.id}
              trap={trap}
              units={trap.units.map((number) => `Unit ${number} ${unitTitle(number)}`.trim()).join(" · ")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
