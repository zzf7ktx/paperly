PAPERLY TEST DOCUMENTS

split-character-text.pdf
  Contains one normal text line and two lines whose characters are stored as
  separate PDF text operations. Open it in Paperly and toggle:

    View > Join split characters

  With the option enabled, each split line should be selectable as one text
  box. With it disabled, every character should be individually selectable.

Regenerate the document with:
  node scripts/create-split-character-example.cjs
