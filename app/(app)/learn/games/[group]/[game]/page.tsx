"use client";

import { useParams } from "next/navigation";
import GameShell from "@/components/games/GameShell";

export default function GamePage() {
  const { group, game } = useParams<{ group: string; game: string }>();

  return <GameShell group={group} game={game} />;
}
