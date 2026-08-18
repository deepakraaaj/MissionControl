import { useState, useRef } from 'react';
import { Network, Plus, Download, ZoomIn, ZoomOut, Move, ArrowRight, User, Calendar, CreditCard, CheckCircle, Smartphone, Activity, Clock, MessageCircle, Monitor, Sparkles } from 'lucide-react';
import { useTeamStore } from './team-store';
import type { VisualDiagram, DiagramNode, DiagramEdge } from './team-types';

interface VisualCanvasViewProps {
  missionId: string;
}

const ICON_MAP: Record<string, any> = {
  User,
  Calendar,
  CreditCard,
  CheckCircle,
  Smartphone,
  Activity,
  Clock,
  MessageCircle,
  Monitor,
};

export function VisualCanvasView({ missionId }: VisualCanvasViewProps) {
  const diagrams = useTeamStore((s) => s.diagrams);
  const missionDiagrams = diagrams.filter((d) => d.missionId === missionId);
  const [selectedDiagramId, setSelectedDiagramId] = useState<string>(
    missionDiagrams[0]?.id || ''
  );

  const activeDiagram = missionDiagrams.find((d) => d.id === selectedDiagramId) || missionDiagrams[0];
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);

  if (!activeDiagram) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
        <Network className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Visual Architecture Mapped Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Sketch the customer flow, process, or technical plan for this project.
        </p>
      </div>
    );
  }

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeDiagram, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeDiagram.title.toLowerCase().replace(/\s+/g, '-')}-diagram.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white flex items-center gap-2">
              {activeDiagram.title}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-mono">
                {activeDiagram.diagramType.replace('_', ' ')}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">{activeDiagram.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-2">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Flow
          </button>
        </div>
      </div>

      {/* Interactive Flow Canvas */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between">
        {/* Subtle Grid Background */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#6366f1 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Canvas Surface */}
        <div 
          className="relative w-full h-full p-6 overflow-auto transition-transform duration-150 origin-top-left"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Render Flow Nodes */}
          <div className="relative min-w-[700px] min-h-[320px]">
            {activeDiagram.nodes.map((node, idx) => {
              const IconComp = (node.icon && ICON_MAP[node.icon]) || Sparkles;
              const isSelected = selectedNode?.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                  }}
                  className={`absolute w-56 p-3.5 rounded-2xl border transition-all cursor-pointer select-none shadow-xl ${
                    isSelected
                      ? 'bg-slate-800 border-accent shadow-accent/20 scale-105 z-20'
                      : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600 hover:scale-[1.02] z-10'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className={`p-1.5 rounded-xl ${
                      node.color === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : node.color === 'blue'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : node.color === 'purple'
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-white truncate">{node.label}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">{node.type}</div>
                    </div>
                  </div>

                  {node.sublabel && (
                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-1">
                      {node.sublabel}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Sequence Bar at Bottom */}
        <div className="relative z-20 flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="font-semibold text-slate-200">Sequence:</span>
            {activeDiagram.nodes.map((node, i) => (
              <span key={node.id} className="flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {i + 1}
                </span>
                <span className="text-slate-300 font-medium truncate max-w-[100px]">{node.label}</span>
                {i < activeDiagram.nodes.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600" />}
              </span>
            ))}
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {activeDiagram.nodes.length} Nodes • {activeDiagram.edges.length} Connectors
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700/80 flex items-start justify-between animate-in fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{selectedNode.label}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                {selectedNode.type}
              </span>
            </div>
            <p className="text-xs text-slate-300">{selectedNode.sublabel}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedNode(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
