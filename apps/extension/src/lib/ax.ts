export type AXNode = {
    nodeId: string;
    parentId?: string;
    name?: { value: string };
    role?: { value: string };
    properties?: { name: string; value: { value: any } }[];
    ignored?: boolean;
    childIds?: string[];
};

type FilteredAXNode = {
    nodeId: string;
    parentId?: string;
    name?: string;
    role?: string;
    url?: string;
    focusable?: boolean;
    children?: FilteredAXNode[];
};

export function filterAXTree(nodes: AXNode[]) {
    const idMap = new Map(nodes.map(n => [n.nodeId, n]));

    const isRelevant = (node: AXNode) => {
        if (node.ignored) return false;
        const role = node.role?.value;
        const name = node.name?.value?.trim();
        const props = node.properties || [];
        const hasUrl = props.some(p => p.name === "url");
        const isFocusable = props.some(p => p.name === "focusable" && p.value.value === true);
        return name || hasUrl || isFocusable || ["link", "button", "heading", "paragraph", "image"].includes(role ?? "");
    };

    const extract = (node: AXNode) => {
        const props = Object.fromEntries((node.properties || []).map(p => [p.name, p.value?.value]));
        return {
            nodeId: node.nodeId,
            name: node.name?.value || "",
            role: node.role?.value || "",
            url: props.url,
            focusable: props.focusable,
            children: (node.childIds || []).map(id => idMap.get(id)).filter(Boolean).map(extract).filter(Boolean)
        };
    };

    return nodes
        .filter(n => !n.parentId && isRelevant(n))
        .map(extract);
}

export function axTreeToMarkdown(nodes: FilteredAXNode[], depth = 0) {
    return nodes.map(node => {
        const indent = "  ".repeat(depth);
        const name = node.name?.trim() ?? "";
        if (!name) return "";

        if (node.role === "heading") {
            return `${"#".repeat(Math.min(depth + 1, 6))} ${name}`;
        } else if (node.role === "link" && node.url) {
            return `- [${name}](${node.url})`;
        } else if (node.role === "paragraph") {
            return `${indent}${name}`;
        } else if (node.role === "image" && node.url) {
            return `![${name}](${node.url})`;
        } else if (["button", "region"].includes(node.role)) {
            return `${indent}**${name}**`;
        } else {
            return `${indent}${name}`;
        }
    }).join("\n\n") + "\n" + nodes.flatMap(n => axTreeToMarkdown(n.children || [], depth + 1)).join("\n");
}