import re
from collections import namedtuple

Link = namedtuple('Link', ['ref', 'anchor', 'display'])

with open('doc/README_src.md') as file:
  content = file.read()

def extract_link(heading):
  display = re.sub('\).*', ')', re.sub('\(.+\)', '()', heading))
  anchor = re.sub('[.()\[\],>]', '', heading).replace(' ', '-').lower()
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
