import os

import pytest

RUN = os.getenv("RUN_OPTIONAL_INTEGRATION", "false").lower() == "true"


@pytest.mark.skipif(not RUN, reason="optional integration disabled")
def test_optional_web_fallback_env_present():
    assert os.getenv("RECOVERY_WEB_BASE_URL")
