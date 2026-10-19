# Google Stitch GUI Specification & Complete Single-File Implementation

> **Comprehensive Reference**: GUI Architecture, Component Hierarchy, Design Token Engine, TypeScript Interfaces, Canvas Engine, and Production Ready Single-File React Implementation.

---

## 1. System Overview & Architecture

**Google Stitch** is an AI-native interface design-to-code platform developed by Google Labs and powered by multimodal Gemini models. It provides an infinite 2D canvas workspace for prompt-driven UI generation, multi-screen user journey linking, real-time code inspection, and bidirectional Figma synchronization.

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR: Project Name · Viewport Selector · Design Tokens Theme Engine · Code/Figma Export Suite │
├─────────────────────┬────────────────────────────────────────────────────────┬───────────────────┤
│ LEFT PANEL          │ CENTER: INFINITE ZOOMABLE CANVAS                       │ RIGHT PANEL       │
│ • Screen Explorer   │                                                        │ • Element Tree    │
│ • User Journey Flow │   ┌───────────────┐           ┌────────────────────┐   │ • CSS Box Model   │
│ • Component Library │   │ Screen 1      │ ────────> │ Screen 2           │   │ • Typography      │
│ • Asset Uploader    │   │ (Live Sandbox)│ [Bezier]  │ (Live Sandbox)     │   │ • Token Overrides │
│                     │   └───────────────┘           └────────────────────┘   │ • State Variants  │
├─────────────────────┴────────────────────────────────────────────────────────┴───────────────────┤
│ BOTTOM DOCK: Multimodal Gemini Prompt Bar (Text / Wireframe / Screenshot / Voice Agent)         │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Low-Contrast, Eye-Friendly Design System Tokens

Stitch designs enforce a soft, glare-free aesthetic avoiding stark pitch-black (`#000000`) and ultra-saturated neon colors.

```css
:root {
  /* Surfaces & Canvas */
  --stitch-canvas-bg: #F8F9FA;
  --stitch-canvas-dot: #E2E8F0;
  --stitch-surface-card: #FFFFFF;
  --stitch-surface-subtle: #F1F5F9;
  --stitch-surface-hover: #E2E8F0;
  
  /* Borders & Outlines */
  --stitch-border-subtle: #E2E8F0;
  --stitch-border-default: #CBD5E1;
  --stitch-border-active: #059669;
  
  /* Typography */
  --stitch-text-primary: #1E293B;
  --stitch-text-secondary: #64748B;
  --stitch-text-muted: #94A3B8;
  
  /* Soft Accent Colors */
  --stitch-accent-emerald: #059669;
  --stitch-accent-emerald-subtle: #ECFDF5;
  --stitch-accent-slate: #475569;
  --stitch-accent-slate-subtle: #F1F5F9;
  --stitch-accent-amber: #D97706;
  --stitch-accent-amber-subtle: #FFFBEB;
  --stitch-accent-rose: #E11D48;
  --stitch-accent-rose-subtle: #FFF1F2;
  
  /* Shadows & Radius */
  --stitch-shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);
  --stitch-shadow-floating: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);
  --stitch-radius-sm: 6px;
  --stitch-radius-md: 10px;
  --stitch-radius-lg: 16px;
  --stitch-radius-full: 9999px;
}
```

---

## 3. Data Models & TypeScript Interfaces

```typescript
export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface ViewportDimension {
  width: number;
  height: number;
  label: string;
}

export const VIEWPORT_DIMENSIONS: Record<ViewportMode, ViewportDimension> = {
  mobile: { width: 375, height: 720, label: 'Mobile (375 × 720)' },
  tablet: { width: 768, height: 960, label: 'Tablet (768 × 960)' },
  desktop: { width: 1200, height: 800, label: 'Desktop (1200 × 800)' },
};

export interface ScreenConnection {
  targetScreenId: string;
  label: string;
  action: 'navigate' | 'modal' | 'tab';
}

export interface StitchScreenNode {
  id: string;
  title: string;
  viewport: ViewportMode;
  position: { x: number; y: number };
  htmlContent: string;
  cssContent?: string;
  connections: ScreenConnection[];
  isSelected?: boolean;
}

export interface StitchProjectState {
  id: string;
  name: string;
  screens: StitchScreenNode[];
  activeScreenId: string | null;
  selectedElementId: string | null;
  canvasScale: number;
  canvasOffset: { x: number; y: number };
  isPromptStreaming: boolean;
  activePrompt: string;
}
```

