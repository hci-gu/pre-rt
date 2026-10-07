import copy
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

spec=importlib.util.spec_from_file_location('resources',Path(__file__).with_name('resources.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
ROOT=r.ROOT

class ExtractionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest=json.loads((ROOT/'content/resources/manifest.json').read_text())
        cls.temp=tempfile.TemporaryDirectory()
        cls.bundle,cls.counts=r.Compiler(ROOT/'resources.docx',cls.manifest).compile(Path(cls.temp.name))
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def walk(self,obj):
        if isinstance(obj,dict):
            yield obj
            for v in obj.values():yield from self.walk(v)
        elif isinstance(obj,list):
            for v in obj:yield from self.walk(v)
    def resource(self,key):return next(x for x in self.bundle['resources'] if x['sourceKey']==key)
    def test_baseline_coverage_and_shape_conversion(self):
        self.assertEqual({k:self.counts[k] for k in ('resources','images','textBoxes','comments','alternateContent')},{'resources':38,'images':37,'textBoxes':17,'comments':24,'alternateContent':16})
        self.assertEqual([len(x['resources']) for x in self.bundle['collections']],[9,7,3,5,5,4,2,3])
        nodes=list(self.walk(self.bundle['resources']))
        self.assertEqual(sum(n.get('type')=='video' for n in nodes),6)
        self.assertEqual(sum(n.get('type')=='callout' for n in nodes),5)
        buttons=[n for n in nodes if n.get('type')=='linkButton']
        self.assertEqual(len(buttons),12)
        self.assertTrue(all(n.get('href','').startswith('https://') for n in buttons))
        self.assertEqual(self.bundle['collections'][4]['content']['footer'],[])
        footer=self.resource('violence.support')['content']['blocks']
        self.assertEqual(footer[0]['type'],'columns')
        self.assertEqual(len(footer[0]['columns']),2)
        self.assertEqual(self.bundle['collections'][5]['content']['audience'],{})
    def test_illustrations_stay_with_steps_and_text_boxes_are_not_duplicated(self):
        blocks=self.resource('dilator.how-to')['content']['blocks']
        items=[item for b in blocks if b['type']=='list' for item in b['items']]
        self.assertEqual(len(items),7)
        self.assertTrue(all(any(b['type']=='image' for b in item['blocks']) for item in items))
        dry=self.resource('radiation.dry-mucosa')
        self.assertEqual(sum(n.get('text','').count('Lokalt östrogen kan hjälpa genom att:') for n in self.walk(dry)),1)
        self.assertEqual(sum(n.get('text','').count('När du ska göra mätningen:') for n in self.walk(self.resource('dilator.measure-length'))),1)
    def test_internal_links_resolve_and_reviewed_source_can_publish(self):
        self.assertEqual(r.validate(self.bundle,Path(self.temp.name)),[])
        self.assertEqual(r.validate(self.bundle,Path(self.temp.name),True),[])
        targets=[n['target'] for n in self.walk(self.bundle['resources']) if 'target' in n]
        self.assertEqual(set(targets),{'radiation.estrogen','intimate-care','radiation.dry-mucosa','dilator.how-to','sexual-health.relationships'})
        self.assertNotIn('https://pre-rt.prod.appadem.in/about',r.canonical(self.bundle['resources']))
    def test_feedback_helpers_audience_and_contact_links(self):
        helpers=next(c for c in self.bundle['collections'] if c['sourceKey']=='questionnaire-help')
        self.assertFalse(helpers['visible'])
        for key,id in [('close-person','h3t6383vxtilg44'),('vaginal-sex','8d2vi8ipto076du'),('hormone-skin','iiqw74s03f6273r')]:
            item=self.resource('questionnaire-help.'+key)
            self.assertEqual(item['existingId'],id)
            self.assertTrue(item['content']['blocks'])
        for item in self.bundle['resources']:
            if item['sourceKey'].startswith('after-treatment.'):
                self.assertNotIn('phases',item['content']['audience'])
        for key,number in [('violence.why-asked','tel:020505050'),('violence.answering-yes','tel:020505050'),('violence.support','tel:0313428977')]:
            self.assertTrue(any(n.get('href')==number for n in self.walk(self.resource(key))))
        for key in ['study.contacts','after-treatment.contact']:
            self.assertTrue(any(n.get('href')=='tel:0317866159' for n in self.walk(self.resource(key))))
    def mutated(self,mutate):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        path=Path(temp.name)/'source.docx'
        with zipfile.ZipFile(ROOT/'resources.docx') as source,zipfile.ZipFile(path,'w') as dest:
            for entry in source.infolist():
                data=source.read(entry.filename)
                if entry.filename=='word/document.xml':data=mutate(data)
                dest.writestr(entry.filename,data)
        return r.Compiler(path,self.manifest).compile(Path(temp.name)/'out')[0]
    def test_title_edit_keeps_identity(self):
        b=self.mutated(lambda data:data.replace('Vilken storlek på stav?'.encode(),'Vilken storlek passar?'.encode()))
        item=next(x for x in b['resources'] if x['sourceKey']=='dilator.size')
        self.assertEqual(item['title'],'Vilken storlek passar?')
        self.assertEqual(item['existingId'],'540wnc1pz0k7v44')
    def test_changed_anchor_is_flagged_not_silently_reidentified(self):
        b=self.mutated(lambda data:data.replace(b'35A944CB',b'12345678'))
        self.assertTrue(any(i['code']=='identity-anchor' and i['blocking'] for i in b['issues']))
    def test_run_is_deterministic(self):
        with tempfile.TemporaryDirectory() as out:
            again,_=r.Compiler(ROOT/'resources.docx',self.manifest).compile(Path(out))
            self.assertEqual(self.bundle,again)
    def test_resolution_is_invalidated_when_comment_changes(self):
        issue=next(i for i in self.bundle['issues'] if i['code']=='editorial-comment')
        manifest=copy.deepcopy(self.manifest);manifest['resolutions'][issue['id']]='Reviewed as an editorial question; source retained.'
        with tempfile.TemporaryDirectory() as out:
            bundle,_=r.Compiler(ROOT/'resources.docx',manifest).compile(Path(out))
            self.assertFalse(next(i for i in bundle['issues'] if i['id']==issue['id'])['blocking'])
            changed=Path(out)/'changed.docx'
            with zipfile.ZipFile(ROOT/'resources.docx') as source,zipfile.ZipFile(changed,'w') as dest:
                for entry in source.infolist():
                    data=source.read(entry.filename)
                    if entry.filename=='word/comments.xml':
                        xml=ET.fromstring(data)
                        comment=next(c for c in xml if c.get(r.q('w:id'))==issue['evidence']['id'])
                        first=next(comment.iter(r.q('w:t')))
                        first.text=(first.text or '')+' Changed review question.'
                        data=ET.tostring(xml)
                    dest.writestr(entry.filename,data)
            updated,_=r.Compiler(changed,manifest).compile(Path(out)/'updated')
            updated_issue=next(i for i in updated['issues'] if i['code']=='editorial-comment' and i['evidence']['id']==issue['evidence']['id'])
            self.assertTrue(updated_issue['blocking'])
            self.assertNotEqual(updated_issue['id'],issue['id'])
    def test_asset_corruption_is_detected(self):
        with tempfile.TemporaryDirectory() as out:
            bundle,_=r.Compiler(ROOT/'resources.docx',self.manifest).compile(Path(out))
            (Path(out)/bundle['assets'][0]['path']).write_bytes(b'broken')
            self.assertTrue(any('asset' in e for e in r.validate(bundle,Path(out))))

    def test_updated_source_has_no_remaining_mapping_or_authoring_gaps(self):
        blockers=[i for i in self.bundle['issues'] if i['blocking']]
        self.assertEqual(blockers,[])
        media=[n for n in self.walk(self.bundle['resources']) if n.get('type') in ('image','video')]
        self.assertEqual(len(media),37)
        self.assertTrue(all(n['alt'].strip() for n in media))
        self.assertFalse(any(i.get('evidence',{}).get('id')=='260864063' for i in self.bundle['issues'] if isinstance(i.get('evidence'),dict)))
        self.assertEqual(self.resource('radiation.partner-conversation')['collection'],'sexual-health')
        contact=r.canonical(self.resource('study.contacts'))
        for link in ('tel:0313439856','tel:0317866159','mailto:josefin.hoyna@vgregion.se','mailto:linda.akeflo@gu.se'):
            self.assertIn(link,contact)

    def test_timing_is_split_only_by_arm_and_does_not_mix_list_items(self):
        for key in ('dilator.timing','after-treatment.dilator-use'):
            groups=self.resource(key)['content']['blocks']
            self.assertEqual([g['type'] for g in groups],['audienceGroup','audienceGroup'])
            self.assertEqual([g['audience'] for g in groups],[{'arms':['PRE']},{'arms':['POST']}])
            self.assertIn('Fortsätt dagligen i 6 veckor',r.canonical(groups[0]))
            self.assertNotIn('Fortsätt dagligen i 6 veckor',r.canonical(groups[1]))
            self.assertIn('1 månad',r.canonical(groups[1]))
        b=self.mutated(lambda data:data.replace(b'55C389CA',b'01234567'))
        self.assertTrue(any(i['code']=='audience-range' and i['blocking'] for i in b['issues']))
        self.assertTrue(any(i['code']=='audience-unassigned' and i['blocking'] for i in b['issues']))

    def test_video_placeholders_require_an_explicit_decision(self):
        self.assertEqual(sum(i['code']=='video-placeholder' and not i['blocking'] for i in self.bundle['issues']),6)
        manifest=copy.deepcopy(self.manifest)
        for a in manifest['assets'].values():a.pop('placeholder',None)
        with tempfile.TemporaryDirectory() as out:
            bundle,_=r.Compiler(ROOT/'resources.docx',manifest).compile(Path(out))
            self.assertEqual(sum(i['code']=='video-source' and i['blocking'] for i in bundle['issues']),6)

if __name__=='__main__':unittest.main()
