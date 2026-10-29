import type { ReactNode } from "react";

/**
 * Chhota markdown renderer — policy pages ke liye kaafi hai.
 * Naya syntax chahiye to react-markdown add karo, tab tak zero dependency.
 */
export function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`} className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-[#5c534b]">
        {listItems.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const [head, ...rows] = tableRows;
    blocks.push(
      <div key={`table-${key++}`} className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {head.map((cell, index) => (
                <th key={index} className="border border-[#e9dfd4] bg-[#faf6f1] px-3 py-2 text-left font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-[#e9dfd4] px-3 py-2 text-[#5c534b]">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
    tableRows = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("|")) flushTable();
    if (!line.startsWith("- ")) flushList();

    if (line === "") continue;
    if (line.startsWith("|")) {
      const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
      if (cells.every((cell) => /^-+$/.test(cell))) continue;
      tableRows.push(cells);
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${key++}`} className="mt-5 text-[13.5px] font-semibold tracking-[.04em] text-[#862222]">
          {inline(line.slice(4))}
        </h3>,
      );
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${key++}`} className="mt-7 font-display text-[19px] font-medium tracking-[.02em]">
          {inline(line.slice(3))}
        </h2>,
      );
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${key++}`} className="font-display text-[28px] leading-tight font-medium tracking-[.03em] sm:text-[34px]">
          {inline(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      blocks.push(
        <p key={`ol-${key++}`} className="mt-1 pl-1 text-[13px] leading-relaxed text-[#5c534b]">
          {inline(line)}
        </p>,
      );
      continue;
    }
    blocks.push(
      <p key={`p-${key++}`} className="mt-2.5 text-[13px] leading-relaxed text-[#5c534b]">
        {inline(line)}
      </p>,
    );
  }
  flushList();
  flushTable();
  return blocks;
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-[#2f2a25]">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}
