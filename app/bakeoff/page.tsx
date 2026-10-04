import type { Metadata } from "next";
import { KernelBakeoffProbe } from "@/components/KernelBakeoffProbe";

export const metadata: Metadata = {
  title: "AutoBench M0 Kernel Bake-off",
  robots: { index: false, follow: false },
};

export default function KernelBakeoffPage() {
  return <KernelBakeoffProbe />;
}
