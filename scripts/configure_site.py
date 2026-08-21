#!/usr/bin/env python3
import argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

parser = argparse.ArgumentParser(description='Configure GitHub Pages and Worker URLs for 멀리멀리.')
parser.add_argument('--owner', required=True, help='GitHub username or organization')
parser.add_argument('--repo', required=True, help='GitHub repository name')
parser.add_argument('--api', default='', help='Deployed Worker API base URL (optional)')
args = parser.parse_args()

site_url = f'https://{args.owner}.github.io/{args.repo}/'
origin = f'https://{args.owner}.github.io'

files = [
    ROOT / 'site/index.html',
    ROOT / 'site/config.js',
    ROOT / 'site/robots.txt',
    ROOT / 'site/sitemap.xml',
]
for path in files:
    text = path.read_text(encoding='utf-8')
    text = text.replace('https://USERNAME.github.io/REPOSITORY/', site_url)
    path.write_text(text, encoding='utf-8')

config = ROOT / 'site/config.js'
text = config.read_text(encoding='utf-8')
if args.api:
    import re
    text = re.sub(r"apiBaseUrl:\s*'[^']*'", f"apiBaseUrl: '{args.api.rstrip('/')}'", text)
config.write_text(text, encoding='utf-8')

wrangler = ROOT / 'worker/wrangler.toml'
text = wrangler.read_text(encoding='utf-8')
text = text.replace('https://USERNAME.github.io', origin)
wrangler.write_text(text, encoding='utf-8')

print(f'Configured site URL: {site_url}')
print(f'Allowed Pages origin: {origin}')
if args.api:
    print(f'Configured API: {args.api.rstrip("/")}')
