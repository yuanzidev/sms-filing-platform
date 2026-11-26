"""参考客户签名合规样例验证自动划入边界。"""

import pytest

from app.services.qualification_compliance import auto_compliance_reason


@pytest.mark.parametrize(
    ("signature", "enterprise", "signature_type", "expected"),
    [
        ("元动未来", "元动未来(北京)科技有限公司", "商标", None),
        ("凤凰易学", "江苏凤凰数字传媒有限公司", "商标", None),
        ("富友", "上海富友电子商务有限公司", "企业简称", None),
        ("上海富友", "上海富友电子商务有限公司", "企业简称", None),
        ("上海富友电子商务", "上海富友电子商务有限公司", "企业简称", "规范简称"),
        ("上海富友电子商务有限公司", "上海富友电子商务有限公司", "企业全称", "企业全称"),
        ("【上海富友电子商务】", "上海富友电子商务有限公司", None, "规范简称"),
        (" 上海富友电子商务 ", "上海富友电子商务有限公司", None, "规范简称"),
        ("上海富友电子商务", "上海富友电子商务股份有限公司", None, None),
        ("", "上海富友电子商务有限公司", None, None),
        ("上海富友电子商务", "", None, None),
    ],
)
def test_auto_compliance_reason(signature, enterprise, signature_type, expected):
    assert auto_compliance_reason(signature, enterprise, signature_type) == expected
