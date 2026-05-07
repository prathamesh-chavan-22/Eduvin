import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, Download, Info, Flag, CheckCircle2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MindmapNode {
  label: string;
  children: MindmapNode[];
  // Enriched schema fields (optional for backwards compatibility)
  type?: string;
  description?: string;
  keyPoints?: string[];
  tags?: string[];
  confidence?: number;
}

interface Position {
  x: number;
  y: number;
}

interface RenderedNode {
  node: MindmapNode;
  x: number;
  y: number;
  depth: number;
  expanded: boolean;
  children: RenderedNode[];
}

// Color palette for different node types
const NODE_TYPE_STYLES: Record<string, { bg: string; stroke: string; icon?: React.ReactNode }> = {
  root: { bg: "bg-violet-500 text-white", stroke: "#8b5cf6" },
  topic: { bg: "bg-blue-500 text-white", stroke: "#3b82f6" },
  subtopic: { bg: "bg-cyan-500 text-white", stroke: "#06b6d4" },
  detail: { bg: "bg-slate-500 text-white", stroke: "#64748b" },
  action_item: { bg: "bg-amber-500 text-white", stroke: "#f59e0b", icon: <Flag className="w-3 h-3" /> },
  decision: { bg: "bg-emerald-500 text-white", stroke: "#10b981", icon: <CheckCircle2 className="w-3 h-3" /> },
};

const DEFAULT_COLORS = [
  { bg: "bg-violet-500 text-white", stroke: "#8b5cf6" },
  { bg: "bg-blue-500 text-white", stroke: "#3b82f6" },
  { bg: "bg-cyan-500 text-white", stroke: "#06b6d4" },
  { bg: "bg-teal-500 text-white", stroke: "#14b8a6" },
  { bg: "bg-emerald-500 text-white", stroke: "#10b981" },
  { bg: "bg-amber-500 text-white", stroke: "#f59e0b" },
  { bg: "bg-rose-500 text-white", stroke: "#f43f5e" },
];

function getNodeStyle(node: MindmapNode, depth: number) {
  const typeStyle = node.type ? NODE_TYPE_STYLES[node.type] : null;
  if (typeStyle) return typeStyle;
  return DEFAULT_COLORS[depth % DEFAULT_COLORS.length];
}

interface MindmapTreeProps {
  data: MindmapNode;
}

