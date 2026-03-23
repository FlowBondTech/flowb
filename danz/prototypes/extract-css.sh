#!/bin/bash

# FlowBond CSS Extraction Script
# Extracts inline CSS from theme HTML files to external theme.css

THEMES_DIR="/home/koh/Documents/DANZ/flowbond-prototypes"

# List of themes to process (excluding hiphop which is already done)
THEMES=(
    "bachata"
    "disco"
    "kpop"
    "light-minimalist"
    "light-modern"
    "light-pastel"
    "reggae"
    "salsa"
    "wearable"
)

echo "Starting CSS extraction for ${#THEMES[@]} themes..."
echo ""

for theme in "${THEMES[@]}"; do
    THEME_DIR="$THEMES_DIR/$theme"
    HTML_FILE="$THEME_DIR/index.html"
    CSS_FILE="$THEME_DIR/theme.css"

    if [ ! -f "$HTML_FILE" ]; then
        echo "❌ $theme: HTML file not found"
        continue
    fi

    echo "Processing $theme..."

    # Extract CSS between <style> and </style> tags
    sed -n '/<style>/,/<\/style>/p' "$HTML_FILE" | \
        sed '1d;$d' > "$CSS_FILE"

    # Get line counts
    ORIGINAL_LINES=$(wc -l < "$HTML_FILE")
    CSS_LINES=$(wc -l < "$CSS_FILE")

    # Create backup
    cp "$HTML_FILE" "$HTML_FILE.backup"

    # Remove <style> block and update stylesheet links
    sed -i '/<style>/,/<\/style>/d' "$HTML_FILE"

    # Add new stylesheet links after base.css
    sed -i 's|<link rel="stylesheet" href="../shared/css/base.css">|<link rel="stylesheet" href="../shared/css/base.css">\n    <link rel="stylesheet" href="../shared/css/variables.css">\n    <link rel="stylesheet" href="theme.css">|' "$HTML_FILE"

    # Remove onclick handlers (if any)
    sed -i 's/ onclick="checkPassword()"//g' "$HTML_FILE"

    NEW_LINES=$(wc -l < "$HTML_FILE")
    REDUCTION=$((ORIGINAL_LINES - NEW_LINES))
    PERCENT=$((REDUCTION * 100 / ORIGINAL_LINES))

    echo "  ✅ Extracted $CSS_LINES lines of CSS"
    echo "  ✅ Reduced HTML from $ORIGINAL_LINES to $NEW_LINES lines (-$PERCENT%)"
    echo ""
done

echo "✨ CSS extraction complete!"
echo ""
echo "Next steps:"
echo "1. Review each theme.css file"
echo "2. Test each theme in browser"
echo "3. Remove .backup files if satisfied"
