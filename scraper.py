import requests
from bs4 import BeautifulSoup
import json
import os
import time
import re
from urllib.parse import urljoin, parse_qs, urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

class GTUPaperScraper:
    def __init__(self, base_dir="papers"):
        self.base_url = "https://gturanker.com/papers/BE/"
        self.base_dir = base_dir
        self.metadata = {"branches": []}
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
    def get_page(self, url, retries=3):
        """Fetch a page with retry logic"""
        for attempt in range(retries):
            try:
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                time.sleep(0.5)  # Rate limiting
                return response.text
            except Exception as e:
                print(f"Error fetching {url} (attempt {attempt + 1}/{retries}): {e}")
                if attempt < retries - 1:
                    time.sleep(2)
                else:
                    return None
        return None
    
    def extract_branches(self):
        """Extract all branch codes and names from main page"""
        print("Fetching branches...")
        html = self.get_page(self.base_url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        branches = []
        
        # Find all branch links
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if '/papers/BE/' in href and href.count('/') == 5:
                # Extract branch code from URL
                parts = href.rstrip('/').split('/')
                if len(parts) >= 5:
                    branch_code = parts[-1]
                    branch_name = link.get_text(strip=True)
                    # Clean up the branch name
                    branch_name = re.sub(r'^\d+\s*', '', branch_name)  # Remove leading numbers
                    branch_name = re.sub(r'GTU BE\s*', '', branch_name)  # Remove GTU BE prefix
                    branch_name = re.sub(r'\s*Papers$', '', branch_name)  # Remove Papers suffix
                    
                    if branch_code and branch_name and branch_code not in [b['code'] for b in branches]:
                        branches.append({
                            'code': branch_code,
                            'name': branch_name.strip()
                        })
        
        print(f"Found {len(branches)} branches")
        return branches
    
    def extract_semesters(self, branch_code):
        """Extract semester links for a branch"""
        url = f"{self.base_url}{branch_code}/"
        html = self.get_page(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        semesters = []
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if f'/papers/BE/{branch_code}/' in href and href.count('/') == 6:
                parts = href.rstrip('/').split('/')
                if len(parts) >= 6 and parts[-1].isdigit():
                    sem_num = int(parts[-1])
                    if sem_num not in semesters and 1 <= sem_num <= 8:
                        semesters.append(sem_num)
        
        return sorted(semesters)
    
    def extract_subjects(self, branch_code, semester):
        """Extract subjects for a semester"""
        url = f"{self.base_url}{branch_code}/{semester}/"
        html = self.get_page(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        subjects = []
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if f'/papers/BE/{branch_code}/{semester}/' in href and href.count('/') == 7:
                parts = href.rstrip('/').split('/')
                if len(parts) >= 7:
                    subject_code = parts[-1]
                    subject_name = link.get_text(strip=True)
                    # Clean up subject name
                    subject_name = re.sub(r'^\d+\s*[/-]\s*', '', subject_name)
                    subject_name = re.sub(r'\s*Papers$', '', subject_name)
                    
                    if subject_code and subject_name and subject_code not in [s['code'] for s in subjects]:
                        subjects.append({
                            'code': subject_code,
                            'name': subject_name.strip()
                        })
        
        return subjects
    
    def extract_papers(self, branch_code, semester, subject_code):
        """Extract paper download links for a subject"""
        url = f"{self.base_url}{branch_code}/{semester}/{subject_code}/"
        html = self.get_page(url)
        if not html:
            return []
        
        soup = BeautifulSoup(html, 'html.parser')
        papers = []
        
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if 'gturanker.com/download/' in href and 'paper=' in href:
                text = link.get_text(strip=True)
                # Extract year from text (e.g., "Winter 2025 Download")
                year_match = re.search(r'(Winter|Summer)\s+(\d{4})', text)
                if year_match:
                    year = f"{year_match.group(1)} {year_match.group(2)}"
                    papers.append({
                        'year': year,
                        'downloadUrl': href
                    })
        
        return papers
    
    def download_pdf(self, url, save_path):
        """Download a PDF file"""
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            
            # Check if file already exists
            if os.path.exists(save_path):
                print(f"  ✓ Already exists: {save_path}")
                return True
            
            response = self.session.get(url, timeout=60, stream=True)
            response.raise_for_status()
            
            with open(save_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"  ✓ Downloaded: {save_path}")
            time.sleep(0.5)  # Rate limiting
            return True
        except Exception as e:
            print(f"  ✗ Failed to download {url}: {e}")
            return False
    
    def scrape_all(self):
        """Main scraping function"""
        print("=" * 60)
        print("GTU BE Papers Scraper")
        print("=" * 60)
        
        # Get all branches
        branches = self.extract_branches()
        
        for idx, branch in enumerate(branches, 1):
            branch_code = branch['code']
            branch_name = branch['name']
            
            print(f"\n[{idx}/{len(branches)}] Processing: {branch_name} ({branch_code})")
            
            branch_data = {
                'code': branch_code,
                'name': branch_name,
                'semesters': []
            }
            
            # Get semesters
            semesters = self.extract_semesters(branch_code)
            print(f"  Found {len(semesters)} semesters")
            
            for semester in semesters:
                print(f"  Semester {semester}:")
                
                semester_data = {
                    'number': semester,
                    'subjects': []
                }
                
                # Get subjects
                subjects = self.extract_subjects(branch_code, semester)
                print(f"    Found {len(subjects)} subjects")
                
                for subject in subjects:
                    subject_code = subject['code']
                    subject_name = subject['name']
                    
                    print(f"    - {subject_name} ({subject_code})")
                    
                    # Get papers
                    papers = self.extract_papers(branch_code, semester, subject_code)
                    
                    if papers:
                        print(f"      Found {len(papers)} papers")
                        
                        # Download papers
                        for paper in papers:
                            year = paper['year'].replace(' ', '_')
                            filename = f"{year}.pdf"
                            save_path = os.path.join(
                                self.base_dir,
                                branch_code,
                                str(semester),
                                subject_code,
                                filename
                            )
                            
                            self.download_pdf(paper['downloadUrl'], save_path)
                            paper['localPath'] = save_path
                        
                        subject['papers'] = papers
                        semester_data['subjects'].append(subject)
            
                if semester_data['subjects']:
                    branch_data['semesters'].append(semester_data)
            
            if branch_data['semesters']:
                self.metadata['branches'].append(branch_data)
            
            # Save metadata after each branch
            self.save_metadata()
        
        print("\n" + "=" * 60)
        print("Scraping completed!")
        print(f"Total branches: {len(self.metadata['branches'])}")
        print(f"Metadata saved to: papers_metadata.json")
        print("=" * 60)
    
    def save_metadata(self):
        """Save metadata to JSON file"""
        with open('papers_metadata.json', 'w', encoding='utf-8') as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    scraper = GTUPaperScraper()
    scraper.scrape_all()