export function MindmapTree({ data }: MindmapTreeProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Position>({ x: 50, y: 300 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(["root"]));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<MindmapNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate tree layout
  const NODE_WIDTH = 200;
  const NODE_HEIGHT = 56;
  const HORIZONTAL_SPACING = 240;
  const VERTICAL_SPACING = 75;

  const getNodeId = (path: string[]) => path.join("-") || "root";

  const calculateTreeLayout = useCallback(
    (node: MindmapNode, depth: number, path: string[]): RenderedNode => {
      const nodeId = getNodeId(path);
      const isExpanded = expandedNodes.has(nodeId);

      const renderedNode: RenderedNode = {
        node,
        x: depth * HORIZONTAL_SPACING,
        y: 0, // Will be calculated after counting children
        depth,
        expanded: isExpanded,
        children: [],
      };

      if (isExpanded && node.children.length > 0) {
        renderedNode.children = node.children.map((child, index) =>
          calculateTreeLayout(child, depth + 1, [...path, String(index)])
        );
      }

      return renderedNode;
    },
    [expandedNodes]
  );

  // Calculate Y positions based on leaf count
  const assignYPositions = useCallback(
    (renderedNode: RenderedNode, startY: number): number => {
      if (renderedNode.children.length === 0) {
        renderedNode.y = startY;
        return startY + VERTICAL_SPACING;
      }

      let currentY = startY;
      for (const child of renderedNode.children) {
        currentY = assignYPositions(child, currentY);
      }

      // Center parent vertically among children
      const firstChild = renderedNode.children[0];
      const lastChild = renderedNode.children[renderedNode.children.length - 1];
      renderedNode.y = (firstChild.y + lastChild.y) / 2;

      return currentY;
    },
    []
  );

  const treeLayout = calculateTreeLayout(data, 0, []);
  assignYPositions(treeLayout, 100);

  // Calculate SVG bounds
  const getMaxX = (node: RenderedNode): number => {
    const childMaxX = node.children.length > 0 ? Math.max(...node.children.map(getMaxX)) : node.x;
    return Math.max(node.x, childMaxX);
  };

  const getMaxY = (node: RenderedNode): number => {
    const childMaxY = node.children.length > 0 ? Math.max(...node.children.map(getMaxY)) : node.y;
    return Math.max(node.y, childMaxY);
  };

  const svgWidth = getMaxX(treeLayout) + NODE_WIDTH + 100;
  const svgHeight = Math.max(getMaxY(treeLayout) + NODE_HEIGHT + 100, 600);

  // Toggle expand/collapse
  const toggleNode = useCallback((path: string[]) => {
    const nodeId = getNodeId(path);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Zoom controls
  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 2.5));
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.3));
  const resetView = () => {
    setScale(1);
    setOffset({ x: 50, y: 300 });
  };

  // Expand/collapse all
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collect = (node: MindmapNode, path: string[]) => {
      allIds.add(getNodeId(path));
      node.children.forEach((child, i) => collect(child, [...path, String(i)]));
    };
    collect(data, []);
    setExpandedNodes(allIds);
  }, [data]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set(["root"]));
  }, []);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Export as PNG
  const exportPNG = async () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.download = "mindmap.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Export as JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = "mindmap.json";
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  // Render node tooltip
  const NodeTooltip = ({ node }: { node: MindmapNode }) => {
    if (!node.description && !node.keyPoints?.length && !node.tags?.length && node.confidence == null) {
      return null;
    }

    return (
      <div className="max-w-xs space-y-2 p-3">
        {node.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{node.description}</p>
          </div>
        )}
        {node.keyPoints && node.keyPoints.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              <Lightbulb className="w-3 h-3 inline mr-1" />
              Key Points
            </p>
            <ul className="text-sm space-y-1">
              {node.keyPoints.slice(0, 4).map((kp, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
                  <span className="line-clamp-2">{kp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {node.tags && node.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {node.tags.slice(0, 5).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {node.confidence != null && (
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">Confidence</p>
            <div className="flex-1 h-1.5 rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  node.confidence > 0.8
                    ? "bg-emerald-500"
                    : node.confidence > 0.6
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${node.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs">{(node.confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    );
  };

  // Render node and edges recursively
  const renderNode = (renderedNode: RenderedNode, path: string[]) => {
    const { node, x, y, depth, expanded } = renderedNode;
    const nodeId = getNodeId(path);
    const style = getNodeStyle(node, depth);

    return (
      <g key={nodeId}>
        {/* Edges to children */}
        {renderedNode.children.map((child, index) => {
          const childPath = [...path, String(index)];
          const childStyle = getNodeStyle(child.node, child.depth);
          return (
            <g key={getNodeId(childPath)}>
              <motion.path
                d={`M ${x + NODE_WIDTH} ${y + NODE_HEIGHT / 2}
                    C ${x + NODE_WIDTH + 60} ${y + NODE_HEIGHT / 2},
                      ${child.x - 60} ${child.y + NODE_HEIGHT / 2},
                      ${child.x} ${child.y + NODE_HEIGHT / 2}`}
                fill="none"
                stroke={childStyle.stroke}
                strokeWidth="3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {renderNode(child, childPath)}
            </g>
          );
        })}

        {/* Node rectangle with tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.g
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: depth * 0.1 }}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <foreignObject x={x} y={y} width={NODE_WIDTH} height={NODE_HEIGHT}>
                  <div
                    className={`w-full h-full rounded-lg shadow-md cursor-pointer select-none flex items-center gap-2 px-3 py-2 ${style.bg} ${
                      node.children.length > 0 ? "hover:brightness-110" : ""
                    }`}
                    onClick={() => node.children.length > 0 && toggleNode(path)}
                    style={{ minHeight: NODE_HEIGHT }}
                  >
                    {/* Type icon */}
                    {style.icon && <span className="shrink-0">{style.icon}</span>}

                    {/* Label */}
                    <p className="text-sm font-medium text-center leading-tight flex-1 line-clamp-2">
                      {node.label}
                    </p>

                    {/* Confidence mini-indicator */}
                    {node.confidence != null && (
                      <div className="w-6 h-1 rounded-full bg-white/30 shrink-0">
                        <div
                          className="h-full rounded-full bg-white"
                          style={{ width: `${node.confidence * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </foreignObject>

                {/* Expand/collapse indicator */}
                {node.children.length > 0 && (
                  <circle
                    cx={x + NODE_WIDTH}
                    cy={y + NODE_HEIGHT / 2}
                    r="8"
                    fill={expanded ? "#10b981" : "#f59e0b"}
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
              </motion.g>
            </TooltipTrigger>
            <TooltipContent side="top" align="start" className="max-w-xs">
              <NodeTooltip node={node} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </g>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
          <Button variant="outline" size="icon" onClick={zoomIn} title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={zoomOut} title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={resetView} title="Reset View">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
        <div className="flex gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-lg">
          <Button variant="outline" size="icon" onClick={exportPNG} title="Export as PNG">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={exportJSON}>
            Export JSON
          </Button>
        </div>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg text-xs text-slate-600">
          Zoom: {(scale * 100).toFixed(0)}%
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {renderNode(treeLayout, [])}
        </g>
      </svg>
    </div>
  );
}
