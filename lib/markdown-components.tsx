import React from "react";
import { Components } from "react-markdown";

/**
 * Shared ReactMarkdown component configuration for chat messages
 * Provides consistent styling across the application
 */
export const chatMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-white mb-2 mt-0 break-words">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold text-white mb-2 mt-3 break-words">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium text-white mb-1 mt-2 break-words">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-white/90 mb-2 leading-relaxed break-words hyphens-auto text-sm">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="text-white font-semibold break-words text-sm">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="text-white/80 italic break-words text-sm">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-purple-300 hover:text-purple-200 underline cursor-pointer break-words text-sm"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-white/30" />,
  ul: ({ children }) => (
    <ul className="list-disc list-inside text-white/90 space-y-1 mb-2 break-words text-sm">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside text-white/90 space-y-1 mb-2 break-words text-sm">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-white/90 break-words text-sm">{children}</li>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-4 max-w-full">
      <table
        className="w-full max-w-full border-collapse border border-white/30 rounded-lg bg-black/20 text-xs sm:text-sm"
        style={{ maxWidth: "100%", minWidth: "auto" }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/10">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/20">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-white/5 transition-colors">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-b border-white/30 break-words">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white/90 border-b border-white/20 break-words">
      {children}
    </td>
  ),
};
