import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Edit3, Network, Plus, Trash2 } from 'lucide-react';
import {
  Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, addEdge,
  useEdgesState, useNodesState, type Connection, type Edge, type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTeamStore } from './team-store';
import type { DiagramNode, VisualDiagram } from './team-types';

interface VisualCanvasViewProps { missionId: string; }
type FlowData = { label: string; sublabel?: string; type: string };
type NodeDraft = { label: string; sublabel: string; type: string };
const nodeStyle = { background: 'rgb(var(--surface-1))', color: 'rgb(var(--text-primary))', border: '1px solid rgb(var(--border-strong) / .65)', borderRadius: 14, padding: 12, width: 210, boxShadow: '0 10px 24px rgb(var(--shadow-color) / .2)' };

const toFlowNodes = (nodes: DiagramNode[]): Node<FlowData>[] => nodes.map((node) => ({ id: node.id, position: { x: node.x, y: node.y }, data: { label: node.label, sublabel: node.sublabel, type: node.type }, style: { ...nodeStyle, borderRadius: node.type === 'actor' || node.type === 'action' ? 999 : node.type === 'database' ? '50% / 18%' : node.type === 'system' ? 4 : 14, borderColor: node.type === 'actor' ? 'rgb(192 132 252 / .65)' : node.type === 'database' ? 'rgb(96 165 250 / .65)' : node.type === 'system' ? 'rgb(34 211 238 / .65)' : node.type === 'action' ? 'rgb(251 191 36 / .65)' : 'rgb(var(--accent) / .65)' } }));
const toDiagramNodes = (nodes: Node<FlowData>[]): DiagramNode[] => nodes.map((node) => ({ id: node.id, x: node.position.x, y: node.position.y, label: node.data.label, sublabel: node.data.sublabel, type: (node.data.type as DiagramNode['type']) || 'process', color: 'blue' }));


function FlowEditor({ diagram, onChange }: { diagram: VisualDiagram; onChange: (nodes: Node<FlowData>[], edges: Edge[]) => void }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(diagram.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(diagram.edges.map((edge) => ({ id: edge.id, source: edge.from, target: edge.to, label: edge.label, animated: edge.dashed })));
  const [nodeDraft, setNodeDraft] = useState<NodeDraft>({ label: '', sublabel: '', type: 'process' });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [nodeEditorOpen, setNodeEditorOpen] = useState(false);
  useEffect(() => { setNodes(toFlowNodes(diagram.nodes)); setEdges(diagram.edges.map((edge) => ({ id: edge.id, source: edge.from, target: edge.to, label: edge.label, animated: edge.dashed }))); }, [diagram.id, setEdges, setNodes]);
  const persistNodes = useCallback((next: Node<FlowData>[]) => { setNodes(next); onChange(next, edges); }, [edges, onChange, setNodes]);
  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => { onNodesChange(changes); const moved = changes.some((change) => change.type === 'position' && change.dragging === false); if (moved) window.setTimeout(() => onChange(nodes, edges), 0); }, [edges, nodes, onChange, onNodesChange]);
  const connect = useCallback((connection: Connection) => { const next = addEdge({ ...connection, animated: false, style: { stroke: 'rgb(var(--accent))' } }, edges); setEdges(next); onChange(nodes, next); }, [edges, nodes, onChange, setEdges]);
  const openNodeEditor = (node?: Node<FlowData>) => { setEditingNodeId(node?.id ?? null); setNodeDraft(node ? { label: node.data.label, sublabel: node.data.sublabel ?? '', type: node.data.type } : { label: '', sublabel: '', type: 'process' }); setNodeEditorOpen(true); };
  const saveNode = (event: React.FormEvent) => { event.preventDefault(); if (!nodeDraft.label.trim()) return; const next = editingNodeId ? nodes.map((node) => node.id === editingNodeId ? { ...node, data: { ...node.data, ...nodeDraft, label: nodeDraft.label.trim() } } : node) : [...nodes, { id: `${diagram.id}-node-${nodes.length + 1}`, position: { x: 80 + (nodes.length % 3) * 260, y: 70 + Math.floor(nodes.length / 3) * 160 }, data: { ...nodeDraft, label: nodeDraft.label.trim() } }]; persistNodes(next); setEditingNodeId(null); setNodeDraft({ label: '', sublabel: '', type: 'process' }); setNodeEditorOpen(false); };
  return <div className="relative h-[520px] overflow-hidden rounded-2xl border border-borderSoft/40 bg-panel2/55"><ReactFlow nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange} onConnect={connect} onNodeDoubleClick={(_, node) => openNodeEditor(node as Node<FlowData>)} fitView deleteKeyCode="Delete"><Background color="rgb(var(--border-subtle))" gap={22} /><Controls className="!bottom-4 !left-4 overflow-hidden !rounded-xl !border !border-borderSoft/40 !bg-panel !text-text-primary !shadow-lg [&>button]:!border-borderSoft/30 [&>button]:!bg-panel [&>button]:!text-text-primary [&>button:hover]:!bg-panel2 [&_svg]:!fill-current" /><MiniMap className="!bottom-4 !right-4 !h-20 !w-28 overflow-hidden !rounded-xl !border !border-borderSoft/40 !shadow-lg md:!h-28 md:!w-40" bgColor="rgb(var(--surface-1))" nodeColor="rgb(var(--accent))" maskColor="rgb(var(--bg-base) / .75)" /></ReactFlow><button type="button" onClick={() => openNodeEditor()} className="absolute bottom-28 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-3 py-2 text-xs font-bold text-[rgb(var(--accent-contrast))] shadow-lg md:bottom-5"><Plus className="h-4 w-4" />Add node</button>{nodeEditorOpen && <form onSubmit={saveNode} className="absolute left-1/2 top-1/2 z-20 w-[min(92%,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-borderSoft/50 bg-panel p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-text-primary">{editingNodeId ? 'Edit node' : 'Add node'}</h3><button type="button" onClick={() => setNodeEditorOpen(false)} className="text-text-muted">×</button></div><input autoFocus required value={nodeDraft.label} onChange={(e) => setNodeDraft({ ...nodeDraft, label: e.target.value })} placeholder="Node label" className="w-full rounded-xl border border-borderSoft/45 bg-panel2 px-3 py-2.5 text-sm text-text-primary" /><textarea value={nodeDraft.sublabel} onChange={(e) => setNodeDraft({ ...nodeDraft, sublabel: e.target.value })} placeholder="Details (optional)" className="mt-2 min-h-16 w-full rounded-xl border border-borderSoft/45 bg-panel2 px-3 py-2.5 text-sm text-text-primary" /><select value={nodeDraft.type} onChange={(e) => setNodeDraft({ ...nodeDraft, type: e.target.value })} className="mt-2 w-full rounded-xl border border-borderSoft/45 bg-panel2 px-3 py-2.5 text-sm text-text-primary"><option>actor</option><option>process</option><option>system</option><option>database</option><option>action</option></select><button className="mt-3 w-full rounded-xl bg-accent py-2 text-xs font-bold text-[rgb(var(--accent-contrast))]">Save node</button></form>}</div>;
}

