import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "内容工厂控制台 · miaowazhongzi",
  description: "雷达选题 → 多平台内容生产 → 视觉出图 → 分发 的一人公司内容流水线。",
  keywords: "小红书,虚拟资料,内容工厂,雷达选题,AI写作",
};

/**
 * 首屏防闪(anti-FOUC):在 <head> 内同步执行,先于 body 绘制设置 data-theme。
 * 读取 localStorage('mz-theme'),缺省 dark;与 ThemeToggle 共用同一 key。
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('mz-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
