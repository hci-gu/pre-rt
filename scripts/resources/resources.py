#!/usr/bin/env python3
"""Deterministic, dependency-free DOCX resource compiler. Python >=3.11."""
import argparse
import copy
import hashlib
import json
import re
import struct
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from schema_validation import validate_schema

ROOT = Path(__file__).resolve().parents[2]
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
      'w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
      'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
VERSION = '1.1.0'

def q(name):
    prefix, local = name.split(':')
    return '{' + NS[prefix] + '}' + local

def value(node, path, default=None):
    n = node.find(path, NS)
    return n.get(q('w:val'), default) if n is not None else default

def text(node):
    return ''.join(n.text or '' for n in node.iter(q('w:t')))

def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':'))

def digest(obj):
    return hashlib.sha256(canonical(obj).encode()).hexdigest()

def semantic(obj):
    if isinstance(obj, dict):
        return {k: semantic(v) for k,v in obj.items() if k not in ('source','contentHash','sourceDocumentHash')}
    if isinstance(obj, list):
        return [semantic(x) for x in obj]
    return obj

def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')

class Compiler:
    def __init__(self, source, manifest):
        self.raw = Path(source).read_bytes()
        self.zip = zipfile.ZipFile(source)
        self.manifest = manifest
        self.issues = []
        self.coverage = []
        self.assets = {}
        self.comments = []
        self.loc = {}
        self.current = None
        self.used = set()
        self.styles = {}
        self.numbering = {}
        self.abstract = {}
        self.shapes = 0
        self.image_count = 0
        self.link_count = 0
        self.alternates = 0
        self.default_run = {}

    def xml(self, path):
        return ET.fromstring(self.zip.read(path)) if path in self.zip.namelist() else ET.Element('empty')

    def issue(self, code, message, evidence=None, blocking=True):
        evidence = evidence if evidence is not None else self.loc
        identity = digest({'code':code,'evidence':evidence})
        resolution = self.manifest.get('resolutions', {}).get(identity) if code in ('editorial-comment','timing-frequency') else None
        self.issues.append({'id':identity,'code':code,'message':message,'source':copy.deepcopy(self.loc),
                            'resource':self.current['sourceKey'] if self.current else '',
                            'blocking':blocking and not bool(resolution), 'resolution':resolution or '', 'evidence':evidence})

    def select_branches(self, parent):
        for child in list(parent):
            if child.tag == q('mc:AlternateContent'):
                self.alternates += 1
                options = child.findall('mc:Choice', NS)
                chosen = next((n for n in options if set(n.get('Requires','').split()) <= {'wps','wpg','w14','wp14'}), None)
                if chosen is None:
                    chosen = child.find('mc:Fallback', NS)
                if chosen is None:
                    self.issue('unsupported-alternate', 'No supported alternate-content branch', ET.tostring(child, encoding='unicode'))
                    continue
                at = list(parent).index(child)
                parent.remove(child)
                for item in list(chosen):
                    parent.insert(at, item); at += 1
                    self.select_branches(item)
            else:
                self.select_branches(child)

    def relationships(self, path):
        return {n.get('Id'):n.get('Target') for n in self.xml(path)}

    def properties(self, props):
        if props is None:
            return {}
        out = {}
        for name, mark in [('b','bold'),('i','italic'),('u','underline')]:
            n = props.find('w:'+name, NS)
            if n is not None:
                out[mark] = n.get(q('w:val'),'true') not in ('0','false','off','none')
        return out

    def style_props(self, ident, seen=None):
        seen = set() if seen is None else seen
        if not ident or ident in seen or ident not in self.styles:
            return {}
        seen.add(ident)
        s = self.styles[ident]
        return {**self.style_props(value(s,'w:basedOn'),seen), **self.properties(s.find('w:rPr',NS))}

    def inlines(self, node, inherited=None, href=None, target=None):
        inherited = inherited or {}
        result = []
        for n in node:
            if n.tag in (q('w:drawing'), q('w:pict'), q('w:txbxContent'), q('w:pPr'), q('w:rPr')):
                continue
            if n.tag == q('w:r'):
                props = n.find('w:rPr',NS)
                marks = {**inherited, **self.style_props(value(n,'w:rPr/w:rStyle')), **self.properties(props)}
                result.extend(self.inlines(n,marks,href,target))
            elif n.tag == q('w:hyperlink'):
                self.link_count += 1
                url = self.rels.get(n.get(q('r:id')),'')
                internal = self.manifest.get('internalLinks',{}).get(self.loc.get('paraId'))
                if 'pre-rt.prod.appadem.in/about' in url:
                    if not internal:
                        self.issue('internal-link','Internal link has no target', {'text':text(n),'url':url})
                    url = ''
                if not url and not internal:
                    self.issue('missing-link','Hyperlink target missing',text(n))
                result.extend(self.inlines(n,inherited,url or None,internal))
            elif n.tag in (q('w:t'), q('w:tab'), q('w:br'), q('w:cr')):
                content = n.text or '' if n.tag == q('w:t') else ('\t' if n.tag == q('w:tab') else '\n')
                item = {'text':content, **{k:v for k,v in inherited.items() if v}}
                if href: item['href'] = href
                if target: item['target'] = target
                if result and {k:v for k,v in result[-1].items() if k != 'text'} == {k:v for k,v in item.items() if k != 'text'}:
                    result[-1]['text'] += content
                else: result.append(item)
            elif n.tag in (q('w:del'), q('w:ins')):
                self.issue('tracked-change','Resolve tracked changes in Word before publication',ET.tostring(n,encoding='unicode'))
                result.extend(self.inlines(n,inherited,href,target))
            elif n.tag == q('w:instrText'):
                self.issue('word-field','Unsupported Word field needs explicit conversion',n.text)
            else:
                result.extend(self.inlines(n,inherited,href,target))
        compact=[]
        for item in result:
            if not item['text']: continue
            if compact and {k:v for k,v in compact[-1].items() if k!='text'} == {k:v for k,v in item.items() if k!='text'}:
                compact[-1]['text']+=item['text']
            else: compact.append(item)
        return compact

    def listing(self,p):
        ident = value(p,'w:pPr/w:numPr/w:numId')
        level = int(value(p,'w:pPr/w:numPr/w:ilvl','0'))
        if not ident:
            style = self.styles.get(value(p,'w:pPr/w:pStyle'))
            if style is not None:
                ident = value(style,'w:pPr/w:numPr/w:numId')
        if not ident or ident == '0': return None
        abstract, overrides = self.numbering.get(ident, ('',{}))
        definition = overrides.get(level, self.abstract.get((abstract,level),{}))
        if not definition:
            self.issue('numbering','Unknown list definition',{'numId':ident,'level':level})
        fmt = definition.get('format','bullet')
        if fmt not in ('bullet','decimal'):
            self.issue('numbering-format','Unsupported numbering format',fmt)
        return {'ordered':fmt != 'bullet','level':level,'start':definition.get('start',1),'numId':ident}

    def drawings(self,p):
        result=[]
        for drawing in p.iter(q('w:drawing')):
            boxes=list(drawing.iter(q('w:txbxContent')))
            if boxes:
                fills=[x.get('val') for x in drawing.findall('.//a:solidFill/a:srgbClr',NS)]
                tone = 'link' if 'FFC0C0' in fills else 'emergency' if 'FFFFD5' in fills else 'advice'
                if not any(c in fills for c in ('FFC0C0','FFFFD5','FBEEE5')):
                    self.issue('shape-style','Unknown text-box styling',fills)
                contents=[]
                for box in boxes:
                    self.shapes += 1
                    blocks=[]
                    for para in box.findall('w:p',NS):
                        self.append(blocks,self.paragraph(para,allow_drawings=False), self.listing(para))
                    if blocks and blocks[0]['type']=='paragraph' and ''.join(x['text'] for x in blocks[0]['inline']).strip().endswith(('?',':')):
                        blocks[0]['type']='subheading'
                    contents.append({'type':'callout','tone':tone if tone!='link' else 'advice','blocks':blocks,'source':self.loc.copy()})
                if tone=='link':
                    result.append({'type':'linkButton','inline':[{'text':text(boxes[0]).strip()}],'source':self.loc.copy()})
                elif len(contents)>1:
                    result.append({'type':'columns','columns':[[x] for x in contents],'source':self.loc.copy()})
                else:result.extend(contents)
            else:
                if not drawing.findall('.//a:blip',NS):
                    self.issue('unsupported-drawing','Drawing has no supported image or text box',ET.tostring(drawing,encoding='unicode'))
                for img in drawing.findall('.//a:blip',NS):
                    self.image_count+=1
                    name=self.rels.get(img.get(q('r:embed')),'')
                    if not name.startswith('media/') or '..' in name:
                        self.issue('image-path','Missing or unsafe image relationship',name);continue
                    binary=self.zip.read('word/'+name)
                    sha=hashlib.sha256(binary).hexdigest()
                    if not binary.startswith(b'\x89PNG\r\n\x1a\n'):
                        self.issue('image-format','Only PNG source images are currently supported',name);continue
                    w,h=struct.unpack('>II',binary[16:24])
                    self.assets[sha]={'key':sha,'path':'assets/'+sha+'.png','mediaType':'image/png','width':w,'height':h,'bytes':len(binary),'_binary':binary}
                    extent=drawing.find('.//wp:extent',NS)
                    crop=drawing.find('.//a:srcRect',NS)
                    spec=self.manifest.get('assets',{}).get(sha,{})
                    if spec.get('reviewNote'):
                        self.issue('image-review',spec['reviewNote'],{'asset':sha,'note':spec['reviewNote']})
                    props=drawing.find('.//wp:docPr',NS)
                    alt=spec.get('alt') or (props.get('descr','') if props is not None else '')
                    kind=spec.get('kind','image')
                    block={'type':kind,'asset':sha,'alt':alt,'decorative':spec.get('decorative',False),'source':self.loc.copy()}
                    if extent is not None:
                        block['width']=round(int(extent.get('cx','0'))/9525,2)
                        block['height']=round(int(extent.get('cy','0'))/9525,2)
                    if crop is not None:
                        block['crop']={k:int(v)/100000 for k,v in crop.attrib.items()}
                    if not alt and not block['decorative']:
                        self.issue('image-alt','Meaningful image needs reviewed alternative text',{'asset':sha})
                    if kind=='video':
                        block['url']=spec.get('url','')
                        block['placeholder']=bool(spec.get('placeholder',False))
                        if not block['url']:
                            self.issue('video-placeholder' if block['placeholder'] else 'video-source',
                                       'Video link pending; approved placeholder' if block['placeholder'] else 'Video screenshot has no verified playback/link target',
                                       {'asset':sha}, blocking=not block['placeholder'])
                    result.append(block)
        return result

    def paragraph(self,p,allow_drawings=True):
        for unsupported in ('w:pict','w:object','w:sym','w:footnoteReference','w:endnoteReference'):
            for n in p.iter(q(unsupported)):
                self.issue('unsupported-inline','Unsupported content must be converted explicitly',ET.tostring(n,encoding='unicode'))
        marks={**self.default_run, **self.style_props(value(p,'w:pPr/w:pStyle','Normal'))}
        inline=self.inlines(p,marks)
        plain=''.join(x['text'] for x in inline)
        blocks=[]
        if plain.strip():
            kind='paragraph'
            if inline and all(x.get('bold') or not x['text'].strip() for x in inline) and plain.rstrip().endswith(('?',':')):
                kind='subheading'
            blocks.append({'type':kind,'inline':inline,'source':self.loc.copy()})
            if any(x in plain for x in ('(lokal länk)','(kontaktruta)','(länk till samma film')) or plain.strip()=='¨':
                self.issue('authoring-note','Patient copy contains a placeholder/editorial note',plain)
        if allow_drawings:
            shapes=self.drawings(p)
            # Floating shapes are extracted separately from the surrounding run text.
            blocks.extend(shapes)
        return blocks

    def append(self, blocks, addition, listing):
        if not addition:return
        if listing:
            level=listing['level']
            parent=blocks
            for _ in range(level):
                if not parent or parent[-1]['type']!='list':
                    self.issue('list-level','List starts below an existing parent',listing)
                    break
                parent=parent[-1]['items'][-1]['blocks']
            if not parent or parent[-1]['type']!='list' or parent[-1]['ordered']!=listing['ordered'] or (listing['ordered'] and parent[-1].get('_numId')!=listing['numId']):
                parent.append({'type':'list','ordered':listing['ordered'],'start':listing['start'],'items':[], '_numId':listing['numId'],'source':self.loc.copy()})
            parent[-1]['items'].append({'blocks':addition})
        elif all(b['type'] in ('image','video') for b in addition) and blocks and blocks[-1]['type']=='list':
            blocks[-1]['items'][-1]['blocks'].extend(addition)
        else:blocks.extend(addition)

    def match(self,p,entries,kind):
        pid=p.get(q('w14:paraId'))
        exact=[e for e in entries if e['paraId']==pid]
        if exact:return exact[0]
        title=''.join(x['text'] for x in self.inlines(p)).strip()
        candidates=[e for e in entries if title in e['titleHistory']]
        if candidates:
            self.issue('identity-anchor',f'{kind} paragraph ID changed; confirm manifest mapping',{'paraId':pid,'title':title,'candidates':[e['sourceKey'] for e in candidates]})
            return candidates[0] if len(candidates)==1 else None
        return None

    def load_metadata(self):
        styles=self.xml('word/styles.xml')
        self.default_run=self.properties(styles.find('w:docDefaults/w:rPrDefault/w:rPr',NS))
        self.styles={s.get(q('w:styleId')):s for s in styles.findall('w:style',NS)}
        numbering=self.xml('word/numbering.xml')
        for n in numbering.findall('w:abstractNum',NS):
            for lvl in n.findall('w:lvl',NS):
                self.abstract[(n.get(q('w:abstractNumId')),int(lvl.get(q('w:ilvl'))))]={'format':value(lvl,'w:numFmt'),'start':int(value(lvl,'w:start','1'))}
        for n in numbering.findall('w:num',NS):
            abstract=value(n,'w:abstractNumId');overrides={}
            for ov in n.findall('w:lvlOverride',NS):
                level=int(ov.get(q('w:ilvl')))
                props=dict(self.abstract.get((abstract,level),{}))
                props['start']=int(value(ov,'w:startOverride',str(props.get('start',1))))
                if ov.find('w:lvl',NS) is not None:
                    props['format']=value(ov,'w:lvl/w:numFmt',props.get('format','bullet'))
                overrides[level]=props
            self.numbering[n.get(q('w:numId'))]=(abstract,overrides)
        rels=self.relationships('word/_rels/comments.xml.rels')
        for c in self.xml('word/comments.xml').findall('w:comment',NS):
            links=[{'label':text(n),'url':rels.get(n.get(q('r:id')),'')} for n in c.findall('.//w:hyperlink',NS)]
            self.comments.append({'id':c.get(q('w:id')),'text':text(c),'links':links,'paraIds':[n.get(q('w14:paraId')) for n in c.findall('w:p',NS)]})
        self.thread_metadata={f:self.zip.read('word/'+f).decode() for f in ('commentsExtended.xml','commentsIds.xml') if 'word/'+f in self.zip.namelist()}
        w15='{http://schemas.microsoft.com/office/word/2012/wordml}'
        resolved={n.get(w15+'paraId') for n in self.xml('word/commentsExtended.xml') if n.get(w15+'done')=='1'}
        for c in self.comments:
            c['resolved']=any(pid in resolved for pid in c['paraIds'])

    def compile(self,out):
        self.load_metadata()
        self.rels=self.relationships('word/_rels/document.xml.rels')
        doc=self.xml('word/document.xml')
        raw_text_nodes=len(list(doc.iter(q('w:t'))))
        self.select_branches(doc)
        body=doc.find('w:body',NS)
        # Explicit, reviewed paragraph ranges. Changed/missing boundaries fail closed.
        positions={}
        for i,p in enumerate(body):
            positions.setdefault(p.get(q('w14:paraId')),[]).append(i)
        ranges={}
        heading_positions=sorted(i for e in self.manifest['collections']+self.manifest['resources'] for i in positions.get(e['paraId'],[]))
        for entry in self.manifest['resources']:
            definitions=entry.get('audienceRanges',[])
            if not definitions: continue
            ranges[entry['sourceKey']]=[]
            previous=-1
            heading=positions.get(entry['paraId'],[])
            section_start=heading[0] if len(heading)==1 else len(body)
            section_end=next((i for i in heading_positions if i>section_start),len(body))
            for definition in definitions:
                start=positions.get(definition['start'],[]);end=positions.get(definition['end'],[])
                if len(start)!=1 or len(end)!=1 or start[0]>end[0] or start[0]<=previous or not section_start<start[0]<=end[0]<section_end:
                    self.issue('audience-range','Audience boundary missing, duplicated or reordered',{'resource':entry['sourceKey'],**definition})
                    continue
                previous=end[0]
                ranges[entry['sourceKey']].append((start[0],end[0],definition['audience']))
        used_ranges=set()
        collections=[];resources=[];collection=None;footer=False
        comment_locations={}
        for i,p in enumerate(body):
            self.loc={'paragraph':i,'paraId':p.get(q('w14:paraId'),'')}
            if p.tag==q('w:sectPr'):continue
            if p.tag!=q('w:p'):
                self.issue('body-element','Unsupported body element',{'tag':p.tag,'text':text(p)})
                self.coverage.append({**self.loc,'disposition':'issue','text':text(p)});continue
            for c in p.findall('.//w:commentRangeStart',NS):
                comment_locations[c.get(q('w:id'))]=self.loc.copy()
            c=self.match(p,self.manifest['collections'],'Collection')
            r=self.match(p,self.manifest['resources'],'Resource')
            if c:
                self.used.add(c['sourceKey']);footer=False;self.current=None
                collection={'sourceKey':c['sourceKey'],'existingId':c.get('existingId',''),'name':''.join(x['text'] for x in self.inlines(p)).strip(),
                            'visible':c.get('visible',True),'showQuickExit':c.get('showQuickExit',False),'sort':(len(collections)+1)*10,
                            'resources':[],'content':{'schemaVersion':1,'audience':c.get('audience',{}),'blocks':[],'footer':[]},'source':self.loc.copy()}
                collections.append(collection);disposition='collection-heading'
            elif r:
                if collection is None:raise ValueError('Resource before collection')
                self.used.add(r['sourceKey']);footer=False
                self.current={'sourceKey':r['sourceKey'],'existingId':r.get('existingId',''),'title':''.join(x['text'] for x in self.inlines(p)).strip(),
                              'titleHistory':r['titleHistory'],'collection':collection['sourceKey'],
                              'content':{'schemaVersion':1,'audience':r.get('audience',collection['content']['audience']),'blocks':[]},'source':self.loc.copy()}
                resources.append(self.current);collection['resources'].append(r['sourceKey']);disposition='resource-heading'
            elif self.loc['paraId'] in self.manifest.get('footerParaIds',[]):
                footer=True
                collection['content']['footer'].extend(self.drawings(p))
                disposition='footer-group-and-editorial-label'
            else:
                style=value(p,'w:pPr/w:pStyle','')
                main=''.join(x['text'] for x in self.inlines(p)).strip()
                if style in ('Rubrik1Sd','Rubrik2Sd') and main:
                    self.issue('unknown-heading','New heading needs a stable manifest key',{'title':main,'style':style,'paraId':self.loc['paraId']})
                blocks=self.paragraph(p)
                target=collection['content']['footer'] if footer else self.current['content']['blocks'] if self.current else collection['content']['blocks'] if collection else None
                if blocks and self.current and self.current['sourceKey'] in ranges and not footer:
                    key=self.current['sourceKey']
                    matches=[(start,end,audience) for start,end,audience in ranges[key] if start<=i<=end]
                    if len(matches)!=1:
                        self.issue('audience-unassigned','Timing content is outside the reviewed PRE/POST ranges',self.loc.copy())
                    else:
                        start,end,audience=matches[0]
                        token=(key,start,end)
                        if token not in used_ranges:
                            target.append({'type':'audienceGroup','audience':audience,'blocks':[],'source':self.loc.copy()})
                            used_ranges.add(token)
                        target=target[-1]['blocks']
                if blocks and target is None: self.issue('unassigned','Content has no section',text(p))
                elif blocks: self.append(target,blocks,self.listing(p))
                disposition='blocks' if blocks else 'blank-spacing'
            self.coverage.append({**self.loc,'disposition':disposition,'textNodeCount':len(list(p.iter(q('w:t')))), 'text':text(p),'images':len(p.findall('.//a:blip',NS))})
        for e in self.manifest['collections']+self.manifest['resources']:
            if e['sourceKey'] not in self.used:
                self.issue('missing-section','Previously mapped section is absent; review retirement',e)
        for key,definitions in ranges.items():
            for start,end,audience in definitions:
                if (key,start,end) not in used_ranges:
                    self.issue('audience-range','Audience range no longer belongs to its resource',{'resource':key,'start':start,'end':end})
        # Resolve link-button labels via reference comments in the same resource span.
        for idx,r in enumerate(resources):
            start=r['source']['paragraph'];end=resources[idx+1]['source']['paragraph'] if idx+1<len(resources) else len(body)
            refs=[c for c in self.comments if start<=comment_locations.get(c['id'],{}).get('paragraph',-1)<end]
            links=[x for c in refs for x in c['links']]
            blocks=r['content']['blocks']
            buttons=[b for b in blocks if b['type']=='linkButton']
            blocks[:]=[b for b in blocks if b['type']!='linkButton']
            for b in buttons:
                label=''.join(n['text'] for n in b['inline']).strip()
                matches=[link for link in links if re.sub(r'\s+',' ',link['label']).strip().casefold()==re.sub(r'\s+',' ',label).strip().casefold()]
                if not matches and len(buttons)==1 and len(links)==1: matches=links
                if len({x['url'] for x in matches})==1:
                    b['href']=matches[0]['url']
                else:
                    self.current=r;self.loc=b['source'];self.issue('link-button','Cannot unambiguously resolve link button URL',label)
                markers=[i for i,x in enumerate(blocks) if x['type']=='paragraph' and 'läs mer här:' in ''.join(n['text'] for n in x['inline']).lower()]
                at=markers[-1]+1 if markers else len(blocks)
                while at<len(blocks) and blocks[at]['type']=='linkButton':at+=1
                blocks.insert(at,b)
        for c in self.comments:
            c['source']=comment_locations.get(c['id'],{})
            if not c['links'] and not c['resolved']:
                self.loc=c['source'];self.current=next((r for r in reversed(resources) if r['source']['paragraph']<=self.loc.get('paragraph',-1)),None)
                self.issue('editorial-comment','Unresolved editorial comment: '+c['text'],{'id':c['id'],'text':c['text']})
        self.current=None;self.loc={}
        # Source-specific semantic conflicts must remain visible until the author resolves them.
        for r in resources:
            if r['sourceKey'] in ('dilator.timing','after-treatment.dilator-use') and '2-3 gånger dagligen' in canonical(r['content']):
                self.current=r;self.loc=r['source'];self.issue('timing-frequency','Frequency conflicts with the existing PRE instructions; author must confirm source wording/audience',semantic(r['content']))
        self.current=None;self.loc={}
        for coll in collections:
            for key in ('blocks','footer'):self.clean(coll['content'][key])
            coll['contentHash']=digest(semantic(coll))
        for r in resources:
            self.clean(r['content']['blocks']);r['contentHash']=digest(semantic(r))
        for asset in self.assets.values():
            path=out/asset['path'];path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(asset.pop('_binary'))
        bundle={'schemaVersion':1,'parserVersion':VERSION,'sourceDocumentHash':hashlib.sha256(self.raw).hexdigest(),'manifestHash':digest(self.manifest),
                'collections':collections,'resources':resources,'assets':list(self.assets.values()),'issues':self.issues,
                'retirements':self.manifest.get('retirements',[]),'relationRemaps':self.manifest.get('relationRemaps',[])}
        bundle['bundleHash']=digest({k:v for k,v in bundle.items() if k!='sourceDocumentHash'})
        counts={'collections':len(collections),'resources':len(resources),'images':self.image_count,'textBoxes':self.shapes,'comments':len(self.comments),'alternateContent':self.alternates,
                'rawTextNodes':raw_text_nodes,'selectedTextNodes':sum(x.get('textNodeCount',0) for x in self.coverage),'bodyParagraphs':len(self.coverage)}
        write_json(out/'bundle.json',bundle)
        write_json(out/'issues.json',self.issues)
        write_json(out/'coverage.json',{'counts':counts,'paragraphs':self.coverage,'comments':self.comments,'threadMetadata':self.thread_metadata})
        return bundle,counts

    def clean(self,value):
        if isinstance(value,dict):
            value.pop('_numId',None)
            for v in value.values():self.clean(v)
        if isinstance(value,list):
            for v in value:self.clean(v)

