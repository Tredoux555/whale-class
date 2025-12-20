// src/types/dagre.d.ts
// Type declarations for dagre library

declare module 'dagre' {
  export namespace graphlib {
    class Graph {
      constructor(options?: { directed?: boolean; multigraph?: boolean; compound?: boolean });
      setGraph(options: GraphOptions): void;
      setDefaultEdgeLabel(callback: () => object): void;
      setNode(name: string, options: NodeOptions): void;
      setEdge(source: string, target: string, options?: EdgeOptions): void;
      node(name: string): NodeOptions & { x: number; y: number };
      nodes(): string[];
      edges(): Array<{ v: string; w: string }>;
    }
  }

  interface GraphOptions {
    rankdir?: 'TB' | 'BT' | 'LR' | 'RL';
    align?: 'UL' | 'UR' | 'DL' | 'DR';
    nodesep?: number;
    edgesep?: number;
    ranksep?: number;
    marginx?: number;
    marginy?: number;
    acyclicer?: 'greedy';
    ranker?: 'network-simplex' | 'tight-tree' | 'longest-path';
  }

  interface NodeOptions {
    width?: number;
    height?: number;
    label?: string;
  }

  interface EdgeOptions {
    label?: string;
    weight?: number;
    minlen?: number;
  }

  export function layout(graph: graphlib.Graph): void;
}

