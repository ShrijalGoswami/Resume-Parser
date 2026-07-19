"""
Autonomous Recruiting Agent (V5 / Sprint 9).

An orchestration layer: it observes the pipeline, runs workflows that detect
situations deterministically, coordinates the EXISTING engines through a tool
registry, and produces explainable, evidence-backed recommendations requiring
human approval. It owns no business logic of its own.

    from app.ai.agent import agent_engine, ToolContext
"""

from app.ai.agent.tools import Tool, ToolContext, available_tools, get_tool, invoke_tool, register_tool
from app.ai.agent.workflows import WORKFLOWS
from app.ai.agent.engine import agent_engine, AgentEngine

__all__ = [
    "agent_engine",
    "AgentEngine",
    "ToolContext",
    "Tool",
    "register_tool",
    "get_tool",
    "invoke_tool",
    "available_tools",
    "WORKFLOWS",
]