def validate(bundle,out,publish=False):
    errors=validate_schema(bundle,json.loads((ROOT/'content/resources/schema.json').read_text()))
    if errors: return errors
    if bundle.get('schemaVersion')!=1:errors.append('Unknown schema version')
    keys=[x['sourceKey'] for x in bundle['resources']+bundle['collections']]
    if len(keys)!=len(set(keys)):errors.append('Duplicate source keys')
    assets={x['key'] for x in bundle['assets']}
    for a in bundle['assets']:
        path=out/a['path']
        if Path(a['path']).is_absolute() or '..' in Path(a['path']).parts:errors.append('Unsafe asset path');continue
        if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=a['key']:errors.append('Missing/changed asset '+a['key'])
    def walk(obj):
        if isinstance(obj,dict):
            if 'asset' in obj and obj['asset'] not in assets:errors.append('Missing asset reference')
            if 'target' in obj and obj['target'] not in keys:errors.append('Missing internal target '+obj['target'])
            for k in ('href','url'):
                if obj.get(k) and not re.match(r'^(https://|tel:[+0-9 ()-]+$|mailto:)',obj[k]):errors.append('Unsafe URL '+obj[k])
            for v in obj.values():walk(v)
        if isinstance(obj,list):
            for v in obj:walk(v)
    walk(bundle['resources']);walk(bundle['collections'])
    if publish:errors.extend(x['code']+': '+x['message'] for x in bundle['issues'] if x['blocking'])
    return errors

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command',choices=['extract','validate','preview','report'])
    parser.add_argument('source',nargs='?',default=str(ROOT/'resources.docx'))
    parser.add_argument('--manifest',type=Path,default=ROOT/'content/resources/manifest.json')
    parser.add_argument('--out',type=Path,default=ROOT/'content/resources/generated')
    parser.add_argument('--port',default='5174',help='Local preview port')
    parser.add_argument('--publish',action='store_true',help='Also reject unresolved editorial/source issues')
    args=parser.parse_args()
    if args.command=='report':
        import difflib
        plan=json.loads(Path(args.source).read_text())
        operations=plan.get('operations',[])
        summary={'compiledBundleHash':plan.get('compiledBundleHash'),'review':plan.get('review'),'issues':plan.get('issues',[]),'coverage':plan.get('coverage',[]),'operations':[]}
        lines=['# Resource import review','',f"Operations: {len(operations)}",'']
        for op in operations:
            before=op.get('before') or {};after=op['after']
            changes=[key for key in after if before.get(key)!=after[key]]
            title=after.get('title') or after.get('name') or op['id']
            summary['operations'].append({'collection':op['collection'],'id':op['id'],'kind':op['kind'],'title':title,'fields':changes})
            lines.extend([f"## {title}",'',f"{op['kind']}: `{op['collection']}/{op['id']}`",'', 'Changed fields: '+', '.join(changes),''])
            if before.get('content') and before['content']!=after.get('content'):
                a=json.dumps(before['content'],ensure_ascii=False,indent=2).splitlines()
                b=json.dumps(after.get('content'),ensure_ascii=False,indent=2).splitlines()
                lines+=['```diff',*difflib.unified_diff(a,b,fromfile='previous',tofile='document',lineterm=''),'```','']
        lines+=['## Publication blockers','']+[f"- **{i['code']}**: {i['message']}" for i in summary['issues'] if i['blocking']]
        write_json(args.out/'review-report.json',summary)
        (args.out/'review-report.md').write_text('\n'.join(lines)+'\n')
        print(f"Review report: {args.out/'review-report.md'}")
        return 0
    if args.command=='extract':
        bundle,counts=Compiler(args.source,json.loads(args.manifest.read_text())).compile(args.out)
        print(json.dumps(counts,indent=2))
    elif args.command=='preview':
        print(f'Local document review: http://127.0.0.1:{args.port}/resource-review.html',flush=True)
        return subprocess.call(['pnpm','dev','--host','127.0.0.1','--port',args.port],cwd=ROOT/'web')
    else:bundle=json.loads((args.out/'bundle.json').read_text())
    errors=validate(bundle,args.out,args.publish)
    for err in errors:print(err,file=sys.stderr)
    print(f"{len(bundle['issues'])} source issues; {sum(bool(x['blocking']) for x in bundle['issues'])} publication blockers. Draft extraction does not authorize publication.")
    return 1 if errors else 0

if __name__=='__main__':sys.exit(main())
