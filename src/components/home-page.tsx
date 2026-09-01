"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormData, RESOURCE_TYPES, PLATFORM_OPTIONS, STYLE_OPTIONS, GUIDANCE_OPTIONS, COUNT_OPTIONS,
  GeneratedNote, ANGLE_COLORS, POSTING_TIME_SUGGESTIONS,
} from "@/lib/types";
import {
  Shuffle, Heart, BookOpen, Zap, Scale, PenLine, Sparkles, Copy, Check,
  AlertTriangle, Shield, Clock, Image, TrendingUp, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shuffle, Heart, BookOpen, Zap, Scale, PenLine,
};

export function HomePage() {
  const [formData, setFormData] = useState<FormData>({
    resourceType: "育儿资料", customType: "", keyword: "", targetAudience: "",
    style: "智能混合", priceRange: "", guidanceLevel: "轻度引导", count: 5,
    platform: "xiaohongshu", mode: "original", originalNote: "",
    rewriteOriginal: "", rewritePlatforms: [], rewriteFocus: "保持原意",
    aiDensity: 50, wordCount: 500,
  });

  const [notes, setNotes] = useState<GeneratedNote[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [error, setError] = useState("");
  const [expandedNote, setExpandedNote] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!formData.keyword.trim()) { setError("请输入核心关键词"); return; }
    setError("");
    setIsGenerating(true);
    setNotes([]);
    setStreamContent("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (!response.ok) throw new Error("生成失败");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("无法读取响应流");

      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) { fullContent += parsed.content; setStreamContent(fullContent); }
              if (parsed.error) setError(parsed.error);
            } catch {}
          }
        }
      }

      try {
        const parsed = JSON.parse(fullContent);
        setNotes(Array.isArray(parsed) ? parsed : [parsed]);
      } catch { setError("解析生成结果失败，请重试"); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally { setIsGenerating(false); }
  }, [formData]);

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentPlatform = PLATFORM_OPTIONS.find((p) => p.value === formData.platform);
  const timeSuggestions = POSTING_TIME_SUGGESTIONS[formData.platform] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🐸</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">妙蛙种字</h1>
              <p className="text-xs text-gray-500">小红书虚拟资料笔记批量生成</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Powered by AI</span>
            <Sparkles className="w-4 h-4 text-orange-500" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                  笔记配置
                </CardTitle>
                <CardDescription>填写资料信息，AI 为你批量生成种草笔记</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">生成模式</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["original", "rewrite", "multi-platform"] as const).map((mode) => (
                      <Button key={mode} variant={formData.mode === mode ? "default" : "outline"} size="sm"
                        onClick={() => setFormData({ ...formData, mode })} className="text-xs">
                        {mode === "original" ? "原创" : mode === "rewrite" ? "仿写" : "多平台"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">目标平台</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PLATFORM_OPTIONS.map((p) => (
                      <Button key={p.value} variant={formData.platform === p.value ? "default" : "outline"} size="sm"
                        onClick={() => setFormData({ ...formData, platform: p.value })}>
                        <span>{p.emoji}</span><span className="text-xs">{p.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">资料类型</label>
                  <div className="flex flex-wrap gap-2">
                    {RESOURCE_TYPES.map((type) => (
                      <Button key={type.value} variant={formData.resourceType === type.value ? "default" : "outline"} size="sm"
                        onClick={() => setFormData({ ...formData, resourceType: type.value })} className="text-xs">
                        {type.label}
                      </Button>
                    ))}
                  </div>
                  {formData.resourceType === "其他" && (
                    <input type="text" placeholder="请输入资料类型" value={formData.customType}
                      onChange={(e) => setFormData({ ...formData, customType: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md text-sm" />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">核心关键词 *</label>
                  <input type="text" placeholder="如：幼小衔接数学思维训练" value={formData.keyword}
                    onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">目标人群</label>
                  <input type="text" placeholder="如：3-6岁宝妈、职场新人" value={formData.targetAudience}
                    onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md text-sm" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">写作风格</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map((s) => {
                      const Icon = ICON_MAP[s.icon] || Sparkles;
                      return (
                        <Button key={s.value} variant={formData.style === s.value ? "default" : "outline"} size="sm"
                          onClick={() => setFormData({ ...formData, style: s.value })} className="text-xs justify-start gap-2">
                          <Icon className="w-3 h-3" />{s.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">生成数量</label>
                  <div className="flex gap-2">
                    {COUNT_OPTIONS.map((c) => (
                      <Button key={c.value} variant={formData.count === c.value ? "default" : "outline"} size="sm"
                        onClick={() => setFormData({ ...formData, count: c.value })}>{c.label}</Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>AI 浓度</span><span className="text-xs text-gray-500">{formData.aiDensity}%</span>
                  </label>
                  <input type="range" min="0" max="100" value={formData.aiDensity}
                    onChange={(e) => setFormData({ ...formData, aiDensity: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                  <div className="flex justify-between text-xs text-gray-400"><span>更人味</span><span>更专业</span></div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center justify-between">
                    <span>正文字数</span><span className="text-xs text-gray-500">{formData.wordCount} 字</span>
                  </label>
                  <input type="range" min="100" max="2000" step="50" value={formData.wordCount}
                    onChange={(e) => setFormData({ ...formData, wordCount: Number(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">引导方式</label>
                  <div className="space-y-1">
                    {GUIDANCE_OPTIONS.map((g) => (
                      <label key={g.value}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer border ${formData.guidanceLevel === g.value ? "border-orange-500 bg-orange-50" : "border-transparent"}`}>
                        <input type="radio" name="guidance" value={g.value} checked={formData.guidanceLevel === g.value}
                          onChange={() => setFormData({ ...formData, guidanceLevel: g.value })} className="hidden" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{g.label}</span>
                          <span className="text-xs text-gray-500 ml-2">{g.desc}</span>
                        </div>
                        {g.risk && <span className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{g.risk}</span>}
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={handleGenerate} disabled={isGenerating || !formData.keyword.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white" size="lg">
                  {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</> : <><Sparkles className="w-4 h-4 mr-2" />开始生成 {formData.count} 篇笔记</>}
                </Button>

                {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">{error}</div>}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {notes.length === 0 && !isGenerating && (
              <Card className="text-center py-12">
                <CardContent>
                  <span className="text-6xl mb-4 block">📝</span>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">配置并生成笔记</h3>
                  <p className="text-sm text-gray-500">在左侧填写资料信息，点击生成按钮，AI 将为你批量创作种草笔记</p>
                </CardContent>
              </Card>
            )}

            {isGenerating && (
              <Card>
                <CardContent className="py-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                    <span className="text-sm font-medium">正在生成笔记...</span>
                  </div>
                  {streamContent && (
                    <pre className="text-xs text-gray-600 bg-gray-50 p-4 rounded-md overflow-auto max-h-96 whitespace-pre-wrap">{streamContent}</pre>
                  )}
                </CardContent>
              </Card>
            )}

            {notes.map((note, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-pink-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ANGLE_COLORS[index % ANGLE_COLORS.length]}`}>{note.angle}</span>
                      {note.scores && (
                        <span className="text-xs text-gray-500">
                          综合评分: {Math.round((note.scores.title_attraction + note.scores.conversion_power + note.scores.completeness + note.scores.safety) / 4)}/10
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedNote(expandedNote === index ? null : index)}>
                      {expandedNote === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                  <CardTitle className="text-base mt-2">{note.titles?.[0]}</CardTitle>
                </CardHeader>
                {expandedNote === index && (
                  <CardContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">备选标题</label>
                      {note.titles?.map((title, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1">{title}</span>
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(title, `title-${index}-${i}`)}>
                            {copiedIndex === `title-${index}-${i}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">正文</label>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(note.body, `body-${index}`)}>
                          {copiedIndex === `body-${index}` ? <><Check className="w-3 h-3 mr-1 text-green-500" />已复制</> : <><Copy className="w-3 h-3 mr-1" />复制正文</>}
                        </Button>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap">{note.body}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">标签</label>
                      <div className="flex flex-wrap gap-2">
                        {note.tags?.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {note.cover_prompt && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Image className="w-4 h-4" />封面图提示词</label>
                        <div className="p-3 bg-purple-50 rounded-md text-xs text-purple-700">{note.cover_prompt}</div>
                      </div>
                    )}

                    {note.compliance_check && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4" />合规检测</label>
                        {note.compliance_check.passed ? (
                          <div className="p-3 bg-green-50 rounded-md text-sm text-green-700 flex items-center gap-2">
                            <Check className="w-4 h-4" />通过合规检测，无风险内容
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {note.compliance_check.risks?.map((risk, i) => (
                              <div key={i} className="p-3 bg-yellow-50 rounded-md text-sm">
                                <div className="text-yellow-700 font-medium">"{risk.snippet}"</div>
                                <div className="text-yellow-600 text-xs mt-1">建议: {risk.suggestion}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {note.suggested_time && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />建议发布时段: {note.suggested_time}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}

            {notes.length > 0 && timeSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />{currentPlatform?.label} 最佳发布时段
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {timeSuggestions.map((time, i) => (
                      <span key={i} className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs">{time}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t bg-white/50 mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>🐸 妙蛙种字 - 让内容创作更高效</p>
          <p className="text-xs mt-1">AI 生成内容仅供参考，请根据实际情况调整</p>
        </div>
      </footer>
    </div>
  );
}
