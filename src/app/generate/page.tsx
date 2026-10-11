import { redirect } from "next/navigation";

/**
 * F-05:`/generate` 为旧原型页(脱离 console shell、功能已坏),B1 起归位到生成工作台。
 */
export default function GeneratePage() {
  redirect("/workbench");
}
