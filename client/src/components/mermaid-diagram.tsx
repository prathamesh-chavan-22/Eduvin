import { useEffect, useRef, useState, useCallback } from "react";
import mermaid from "mermaid";
import { Button } from "@/components/ui/button";

// Initialize mermaid once
mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "strict",
    fontFamily: "inherit",
});

let renderCounter = 0;

interface MermaidDiagramProps {
    chart: string;
    interactive?: boolean;
}

export default function MermaidDiagram({ chart, interactive = false }: MermaidDiagramProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{ x: number; y: number; dragging: boolean }>({ x: 0, y: 0, dragging: false });
    const [svg, setSvg] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });

    const clampScale = (value: number) => Math.max(0.4, Math.min(2.8, value));

    const renderChart = useCallback(async () => {
        if (!chart.trim()) return;

        try {
            const id = `mermaid-${Date.now()}-${renderCounter++}`;
            const { svg: renderedSvg } = await mermaid.render(id, chart.trim());
            setSvg(renderedSvg);
            setError(null);
        } catch (err: any) {
            console.warn("Mermaid render error:", err);
            setError(err?.message || "Failed to render diagram");
            setSvg("");
        }
    }, [chart]);

    useEffect(() => {
        renderChart();
    }, [renderChart]);

    useEffect(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    }, [chart]);

    const zoomIn = () => setScale((prev) => clampScale(prev + 0.15));
    const zoomOut = () => setScale((prev) => clampScale(prev - 0.15));
    const resetView = () => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
    };

    const onWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
        if (!interactive) {
            return;
        }
        if (!event.ctrlKey && !event.metaKey) {
            return;
        }
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.08 : 0.08;
        setScale((prev) => clampScale(prev + delta));
    };

    const onMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive) {
            return;
        }
        dragStateRef.current = { x: event.clientX, y: event.clientY, dragging: true };
    };

    const onMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!interactive || !dragStateRef.current.dragging) {
            return;
        }
        const dx = event.clientX - dragStateRef.current.x;
        const dy = event.clientY - dragStateRef.current.y;
        dragStateRef.current = { x: event.clientX, y: event.clientY, dragging: true };
        setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const stopDragging = () => {
        dragStateRef.current.dragging = false;
    };

    if (error) {
        return (
            <div className="my-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 overflow-x-auto">
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
                    ⚠ Diagram could not be rendered
                </p>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{chart}</pre>
            </div>
        );
    }

    if (!svg) {
        return (
            <div className="my-4 flex items-center justify-center p-8 rounded-lg border border-border/50 bg-muted/20">
                <div className="animate-pulse text-sm text-muted-foreground">Rendering diagram...</div>
            </div>
        );
    }

    return (
        <div className="my-4 rounded-xl border border-border/50 bg-white dark:bg-slate-950 p-3 shadow-sm">
            {interactive && (
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                        Scroll to pan. Hold Ctrl/Cmd + mouse wheel to zoom. Drag to reposition.
                    </p>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={zoomOut}>-</Button>
                        <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
                        <Button size="sm" variant="outline" onClick={zoomIn}>+</Button>
                        <Button size="sm" variant="outline" onClick={resetView}>Reset</Button>
                    </div>
                </div>
            )}

            <div
                ref={containerRef}
                className={`overflow-auto rounded-lg border border-border/40 bg-white dark:bg-slate-950 ${interactive ? "max-h-[72vh]" : ""}`}
                onWheel={onWheelZoom}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={stopDragging}
                onMouseLeave={stopDragging}
            >
                <div
                    className={`p-4 ${interactive ? "cursor-grab active:cursor-grabbing" : ""}`}
                    style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: "top left" }}
                >
                    {svg && (
                        <svg
                            dangerouslySetInnerHTML={{ __html: svg }}
                            style={{ width: "100%", height: "auto" }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
