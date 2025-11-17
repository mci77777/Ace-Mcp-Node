# Assets Directory

This directory contains application icons and resources for Electron packaging.

## Required Files

- `icon.png` - Application icon (512x512 or 1024x1024 PNG)
- `icon.ico` - Windows icon (256x256 ICO format)
- `icon.icns` - macOS icon (ICNS format)

## Generating Icons

You can use tools like:
- **electron-icon-builder**: `npm install -g electron-icon-builder`
- **png2icons**: Online converter at https://www.icoconverter.com/

### Quick Start

1. Create a 1024x1024 PNG file named `icon.png`
2. Use electron-icon-builder to generate all formats:
   ```bash
   electron-icon-builder --input=./icon.png --output=./
   ```

## Placeholder

Currently using default Electron icon. Add your custom icons here for branding.
