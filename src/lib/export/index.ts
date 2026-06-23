/**
 * 导出工具集
 * - exportJSON : 下载完整项目 JSON
 * - exportDocx : 下载剧本 Word (.docx)
 * - printPDF   : 调用浏览器打印（支持中文）
 */

import type { Project } from "@/types/project";

// ─── JSON ──────────────────────────────────────────────────────
export function exportJSON(project: Project): void {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  triggerDownload(blob, `${sanitizeFilename(project.title)}_project.json`);
}

// ─── DOCX ──────────────────────────────────────────────────────
export async function exportDocx(project: Project): Promise<void> {
  // 动态导入 docx 包避免 SSR 问题
  const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } =
    await import("docx");

  const children: InstanceType<typeof Paragraph>[] = [];

  // 项目标题
  children.push(
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // 如果有剧本文本
  if (project.scriptScenes.length > 0) {
    project.scriptScenes.forEach((scene) => {
      scene.formattedBlocks.forEach((block) => {
        switch (block.type) {
          case "scene_heading":
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.text,
                    bold: true,
                    size: 22,
                    color: "555555",
                  }),
                ],
                spacing: { before: 240, after: 120 },
              })
            );
            break;

          case "role_name":
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: block.text,
                    bold: true,
                    size: 24,
                  }),
                ],
                spacing: { before: 200, after: 60 },
                indent: { left: 720 },
              })
            );
            break;

          case "dialogue":
            children.push(
              new Paragraph({
                children: [new TextRun({ text: block.text, size: 24 })],
                spacing: { after: 80 },
                indent: { left: 720 },
              })
            );
            break;

          case "stage_direction":
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `（${block.text}）`,
                    italics: true,
                    size: 20,
                    color: "777777",
                  }),
                ],
                spacing: { after: 80 },
              })
            );
            break;

          case "lyrics":
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `♪ ${block.text}`,
                    italics: true,
                    size: 22,
                    color: "8B6914",
                  }),
                ],
                spacing: { after: 80 },
                indent: { left: 720 },
              })
            );
            break;
        }
      });
    });
  } else {
    // 无剧本时导出世界书摘要
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "【世界书摘要】", bold: true, size: 22 }),
        ],
        spacing: { before: 240, after: 120 },
      })
    );
    project.worldbookCards.forEach((card) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `· ${card.title}`, bold: true, size: 22 }),
            new TextRun({ text: `：${card.summary}`, size: 22 }),
          ],
          spacing: { after: 80 },
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1800 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  triggerDownload(buffer, `${sanitizeFilename(project.title)}_剧本.docx`);
}

// ─── PDF（浏览器打印）──────────────────────────────────────────
export function printPDF(): void {
  // 注入临时打印样式
  const styleId = "print-override";
  const existing = document.getElementById(styleId);
  if (!existing) {
    const style = document.createElement("style");
    style.id = styleId;
    style.media = "print";
    style.textContent = `
      body { background: white !important; color: black !important; }
      header, footer, [data-no-print], .no-print { display: none !important; }
      @page { margin: 2cm; }
    `;
    document.head.appendChild(style);
  }
  window.print();
}

// ─── 工具函数 ──────────────────────────────────────────────────
function triggerDownload(blob: Blob, filename: string): void {
  const url  = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 60);
}
