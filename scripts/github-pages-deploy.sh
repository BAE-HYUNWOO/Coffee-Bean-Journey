#!/bin/bash

set -e

echo "🚀 GitHub Pages 배포 시작..."

# 현재 변경사항 확인
if git status --short | grep -q .; then
  echo "📝 변경 사항이 감지되었습니다."
  git add .
  echo "✅ 파일이 스테이지되었습니다."
  
  # 현재 타임스탐프를 커밋 메시지로 사용
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  git commit -m "배포: $TIMESTAMP"
  echo "💾 커밋되었습니다."
else
  echo "ℹ️  변경 사항이 없습니다. 그대로 푸시합니다."
fi

# GitHub에 푸시
git push origin main
echo "📤 GitHub에 푸시되었습니다."

echo ""
echo "✨ 배포 완료!"
echo "🌐 사이트 주소: https://bae-hyunwoo.github.io/Coffee-Bean-Journey"
echo ""
echo "💡 Tip: GitHub Pages 설정을 확인하려면"
echo "   https://github.com/BAE-HYUNWOO/Coffee-Bean-Journey/settings/pages"
