import Cocoa
import Foundation

// Arguments: Input SVG path, Output PNG path, Size (optional, default 1024)
let args = CommandLine.arguments

guard args.count >= 3 else {
    print("Usage: swift convert_svg_to_png.swift <input_svg_path> <output_png_path> [size]")
    exit(1)
}

let inputPath = args[1]
let outputPath = args[2]
let size = args.count > 3 ? Double(args[3])! : 1024.0

let fileManager = FileManager.default
if !fileManager.fileExists(atPath: inputPath) {
    print("Error: Input file does not exist at \(inputPath)")
    exit(1)
}

let url = URL(fileURLWithPath: inputPath)

// Create a view to render the SVG
// Note: WebKit is often used for SVG, but for simple SVGs, we might try a different approach or rely on Cocoa's capabilities if possible.
// However, NSImage supports SVG on modern macOS (macOS 12+).
// Let's try loading it as an NSImage.

guard let image = NSImage(contentsOf: url) else {
    print("Error: Could not load image from \(inputPath)")
    exit(1)
}

// Create a bitmap representation of the desired size
let targetSize = NSSize(width: size, height: size)
let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size),
    pixelsHigh: Int(size),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: NSColorSpaceName.deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
)

guard let bitmapRep = rep else {
    print("Error: Could not create bitmap representation")
    exit(1)
}

// Setup graphics context
NSGraphicsContext.saveGraphicsState()
let context = NSGraphicsContext(bitmapImageRep: bitmapRep)
NSGraphicsContext.current = context

// Clear transparent
NSColor.clear.set()
NSRect(origin: .zero, size: targetSize).fill()

// Draw the image
// We need to ensure it scales correctly
image.size = targetSize
let rect = NSRect(origin: .zero, size: targetSize)
image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)

NSGraphicsContext.restoreGraphicsState()

// Convert to PNG data
guard let pngData = bitmapRep.representation(using: NSBitmapImageRep.FileType.png, properties: [:]) else {
    print("Error: Could not convert to PNG data")
    exit(1)
}

// Write to file
do {
    try pngData.write(to: URL(fileURLWithPath: outputPath))
    print("Successfully converted \(inputPath) to \(outputPath) at size \(size)x\(size)")
} catch {
    print("Error writing file: \(error)")
    exit(1)
}
