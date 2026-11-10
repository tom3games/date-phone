#!/bin/zsh
# 切り絵の元画像を生成する。生画像はリポジトリの外（_art_raw/date-phone）に置く。1回目: zsh gen.sh 1 / 2回目（参照つき）: zsh gen.sh 2
cd ~/Desktop/claudecode/date-phone/art
G=~/.claude/skills/3d-homepage/scripts/codex_imagegen.py
R=~/Desktop/claudecode/_art_raw/date-phone
run() { python3 $G $R/$1.png prompts/$1.md ${@:2} --quality high --size 1536x1024 > logs/$1.log 2>&1 && echo "$1 ok" || echo "$1 FAIL" }
if [[ $1 == 1 ]]; then
  for k in date_a misc food feed; do run $k & done; wait
elif [[ $1 == 2 ]]; then
  for k in date_b date_c date_d; do run $k $R/date_a.png & done; wait
else
  for k in ${@:2}; do if [[ $k == date_[bcd] ]]; then run $k $R/date_a.png & else run $k & fi; done; wait
fi
