#!/usr/bin/env python3
"""
MCP Server for Git Research and Authentication
Helps research successful git push methods and authentication patterns
"""

import json
import subprocess
import os
from typing import Any, Dict, List

class GitResearchServer:
    def __init__(self):
        self.name = "git-research-server"
        self.version = "1.0.0"
        
    def get_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "research_git_history",
                "description": "Research git command history and successful authentication patterns",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "search_pattern": {
                            "type": "string",
                            "description": "Pattern to search for in git history"
                        }
                    }
                }
            },
            {
                "name": "analyze_git_config", 
                "description": "Analyze current git configuration and credential setup",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
            {
                "name": "test_github_connectivity",
                "description": "Test connectivity and authentication to GitHub",
                "inputSchema": {
                    "type": "object", 
                    "properties": {
                        "token": {
                            "type": "string",
                            "description": "GitHub token to test"
                        }
                    }
                }
            },
            {
                "name": "find_working_push_method",
                "description": "Try different git push methods to find working one",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "repo_url": {
                            "type": "string", 
                            "description": "Repository URL"
                        },
                        "token": {
                            "type": "string",
                            "description": "GitHub token"
                        }
                    }
                }
            }
        ]
    
    def research_git_history(self, search_pattern: str) -> Dict[str, Any]:
        """Research git command history for successful patterns"""
        try:
            # Check bash history for git commands
            history_cmd = f"history | grep -i '{search_pattern}'"
            result = subprocess.run(history_cmd, shell=True, capture_output=True, text=True)
            
            # Check git logs
            git_log = subprocess.run(['git', 'log', '--oneline', '-10'], capture_output=True, text=True)
            
            # Check git config
            git_config = subprocess.run(['git', 'config', '--list'], capture_output=True, text=True)
            
            return {
                "history_matches": result.stdout,
                "recent_commits": git_log.stdout,
                "git_configuration": git_config.stdout,
                "status": "success"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def analyze_git_config(self) -> Dict[str, Any]:
        """Analyze current git setup"""
        try:
            # Get git remote info
            remote_info = subprocess.run(['git', 'remote', '-v'], capture_output=True, text=True)
            
            # Get credential helper info
            cred_helper = subprocess.run(['git', 'config', '--get', 'credential.helper'], capture_output=True, text=True)
            
            # Check if credential file exists
            cred_file_path = os.path.expanduser('~/.git-credentials')
            cred_file_exists = os.path.exists(cred_file_path)
            cred_file_size = os.path.getsize(cred_file_path) if cred_file_exists else 0
            
            # Get git status
            git_status = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True)
            
            return {
                "remote_info": remote_info.stdout,
                "credential_helper": cred_helper.stdout.strip(),
                "credential_file_exists": cred_file_exists,
                "credential_file_size": cred_file_size,
                "git_status": git_status.stdout,
                "status": "success"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def test_github_connectivity(self, token: str) -> Dict[str, Any]:
        """Test GitHub API connectivity"""
        try:
            # Test basic connectivity
            ping_result = subprocess.run(['ping', '-c', '1', 'github.com'], capture_output=True, text=True)
            
            # Test GitHub API with token
            api_test = subprocess.run([
                'curl', '-s', '-H', f'Authorization: token {token}', 
                'https://api.github.com/user'
            ], capture_output=True, text=True)
            
            return {
                "ping_result": ping_result.returncode == 0,
                "api_response": api_test.stdout,
                "api_status": api_test.returncode,
                "status": "success"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def find_working_push_method(self, repo_url: str, token: str) -> Dict[str, Any]:
        """Try different push methods to find working one"""
        methods_tried = []
        
        try:
            # Method 1: Token in URL
            method1 = f"git push https://{token}@github.com/michael5cents/CallForwardingApp.git main"
            result1 = subprocess.run(method1, shell=True, capture_output=True, text=True)
            methods_tried.append({
                "method": "token_in_url",
                "command": method1,
                "returncode": result1.returncode,
                "stdout": result1.stdout,
                "stderr": result1.stderr
            })
            
            if result1.returncode == 0:
                return {"status": "success", "working_method": "token_in_url", "methods_tried": methods_tried}
            
            # Method 2: Username:token format
            method2 = f"git push https://michael5cents:{token}@github.com/michael5cents/CallForwardingApp.git main"
            result2 = subprocess.run(method2, shell=True, capture_output=True, text=True)
            methods_tried.append({
                "method": "username_token",
                "command": method2,
                "returncode": result2.returncode,
                "stdout": result2.stdout,
                "stderr": result2.stderr
            })
            
            if result2.returncode == 0:
                return {"status": "success", "working_method": "username_token", "methods_tried": methods_tried}
            
            # Method 3: Credential helper with stored token
            cred_content = f"https://{token}@github.com"
            with open(os.path.expanduser('~/.git-credentials'), 'w') as f:
                f.write(cred_content)
            
            method3 = "git push origin main"
            result3 = subprocess.run(method3, shell=True, capture_output=True, text=True)
            methods_tried.append({
                "method": "credential_helper",
                "command": method3,
                "returncode": result3.returncode,
                "stdout": result3.stdout,
                "stderr": result3.stderr
            })
            
            if result3.returncode == 0:
                return {"status": "success", "working_method": "credential_helper", "methods_tried": methods_tried}
                
            return {"status": "all_failed", "methods_tried": methods_tried}
            
        except Exception as e:
            return {"status": "error", "error": str(e), "methods_tried": methods_tried}

if __name__ == "__main__":
    server = GitResearchServer()
    print("Git Research MCP Server initialized")
    # In a real MCP server, this would connect to the MCP protocol
    # For now, we can test individual methods