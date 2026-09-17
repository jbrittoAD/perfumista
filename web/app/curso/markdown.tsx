import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renderiza body_md como markdown legível no tema escuro (com tabelas GFM). */
export default function LessonMarkdown({ children }: { children: string }) {
  return (
    <div className="lesson-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-wrap">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
