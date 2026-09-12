const fs = require('node:fs');
const path = require('node:path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function main() {
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.08, 0.12, 0.14);
  const muted = rgb(0.34, 0.4, 0.42);
  const accent = rgb(0.04, 0.45, 0.36);

  page.drawText('Paperly split-character test', { x: 54, y: 722, size: 22, font: bold, color: dark });
  page.drawText('Use this PDF to compare Join split characters on and off.', { x: 54, y: 694, size: 11, font: regular, color: muted });

  page.drawText('NORMAL TEXT (one text operation)', { x: 54, y: 638, size: 9, font: bold, color: accent });
  page.drawText('This sentence should always select as one text box.', { x: 54, y: 610, size: 16, font: regular, color: dark });

  page.drawText('SPLIT TEXT (one operation per character)', { x: 54, y: 548, size: 9, font: bold, color: accent });
  drawSplitText(page, regular, 'This sentence is stored character by character.', 54, 520, 16, dark);

  page.drawText('SPLIT REFERENCE', { x: 54, y: 458, size: 9, font: bold, color: accent });
  drawSplitText(page, bold, 'INV-2026-0042', 54, 426, 20, dark);

  page.drawText('MIXED NUMERIC FRAGMENTS', { x: 310, y: 458, size: 9, font: bold, color: accent });
  drawFragmentedText(page, bold, ['15,000', '.00'], 310, 426, 20, dark);

  page.drawRectangle({ x: 48, y: 392, width: 516, height: 1, color: rgb(0.82, 0.84, 0.83) });
  page.drawText('Expected result', { x: 54, y: 354, size: 12, font: bold, color: dark });
  page.drawText('Join ON: each split line is a single selectable text box.', { x: 54, y: 330, size: 11, font: regular, color: muted });
  page.drawText('Join OFF: each character is a separate selectable text box.', { x: 54, y: 310, size: 11, font: regular, color: muted });

  const outputDirectory = path.join(__dirname, '..', 'examples');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, 'split-character-text.pdf');
  fs.writeFileSync(outputPath, await document.save({ useObjectStreams: false }));
  console.log(outputPath);
}

function drawSplitText(page, font, text, x, y, size, color) {
  let cursor = x;
  for (const character of text) {
    page.drawText(character, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(character, size);
  }
}

function drawFragmentedText(page, font, fragments, x, y, size, color) {
  let cursor = x;
  for (const fragment of fragments) {
    page.drawText(fragment, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(fragment, size);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
