#!/bin/bash

SOURCE="public/logo_small.png"
SIZES=(72 96 128 144 152 192 384 512)

echo "Generating PWA icons from $SOURCE..."

for size in "${SIZES[@]}"; do
  OUTPUT="public/icon-${size}x${size}.png"
  echo "Creating ${size}x${size} icon..."
  convert "$SOURCE" -resize ${size}x${size} -gravity center -background transparent -extent ${size}x${size} "$OUTPUT"
done

echo "All icons generated successfully!"
