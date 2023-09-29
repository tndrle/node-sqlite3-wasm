import re
from collections import namedtuple

Link = namedtuple('Link', ['ref', 'anchor', 'display'])

with open('Makefile') as file:
  v = re.search(r'amalgamation-(\d+)\.zip', file.read()).group(1)
sqlite_version = f'{int(v[0])}.{int(v[1:3])}.{int(v[3:5])}'

with open('doc/README_src.md') as file:
  content = file.read()

content = content.replace('%%sqlite_version%%', sqlite_version)

def extract_link(heading):
  display = re.sub('\).*', ')', re.sub('\(.+\)', '()', heading))
  anchor = re.sub('[.()\[\],<>]', '', heading).replace(' ', '-').lower()
  ref = re.sub('^database', 'db', display.lower())
  ref = re.sub('^statement', 'stmt', ref).replace('()', '')
  return Link(ref, anchor, display)

links = map(extract_link, re.findall(r'^#+\s+`(.+?)`$', content, re.M))
links = {l.ref: l for l in links}

def insert_link(match):
  l = links[match.group(2)]
  g1 = match.group(1)
  display = g1 if g1 != '' else l.display
  return f'[`{display}`](#{l.anchor})'

with open('README.md', 'w') as file:
  file.write(re.sub('\[(.*?)\]\(#(.+?)\)', insert_link, content))
