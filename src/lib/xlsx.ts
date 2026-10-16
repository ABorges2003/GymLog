// A minimal Excel file (.xlsx) writer, so the app needs no extra library.
// An .xlsx is a ZIP of a few XML files; this writes one sheet of text and
// numbers, with bold rows and column widths, in a ZIP without compression
// (Excel, Google Sheets and Numbers all open it).

export type Cell = string | number | null;

type SheetOptions = {
  // Indexes of the rows to show in bold (e.g. the header).
  boldRows?: number[];
  // Width of each column, in characters.
  columnWidths?: number[];
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

// CRC-32 of the bytes, as ZIP files need.
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "A", "B", ... "Z", "AA"... for a 0-based column.
function columnName(index: number): string {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rest = (n - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function sheetXml(rows: Cell[][], options: SheetOptions): string {
  const bold = new Set(options.boldRows ?? []);
  const cols = options.columnWidths?.length
    ? `<cols>${options.columnWidths
        .map(
          (width, index) =>
            `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
        )
        .join("")}</cols>`
    : "";
  const body = rows
    .map((row, rowIndex) => {
      const style = bold.has(rowIndex) ? ' s="1"' : "";
      const cells = row
        .map((cell, colIndex) => {
          if (cell === null || cell === "") return "";
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          if (typeof cell === "number") {
            return Number.isFinite(cell)
              ? `<c r="${ref}"${style}><v>${cell}</v></c>`
              : "";
          }
          return `<c r="${ref}"${style} t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${cols}<sheetData>${body}</sheetData></worksheet>`;
}

function workbookFiles(
  sheetName: string,
  rows: Cell[][],
  options: SheetOptions,
): { name: string; content: string }[] {
  const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const rels = "http://schemas.openxmlformats.org/package/2006/relationships";
  const officeRels =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return [
    {
      name: "[Content_Types].xml",
      content: `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      content: `${head}<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${officeRels}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `${head}<workbook xmlns="${main}" xmlns:r="${officeRels}"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `${head}<Relationships xmlns="${rels}"><Relationship Id="rId1" Type="${officeRels}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${officeRels}/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: `${head}<styleSheet xmlns="${main}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    },
    { name: "xl/worksheets/sheet1.xml", content: sheetXml(rows, options) },
  ];
}

// A ZIP archive storing the files as they are (no compression).
export function zipStore(
  files: { name: string; content: Uint8Array }[],
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.content);
    const size = file.content.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // names are UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, 0, true); // time
    local.setUint16(12, 0x21, true); // date: 1980-01-01
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), name, file.content);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true); // central directory entry
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, 0, true);
    entry.setUint16(14, 0x21, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), name);

    offset += 30 + name.length + size;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);

  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let position = 0;
  for (const part of parts) {
    result.set(part, position);
    position += part.length;
  }
  return result;
}

// An .xlsx file with one sheet.
export function buildXlsx(
  sheetName: string,
  rows: Cell[][],
  options: SheetOptions = {},
): Uint8Array {
  const encoder = new TextEncoder();
  return zipStore(
    workbookFiles(sheetName, rows, options).map((file) => ({
      name: file.name,
      content: encoder.encode(file.content),
    })),
  );
}
