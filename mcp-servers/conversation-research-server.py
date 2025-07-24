#!/usr/bin/env python3
"""
MCP Server for Conversation History Research
Searches through conversation context to find successful methods
"""

import json
import re
import os
from typing import Any, Dict, List

class ConversationResearchServer:
    def __init__(self):
        self.name = "conversation-research-server"
        self.version = "1.0.0"
        
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "search_successful_patterns",
                "description": "Search for successful git push patterns in documentation",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Pattern to search for"
                        }
                    }
                }
            },
            {
                "name": "analyze_session_docs",
                "description": "Analyze session documentation for working methods",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "extract_auth_patterns",
                "description": "Extract authentication patterns from available files",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "search_terms": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Terms to search for"
                        }
                    }
                }
            }
        ]
    
    def search_successful_patterns(self, pattern: str) -> Dict[str, Any]:
        """Search for successful patterns in available documentation"""
        results = []
        search_files = [
            "SESSION_UPDATES.md",
            "GITHUB_AUTH_SUCCESS.md", 
            "PUSH_INSTRUCTIONS.md",
            "CLAUDE.md"
        ]
        
        for filename in search_files:
            filepath = f"/home/michael5cents/call-forwarding-app/{filename}"
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        
                    # Search for pattern
                    matches = re.findall(f".*{pattern}.*", content, re.IGNORECASE)
                    if matches:
                        results.append({
                            "file": filename,
                            "matches": matches,
                            "context": self._get_context_around_matches(content, pattern)
                        })
                except Exception as e:
                    results.append({
                        "file": filename,
                        "error": str(e)
                    })
        
        return {"results": results, "pattern_searched": pattern}
    
    def analyze_session_docs(self) -> Dict[str, Any]:
        """Analyze all session documentation for authentication methods"""
        analysis = {}
        
        # Key files to analyze
        files_to_check = [
            "SESSION_UPDATES.md",
            "GITHUB_AUTH_SUCCESS.md",
            "PUSH_INSTRUCTIONS.md", 
            "CLAUDE.md"
        ]
        
        for filename in files_to_check:
            filepath = f"/home/michael5cents/call-forwarding-app/{filename}"
            if os.path.exists(filepath):
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                    
                    # Extract git commands
                    git_commands = re.findall(r'git [^\n]*', content)
                    
                    # Extract authentication references
                    auth_refs = re.findall(r'(?:token|auth|credential)[^\n]*', content, re.IGNORECASE)
                    
                    # Extract success indicators
                    success_indicators = re.findall(r'(?:success|working|completed)[^\n]*', content, re.IGNORECASE)
                    
                    analysis[filename] = {
                        "git_commands": git_commands,
                        "auth_references": auth_refs,
                        "success_indicators": success_indicators,
                        "file_size": len(content)
                    }
                    
                except Exception as e:
                    analysis[filename] = {"error": str(e)}
        
        return {"analysis": analysis}
    
    def extract_auth_patterns(self, search_terms: List[str]) -> Dict[str, Any]:
        """Extract authentication patterns from files"""
        patterns_found = {}
        
        # Search in git config files
        config_files = [
            "~/.gitconfig",
            "~/.git-credentials",
            ".git/config"
        ]
        
        for config_file in config_files:
            full_path = os.path.expanduser(config_file)
            if os.path.exists(full_path):
                try:
                    with open(full_path, 'r') as f:
                        content = f.read()
                    
                    file_patterns = {}
                    for term in search_terms:
                        matches = re.findall(f".*{term}.*", content, re.IGNORECASE)
                        if matches:
                            file_patterns[term] = matches
                    
                    if file_patterns:
                        patterns_found[config_file] = file_patterns
                        
                except Exception as e:
                    patterns_found[config_file] = {"error": str(e)}
        
        # Also search session documentation
        doc_files = ["SESSION_UPDATES.md", "GITHUB_AUTH_SUCCESS.md"]
        for doc_file in doc_files:
            doc_path = f"/home/michael5cents/call-forwarding-app/{doc_file}"
            if os.path.exists(doc_path):
                try:
                    with open(doc_path, 'r') as f:
                        content = f.read()
                    
                    file_patterns = {}
                    for term in search_terms:
                        matches = re.findall(f".*{term}.*", content, re.IGNORECASE)
                        if matches:
                            file_patterns[term] = matches
                    
                    if file_patterns:
                        patterns_found[doc_file] = file_patterns
                        
                except Exception as e:
                    patterns_found[doc_file] = {"error": str(e)}
        
        return {"patterns_found": patterns_found, "search_terms": search_terms}
    
    def _get_context_around_matches(self, content: str, pattern: str) -> List[str]:
        """Get context lines around pattern matches"""
        lines = content.split('\n')
        context = []
        
        for i, line in enumerate(lines):
            if re.search(pattern, line, re.IGNORECASE):
                # Get 2 lines before and after for context
                start = max(0, i-2)
                end = min(len(lines), i+3)
                context_block = lines[start:end]
                context.append('\n'.join(context_block))
        
        return context

if __name__ == "__main__":
    server = ConversationResearchServer()
    print("Conversation Research MCP Server initialized")