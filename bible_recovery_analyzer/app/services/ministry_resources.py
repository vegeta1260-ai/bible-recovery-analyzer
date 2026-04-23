from app.models.schemas import MinistryResourceItem

RESOURCE_INDEX: list[MinistryResourceItem] = [
    MinistryResourceItem(
        title="Living Stream Ministry Publications Catalog",
        kind="affirmation_negation",
        language="zh/en",
        url="https://www.lsm.org/",
        note="用於查核《肯定與否定》系列授權與可取得版本（需人工確認可用性）。",
    ),
    MinistryResourceItem(
        title="Taiwan Gospel Book Room",
        kind="affirmation_negation",
        language="zh",
        url="https://www.twgbr.org.tw/",
        note="可查詢書籍目錄與購買資訊；是否有全文公開需逐篇確認。",
    ),
    MinistryResourceItem(
        title="Sefaria Hebrew Bible (study reference)",
        kind="hebrew_resource",
        language="en/he",
        url="https://www.sefaria.org/texts/Tanakh",
        note="可作希伯來文研究輔助資源（非恢復本）。",
    ),
    MinistryResourceItem(
        title="STEP Bible",
        kind="hebrew_resource",
        language="en/he/el",
        url="https://www.stepbible.org/",
        note="可作 OT/NT 原文詞形查考輔助資源。",
    ),
]


def search_resources(query: str) -> list[MinistryResourceItem]:
    q = query.lower().strip()
    return [
        item
        for item in RESOURCE_INDEX
        if q in item.title.lower() or q in item.note.lower() or q in item.kind.lower()
    ] or RESOURCE_INDEX
