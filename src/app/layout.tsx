import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "妙蛙种字 - 小红书虚拟资料笔记批量生成工具",
  description: "AI 驱动的图文笔记批量生成工具，专为小红书虚拟资料卖家打造。",
  keywords: "小红书,虚拟资料,笔记生成,AI写作,内容创作",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
