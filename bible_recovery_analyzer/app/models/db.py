from sqlalchemy import JSON, Boolean, Column, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class Token(Base):
    __tablename__ = "tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    osis = Column(String, index=True, nullable=False)
    verse_ref = Column(String, index=True, nullable=False)
    token_order = Column(Integer, nullable=False)

    # Required upgraded schema fields
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

    # Study helpers
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


class Database:
    def __init__(self, sqlite_path: str):
        self.engine = create_engine(f"sqlite:///{sqlite_path}", future=True)
        self.session_local = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def create_all(self) -> None:
        Base.metadata.create_all(bind=self.engine)

    def reset_all(self) -> None:
        Base.metadata.drop_all(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
