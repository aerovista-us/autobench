import type { Metadata } from "next";
import { CaptureWorkbench } from "@/components/CaptureWorkbench";

export const metadata: Metadata = {
  title: "Pops Van Capture | AutoBench",
  description: "Evidence-first Pops Van measurement and photo capture.",
};

export default function CapturePage() {
  return <CaptureWorkbench />;
}
