#!/bin/bash
find frontend/src -type f \( -name "*.tsx" -o -name "*.jsx" \) -exec sed -i '' \
  -e 's/\/logo\/[^\"]*\.png/\/logo2\/Blue_transparent.png?v=4/g' \
  -e "s/\/logo\/[^\']*\.png/\/logo2\/Blue_transparent.png?v=4/g" \
  {} +
