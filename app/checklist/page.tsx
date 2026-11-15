import type { Metadata } from "next";
import Checklist from "@/components/Checklist";

export const metadata: Metadata = {
  title: "Silent Charts · Decision Checklist",
  description:
    "Fundamental, technical, and risk checklist for an investment or trade, with the live US 10-year yield beside that row.",
};

export default function ChecklistPage() {
  return <Checklist />;
}
