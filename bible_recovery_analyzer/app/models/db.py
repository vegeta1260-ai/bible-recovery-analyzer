from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.sql import func

Base = declarative_base()


class Token(Base):
    __tablename__ = "tokens"
    id = Column(Integer, primary_key=True, autoincrement=True)
    osis = Column(String, index=True, nullable=False)
    verse_ref = Column(String, index=True, nullable=False)
    token_order = Column(Integer, nullable=False)
    surface_form = Column(String, nullable=False)
    normalized_form = Column(String, nullable=False)
    lemma = Column(String, index=True, nullable=False)
    strongs_primary = Column(String, index=True, nullable=False)
    strongs_secondary = Column(String, nullable=True)
    analytical_code_raw = Column(String, index=True, nullable=False)
    analytical_code_expanded = Column(JSON, nullable=False, default=dict)
    part_of_speech = Column(String, nullable=False)
    morphology_features = Column(JSON, nullable=False, default=dict)
    literal_gloss_en = Column(String, nullable=False)
    translation_note_zh = Column(Text, nullable=False)
    recovery_alignment_note = Column(Text, nullable=False)
    pronunciation_transliteration = Column(String, nullable=False)
    pronunciation_bopomofo = Column(String, nullable=False)
    source_layer = Column(String, nullable=False, default="OSHB|WLC|SBLGNT|MorphGNT")
    verse_usage = Column(Text, nullable=False)
    related_refs = Column(JSON, nullable=False, default=list)
    grammar_explanation = Column(Text, nullable=False, default="")
    is_ot_quote = Column(Boolean, nullable=False, default=False)


class LexiconEntry(Base):
    __tablename__ = "lexicon_entries"
    id = Column(Integer, primary_key=True, autoincrement=True)
    strongs = Column(String, unique=True, index=True, nullable=False)
    normalized_strongs = Column(String, index=True, nullable=False)
    lemma = Column(String, index=True, nullable=False)
    language = Column(String, nullable=False)
    transliteration = Column(String, nullable=False)
    pronunciation_bopomofo = Column(String, nullable=False)
    short_definition = Column(Text, nullable=False)
    literal_gloss_en = Column(String, nullable=False)
    common_inflections = Column(JSON, nullable=False, default=list)
    analytical_notes = Column(JSON, nullable=False, default=list)


class OriginalToken(Base):
    __tablename__ = "original_tokens"
    id = Column(Integer, primary_key=True, autoincrement=True)
    testament = Column(String, nullable=False)
    language = Column(String, nullable=False)
    source = Column(String, nullable=False)
    book_code = Column(String, nullable=False)
    book_name = Column(String, nullable=False)
    chapter = Column(Integer, nullable=False)
    verse = Column(Integer, nullable=False)
    verse_ref = Column(String, index=True, nullable=False)
    token_index = Column(Integer, nullable=False)
    sentence_id = Column(String, nullable=True)
    xml_id = Column(String, nullable=True)
    surface_form = Column(String, nullable=False)
    normalized_form = Column(String, nullable=True)
    lemma = Column(String, nullable=True)
    strong_number = Column(String, nullable=True)
    strong_number_base = Column(String, nullable=True)
    strong_number_extended = Column(String, nullable=True)
    morph_code = Column(String, nullable=True)
    part_of_speech = Column(String, nullable=True)
    person = Column(String, nullable=True)
    number = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    case = Column(String, nullable=True)
    tense = Column(String, nullable=True)
    voice = Column(String, nullable=True)
    mood = Column(String, nullable=True)
    stem = Column(String, nullable=True)
    state = Column(String, nullable=True)
    aspect = Column(String, nullable=True)
    gloss_en = Column(String, nullable=True)
    gloss_zh = Column(String, nullable=True)
    semantic_domain = Column(String, nullable=True)
    semantic_role = Column(String, nullable=True)
    referent = Column(String, nullable=True)
    speaker = Column(String, nullable=True)
    raw_json = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OriginalVerse(Base):
    __tablename__ = "original_verses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    testament = Column(String, nullable=False)
    language = Column(String, nullable=False)
    source = Column(String, nullable=False)
    book_code = Column(String, nullable=False)
    book_name = Column(String, nullable=False)
    chapter = Column(Integer, nullable=False)
    verse = Column(Integer, nullable=False)
    verse_ref = Column(String, index=True, nullable=False)
    original_text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    raw_json = Column(Text, nullable=True)


class ImportRun(Base):
    __tablename__ = "import_runs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String, nullable=False)
    imported_tokens_count = Column(Integer, nullable=False, default=0)
    imported_verses_count = Column(Integer, nullable=False, default=0)
    diagnostics_json = Column(Text, nullable=True)


class SourceAttribution(Base):
    __tablename__ = "source_attributions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String, nullable=False)
    title = Column(String, nullable=False)
    url = Column(String, nullable=False)
    license = Column(String, nullable=False)
    attribution_text = Column(Text, nullable=False)


class Database:
    def __init__(self, sqlite_path: str):
        self.engine = create_engine(f"sqlite:///{sqlite_path}", future=True)
        self.session_local = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def create_all(self) -> None:
        Base.metadata.create_all(bind=self.engine)

    def reset_all(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
