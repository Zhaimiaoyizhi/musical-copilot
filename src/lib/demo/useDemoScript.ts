"use client";

/**
 * 60 秒一键演示脚本
 * 由 useUIStore.isDemoRunning 触发，在 Studio 页面中挂载
 *
 * 步骤时间线（每步 await 前已到达该状态）：
 * 0s   → 资产生成动画自动触发（已由 autoGenerate 处理）
 * 8s   → 选中"旧礼堂线索出现"（evt_02）
 * 12s  → 右侧芯片飞入，人物推演播放
 * 20s  → 点击"生成剧本"
 * 32s  → 剧本输出完成，点击"一致性检查"
 * 44s  → 红线动画出现
 * 52s  → 点击"修改剧本"
 * 57s  → 演示结束，弹出完成提示
 */

import { useEffect, useRef } from "react";
import { useUIStore } from "@/lib/store/uiStore";

// 这些 ID 对应 mock 数据中的 evt_02
const DEMO_EVENT_ID = "evt_02";
const DEMO_NODE_ID  = "tn_evt_02_event";

export function useDemoScript() {
  const isDemoRunning   = useUIStore((s) => s.isDemoRunning);
  const setIsDemoRunning = useUIStore((s) => s.setIsDemoRunning);
  const setDemoStep      = useUIStore((s) => s.setDemoStep);
  const selectNode       = useUIStore((s) => s.selectNode);
  const addLog           = useUIStore((s) => s.addLog);
  const assetsGenerated  = useUIStore((s) => s.assetsGenerated);

  const ranRef = useRef(false);

  useEffect(() => {
    if (!isDemoRunning || ranRef.current) return;
    if (!assetsGenerated) return; // 等生成完成才执行

    ranRef.current = true;

    const run = async () => {
      addLog("🎬 一键演示脚本启动...");

      // Step 1: 等待生成完成后选中节点（约 3s 缓冲）
      await sleep(3000);
      setDemoStep(1);
      addLog("📌 演示：选中第一幕第二场「旧礼堂线索出现」");
      selectNode(DEMO_NODE_ID, DEMO_EVENT_ID);

      // Step 2: 等待芯片飞入 + 推演展示
      await sleep(4000);
      setDemoStep(2);
      addLog("✦ 演示：上下文芯片已组装，人物推演展示中...");

      // Step 3: 触发生成（通过模拟按钮点击 data 属性）
      await sleep(4000);
      setDemoStep(3);
      addLog("✍️ 演示：开始生成第一幕第二场剧本...");
      triggerButtonByTestId("btn-generate-script");

      // Step 4: 等生成完成，触发检查
      await sleep(14000);
      setDemoStep(4);
      addLog("🔍 演示：触发一致性检查...");
      triggerButtonByTestId("btn-check-consistency");

      // Step 5: 等红线动画展示
      await sleep(8000);
      setDemoStep(5);
      addLog("⚠️ 演示：发现冲突！林夏提前知道母亲秘密");

      // Step 6: 修复冲突
      await sleep(6000);
      setDemoStep(6);
      addLog("✅ 演示：修改剧本，冲突解除");
      triggerButtonByTestId("btn-fix-conflict");

      // Step 7: 结束
      await sleep(4000);
      setDemoStep(7);
      addLog("🎭 一键演示完成！完整链路：资产生成→选场景→生成剧本→一致性检查→修复冲突");
      setIsDemoRunning(false);
      ranRef.current = false;
    };

    run();
  }, [isDemoRunning, assetsGenerated, selectNode, addLog, setDemoStep, setIsDemoRunning]);
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function triggerButtonByTestId(testId: string) {
  const el = document.querySelector(`[data-demo="${testId}"]`) as HTMLButtonElement | null;
  if (el) { el.click(); }
}
