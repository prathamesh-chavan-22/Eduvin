import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight, ChevronDown, Copy, Download, Upload, Save,
  Edit3, Check, X, Search, Filter, Info, Plus, Trash2,
  Undo, Redo, Code, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MindmapNode {
  label: string;
  type: "root" | "topic" | "subtopic" | "detail" | "action_item" | "decision";
  description?: string;
  keyPoints?: string[];
  tags?: string[];
  sourceChunk?: number;
  confidence?: number;
  children?: MindmapNode[];
}

interface MindmapData {
  version?: string;
  metadata?: Record<string, any>;
  summary: MindmapNode;
  chunks?: Array<Record<string, any>>;
  editableNotes?: string;
}

type ViewMode = "tree" | "json" | "split";

// ─── Helpers ────────────────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, string> = {
  root: "bg-violet-100 text-violet-800 border-violet-200",
  topic: "bg-blue-100 text-blue-800 border-blue-200",
  subtopic: "bg-cyan-100 text-cyan-800 border-cyan-200",
  detail: "bg-slate-100 text-slate-700 border-slate-200",
  action_item: "bg-amber-100 text-amber-800 border-amber-200",
  decision: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const NODE_TYPE_DOT: Record<string, string> = {
  root: "bg-violet-500",
  topic: "bg-blue-500",
  subtopic: "bg-cyan-500",
  detail: "bg-slate-400",
  action_item: "bg-amber-500",
  decision: "bg-emerald-500",
};

function cloneNode(node: MindmapNode): MindmapNode {
  return JSON.parse(JSON.stringify(node));
}

function findNodeByPath(
  root: MindmapNode,
  path: number[]
): { node: MindmapNode; parent: MindmapNode | null; index: number } | null {
  if (path.length === 0) return { node: root, parent: null, index: 0 };
  let current = root;
  let parent: MindmapNode | null = null;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current.children?.[path[i]]) return null;
    parent = current;
    current = current.children[path[i]];
  }
  return { node: current, parent, index: path[path.length - 1] };
}

// ─── Node Editor Panel ──────────────────────────────────────────────────────

interface NodeEditorProps {
  node: MindmapNode;
  onChange: (updated: MindmapNode) => void;
}

