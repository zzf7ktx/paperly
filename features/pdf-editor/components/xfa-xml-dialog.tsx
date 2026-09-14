'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  composeXdp,
  createXfaPacketZip,
  createXfaPdfFromXdp,
  formatXfaXml,
  inspectXfaXml,
  mergeXfaDatasets,
  parseTabularXfaData,
  readNativeXfaPackets,
  replaceNativeXfaPacket,
  type XfaPacket,
  type XfaXmlInspection,
} from '../../../lib/xfa-template';

type Props = {
  fileName: string;
  hasXfaDocument: boolean;
  hideOpenTrigger?: boolean;
  getBytes: () => Promise<Uint8Array | undefined>;
  onOpenPdf: (file: File) => Promise<void>;
  onOpenStaticPdf: (file: File) => Promise<void>;
  activeFieldPath?: string;
  onJumpToControl: (nameOrPath: string) => void;
  onError: (message: string) => void;
};

function XmlOutlineNode({ element, depth, onJump }: { element: Element; depth: number; onJump: (name: string) => void }) {
  const children = Array.from(element.children);
  const unsupported = ['signature', 'barcode', 'connect', 'submit', 'execute', 'signData'].includes(element.localName);
  const invalidAttribute = ['x', 'y', 'w', 'h'].some((name) => {
    const value = element.getAttribute(name);
    return value !== null && !/^-?\d*\.?\d+(pt|in|cm|mm|px)?$/i.test(value);
  });
  const problematic = unsupported || invalidAttribute;
  const label = `<${element.tagName}${element.getAttribute('name') ? ` name="${element.getAttribute('name')}"` : ''}>`;
  const actions = (
    <span className="xfa-outline-actions">
      {element.localName === 'field' && element.getAttribute('name') && <button onClick={() => onJump(element.getAttribute('name') || '')}>Show</button>}
      <button onClick={() => void navigator.clipboard.writeText(new XMLSerializer().serializeToString(element))}>Copy</button>
    </span>
  );
  if (!children.length) return <div className={`xfa-outline-leaf ${problematic ? 'unsupported' : ''}`} title={unsupported ? 'This node is not supported by Paperly.' : invalidAttribute ? 'This node has an invalid measurement attribute.' : undefined} style={{ paddingLeft: depth * 14 }}><code>{label}</code><span>{element.textContent?.trim()}</span>{actions}</div>;
  return (
    <details className={`xfa-outline-node ${problematic ? 'unsupported' : ''}`} open={depth < 1} style={{ marginLeft: depth * 14 }}>
      <summary><code>{label}</code>{actions}</summary>
      {children.map((child, index) => <XmlOutlineNode key={`${child.tagName}-${index}`} element={child} depth={depth + 1} onJump={onJump} />)}
    </details>
  );
}

function escapeXmlForHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightXmlSource(source: string) {
  const tokens = source.split(/(<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<[^>]*>)/g);
  return tokens.map((token) => {
    if (!token) return '';
    if (token.startsWith('<!--')) return `<span class="xml-comment">${escapeXmlForHtml(token)}</span>`;
    if (token.startsWith('<![CDATA[')) return `<span class="xml-value">${escapeXmlForHtml(token)}</span>`;
    if (!token.startsWith('<')) return escapeXmlForHtml(token);
    const parts = token.split(/("[^"]*"|'[^']*')/g);
    return `<span class="xml-tag">${parts.map((part, index) =>
      index % 2 ? `<span class="xml-value">${escapeXmlForHtml(part)}</span>` : escapeXmlForHtml(part),
    ).join('')}</span>`;
  }).join('');
}

export function XfaXmlDialog({ fileName, hasXfaDocument, hideOpenTrigger, getBytes, onOpenPdf, onOpenStaticPdf, activeFieldPath, onJumpToControl, onError }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const dataRef = useRef<HTMLInputElement>(null);
  const [packets, setPackets] = useState<XfaPacket[]>([]);
  const [nativePackets, setNativePackets] = useState<XfaPacket[]>([]);
  const [imported, setImported] = useState<XfaXmlInspection | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [regularExpression, setRegularExpression] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);
  const [sourceHistory, setSourceHistory] = useState<string[]>([]);
  const [sourceFuture, setSourceFuture] = useState<string[]>([]);
  const [sourceError, setSourceError] = useState('');
  const [fullScreen, setFullScreen] = useState(false);
  const [dataTree, setDataTree] = useState(false);
  const [outline, setOutline] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [pdfStorage, setPdfStorage] = useState<'stream' | 'packets'>('stream');
  const [fallbackPage, setFallbackPage] = useState(false);
  const [acroFormFallback, setAcroFormFallback] = useState(false);
  const selected = packets.find((packet) => packet.name === selectedName) || packets[0];
  const inspection = useMemo(() => {
    if (imported) return imported;
    if (!nativePackets.length) return null;
    try {
      return inspectXfaXml(composeXdp(nativePackets));
    } catch {
      return null;
    }
  }, [imported, nativePackets]);
  const importAction = imported?.kind === 'xdp' ? 'Create a new PDF' : `Replace the ${imported?.packetName} packet`;
  const matches = useMemo(() => {
    if (!selected || !query) return [] as number[];
    try {
      const expression = regularExpression ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(expression, caseSensitive ? 'g' : 'gi');
      return Array.from(selected.xml.matchAll(matcher), (match) => match.index).filter(
        (position): position is number => position !== undefined,
      );
    } catch {
      return [] as number[];
    }
  }, [caseSensitive, query, regularExpression, selected]);
  const originalPacket = selected
    ? nativePackets.find((packet) => packet.name === selected.name)
    : undefined;
  const changed = Boolean(originalPacket && selected && originalPacket.xml !== selected.xml);
  const highlightedXml = useMemo(() => {
    return highlightXmlSource(selected?.xml || '');
  }, [selected?.xml]);
  const embeddedScripts = useMemo(() => {
    if (!selected) return [] as string[];
    try {
      const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
      return Array.from(
        document.getElementsByTagNameNS('*', 'script'),
        (script) => script.textContent?.trim() || '',
      ).filter(Boolean);
    } catch {
      return [];
    }
  }, [selected]);
  const templateFieldNames = useMemo(() => {
    const packet = nativePackets.find((entry) => entry.name === 'template' || entry.name === 'xdp');
    if (!packet) return [];
    try {
      const document = new DOMParser().parseFromString(packet.xml, 'application/xml');
      return Array.from(new Set(Array.from(document.getElementsByTagNameNS('*', 'field'), (field) => field.getAttribute('name')).filter((name): name is string => Boolean(name))));
    } catch { return []; }
  }, [nativePackets]);
  const datasetLeaves = useMemo(() => {
    if (selected?.name !== 'datasets' || !dataTree) return [] as Array<{ index: number; name: string; path: string; value: string }>;
    try {
      const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
      const elements = Array.from(document.getElementsByTagName('*'));
      return elements.flatMap((element, index) => {
        if (element.children.length || ['datasets', 'data'].includes(element.localName)) return [];
        const names: string[] = [];
        for (let node: Element | null = element; node && !['datasets', 'data'].includes(node.localName); node = node.parentElement)
          names.unshift(node.localName);
        return [{ index, name: element.localName, path: names.join('.'), value: element.textContent || '' }];
      });
    } catch { return []; }
  }, [dataTree, selected]);
  useEffect(() => {
    const position = matches[matchIndex];
    const textarea = sourceRef.current;
    if (position === undefined || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(position, position + (textarea.value.slice(position).match(regularExpression ? new RegExp(query, caseSensitive ? '' : 'i') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? '' : 'i'))?.[0].length || query.length));
  }, [caseSensitive, matchIndex, matches, query, regularExpression]);
  useLayoutEffect(() => {
    const textarea = sourceRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
    highlight.scrollLeft = textarea.scrollLeft;
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = textarea.scrollTop;
  }, [selected?.xml, wrapLines]);

  const open = async () => {
    setLoading(true);
    try {
      const bytes = await getBytes();
      if (!bytes) throw new Error('The current PDF could not be prepared.');
      const nextPackets = await readNativeXfaPackets(bytes);
      if (!nextPackets.length) throw new Error('No readable XFA XML packets were found.');
      setPackets(nextPackets);
      setNativePackets(nextPackets);
      setImported(null);
      setSelectedName(nextPackets.find((packet) => packet.name === 'template')?.name || nextPackets[0].name);
      const activeName = activeFieldPath?.split('.').at(-1)?.replace(/\[\d+\]$/, '');
      setQuery(activeName ? `<field name="${activeName}"` : '');
      setEditable(false);
      setSourceHistory([]);
      setSourceFuture([]);
      dialogRef.current?.showModal();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XFA XML could not be opened.');
    } finally {
      setLoading(false);
    }
  };

  const exportPacket = () => {
    if (!selected) return;
    const extension = selected.name === 'xdp' ? 'xdp' : 'xml';
    const safeName = selected.name.replace(/[^a-z0-9_-]+/gi, '-');
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(new Blob([selected.xml], { type: 'application/xml;charset=utf-8' }));
    anchor.href = url;
    anchor.download = `${fileName.replace(/\.pdf$/i, '')}-${safeName}.${extension}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const download = (bytes: BlobPart, name: string, type: string) => {
    const anchor = document.createElement('a');
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportXdp = () => {
    try {
      download(composeXdp(nativePackets), `${fileName.replace(/\.pdf$/i, '')}.xdp`, 'application/xml');
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XDP could not be created.');
    }
  };

  const exportZip = () => {
    download(createXfaPacketZip(nativePackets), `${fileName.replace(/\.pdf$/i, '')}-xfa-packets.zip`, 'application/zip');
  };

  const importXml = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const inspection = inspectXfaXml(await file.text());
      setImported(inspection);
      setPackets([{ name: inspection.packetName, xml: inspection.xml }]);
      setSelectedName(inspection.packetName);
      setQuery('');
      setCopied(false);
      setEditable(false);
      setSourceHistory([]);
      setSourceFuture([]);
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XML file could not be opened.');
    } finally {
      setLoading(false);
      if (importRef.current) importRef.current.value = '';
    }
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const type = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
      const xml = parseTabularXfaData(await file.text(), type);
      await importXml(new File([xml], 'datasets.xml', { type: 'application/xml' }));
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The data file could not be imported.');
    } finally {
      if (dataRef.current) dataRef.current.value = '';
    }
  };

  useEffect(() => {
    const listener = (event: Event) => void importXml((event as CustomEvent<File>).detail);
    const chooseListener = () => importRef.current?.click();
    window.addEventListener('paperly-open-xfa', listener);
    window.addEventListener('paperly-choose-xfa', chooseListener);
    return () => {
      window.removeEventListener('paperly-open-xfa', listener);
      window.removeEventListener('paperly-choose-xfa', chooseListener);
    };
  }, []);

  const createPdf = async (openInEditor = false) => {
    if (!imported || imported.kind !== 'xdp' || !selected) return;
    setLoading(true);
    try {
      const bytes = await createXfaPdfFromXdp(selected.xml, pdfStorage, fallbackPage, acroFormFallback);
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const verification = await pdfjs.getDocument({
        data: bytes.slice(),
        enableXfa: true,
        wasmUrl: new URL('pdfjs/wasm/', document.baseURI).href,
      }).promise;
      if ((!fallbackPage && !acroFormFallback && !verification.isPureXfa) || verification.numPages < 1)
        throw new Error('PDF.js could not verify a renderable XFA page in the generated PDF.');
      await verification.getPage(1);
      await verification.destroy();
      const outputName = `${fileName.replace(/\.(pdf|xdp|xml)$/i, '') || 'xfa-form'}.pdf`;
      if (openInEditor) {
        dialogRef.current?.close();
        await onOpenPdf(new File([bytes as BlobPart], outputName, { type: 'application/pdf' }));
      } else download(bytes as BlobPart, outputName, 'application/pdf');
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XFA PDF could not be created.');
    } finally {
      setLoading(false);
    }
  };

  const replacePacket = async () => {
    if (!imported || imported.kind !== 'packet' || !selected) return;
    setLoading(true);
    try {
      const bytes = await getBytes();
      if (!bytes) throw new Error('The current PDF could not be prepared.');
      if (['template', 'config'].includes(imported.packetName) &&
          !window.confirm(`Replace the ${imported.packetName} packet? Layout or behavior may change.`)) return;
      let replacementXml = selected.xml;
      if (imported.packetName === 'datasets') {
        const current = nativePackets.find((packet) => packet.name === 'datasets');
        if (current && window.confirm('Merge imported data with the existing datasets? Choose Cancel to replace it.'))
          replacementXml = mergeXfaDatasets(current.xml, imported.xml);
      }
      download(bytes as BlobPart, `${fileName.replace(/\.pdf$/i, '')}-backup.pdf`, 'application/pdf');
      const output = await replaceNativeXfaPacket(bytes, imported.packetName, replacementXml);
      const outputName = `${fileName.replace(/\.pdf$/i, '')}-${imported.packetName}-imported.pdf`;
      dialogRef.current?.close();
      await onOpenPdf(new File([output as BlobPart], outputName, { type: 'application/pdf' }));
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XFA packet could not be imported.');
    } finally {
      setLoading(false);
    }
  };

  const applyNativeEdit = async () => {
    if (!selected || !changed || sourceError) return;
    if (['template', 'config', 'xdp'].includes(selected.name) &&
        !window.confirm(`Apply changes to the ${selected.name} packet in a new PDF copy?`)) return;
    setLoading(true);
    try {
      const bytes = await getBytes();
      if (!bytes) throw new Error('The current PDF could not be prepared.');
      download(bytes as BlobPart, `${fileName.replace(/\.pdf$/i, '')}-backup.pdf`, 'application/pdf');
      const output = await replaceNativeXfaPacket(bytes, selected.name, selected.xml);
      dialogRef.current?.close();
      await onOpenPdf(new File([output as BlobPart], `${fileName.replace(/\.pdf$/i, '')}-xml-edited.pdf`, { type: 'application/pdf' }));
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The XML changes could not be applied.');
    } finally {
      setLoading(false);
    }
  };

  const flattenPdf = async (openForEditing = false) => {
    setLoading(true);
    try {
      const bytes = await getBytes();
      if (!bytes) throw new Error('The current PDF could not be prepared.');
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      const source = await pdfjs.getDocument({ data: bytes.slice(), enableXfa: true, wasmUrl: new URL('pdfjs/wasm/', document.baseURI).href }).promise;
      const { PDFDocument } = await import('pdf-lib');
      const output = await PDFDocument.create();
      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        const page = await source.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('A canvas could not be created for static rendering.');
        await page.render({ canvas, canvasContext: context, viewport, annotationMode: 0 }).promise;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('A rendered page could not be encoded.')), 'image/jpeg', 0.9));
        const image = await output.embedJpg(await blob.arrayBuffer());
        const outputPage = output.addPage([viewport.width, viewport.height]);
        outputPage.drawImage(image, { x: 0, y: 0, width: outputPage.getWidth(), height: outputPage.getHeight() });
      }
      await source.destroy();
      const flattened = await output.save();
      const staticName = `${fileName.replace(/\.pdf$/i, '')}-static.pdf`;
      if (openForEditing) {
        dialogRef.current?.close();
        await onOpenStaticPdf(new File([flattened.slice().buffer as ArrayBuffer], staticName, { type: 'application/pdf' }));
      } else download(flattened as BlobPart, staticName, 'application/pdf');
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The static PDF could not be created.');
    } finally {
      setLoading(false);
    }
  };

  const prepareAcrobatCopy = async (openForEditing = false) => {
    setLoading(true);
    try {
      const bytes = await getBytes();
      if (!bytes) throw new Error('The current PDF could not be prepared.');
      const outputName = `${fileName.replace(/\.pdf$/i, '')}-acrobat-copy.pdf`;
      if (openForEditing) {
        dialogRef.current?.close();
        await onOpenPdf(new File([bytes.slice().buffer as ArrayBuffer], outputName, { type: 'application/pdf' }));
      } else download(bytes as BlobPart, outputName, 'application/pdf');
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'The Acrobat copy could not be prepared.');
    } finally {
      setLoading(false);
    }
  };

  const updateSource = (xml: string, remember = true) => {
    if (!selected) return;
    if (remember) {
      setSourceHistory((history) => [...history.slice(-49), selected.xml]);
      setSourceFuture([]);
    }
    setPackets((current) => current.map((packet) => packet === selected ? { ...packet, xml } : packet));
    try {
      const next = inspectXfaXml(xml);
      setSourceError('');
      if (imported) setImported(next);
    } catch (reason) {
      setSourceError(reason instanceof Error ? reason.message : 'Invalid XML');
    }
  };

  const restoreSource = (xml: string, destination: 'undo' | 'redo') => {
    if (!selected) return;
    if (destination === 'undo') {
      setSourceFuture((future) => [selected.xml, ...future]);
      setSourceHistory((history) => history.slice(0, -1));
    } else {
      setSourceHistory((history) => [...history, selected.xml]);
      setSourceFuture((future) => future.slice(1));
    }
    updateSource(xml, false);
  };

  const changeDatasetRows = (action: 'add' | 'remove') => {
    if (!selected) return;
    const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
    const rows = Array.from(document.getElementsByTagName('row'));
    if (action === 'add') {
      const row = rows.at(-1);
      if (!row) return onError('No repeated data row was found to clone.');
      const clone = row.cloneNode(true) as Element;
      Array.from(clone.children).forEach((field) => { field.textContent = ''; });
      row.parentElement?.append(clone);
    } else {
      if (rows.length <= 1) return onError('At least one data row must remain.');
      rows.at(-1)?.remove();
    }
    updateSource(new XMLSerializer().serializeToString(document));
  };

  const renameDatasetField = (currentName: string, nextName: string) => {
    if (!selected || currentName === nextName) return;
    const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
    for (const field of Array.from(document.getElementsByTagName(currentName))) {
      const replacement = document.createElement(nextName);
      for (const attribute of Array.from(field.attributes)) replacement.setAttribute(attribute.name, attribute.value);
      while (field.firstChild) replacement.append(field.firstChild);
      field.replaceWith(replacement);
    }
    updateSource(new XMLSerializer().serializeToString(document));
  };

  const jumpFromXml = () => {
    if (!selected) return;
    const cursor = sourceRef.current?.selectionStart || 0;
    const before = selected.xml.slice(0, cursor);
    const fieldTags = Array.from(before.matchAll(/<field\b[^>]*\bname=["']([^"']+)["'][^>]*>/gi));
    const name = fieldTags.at(-1)?.[1];
    if (!name) {
      onError('Place the cursor inside or after a named <field> element first.');
      return;
    }
    onJumpToControl(name);
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        className="button xfa-xml-button"
        hidden={hideOpenTrigger && !hasXfaDocument}
        disabled={loading}
        onClick={() => (hasXfaDocument ? void open() : importRef.current?.click())}
      >
        {loading ? 'Reading XML…' : hasXfaDocument ? 'XFA XML' : 'Open XFA'}
      </button>
      <dialog ref={dialogRef} className={`xfa-xml-dialog ${fullScreen ? 'full-screen' : ''}`} aria-labelledby="xfa-xml-title">
        <div className="xfa-xml-heading">
          <div>
            <h2 id="xfa-xml-title">XFA XML</h2>
            <p>{imported ? 'Review the imported XML before creating or updating a PDF.' : 'Inspect and export the XML packets embedded in this form.'}</p>
          </div>
          <button aria-label="Close XFA XML viewer" onClick={() => dialogRef.current?.close()}>
            ×
          </button>
        </div>
        <div className="xfa-xml-controls">
          <div className="xfa-search-tools">
          <label className="xfa-xml-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={query}
              placeholder={`Search ${selected?.name || 'XML'}…`}
              aria-label="Search XML"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span className="xfa-xml-match-count" aria-live="polite">
            {query.trim() ? `${matches.length ? matchIndex + 1 : 0} of ${matches.length}` : ''}
          </span>
          <button className="button" disabled={!matches.length} aria-label="Previous XML match" onClick={() => setMatchIndex((matchIndex - 1 + matches.length) % matches.length)}>↑</button>
          <button className="button" disabled={!matches.length} aria-label="Next XML match" onClick={() => setMatchIndex((matchIndex + 1) % matches.length)}>↓</button>
          <button className={`button ${caseSensitive ? 'active' : ''}`} aria-pressed={caseSensitive} title="Case-sensitive search" onClick={() => setCaseSensitive((value) => !value)}>Aa</button>
          <button className={`button ${regularExpression ? 'active' : ''}`} aria-pressed={regularExpression} title="Regular-expression search" onClick={() => setRegularExpression((value) => !value)}>.*</button>
          </div>
          <div className="xfa-file-actions">
          <input
            ref={importRef}
            type="file"
            accept=".xml,.xdp,application/xml,text/xml"
            hidden
            onChange={(event) => void importXml(event.target.files?.[0])}
          />
          <input ref={dataRef} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={(event) => void importData(event.target.files?.[0])} />
          <button className="button" onClick={() => importRef.current?.click()}>
            Open XML
          </button>
          <button className="button" onClick={() => dataRef.current?.click()}>
            Import data
          </button>
          <button
            className="button"
            onClick={async () => {
              if (!selected) return;
              await navigator.clipboard.writeText(selected.xml);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? 'Copied' : 'Copy XML'}
          </button>
          {imported?.kind === 'xdp' ? (
            <>
              <label className="xfa-storage-select">Storage<select value={pdfStorage} onChange={(event) => setPdfStorage(event.target.value as 'stream' | 'packets')}><option value="stream">XDP stream</option><option value="packets">Packet array</option></select></label>
              <label className="xfa-fallback-option"><input type="checkbox" checked={fallbackPage} onChange={(event) => setFallbackPage(event.target.checked)} /> Viewer fallback</label>
              <label className="xfa-fallback-option"><input type="checkbox" checked={acroFormFallback} onChange={(event) => setAcroFormFallback(event.target.checked)} /> AcroForm fields</label>
              <button className="button" disabled={loading || imported.warnings.length > 0 || Boolean(sourceError)} onClick={() => void createPdf()}>
                Download PDF
              </button>
              <button className="button primary" disabled={loading || imported.warnings.length > 0 || Boolean(sourceError)} onClick={() => void createPdf(true)}>
                Open and edit
              </button>
            </>
          ) : imported?.kind === 'packet' && hasXfaDocument ? (
            <button className="button primary" disabled={loading || Boolean(sourceError)} onClick={() => void replacePacket()}>
              Import into PDF
            </button>
          ) : imported?.kind === 'packet' ? (
            <button className="button primary" disabled title="Open an XFA PDF before importing a packet">
              XFA PDF required
            </button>
          ) : (
            <>
              <button className="button" onClick={exportXdp}>
                Export XDP
              </button>
              <button className="button" onClick={exportZip}>
                Export ZIP
              </button>
              <button className="button" disabled={loading} onClick={() => void flattenPdf()}>
                Download static
              </button>
              <button className="button" disabled={loading} onClick={() => void flattenPdf(true)}>
                Open static
              </button>
              <button className="button" disabled={loading} onClick={() => void prepareAcrobatCopy()} title="Download a native XFA copy for Adobe Acrobat">
                Download Acrobat
              </button>
              <button className="button" disabled={loading} onClick={() => void prepareAcrobatCopy(true)} title="Open an independent Acrobat-compatible XFA copy in Paperly">
                Open Acrobat copy
              </button>
              {nativePackets.some((packet) => packet.name === 'datasets') && (
                <button className="button" onClick={() => {
                  const data = nativePackets.find((packet) => packet.name === 'datasets');
                  if (data) download(data.xml, `${fileName.replace(/\.pdf$/i, '')}-data.xml`, 'application/xml');
                }}>Export data</button>
              )}
              <button className="button primary" onClick={exportPacket}>
                Export XML
              </button>
              {changed && <button className="button primary" disabled={Boolean(sourceError) || loading} onClick={() => void applyNativeEdit()}>Apply to PDF copy</button>}
            </>
          )}
          </div>
        </div>
        {imported && (
          <section className="xfa-xml-review" aria-label="Import review">
            <div>
              <small>File type</small>
              <strong>{imported.kind === 'xdp' ? 'Complete XDP' : `${imported.packetName} packet`}</strong>
            </div>
            <div>
              <small>Contents</small>
              <strong>{imported.packetNames.length} packet{imported.packetNames.length === 1 ? '' : 's'}{imported.templateVersion ? ` · XFA ${imported.templateVersion}` : ''}</strong>
            </div>
            <div>
              <small>Action</small>
              <strong>{imported.kind === 'packet' && !hasXfaDocument ? 'Open an XFA PDF first' : importAction}</strong>
            </div>
            <div className={imported.warnings.length ? 'warning' : 'ready'}>
              <small>Validation</small>
              <strong>{imported.warnings[0] || 'Ready'}</strong>
            </div>
          </section>
        )}
        {inspection && (
          <section className={`xfa-compatibility xfa-risk-${inspection.compatibility.risk}`} aria-label="XFA compatibility report">
            <div className="xfa-compatibility-title">
              <span>Compatibility</span>
              <strong>{inspection.compatibility.risk === 'low' ? 'Good' : inspection.compatibility.risk === 'review' ? 'Review recommended' : 'Limited'}</strong>
              <small title={inspection.namespace}>{inspection.namespace || 'No namespace'}</small>
            </div>
            <dl>
              <div><dt>Form</dt><dd>{inspection.compatibility.formType}</dd></div>
              <div><dt>Fields</dt><dd>{inspection.compatibility.fields}</dd></div>
              <div><dt>Scripts</dt><dd>{inspection.compatibility.scripts}</dd></div>
              <div><dt>Repeating sections</dt><dd>{inspection.compatibility.repeatedSections}</dd></div>
            </dl>
            <p>{inspection.compatibility.unsupportedFeatures.length
              ? `May not work: ${inspection.compatibility.unsupportedFeatures.join(', ')}`
              : inspection.warnings[0] || 'No known unsupported features detected.'} Native XFA is not supported by Chrome and many PDF viewers; use Adobe Acrobat when native behavior is required.</p>
            {embeddedScripts.length > 0 && (
              <details className="xfa-script-review">
                <summary>Review {embeddedScripts.length} embedded script{embeddedScripts.length === 1 ? '' : 's'}</summary>
                <pre>{embeddedScripts.join('\n\n— — —\n\n')}</pre>
              </details>
            )}
          </section>
        )}
        <div className="xfa-xml-workspace">
          <nav className="xfa-xml-packets" aria-label="XFA packets">
            <div className="xfa-xml-packet-heading">
              <strong>{imported ? 'Imported file' : 'Packets'}</strong>
              {imported && (
                <button
                  onClick={() => {
                    setPackets(nativePackets);
                    setSelectedName(
                      nativePackets.find((packet) => packet.name === 'template')?.name ||
                        nativePackets[0]?.name ||
                        '',
                    );
                    setImported(null);
                  }}
                >
                  Back
                </button>
              )}
            </div>
            {packets.map((packet, index) => (
              <button
                key={`${packet.name}-${index}`}
                className={packet === selected ? 'active' : ''}
                aria-current={packet === selected ? 'page' : undefined}
                onClick={() => {
                  setSelectedName(packet.name);
                  setQuery('');
                  setMatchIndex(0);
                  setCopied(false);
                }}
              >
                <span>{packet.name}</span>
                <small>{new Blob([packet.xml]).size.toLocaleString()} B</small>
              </button>
            ))}
          </nav>
          <section className="xfa-xml-code-pane" aria-label={`${selected?.name || 'XFA'} packet`}>
            <div className="xfa-xml-code-meta">
              <span>{selected?.name || 'XFA'} · {inspection?.encoding || 'UTF-8'}{changed ? ' · Modified' : ''}</span>
              <div className="xfa-code-actions">
                <button disabled={['preamble', 'postamble'].includes(selected?.name || '')} title={['preamble', 'postamble'].includes(selected?.name || '') ? 'XDP framing packets are protected.' : undefined} onClick={() => setEditable((value) => !value)}>{editable ? 'Read only' : 'Edit'}</button>
                <button disabled={!editable || !sourceHistory.length} onClick={() => restoreSource(sourceHistory.at(-1) || '', 'undo')}>Undo</button>
                <button disabled={!editable || !sourceFuture.length} onClick={() => restoreSource(sourceFuture[0], 'redo')}>Redo</button>
                <button disabled={!selected} onClick={() => selected && updateSource(formatXfaXml(selected.xml))}>Format</button>
                <button disabled={!selected} onClick={() => selected && updateSource(formatXfaXml(selected.xml, true))}>Minify</button>
                <button disabled={!changed} onClick={() => setShowDiff((value) => !value)}>{showDiff ? 'Close diff' : 'Diff'}</button>
                <button onClick={() => setWrapLines((value) => !value)}>{wrapLines ? 'No wrap' : 'Wrap'}</button>
                {selected?.name === 'datasets' && <button onClick={() => setDataTree((value) => !value)}>{dataTree ? 'XML' : 'Data tree'}</button>}
                <button onClick={() => { setOutline((value) => !value); setDataTree(false); }}>{outline ? 'Source' : 'Outline'}</button>
                {selected?.name === 'template' || selected?.name === 'xdp' ? <button onClick={jumpFromXml}>Show control</button> : null}
                <button onClick={() => setFullScreen((value) => !value)}>{fullScreen ? 'Exit full screen' : 'Full screen'}</button>
              </div>
            </div>
            {sourceError && <div className="xfa-source-error" role="alert">{sourceError}</div>}
            {changed && originalPacket && <div className="xfa-source-diff">Changed from original · {originalPacket.xml.length.toLocaleString()} → {selected?.xml.length.toLocaleString()} characters <button onClick={() => updateSource(originalPacket.xml)}>Restore original</button></div>}
            {showDiff && selected && originalPacket ? (
              <div className="xfa-xml-diff-view" aria-label="Original and edited XML comparison">
                <section><strong>Original</strong><pre>{formatXfaXml(originalPacket.xml)}</pre></section>
                <section><strong>Edited</strong><pre>{selected.xml}</pre></section>
              </div>
            ) : outline && selected ? (() => {
              const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
              return <div className="xfa-xml-outline" aria-label="Foldable XML outline"><XmlOutlineNode element={document.documentElement} depth={0} onJump={(name) => { onJumpToControl(name); dialogRef.current?.close(); }} /></div>;
            })() : dataTree && selected?.name === 'datasets' ? (
              <div className="xfa-data-tree" role="region" aria-label="XFA datasets values">
                <div className="xfa-data-tree-actions"><button onClick={() => changeDatasetRows('add')}>Add repeated row</button><button onClick={() => changeDatasetRows('remove')}>Remove last row</button></div>
                {datasetLeaves.length ? datasetLeaves.map((leaf) => (
                  <label key={`${leaf.path}-${leaf.index}`}><span title={leaf.path}>{leaf.path}</span>{templateFieldNames.length > 0 && <select aria-label={`Map ${leaf.name}`} value={templateFieldNames.includes(leaf.name) ? leaf.name : ''} onChange={(event) => event.target.value && renameDatasetField(leaf.name, event.target.value)}><option value="">Unmapped</option>{templateFieldNames.map((name) => <option key={name}>{name}</option>)}</select>}<input value={leaf.value} onChange={(event) => {
                    const document = new DOMParser().parseFromString(selected.xml, 'application/xml');
                    const element = document.getElementsByTagName('*')[leaf.index];
                    if (element) { element.textContent = event.target.value; updateSource(new XMLSerializer().serializeToString(document)); }
                  }} /></label>
                )) : <p>No editable dataset values were found.</p>}
              </div>
            ) : <div className="xfa-source-editor">
              <pre ref={lineNumbersRef} className="xfa-line-numbers" aria-hidden="true">{Array.from({ length: (selected?.xml.match(/\n/g)?.length || 0) + 1 }, (_, index) => index + 1).join('\n')}</pre>
              <div className={`xfa-code-stack ${editable && !['preamble', 'postamble'].includes(selected?.name || '') ? 'editing' : ''}`}>
              <pre ref={highlightRef} className={`xfa-xml-highlight ${wrapLines ? 'wrap' : ''}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: highlightedXml }} />
            <textarea
              ref={sourceRef}
              className="xfa-xml-source"
              aria-label={`${selected?.name || 'XFA'} XML source`}
              value={selected?.xml || ''}
              readOnly={!editable || ['preamble', 'postamble'].includes(selected?.name || '')}
              onChange={(event) => updateSource(event.target.value)}
              onScroll={(event) => {
                if (!highlightRef.current) return;
                highlightRef.current.scrollTop = event.currentTarget.scrollTop;
                highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
                if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
              }}
              spellCheck={false}
              wrap={wrapLines ? 'soft' : 'off'}
            />
              </div>
            </div>
            }
          </section>
        </div>
      </dialog>
    </>
  );
}
