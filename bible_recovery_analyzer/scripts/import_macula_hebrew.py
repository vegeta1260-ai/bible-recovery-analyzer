#!/usr/bin/env python3
from pathlib import Path
from sqlalchemy import delete
import os
from app.models.db import Database, OriginalToken, OriginalVerse
from scripts.import_macula_utils import find_tsv, pick, raw_json, read_tsv

def main(source_dir='data/sources/macula-hebrew', force=False, sqlite_path=None):
    db=Database(sqlite_path or os.getenv('SQLITE_PATH','./data/bible_analyzer.db')); db.create_all()
    tsvs=find_tsv(Path(source_dir))
    if not tsvs: raise SystemExit('No TSV found for macula hebrew')
    path=tsvs[0]; tokens=[]
    with db.session_local() as s:
        if force:
            s.execute(delete(OriginalToken).where(OriginalToken.source=='macula_hebrew'))
            s.execute(delete(OriginalVerse).where(OriginalVerse.source=='macula_hebrew'))
        for _,row in read_tsv(path):
            book=pick(row,'book','book_code','bookname') or 'Gen'
            ch=int(pick(row,'chapter','chapter_num') or 1); vs=int(pick(row,'verse','verse_num') or 1)
            ref=f"{book}.{ch}.{vs}"
            tok=OriginalToken(testament='OT',language='hebrew',source='macula_hebrew',book_code=book,book_name=book,chapter=ch,verse=vs,verse_ref=ref,token_index=int(pick(row,'word_number','token_index','id') or 0),surface_form=pick(row,'word','surface','surface_form') or '',normalized_form=pick(row,'normalized_form'),lemma=pick(row,'lemma'),strong_number=pick(row,'strong','strong_number'),strong_number_base=pick(row,'strong_number_base','strong'),strong_number_extended=pick(row,'strong_number_extended'),morph_code=pick(row,'morph','morph_code'),part_of_speech=pick(row,'pos','part_of_speech'),person=pick(row,'person'),number=pick(row,'number'),gender=pick(row,'gender'),case=pick(row,'case'),tense=pick(row,'tense'),voice=pick(row,'voice'),mood=pick(row,'mood'),stem=pick(row,'stem'),state=pick(row,'state'),aspect=pick(row,'aspect'),gloss_en=pick(row,'gloss','gloss_en'),gloss_zh='',semantic_domain=pick(row,'domain','semantic_domain'),semantic_role=pick(row,'role','semantic_role'),referent=pick(row,'referent'),speaker=pick(row,'speaker'),raw_json=raw_json(row))
            if tok.surface_form:
                s.add(tok); tokens.append(tok)
        s.flush(); by_ref={}
        for t in tokens: by_ref.setdefault(t.verse_ref,[]).append(t)
        for ref,arr in by_ref.items():
            s.add(OriginalVerse(testament='OT',language='hebrew',source='macula_hebrew',book_code=arr[0].book_code,book_name=arr[0].book_name,chapter=arr[0].chapter,verse=arr[0].verse,verse_ref=ref,original_text=' '.join(x.surface_form for x in arr),token_count=len(arr),raw_json=None))
        s.commit()
    verse_count=len(by_ref)
    print({'imported_tokens_count':len(tokens),'imported_verses_count':verse_count})

if __name__=='__main__': main()
