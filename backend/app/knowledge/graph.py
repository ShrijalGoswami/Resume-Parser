"""
Knowledge Graph.

A lightweight in-memory graph over knowledge edges (entity → relation → entity),
built on demand from the store. Supports neighbour lookup and bounded traversal for
future AI reasoning. The interface is graph-DB-agnostic (Neo4j/Neptune later slot in
behind the same methods).
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any


class KnowledgeGraph:
    def __init__(self, edges: list[dict]):
        self._adj: dict[str, list[dict]] = defaultdict(list)
        self._nodes: dict[str, str] = {}
        for e in edges:
            src, tgt = e.get("source_name"), e.get("target_name")
            if not src or not tgt:
                continue
            self._nodes[src] = e.get("source_type", "")
            self._nodes[tgt] = e.get("target_type", "")
            self._adj[src].append({"relation": e.get("relation", ""), "target": tgt,
                                    "target_type": e.get("target_type", ""), "weight": e.get("weight", 1)})

    def neighbors(self, node: str) -> list[dict]:
        return self._adj.get(node, [])

    def traverse(self, start: str, depth: int = 2) -> dict[str, Any]:
        """BFS up to `depth` hops → {nodes, edges} for visualization/reasoning."""
        seen = {start}
        frontier = [start]
        nodes = [{"name": start, "type": self._nodes.get(start, "")}]
        out_edges: list[dict] = []
        for _ in range(max(0, depth)):
            nxt = []
            for node in frontier:
                for edge in self._adj.get(node, []):
                    out_edges.append({"source": node, "relation": edge["relation"], "target": edge["target"]})
                    if edge["target"] not in seen:
                        seen.add(edge["target"])
                        nodes.append({"name": edge["target"], "type": edge["target_type"]})
                        nxt.append(edge["target"])
            frontier = nxt
            if not frontier:
                break
        return {"nodes": nodes, "edges": out_edges}

    def summary(self) -> dict[str, Any]:
        return {"node_count": len(self._nodes), "edge_count": sum(len(v) for v in self._adj.values())}
