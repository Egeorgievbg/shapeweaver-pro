import type { NormalizedPackagingModel, PackagingFold, PackagingPanel } from "@/integrations/boxcraft/types";

/**
 * The fold graph is a rooted tree over panels connected by folds.
 * Root = a cardinal-direction panel (front preferred), else the largest panel.
 * Each edge = one fold hinge; children rotate around it.
 */
export interface FoldNode {
  panel: PackagingPanel;
  incomingFold?: PackagingFold; // fold that attaches this node to its parent
  children: FoldNode[];
}

export interface FoldGraph {
  root: FoldNode;
  nodeCount: number;
  orphans: PackagingPanel[]; // panels not reachable from root
}

export function buildFoldGraph(model: NormalizedPackagingModel): FoldGraph | null {
  const panels = model.panels;
  const folds = model.folds;
  if (panels.length === 0) return null;

  // Pick root
  const rootPanel =
    panels.find((p) => p.direction === "front") ??
    panels.find((p) => p.direction) ??
    largestPanel(panels);
  if (!rootPanel) return null;

  // Adjacency via folds (undirected)
  const adjacency = new Map<string, { fold: PackagingFold; otherId: string }[]>();
  const push = (from: string, to: string, fold: PackagingFold) => {
    const list = adjacency.get(from) ?? [];
    list.push({ fold, otherId: to });
    adjacency.set(from, list);
  };
  for (const f of folds) {
    if (f.parentPanelId && f.childPanelId) {
      push(f.parentPanelId, f.childPanelId, f);
      push(f.childPanelId, f.parentPanelId, f);
    }
  }

  // BFS from root
  const visited = new Set<string>([rootPanel.id]);
  const byId = new Map(panels.map((p) => [p.id, p]));
  const root: FoldNode = { panel: rootPanel, children: [] };
  const queue: FoldNode[] = [root];
  let count = 1;

  while (queue.length) {
    const node = queue.shift()!;
    const neighbors = adjacency.get(node.panel.id) ?? [];
    for (const { fold, otherId } of neighbors) {
      if (visited.has(otherId)) continue;
      const childPanel = byId.get(otherId);
      if (!childPanel) continue;
      visited.add(otherId);
      const child: FoldNode = { panel: childPanel, incomingFold: fold, children: [] };
      node.children.push(child);
      queue.push(child);
      count++;
    }
  }

  const orphans = panels.filter((p) => !visited.has(p.id));
  return { root, nodeCount: count, orphans };
}

function largestPanel(panels: PackagingPanel[]): PackagingPanel {
  return panels.reduce((a, b) => (a.bbox.w * a.bbox.h >= b.bbox.w * b.bbox.h ? a : b), panels[0]);
}