export function VisualCanvasView({ missionId }: VisualCanvasViewProps) {
  const diagrams = useTeamStore((state) => state.diagrams); const addDiagram = useTeamStore((state) => state.addDiagram); const updateDiagram = useTeamStore((state) => state.updateDiagram); const deleteDiagram = useTeamStore((state) => state.deleteDiagram); const updateDiagramNodes = useTeamStore((state) => state.updateDiagramNodes);
  const missionDiagrams = useMemo(() => diagrams.filter((diagram) => diagram.missionId === missionId), [diagrams, missionId]); const [selectedId, setSelectedId] = useState(''); const active = missionDiagrams.find((diagram) => diagram.id === selectedId) ?? missionDiagrams[0];
  const [nameDialog, setNameDialog] = useState<'create' | 'rename' | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const create = () => { setTitleDraft(''); setNameDialog('create'); };
  const edit = () => { if (!active) return; setTitleDraft(active.title); setNameDialog('rename'); };
  const saveDiagramName = (event: React.FormEvent) => {
    event.preventDefault();
    const title = titleDraft.trim();
    if (!title) return;
    if (nameDialog === 'create') {
      const diagram = addDiagram({ missionId, title, description: '', diagramType: 'custom', nodes: [], edges: [] });
      setSelectedId(diagram.id);
    } else if (nameDialog === 'rename' && active) {
      updateDiagram(active.id, { title });
    }
    setNameDialog(null);
  };
  const remove = () => { if (active) setDeleteDialogOpen(true); };
  const confirmRemove = () => { if (!active) return; deleteDiagram(active.id); setSelectedId(''); setDeleteDialogOpen(false); };
  const exportJson = () => { if (!active) return; const link = document.createElement('a'); link.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(active, null, 2))}`; link.download = `${active.title.toLowerCase().replace(/\s+/g, '-')}.json`; link.click(); };
  const persistFlow = (nodes: Node<FlowData>[], edges: Edge[]) => { if (!active) return; updateDiagramNodes(active.id, toDiagramNodes(nodes)); updateDiagram(active.id, { edges: edges.map((edge) => ({ id: edge.id, from: edge.source, to: edge.target, label: typeof edge.label === 'string' ? edge.label : undefined, dashed: Boolean(edge.animated) })) }); };
  return (
    <ReactFlowProvider>
      <div className="space-y-2">
        {active ? (
          <>
            <div className="flex min-h-12 items-center gap-2 rounded-xl border border-borderSoft/35 bg-panel/55 p-2">
              <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:flex">
                <Network className="h-4 w-4" />
              </span>
              {missionDiagrams.length > 1 ? (
                <select
                  aria-label="Active diagram"
                  value={active.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="min-w-0 max-w-sm flex-1 truncate rounded-lg border border-borderSoft/35 bg-panel2 px-2.5 py-1.5 text-sm font-bold text-text-primary"
                >
                  {missionDiagrams.map((diagram) => <option key={diagram.id} value={diagram.id}>{diagram.title}</option>)}
                </select>
              ) : (
                <div className="min-w-0 flex-1 px-1">
                  <h3 className="truncate text-sm font-bold text-text-primary">{active.title}</h3>
                  <p className="text-[11px] text-text-muted">{active.nodes.length} nodes · {active.edges.length} connections</p>
                </div>
              )}
              {missionDiagrams.length > 1 && <span className="hidden whitespace-nowrap text-[11px] text-text-muted lg:inline">{active.nodes.length} nodes · {active.edges.length} connections</span>}
              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button type="button" onClick={create} title="New diagram" aria-label="New diagram" className="inline-flex items-center gap-1 rounded-lg bg-accent px-2.5 py-2 text-xs font-bold text-[rgb(var(--accent-contrast))]">
                  <Plus className="h-4 w-4" /><span className="hidden md:inline">New</span>
                </button>
                <button type="button" onClick={edit} title="Rename diagram" aria-label="Rename diagram" className="rounded-lg p-2 text-text-secondary hover:bg-panel2"><Edit3 className="h-4 w-4" /></button>
                <button type="button" onClick={exportJson} title="Export diagram" aria-label="Export diagram" className="rounded-lg p-2 text-text-secondary hover:bg-panel2"><Download className="h-4 w-4" /></button>
                <button type="button" onClick={remove} title="Delete diagram" aria-label="Delete diagram" className="rounded-lg p-2 text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <FlowEditor diagram={active} onChange={persistFlow} />
          </>
        ) : (
          <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-borderSoft/50 text-sm text-text-secondary">
            <Network className="mb-3 h-10 w-10 text-text-muted" />
            <p>No diagram yet.</p>
            <button type="button" onClick={create} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-bold text-[rgb(var(--accent-contrast))]"><Plus className="h-4 w-4" />Create diagram</button>
          </div>
        )}
      </div>
      {nameDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={() => setNameDialog(null)}>
          <form onSubmit={saveDiagramName} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-borderSoft/45 bg-panel p-5 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-base font-bold text-text-primary">{nameDialog === 'create' ? 'Create diagram' : 'Rename diagram'}</h2>
              <p className="mt-1 text-xs text-text-secondary">Choose a clear name so your team can find this flow quickly.</p>
            </div>
            <label htmlFor="diagram-title" className="mb-2 block text-xs font-semibold text-text-secondary">Diagram name</label>
            <input
              id="diagram-title"
              autoFocus
              required
              maxLength={100}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              placeholder="e.g. Booking architecture flow"
              className="w-full rounded-xl border border-borderSoft/50 bg-panel2 px-3.5 py-3 text-sm text-text-primary outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/15"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setNameDialog(null)} className="rounded-xl border border-borderSoft/40 px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-panel2">Cancel</button>
              <button type="submit" disabled={!titleDraft.trim()} className="rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-[rgb(var(--accent-contrast))] disabled:cursor-not-allowed disabled:opacity-45">{nameDialog === 'create' ? 'Create diagram' : 'Save name'}</button>
            </div>
          </form>
        </div>
      )}
      {deleteDialogOpen && active && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={() => setDeleteDialogOpen(false)}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-diagram-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-borderSoft/45 bg-panel p-5 shadow-2xl">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger"><Trash2 className="h-5 w-5" /></span>
            <h2 id="delete-diagram-title" className="text-base font-bold text-text-primary">Delete this diagram?</h2>
            <p className="mt-2 text-sm leading-5 text-text-secondary"><span className="font-semibold text-text-primary">“{active.title}”</span> and all of its nodes and connections will be removed.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteDialogOpen(false)} className="rounded-xl border border-borderSoft/40 px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-panel2">Cancel</button>
              <button type="button" onClick={confirmRemove} className="rounded-xl bg-danger px-4 py-2.5 text-xs font-bold text-white">Delete diagram</button>
            </div>
          </div>
        </div>
      )}
    </ReactFlowProvider>
  );
}
