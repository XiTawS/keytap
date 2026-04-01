import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Battle Royale — KeyTap",
  description:
    "Join a multiplayer typing battle royale. The slowest typist gets eliminated each round. Last one standing wins on KeyTap.",
};

export default function BattleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
