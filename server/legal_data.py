import httpx
from bs4 import BeautifulSoup
from typing import List, Dict, Any
import json

class IndianKanoonFetcher:
    def __init__(self, api_token: str = None):
        self.api_token = api_token
        self.base_url = "https://api.indiankanoon.org"

    async def search_cases(self, query: str, p: int = 1) -> List[Dict[str, Any]]:
        """
        Search cases on Indian Kanoon.
        Note: Requires an API Token for official API. 
        This is a placeholder for the API integration.
        """
        if not self.api_token:
            return [{"title": "Demo Case 1", "tid": "123", "summary": "Search requires Indian Kanoon API token."}]
        
        headers = {"Authorization": f"Token {self.api_token}"}
        params = {"formInput": query, "pagenum": p}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/search/", headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                return data.get("results", [])
            else:
                return []

    async def get_judgment_text(self, tid: str) -> str:
        """Fetch full judgment text by TID."""
        if not self.api_token:
            return "Judgment text retrieval requires API token."
            
        headers = {"Authorization": f"Token {self.api_token}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/doc/{tid}/", headers=headers)
            if response.status_code == 200:
                data = response.json()
                return data.get("doc", "")
            else:
                return "Error fetching text."
