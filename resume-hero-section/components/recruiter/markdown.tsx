import React from "react"

/**
 * Minimal, dependency-free markdown renderer for copilot answers.
 * Supports: fenced code blocks, #/##/### headings, - / * / • bullet lists,
 * numbered lists, **bold**, and `inline code`. Everything else is plain text.
 * This is intentionally small — we do NOT pull in a markdown library.
 */

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  // Tokenize on **bold** and `code`.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{part.slice(1, -1)}</code>
    }
    return <React.Fragment key={key}>{part}</React.Fragment>
  })
}

export function Markdown({ text }: { text: string }) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n")
  const blocks: React.ReactNode[] = []

  let i = 0
  let key = 0
  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]); i++
      }
      i++ // consume closing fence
      blocks.push(
        <pre key={key++} className="my-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-3 text-xs">
          <code className="font-mono text-foreground/90">{code.join("\n")}</code>
        </pre>
      )
      continue
    }

    // Heading
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const content = renderInline(heading[2], `h${key}`)
      const cls = level === 1 ? "text-base font-bold" : level === 2 ? "text-sm font-bold" : "text-sm font-semibold"
      blocks.push(<p key={key++} className={`mt-3 mb-1 ${cls} text-foreground`}>{content}</p>)
      i++
      continue
    }

    // Bullet list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*•]\s+/, "")); i++
      }
      blocks.push(
        <ul key={key++} className="my-1.5 space-y-1 pl-1">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-2 text-sm leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50" />
              <span>{renderInline(it, `li${key}-${idx}`)}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "")); i++
      }
      blocks.push(
        <ol key={key++} className="my-1.5 space-y-1.5">
          {items.map((it, idx) => (
            <li key={idx} className="flex gap-2.5 text-sm leading-relaxed">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{idx + 1}</span>
              <span>{renderInline(it, `ol${key}-${idx}`)}</span>
            </li>
          ))}
        </ol>
      )
      continue
    }

    // Blank line
    if (line.trim() === "") { i++; continue }

    // Paragraph (accumulate consecutive plain lines)
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*•]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]); i++
    }
    blocks.push(<p key={key++} className="my-1 text-sm leading-relaxed">{renderInline(para.join(" "), `p${key}`)}</p>)
  }

  return <div className="space-y-0.5">{blocks}</div>
}