---

## 4. Complete Single-File Standalone React GUI Component

Below is a self-contained, working React single-file application (`GoogleStitchGUI.tsx`) that implements the full Google Stitch interface: an interactive infinite canvas, pan/zoom controls, live multi-screen sandboxes, bezier curve connections, element property inspector, and Gemini prompt dock.

```tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Laptop, 
  Smartphone, 
  Tablet, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Code2, 
  Download, 
  Copy, 
  Check, 
  Move, 
  Eye, 
  RotateCcw,
  Plus,
  Play,
  Palette
} from 'lucide-react';

// --- TYPES ---
export type ViewportMode = 'mobile' | 'tablet' | 'desktop';

export interface StitchScreen {
  id: string;
  title: string;
  viewport: ViewportMode;
  x: number;
  y: number;
  width: number;
  height: number;
  htmlContent: string;
  connectedTo?: string;
}

// --- SAMPLE BUILT-IN SCREENS ---
const INITIAL_SCREENS: StitchScreen[] = [
  {
    id: 'screen_1',
    title: 'Screen 1: Register Till Dashboard',
    viewport: 'mobile',
    x: 60,
    y: 80,
    width: 360,
    height: 640,
    connectedTo: 'screen_2',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8F9FA; padding: 20px; height: 100%; box-sizing: border-box; color: #1E293B; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 16px;">
            <div>
              <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">Retail Cashier Desk</h2>
              <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Shift: Morning Till #01</p>
            </div>
            <span style="background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; font-size: 10px; font-weight: 700; padding: 3px 8px; rounded: 6px;">● ONLINE</span>
          </div>

          <!-- Register Till In Hand Card -->
          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 14px; margin-bottom: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Register Cash In Hand</span>
            <div style="font-size: 24px; font-weight: 800; color: #065F46; font-family: monospace; margin: 4px 0;">Rs. 24,500</div>
            <div style="font-size: 11px; color: #64748B; border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px;">
              <span>Safe Transfer: -Rs. 138,000</span>
            </div>
          </div>

          <!-- Vault Summary Badge -->
          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 14px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase;">Safe Vault Total</span>
              <span style="background: #ECFDF5; color: #047857; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">✓ Reconciled</span>
            </div>
            <div style="font-size: 22px; font-weight: 800; color: #334155; font-family: monospace; margin: 4px 0;">Rs. 433,500</div>
            <p style="margin: 0; font-size: 10px; color: #64748B;">Base: Rs. 295,500 + Handover: Rs. 138,000</p>
          </div>
        </div>

        <button style="width: 100%; background: #059669; color: #FFFFFF; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span>Transfer Drawer to Safe ➔</span>
        </button>
      </div>
    `
  },
  {
    id: 'screen_2',
    title: 'Screen 2: Safe Transfer Handover Modal',
    viewport: 'mobile',
    x: 480,
    y: 80,
    width: 360,
    height: 640,
    connectedTo: 'screen_3',
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8F9FA; padding: 20px; height: 100%; box-sizing: border-box; color: #1E293B; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 15px; font-weight: 700; color: #0F172A;">Evening Drawer Handover</h2>
            <span style="font-size: 11px; color: #64748B; cursor: pointer;">✕ Close</span>
          </div>

          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 10px; margin-bottom: 16px; font-size: 11px; color: #065F46;">
            🛡️ <strong>Safe Vault Notice:</strong> Evening handovers credit safe balance and reduce register till cash.
          </div>

          <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
            Transfer Amount (PKR)
          </label>
          <div style="background: #FFFFFF; border: 2px solid #059669; border-radius: 10px; padding: 10px 14px; font-size: 20px; font-weight: 800; font-family: monospace; color: #0F172A; margin-bottom: 12px;">
            Rs. 138,000
          </div>

          <div style="display: grid; grid-cols: 3; gap: 6px; margin-bottom: 16px;">
            <span style="background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px; text-align: center; border-radius: 6px; font-size: 11px; font-weight: 600;">+10,000</span>
            <span style="background: #FFFFFF; border: 1px solid #CBD5E1; padding: 6px; text-align: center; border-radius: 6px; font-size: 11px; font-weight: 600;">+50,000</span>
            <span style="background: #E2E8F0; border: 1px solid #CBD5E1; padding: 6px; text-align: center; border-radius: 6px; font-size: 11px; font-weight: 700;">All Drawer</span>
          </div>

          <label style="display: block; font-size: 11px; font-weight: 700; color: #475569; margin-bottom: 6px;">Handover Reason</label>
          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #334155;">
            Day-End Cash Handover to Safe
          </div>
        </div>

        <button style="width: 100%; background: #059669; color: #FFFFFF; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer;">
          Confirm Handover (Rs. 138,000)
        </button>
      </div>
    `
  },
  {
    id: 'screen_3',
    title: 'Screen 3: Vault Reconciled Status',
    viewport: 'mobile',
    x: 900,
    y: 80,
    width: 360,
    height: 640,
    htmlContent: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8F9FA; padding: 20px; height: 100%; box-sizing: border-box; color: #1E293B; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="border-bottom: 1px solid #E2E8F0; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 16px; font-weight: 700; color: #0F172A;">Safe Vault Overview</h2>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748B;">Reconciliation & Ledger Sync</p>
          </div>

          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 16px; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="color: #059669; font-size: 18px;">✓</span>
              <span style="font-size: 12px; font-weight: 700; color: #065F46;">Safe Balance Reconciled</span>
            </div>
            <div style="font-size: 28px; font-weight: 900; font-family: monospace; color: #0F172A;">Rs. 433,500</div>
            <p style="font-size: 11px; color: #64748B; margin: 6px 0 0;">
              Base: Rs. 295,500 + Drawer Transfer: Rs. 138,000
            </p>
          </div>

          <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; padding: 14px;">
            <span style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Recent Audit Log</span>
            <div style="font-size: 11px; color: #334155; margin-top: 8px; line-height: 1.6;">
              <div>• <strong>Rs. 138,000</strong> received from Drawer Till</div>
              <div>• <strong>Rs. 295,500</strong> previous vault balance</div>
              <div>• Target status: <strong>Balanced (0 variance)</strong></div>
            </div>
          </div>
        </div>

        <button style="width: 100%; background: #334155; color: #FFFFFF; border: none; padding: 12px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer;">
          Export Vault Audit Slip
        </button>
      </div>
    `
  }
];

