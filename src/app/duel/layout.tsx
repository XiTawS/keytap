import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "1v1 Duel — KeyTap",
  description:
    "Challenge a friend to a 1v1 typing speed duel. Same words, real-time race. See who types faster on KeyTap.",
};

export default function DuelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
