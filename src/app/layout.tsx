import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "内容工厂控制台 · miaowazhongzi",
  description: "雷达选题 → 多平台内容生产 → 视觉出图 → 分发 的一人公司内容流水线。",
  keywords: "小红书,虚拟资料,内容工厂,雷达选题,AI写作",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
