"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export default function ArticleRenderer({ content }: Props) {
  return (
    <div className="prose prose-zinc dark:prose-invert max-w-none
      prose-headings:font-bold
      prose-h1:text-2xl prose-h1:mb-4
      prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
      prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
      prose-p:leading-relaxed
      prose-code:text-blue-600 dark:prose-code:text-blue-300 prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:break-words prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-700 prose-pre:rounded-xl
      prose-blockquote:border-blue-500 prose-blockquote:italic
      prose-table:text-sm
      prose-th:bg-zinc-100 dark:prose-th:bg-zinc-800 prose-th:font-semibold
      prose-td:border-zinc-200 dark:prose-td:border-zinc-700
      prose-hr:border-zinc-200 dark:prose-hr:border-zinc-700
      prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-700 dark:hover:prose-a:text-blue-300
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // A wide table must scroll inside its own box; left alone it pushes
          // the whole article sideways on a phone. `<pre>` already gets this
          // from the prose plugin.
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
