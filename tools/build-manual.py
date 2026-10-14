#!/usr/bin/env python3
"""Builds manual.html (offline manual shipped with the game) from the '## Manual' section of README.md.

    python3 tools/build-manual.py          # rewrite manual.html
    python3 tools/build-manual.py --check  # exit 1 if manual.html is out of date
README.md is the single source of truth. Requires the 'markdown' package. Bump CACHE in sw.js after changes.
"""
import re, sys, os
import markdown

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
README = os.path.join(ROOT, 'README.md')
OUT = os.path.join(ROOT, 'manual.html')

TEMPLATE = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0d0f14">
<title>Keep of the Gales Manual</title>
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>
*{box-sizing:border-box}
html,body{margin:0;background:#0d0f14;color:#dde;font:16px/1.55 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:12px 16px 48px}
.top{position:sticky;top:0;background:#0d0f14ee;padding:10px 0;border-bottom:1px solid #2a3144;z-index:2}
a{color:#9cf}
.btn{display:inline-block;background:#252b3a;color:#dde;border:1px solid #3a4258;border-radius:6px;padding:8px 14px;text-decoration:none}
h1{font-size:1.6rem;margin:1rem 0 .25rem}
h2{font-size:1.15rem;margin:2rem 0 .4rem;color:#9ab;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #222a3a;padding-bottom:.2rem}
p,li{max-width:70ch}
code{background:#1a2030;border:1px solid #2a3144;border-radius:4px;padding:0 .3em;font-size:.9em}
.scroll{overflow-x:auto;margin:.6rem 0}
table{border-collapse:collapse;min-width:100%;font-size:.92rem}
th,td{border-bottom:1px solid #222a3a;padding:6px 10px;text-align:left;vertical-align:top}
th{color:#9ab;font-weight:600;background:#12151c}
</style>
</head>
<body>
<main>
<div class="top"><a class="btn" href="index.html">&larr; Back to game</a></div>
@@BODY@@
<p><a class="btn" href="index.html">&larr; Back to game</a></p>
</main>
</body>
</html>
'''

def build():
    src = open(README, encoding='utf-8').read()
    m = re.search(r'^## Manual\n(.*?)(?=^## )', src, re.S | re.M)
    if not m:
        sys.exit('README.md has no "## Manual" section')
    text = '\n'.join(l for l in m.group(1).split('\n') if not l.startswith('Direct link:'))
    text = re.sub(r'^### ', '## ', text, flags=re.M)
    html = markdown.markdown('# Keep of the Gales: Manual\n\n' + text.strip() + '\n', extensions=['tables'])
    html = re.sub(r'<table>', '<div class="scroll"><table>', html).replace('</table>', '</table></div>')
    return TEMPLATE.replace('@@BODY@@', html)

if __name__ == '__main__':
    out = build()
    if '--check' in sys.argv:
        cur = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
        sys.exit(0 if cur == out else 1)
    open(OUT, 'w', encoding='utf-8').write(out)