function NodeEditor({ node, onChange }: NodeEditorProps) {
  const updateField = (field: keyof MindmapNode, value: any) => {
    onChange({ ...node, [field]: value });
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...(node.keyPoints || [])];
    updated[index] = value;
    updateField("keyPoints", updated);
  };

  const addKeyPoint = () => {
    updateField("keyPoints", [...(node.keyPoints || []), ""]);
  };

  const removeKeyPoint = (index: number) => {
    updateField(
      "keyPoints",
      (node.keyPoints || []).filter((_, i) => i !== index)
    );
  };

  const updateTag = (index: number, value: string) => {
    const updated = [...(node.tags || [])];
    updated[index] = value;
    updateField("tags", updated);
  };

  const addTag = () => {
    updateField("tags", [...(node.tags || []), ""]);
  };

  const removeTag = (index: number) => {
    updateField("tags", (node.tags || []).filter((_, i) => i !== index));
  };

  const addChild = () => {
    updateField("children", [
      ...(node.children || []),
      {
        label: "New Node",
        type: "detail" as const,
        description: "",
        keyPoints: [],
        tags: [],
        children: [],
      },
    ]);
  };

  const removeChild = (index: number) => {
    updateField(
      "children",
      (node.children || []).filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-4 p-4 text-sm">
      {/* Label */}
      <div>
        <label className="block font-medium mb-1">Label</label>
        <Input
          value={node.label}
          onChange={(e) => updateField("label", e.target.value)}
          className="h-8"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block font-medium mb-1">Type</label>
        <select
          value={node.type}
          onChange={(e) => updateField("type", e.target.value)}
          className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="root">Root</option>
          <option value="topic">Topic</option>
          <option value="subtopic">Subtopic</option>
          <option value="detail">Detail</option>
          <option value="action_item">Action Item</option>
          <option value="decision">Decision</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block font-medium mb-1">Description</label>
        <Textarea
          value={node.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          className="min-h-[60px] resize-none"
          placeholder="Brief summary..."
        />
      </div>

      {/* Confidence */}
      <div>
        <label className="block font-medium mb-1">
          Confidence: {((node.confidence ?? 0) * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={node.confidence ?? 0}
          onChange={(e) => updateField("confidence", parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Key Points */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-medium">Key Points</label>
          <Button variant="ghost" size="sm" onClick={addKeyPoint} className="h-6 px-2 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="space-y-1">
          {(node.keyPoints || []).map((kp, i) => (
            <div key={i} className="flex gap-1">
              <Input
                value={kp}
                onChange={(e) => updateKeyPoint(i, e.target.value)}
                className="h-7 text-xs"
                placeholder="Key point..."
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeKeyPoint(i)}
                className="h-7 w-7 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="font-medium">Tags</label>
          <Button variant="ghost" size="sm" onClick={addTag} className="h-6 px-2 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(node.tags || []).map((tag, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={tag}
                onChange={(e) => updateTag(i, e.target.value)}
                className="h-6 w-24 text-xs px-2"
                placeholder="tag"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeTag(i)}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Children count */}
      <div>
        <label className="block font-medium mb-1">
          Children: {node.children?.length || 0}
        </label>
        <Button variant="outline" size="sm" onClick={addChild} className="w-full h-7 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Add Child Node
        </Button>
      </div>
    </div>
  );
}

// ─── Tree View ──────────────────────────────────────────────────────────────

interface TreeViewProps {
  node: MindmapNode;
  path: number[];
  selectedPath: number[] | null;
  onSelect: (path: number[]) => void;
  searchQuery: string;
  typeFilter: string | null;
}

function TreeView({ node, path, selectedPath, onSelect, searchQuery, typeFilter }: TreeViewProps) {
  const [expanded, setExpanded] = useState(path.length < 2);
  const hasChildren = node.children && node.children.length > 0;

  const matchesSearch =
    !searchQuery ||
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.description || "").toLowerCase().includes(searchQuery.toLowerCase());

  const matchesFilter = !typeFilter || node.type === typeFilter;

  const childMatches = hasChildren
    ? node.children!.some((child, i) => {
        const childPath = [...path, i];
        return (
          child.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (child.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
    : false;

  const shouldShow = (matchesSearch && matchesFilter) || childMatches;

  if (!shouldShow) return null;

  const isSelected = JSON.stringify(path) === JSON.stringify(selectedPath);
  const depth = path.length;

  return (
    <div>
      <motion.div
        className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm transition-colors
          ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/50"}
          ${!matchesSearch && childMatches ? "opacity-60" : ""}
        `}
        onClick={() => onSelect(path)}
        initial={false}
      >
        {/* Expand/collapse */}
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          )}
        </button>

        {/* Type indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${NODE_TYPE_DOT[node.type] || "bg-muted-foreground"}`} />

        {/* Label */}
        <span className="truncate flex-1 font-medium">{node.label}</span>

        {/* Type badge */}
        <Badge
          variant="outline"
          className={`text-[10px] px-1 py-0 shrink-0 ${NODE_TYPE_COLORS[node.type] || ""}`}
        >
          {node.type.replace("_", " ")}
        </Badge>

        {/* Confidence indicator */}
        {node.confidence != null && (
          <div
            className="w-8 h-1.5 rounded-full bg-muted shrink-0"
            title={`Confidence: ${(node.confidence * 100).toFixed(0)}%`}
          >
            <div
              className={`h-full rounded-full ${
                node.confidence > 0.8
                  ? "bg-emerald-500"
                  : node.confidence > 0.6
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${(node.confidence ?? 0) * 100}%` }}
            />
          </div>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            className="ml-4 border-l border-muted pl-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children!.map((child, i) => (
              <TreeView
                key={i}
                node={child}
                path={[...path, i]}
                selectedPath={selectedPath}
                onSelect={onSelect}
                searchQuery={searchQuery}
                typeFilter={typeFilter}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── JSON Raw Editor ────────────────────────────────────────────────────────

interface JsonEditorProps {
  data: MindmapData;
  onChange: (data: MindmapData) => void;
}

function JsonEditor({ data, onChange }: JsonEditorProps) {
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const formatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(rawJson);
      setRawJson(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [rawJson]);

  const applyChanges = useCallback(() => {
    try {
      const parsed = JSON.parse(rawJson);
      onChange(parsed);
      setError(null);
      toast({ title: "Saved", description: "Mindmap data updated" });
    } catch (e: any) {
      setError(e.message);
      toast({ title: "Invalid JSON", description: e.message, variant: "destructive" });
    }
  }, [rawJson, onChange, toast]);

  const loadFromData = useCallback(() => {
    setRawJson(JSON.stringify(data, null, 2));
    setError(null);
  }, [data]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 p-2 border-b">
        <Button variant="outline" size="sm" onClick={loadFromData} className="h-7 text-xs">
          <Upload className="w-3 h-3 mr-1" /> Load Current
        </Button>
        <Button variant="outline" size="sm" onClick={formatJson} className="h-7 text-xs">
          <Code className="w-3 h-3 mr-1" /> Format
        </Button>
        <Button variant="default" size="sm" onClick={applyChanges} className="h-7 text-xs">
          <Save className="w-3 h-3 mr-1" /> Apply Changes
        </Button>
      </div>
      <div className="flex-1 relative">
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          className="w-full h-full p-4 font-mono text-xs resize-none bg-muted/20 focus:outline-none"
          placeholder="Edit mindmap JSON here..."
          spellCheck={false}
        />
        {error && (
          <div className="absolute bottom-2 left-2 right-2 bg-destructive text-destructive-foreground px-3 py-2 rounded text-xs">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface EditableMindmapProps {
  data: MindmapData;
  onChange?: (data: MindmapData) => void;
}

export function EditableMindmap({ data, onChange }: EditableMindmapProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [selectedPath, setSelectedPath] = useState<number[] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<MindmapData[]>([data]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentData = editHistory[historyIndex];
  const summaryNode = currentData.summary as MindmapNode;

  const handleNodeChange = useCallback(
    (updatedNode: MindmapNode) => {
      if (!selectedPath) return;

      const newData = cloneNode(currentData) as MindmapData;
      if (selectedPath.length === 0) {
        newData.summary = updatedNode;
      } else {
        const result = findNodeByPath(newData.summary, selectedPath);
        if (result) {
          if (result.parent) {
            result.parent.children![result.index] = updatedNode;
          } else {
            newData.summary = updatedNode;
          }
        }
      }

      const newHistory = editHistory.slice(0, historyIndex + 1);
      newHistory.push(newData);
      setEditHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      onChange?.(newData);
    },
    [selectedPath, currentData, editHistory, historyIndex, onChange]
  );

  const selectedNode = selectedPath
    ? findNodeByPath(summaryNode, selectedPath)?.node ?? null
    : summaryNode;

  const handleExport = (format: "json" | "png") => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(currentData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Mindmap exported as JSON" });
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange?.(editHistory[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange?.(editHistory[historyIndex + 1]);
    }
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    const collect = (node: MindmapNode) => {
      types.add(node.type);
      node.children?.forEach(collect);
    };
    collect(summaryNode);
    return Array.from(types);
  }, [summaryNode]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card shrink-0">
        {/* View mode toggle */}
        <div className="flex gap-1 bg-muted rounded-md p-0.5">
          <Button
            variant={viewMode === "tree" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("tree")}
            className="h-7 px-3 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> Tree
          </Button>
          <Button
            variant={viewMode === "json" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("json")}
            className="h-7 px-3 text-xs"
          >
            <Code className="w-3.5 h-3.5 mr-1" /> JSON
          </Button>
          <Button
            variant={viewMode === "split" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("split")}
            className="h-7 px-3 text-xs"
          >
            Split
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Undo/Redo */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="h-7 w-7"
              >
                <Undo className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={historyIndex === editHistory.length - 1}
                className="h-7 w-7"
              >
                <Redo className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="h-4 w-px bg-border" />

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Type filter */}
        {uniqueTypes.length > 0 && (
          <select
            value={typeFilter || ""}
            onChange={(e) => setTypeFilter(e.target.value || null)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">All Types</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExport("json")}
          className="h-7 text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export JSON
        </Button>
      </div>

      {/* Content */}
      <div
        className={`flex-1 overflow-hidden ${
          viewMode === "split" ? "grid grid-cols-2 divide-x" : ""
        }`}
      >
        {/* Tree / JSON view */}
        {(viewMode === "tree" || viewMode === "split") && (
          <div className="flex h-full overflow-hidden">
            {/* Tree sidebar */}
            <div className="w-full overflow-y-auto border-r">
              <div className="p-2">
                <TreeView
                  node={summaryNode}
                  path={[]}
                  selectedPath={selectedPath}
                  onSelect={setSelectedPath}
                  searchQuery={searchQuery}
                  typeFilter={typeFilter}
                />
              </div>
            </div>

            {/* Node editor */}
            {viewMode === "split" && selectedNode && (
              <div className="w-full overflow-y-auto">
                <div className="sticky top-0 p-2 border-b bg-card flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="font-medium text-sm">Editing: {selectedNode.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${NODE_TYPE_COLORS[selectedNode.type] || ""}`}
                  >
                    {selectedNode.type.replace("_", " ")}
                  </Badge>
                </div>
                <NodeEditor node={selectedNode} onChange={handleNodeChange} />
              </div>
            )}
          </div>
        )}

        {/* Raw JSON editor */}
        {(viewMode === "json" || viewMode === "split") && (
          <div className="h-full">
            <JsonEditor data={currentData} onChange={(d) => onChange?.(d)} />
          </div>
        )}
      </div>

      {/* Editable notes footer */}
      {currentData.editableNotes && (
        <div className="p-3 border-t bg-amber-50/50 shrink-0">
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{currentData.editableNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
