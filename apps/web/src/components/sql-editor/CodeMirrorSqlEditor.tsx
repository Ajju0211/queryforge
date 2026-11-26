"use client";

import { useMemo } from "react";
import CodeMirror, { Extension } from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import {
  Completion,
  CompletionContext,
  CompletionSource,
  snippetCompletion,
} from "@codemirror/autocomplete";
import { sql, PostgreSQL, SQLNamespace } from "@codemirror/lang-sql";
import { useIsDarkMode } from "@/domain/theme/hooks/useIsDarkMode";

export interface TableColumnInfo {
  name: string;
  dataType: string;
}

export interface TableSchemaInfo {
  name: string;
  schema?: string;
  columns?: TableColumnInfo[];
}

export interface CodeMirrorSqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  tables?: TableSchemaInfo[];
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// 1. QueryForge Dark Theme (#151515 graphite palette)
// ---------------------------------------------------------------------------
const queryforgeDarkTheme = EditorView.theme(
  {
    "&": {
      color: "#f3f4f6",
      backgroundColor: "#151515",
      height: "100%",
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
    ".cm-content": {
      caretColor: "#10b981",
      padding: "10px 0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#10b981",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#10b981",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#1e3d30 !important",
      },
    ".cm-selectionMatch": {
      backgroundColor: "#1e3d30",
    },
    ".cm-activeLine": {
      backgroundColor: "#1e1e1e",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#262626",
      outline: "1px solid #10b981",
    },
    ".cm-gutters": {
      backgroundColor: "#151515",
      color: "#525252",
      borderRight: "1px solid #262626",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#1e1e1e",
      color: "#a3a3a3",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 8px",
      minWidth: "2.5em",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#9ca3af",
    },
    ".cm-tooltip": {
      border: "1px solid #282828",
      backgroundColor: "#1c1c1c",
      color: "#f3f4f6",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
        fontSize: "12px",
        maxHeight: "260px",
      },
      "& > ul > li": {
        padding: "4px 8px",
        borderRadius: "4px",
      },
      "& > ul > li:hover": {
        backgroundColor: "#242424",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "#2a2a2a",
        color: "#ffffff",
      },
    },
    ".cm-completionIcon": {
      marginRight: "6px",
      opacity: "0.8",
    },
    ".cm-completionDetail": {
      fontStyle: "italic",
      color: "#9ca3af",
      marginLeft: "8px",
    },
    ".cm-completionMatchedText": {
      textDecoration: "underline",
      color: "#10b981",
    },
    ".cm-scroller": {
      height: "100%",
      overflow: "auto",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
  },
  { dark: true }
);

const queryforgeDarkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#10b981", fontWeight: "bold" },
  {
    tag: [tags.typeName, tags.standard(tags.name), tags.null, tags.bool],
    color: "#34d399",
  },
  { tag: [tags.string, tags.special(tags.string)], color: "#fbbf24" },
  { tag: tags.number, color: "#60a5fa" },
  { tag: tags.operator, color: "#a78bfa" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: "#6b7280",
    fontStyle: "italic",
  },
  { tag: [tags.name, tags.variableName, tags.propertyName], color: "#f3f4f6" },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "#9ca3af" },
]);

const darkThemeExtension: Extension = [
  queryforgeDarkTheme,
  syntaxHighlighting(queryforgeDarkHighlightStyle),
];

// ---------------------------------------------------------------------------
// 2. QueryForge Light Theme (#fafafa neutral studio palette)
// ---------------------------------------------------------------------------
const queryforgeLightTheme = EditorView.theme(
  {
    "&": {
      color: "#111827",
      backgroundColor: "#fafafa",
      height: "100%",
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
    ".cm-content": {
      caretColor: "#059669",
      padding: "10px 0",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#059669",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#059669",
    },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#d1fae5 !important",
      },
    ".cm-selectionMatch": {
      backgroundColor: "#d1fae5",
    },
    ".cm-activeLine": {
      backgroundColor: "#f3f4f6",
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: "#e5e7eb",
      outline: "1px solid #059669",
    },
    ".cm-gutters": {
      backgroundColor: "#fafafa",
      color: "#9ca3af",
      borderRight: "1px solid #e5e7eb",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#f3f4f6",
      color: "#374151",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 8px",
      minWidth: "2.5em",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "transparent",
      border: "none",
      color: "#6b7280",
    },
    ".cm-tooltip": {
      border: "1px solid #e5e7eb",
      backgroundColor: "#ffffff",
      color: "#111827",
      borderRadius: "6px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
        fontSize: "12px",
        maxHeight: "260px",
      },
      "& > ul > li": {
        padding: "4px 8px",
        borderRadius: "4px",
      },
      "& > ul > li:hover": {
        backgroundColor: "#f3f4f6",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: "#e5e7eb",
        color: "#111827",
      },
    },
    ".cm-completionIcon": {
      marginRight: "6px",
      opacity: "0.8",
    },
    ".cm-completionDetail": {
      fontStyle: "italic",
      color: "#6b7280",
      marginLeft: "8px",
    },
    ".cm-completionMatchedText": {
      textDecoration: "underline",
      color: "#059669",
    },
    ".cm-scroller": {
      height: "100%",
      overflow: "auto",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace",
    },
  },
  { dark: false }
);

const queryforgeLightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#059669", fontWeight: "bold" },
  {
    tag: [tags.typeName, tags.standard(tags.name), tags.null, tags.bool],
    color: "#0d9488",
  },
  { tag: [tags.string, tags.special(tags.string)], color: "#d97706" },
  { tag: tags.number, color: "#2563eb" },
  { tag: tags.operator, color: "#7c3aed" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: "#9ca3af",
    fontStyle: "italic",
  },
  { tag: [tags.name, tags.variableName, tags.propertyName], color: "#111827" },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: "#4b5563" },
]);

const lightThemeExtension: Extension = [
  queryforgeLightTheme,
  syntaxHighlighting(queryforgeLightHighlightStyle),
];

// ---------------------------------------------------------------------------
// 3. Main Component
// ---------------------------------------------------------------------------
export function CodeMirrorSqlEditor({
  value,
  onChange,
  onExecute,
  tables = [],
  readOnly = false,
}: CodeMirrorSqlEditorProps) {
  const isDark = useIsDarkMode();

  // Execute shortcut keymap: Cmd+Enter (Mac) / Ctrl+Enter (Win/Linux)
  const executeKeybinding = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              if (onExecute) {
                onExecute();
                return true;
              }
              return false;
            },
          },
          {
            key: "Ctrl-Enter",
            run: () => {
              if (onExecute) {
                onExecute();
                return true;
              }
              return false;
            },
          },
        ])
      ),
    [onExecute]
  );

  // PostgreSQL dialect configuration with actual schema metadata
  const sqlLanguageExtension = useMemo(() => {
    const sqlSchema: Record<string, SQLNamespace> = {};

    for (const table of tables) {
      if (!table.name) continue;
      const columns: Completion[] = (table.columns || []).map((col) => ({
        label: col.name,
        type: "property",
        detail: col.dataType,
      }));

      // Direct table access: users.id
      sqlSchema[table.name] = columns;

      // Schema-qualified access: public.users.id
      if (table.schema) {
        if (!sqlSchema[table.schema]) {
          sqlSchema[table.schema] = {};
        }
        (sqlSchema[table.schema] as Record<string, SQLNamespace>)[table.name] = columns;
      }
    }

    return sql({
      dialect: PostgreSQL,
      schema: sqlSchema,
    });
  }, [tables]);

  // Autocomplete provider for tables, columns (qualified & unqualified), and SQL snippets
  const schemaAutocompleteExtension = useMemo(() => {
    const options: Completion[] = [];

    for (const table of tables) {
      if (!table.name) continue;
      const colCount = table.columns?.length || 0;

      // Table completion
      options.push({
        label: table.name,
        type: "class",
        detail: `Table (${colCount} columns)`,
        info: `Database table in schema: ${table.schema || "public"}`,
        boost: 2,
      });

      for (const col of table.columns || []) {
        // Unqualified column completion
        options.push({
          label: col.name,
          type: "field",
          detail: `${col.dataType} (${table.name})`,
          boost: 1,
        });

        // Qualified column completion
        options.push({
          label: `${table.name}.${col.name}`,
          type: "field",
          detail: `${col.dataType} in ${table.name}`,
          boost: 1,
        });
      }
    }

    // Common PostgreSQL snippets
    options.push(
      snippetCompletion("SELECT * FROM ${table_name} LIMIT ${10};", {
        label: "SELECT * FROM ...",
        type: "snippet",
        detail: "Select all snippet",
      }),
      snippetCompletion(
        "CREATE TABLE ${table_name} (\n  id SERIAL PRIMARY KEY,\n  ${name} VARCHAR(255) NOT NULL\n);",
        {
          label: "CREATE TABLE ...",
          type: "snippet",
          detail: "Create table snippet",
        }
      )
    );

    const completionSource: CompletionSource = (context: CompletionContext) => {
      // If typing right after a dot (e.g. `users.`), let CodeMirror's SQL schema handle it
      const dotMatch = context.matchBefore(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)/);
      if (dotMatch) {
        return null;
      }

      const word = context.matchBefore(/[a-zA-Z0-9_]*/);
      if (!word || (word.from === word.to && !context.explicit)) {
        return null;
      }

      return {
        from: word.from,
        options,
        validFor: /^[a-zA-Z0-9_]*$/,
      };
    };

    return PostgreSQL.language.data.of({
      autocomplete: completionSource,
    });
  }, [tables]);

  // Combine extensions
  const extensions = useMemo<Extension[]>(() => {
    return [
      executeKeybinding,
      sqlLanguageExtension,
      schemaAutocompleteExtension,
      indentUnit.of("  "),
      EditorState.tabSize.of(2),
      EditorView.lineWrapping,
    ];
  }, [executeKeybinding, sqlLanguageExtension, schemaAutocompleteExtension]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-background">
      <CodeMirror
        value={value}
        onChange={onChange}
        height="100%"
        className="h-full w-full"
        theme={isDark ? darkThemeExtension : lightThemeExtension}
        extensions={extensions}
        readOnly={readOnly}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          history: true,
          searchKeymap: true,
        }}
        indentWithTab={true}
      />
    </div>
  );
}

// Named alias for flexible usage
export { CodeMirrorSqlEditor as SqlEditor };
