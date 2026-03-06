import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import MermaidDiagram from "./mermaid-diagram";
import type { Components } from "react-markdown";

interface MarkdownContentProps {
    content: string;
}

const components: Components = {
    code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match?.[1];
        const codeStr = String(children).replace(/\n$/, "");

        // Mermaid diagram
        if (lang === "mermaid") {
            return <MermaidDiagram chart={codeStr} />;
        }

        // Inline code (no language class, short)
        if (!className) {
            return (
                <code
                    className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-primary"
                    {...props}
                >
                    {children}
                </code>
            );
        }

        // Fenced code block
        return (
            <div className="my-4 overflow-hidden rounded-lg border border-border/50 shadow-sm">
                {lang && (
                    <div className="bg-muted/60 px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                        {lang}
                    </div>
                )}
                <pre className="overflow-x-auto p-4 bg-slate-950 dark:bg-slate-900 text-slate-50">
                    <code className="text-sm font-mono leading-relaxed">{codeStr}</code>
                </pre>
            </div>
        );
    },

    img({ src, alt, ...props }) {
        return (
            <figure className="my-6">
                <img
                    src={src}
                    alt={alt || ""}
                    className="rounded-lg border border-border/50 shadow-sm max-w-full h-auto mx-auto"
                    loading="lazy"
                    onError={(e) => {
                        // If the external image fails (e.g. blocked by adblocker), show a fallback instead of hiding
                        const target = e.target as HTMLImageElement;
                        // To avoid infinite loop, only set it once
                        if (!target.src.includes('images.unsplash.com')) {
                            target.src = "https://images.unsplash.com/photo-1546410531-ee4cs288152"; // Reliable fallback image
                        } else {
                            target.style.display = "none";
                        }
                    }}
                    {...props}
                />
                {alt && (
                    <figcaption className="text-center text-xs text-muted-foreground mt-2">
                        {alt}
                    </figcaption>
                )}
            </figure>
        );
    },

    table({ children, ...props }) {
        return (
            <div className="my-4 overflow-x-auto rounded-lg border border-border/50 shadow-sm">
                <table className="w-full text-sm" {...props}>
                    {children}
                </table>
            </div>
        );
    },

    th({ children, ...props }) {
        return (
            <th
                className="bg-muted/50 px-4 py-2.5 text-left font-semibold text-sm border-b border-border/50"
                {...props}
            >
                {children}
            </th>
        );
    },

    td({ children, ...props }) {
        return (
            <td className="px-4 py-2.5 border-b border-border/30 text-sm" {...props}>
                {children}
            </td>
        );
    },

    blockquote({ children, ...props }) {
        return (
            <blockquote
                className="my-4 border-l-4 border-primary/40 bg-primary/5 rounded-r-lg pl-4 pr-4 py-3 text-sm italic"
                {...props}
            >
                {children}
            </blockquote>
        );
    },

    h2({ children, ...props }) {
        return (
            <h2 className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-border/30" {...props}>
                {children}
            </h2>
        );
    },

    h3({ children, ...props }) {
        return (
            <h3 className="text-xl font-semibold mt-6 mb-3" {...props}>
                {children}
            </h3>
        );
    },

    ul({ children, ...props }) {
        return (
            <ul className="my-3 ml-6 list-disc space-y-1.5 text-sm leading-relaxed" {...props}>
                {children}
            </ul>
        );
    },

    ol({ children, ...props }) {
        return (
            <ol className="my-3 ml-6 list-decimal space-y-1.5 text-sm leading-relaxed" {...props}>
                {children}
            </ol>
        );
    },

    p({ children, ...props }) {
        return (
            <p className="my-3 text-sm leading-relaxed text-foreground/90" {...props}>
                {children}
            </p>
        );
    },

    a({ href, children, ...props }) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                {...props}
            >
                {children}
            </a>
        );
    },

    hr() {
        return <hr className="my-6 border-border/50" />;
    },
};

export default function MarkdownContent({ content }: MarkdownContentProps) {
    if (!content) return null;

    return (
        <div className="markdown-content prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
