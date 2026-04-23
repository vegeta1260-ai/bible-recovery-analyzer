# Backup and Restore

## 本次已執行備份
- Git checkpoint commit: `f3cfdd3`
- Tag: `backup/pre-web-fallback-test`
- Branch: `feature/web-fallback-testing`
- 檔案副本: `/workspace/bible_recovery_analyzer_web_fallback_lab`

## 建立備份步驟（重現）
```bash
git commit --allow-empty -m "chore: backup checkpoint before web fallback testing"
git tag backup/pre-web-fallback-test
git branch feature/web-fallback-testing
git checkout feature/web-fallback-testing
cp -a /workspace/lodes.strapi/bible_recovery_analyzer /workspace/bible_recovery_analyzer_web_fallback_lab
```

## 回復方式
- 回到備份 tag:
```bash
git checkout backup/pre-web-fallback-test
```
- 回到備份分支:
```bash
git checkout feature/web-fallback-testing
```
- 檔案層回復:
```bash
rm -rf /workspace/lodes.strapi/bible_recovery_analyzer
cp -a /workspace/bible_recovery_analyzer_web_fallback_lab /workspace/lodes.strapi/bible_recovery_analyzer
```

## 本次替代方案測試在哪裡進行
- 主要工程修改在 `feature/web-fallback-testing` 分支。
- 同步建立獨立副本 `/workspace/bible_recovery_analyzer_web_fallback_lab` 供隔離測試。
