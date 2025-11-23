export interface InlineSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    code?: boolean;
    subscript?: boolean;
    superscript?: boolean;
    color?: string;
    link?: {
        url: string;
        title?: string;
    };
    mathInline?: string;
}

export interface BaseBlock {
    id: string;
    type: string;
}

export interface HeadingBlock extends BaseBlock {
    type: "heading";
    level: 1 | 2 | 3 | 4;
    content: InlineSpan[];
}

export interface ParagraphBlock extends BaseBlock {
    type: "paragraph";
    content: InlineSpan[];
}

export interface ListItem {
    content: InlineSpan[];
    children?: ListItem[];
}

export interface ListBlock extends BaseBlock {
    type: "list";
    style: "ordered" | "bullet";
    items: ListItem[];
}

export interface CalloutBlock extends BaseBlock {
    type: "callout";
    variant: "example" | "note" | "warning" | "info";
    title?: InlineSpan[];
    icon?: string;
    content: InlineSpan[];
}

export interface EquationBlock extends BaseBlock {
    type: "equation";
    math: string;
    display?: "block" | "inline";
}

export interface CodeBlock extends BaseBlock {
    type: "code";
    language?: string;
    code: string;
}

export interface ImageBlock extends BaseBlock {
    type: "image";
    url: string;
    alt?: string;
    caption?: InlineSpan[];
}

export interface ResourceItem {
    kind: "article" | "video" | "book" | "website";
    title: string;
    url: string;
}

export interface ResourcesBlock extends BaseBlock {
    type: "resources";
    items: ResourceItem[];
}

export interface TableCell {
    content: InlineSpan[];
}

export interface TableRow {
    cells: TableCell[];
}

export interface TableBlock extends BaseBlock {
    type: "table";
    header?: TableRow[];
    rows: TableRow[];
}

export interface DividerBlock extends BaseBlock {
    type: "divider";
}

export type Block =
    | HeadingBlock
    | ParagraphBlock
    | ListBlock
    | CalloutBlock
    | EquationBlock
    | CodeBlock
    | ImageBlock
    | TableBlock
    | DividerBlock
    | ResourcesBlock;

export interface Doc {
    id: string;
    title: string;
    meta?: {
        module?: string;
        topic?: string;
        tags?: string[];
        createdAt?: string;
    };
    blocks: Block[];
}