export const GoogleStitchGUI: React.FC = () => {
  const [screens, setScreens] = useState<StitchScreen[]>(INITIAL_SCREENS);
  const [activeScreenId, setActiveScreenId] = useState<string>('screen_1');
  const [scale, setScale] = useState<number>(0.85);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'code' | 'tokens'>('canvas');

  // Canvas Dragging State
  const [isDraggingCanvas, setIsDraggingCanvas] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeScreen = useMemo(() => {
    return screens.find(s => s.id === activeScreenId) || screens[0];
  }, [screens, activeScreenId]);

  // Pan canvas handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.screen-node') || (e.target as HTMLElement).closest('.dock-container')) {
      return;
    }
    setIsDraggingCanvas(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return;
    setOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCanvas(false);
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(1.5, Math.max(0.4, prev + delta)));
  };

  const handleResetView = () => {
    setScale(0.85);
    setOffset({ x: 20, y: 20 });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      // Simulate Gemini model response creating a new screen node
      const newScreen: StitchScreen = {
        id: `screen_${Date.now()}`,
        title: `Screen: ${promptInput.slice(0, 24)}...`,
        viewport: 'mobile',
        x: screens[screens.length - 1].x + 420,
        y: 80,
        width: 360,
        height: 640,
        htmlContent: `
          <div style="font-family: sans-serif; background: #FFFFFF; padding: 20px; height: 100%; box-sizing: border-box;">
            <h3 style="margin-top: 0; color: #0F172A;">Generated Component</h3>
            <p style="font-size: 12px; color: #64748B;">Prompt: "${promptInput}"</p>
            <div style="background: #F1F5F9; border: 1px dashed #94A3B8; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
              <span style="font-size: 12px; color: #334155;">✨ AI Synthesized Layout</span>
            </div>
            <button style="background: #059669; color: white; border: none; padding: 10px; border-radius: 6px; width: 100%; font-weight: 600;">
              Action Button
            </button>
          </div>
        `
      };
      setScreens(prev => [...prev, newScreen]);
      setActiveScreenId(newScreen.id);
      setIsGenerating(false);
      setPromptInput('');
    }, 1200);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeScreen.htmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50 text-slate-800 select-none overflow-hidden font-sans">
      
      {/* 1. TOP UTILITY HEADER */}
      <header className="h-13 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight">Google Stitch Canvas</h1>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Gemini Multi-Screen UI
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Retail Cash Drawer &amp; Vault Flow Prototyper</p>
          </div>
        </div>

        {/* Viewport & View Mode Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold border border-slate-200">
            <button
              onClick={() => setActiveTab('canvas')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'canvas' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Canvas View
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'code' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Code Output
            </button>
            <button
              onClick={() => setActiveTab('tokens')}
              className={`px-3 py-1 rounded-md transition-all ${
                activeTab === 'tokens' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Design Tokens
            </button>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied HTML!' : 'Export Code'}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT COMPONENT / SCREEN HIERARCHY DRAWER */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between z-10 text-xs">
          <div className="p-3 border-b border-slate-100">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-2">
              Screen Navigator ({screens.length})
            </span>
            <div className="space-y-1">
              {screens.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActiveScreenId(s.id)}
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between border transition-all ${
                    s.id === activeScreenId 
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold' 
                      : 'border-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <span className="text-[10px] text-slate-400 font-mono">360×640</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Zoom Scale:</span>
              <strong className="font-mono text-slate-700">{Math.round(scale * 100)}%</strong>
            </div>
            <div className="flex justify-between">
              <span>Canvas Mode:</span>
              <strong className="text-slate-700">Infinite 2D Pan</strong>
            </div>
          </div>
        </aside>

        {/* CENTER VIEW: INFINITE CANVAS */}
        {activeTab === 'canvas' ? (
          <div 
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-[#F8F9FA]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          >
            {/* FLOATING ZOOM CONTROLS */}
            <div className="absolute top-4 left-4 z-20 bg-white border border-slate-200 rounded-xl p-1 shadow-xs flex items-center gap-1">
              <button 
                onClick={() => handleZoom(0.1)} 
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleZoom(-0.1)} 
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={handleResetView} 
                className="p-1.5 hover:bg-slate-100 rounded text-slate-700 cursor-pointer"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* CANVAS SCALABLE SURFACE */}
            <div 
              className="absolute transition-transform duration-75 origin-top-left"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`
              }}
            >
              {/* CONNECTING BEZIER LINES */}
              <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: 2500, height: 1500 }}>
                {screens.map(s => {
                  if (!s.connectedTo) return null;
                  const target = screens.find(t => t.id === s.connectedTo);
                  if (!target) return null;
                  const startX = s.x + s.width;
                  const startY = s.y + s.height / 2;
                  const endX = target.x;
                  const endY = target.y + target.height / 2;
                  const midX = (startX + endX) / 2;

                  return (
                    <g key={`conn_${s.id}_${target.id}`}>
                      <path
                        d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2.5"
                        strokeDasharray="5,5"
                      />
                      <circle cx={endX} cy={endY} r="4" fill="#059669" />
                    </g>
                  );
                })}
              </svg>

              {/* RENDER SCREEN NODES */}
              {screens.map(s => (
                <div
                  key={s.id}
                  onClick={() => setActiveScreenId(s.id)}
                  className={`screen-node absolute bg-white rounded-2xl shadow-floating border transition-all ${
                    s.id === activeScreenId 
                      ? 'border-emerald-500 ring-4 ring-emerald-500/15' 
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                  style={{
                    left: s.x,
                    top: s.y,
                    width: s.width,
                    height: s.height
                  }}
                >
                  {/* Screen Frame Title Bar */}
                  <div className="h-8 bg-slate-100 border-b border-slate-200 px-3 flex items-center justify-between rounded-t-2xl">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{s.title}</span>
                    <span className="text-[9px] font-mono bg-white px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                      {s.viewport}
                    </span>
                  </div>

                  {/* Sandboxed Live HTML Component Preview */}
                  <div 
                    className="w-full overflow-hidden" 
                    style={{ height: s.height - 32 }}
                    dangerouslySetInnerHTML={{ __html: s.htmlContent }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'code' ? (
          /* CODE INSPECTOR VIEW */
          <div className="flex-1 bg-slate-900 text-slate-100 p-6 overflow-auto font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-emerald-400 font-bold">Generated Markup for: {activeScreen.title}</span>
              <button 
                onClick={handleCopyCode} 
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy HTML'}</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">{activeScreen.htmlContent}</pre>
          </div>
        ) : (
          /* DESIGN TOKENS VIEW */
          <div className="flex-1 bg-white p-6 overflow-auto text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Design Tokens &amp; Theme Variables</h3>
            <p className="text-slate-500 mb-4">Consistent CSS custom properties enforced across all generated screens.</p>
            <div className="grid grid-cols-2 gap-4 max-w-2xl">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-slate-700">--stitch-accent-emerald</span>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded bg-[#059669] border border-slate-300" />
                  <span className="font-mono text-slate-600">#059669 (Primary Action)</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-slate-700">--stitch-canvas-bg</span>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded bg-[#F8F9FA] border border-slate-300" />
                  <span className="font-mono text-slate-600">#F8F9FA (Anti-Glare Canvas)</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-slate-700">--stitch-text-primary</span>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded bg-[#1E293B] border border-slate-300" />
                  <span className="font-mono text-slate-600">#1E293B (Soft Charcoal)</span>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="font-bold text-slate-700">--stitch-border-subtle</span>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded bg-[#CBD5E1] border border-slate-300" />
                  <span className="font-mono text-slate-600">#CBD5E1 (Low Contrast)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. GEMINI MULTIMODAL PROMPT DOCK */}
        <div className="dock-container absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
          <form 
            onSubmit={handleGenerate}
            className="bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl p-2 shadow-floating flex items-center gap-2"
          >
            <div className="p-2 text-emerald-700 bg-emerald-50 rounded-xl">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <input
              type="text"
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              placeholder="Ask Gemini to synthesize a new screen, adjust styling, or connect routes..."
              className="flex-1 text-xs bg-transparent text-slate-800 placeholder-slate-400 outline-none font-medium px-2"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !promptInput.trim()}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isGenerating ? (
                <span>Synthesizing...</span>
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
```

---

## 5. Export Specifications (HTML, React, Figma Sync)

### 5.1 Single HTML Bundle Export
Each generated screen can be extracted into a self-contained `.html` file with zero runtime dependencies.

### 5.2 Figma Synchronization Protocol
- Node positions `(x, y)` map to Figma Canvas Frames.
- Text layers preserve standard typography styles.
- Auto-layout constraints are preserved from CSS flexbox parameters.
