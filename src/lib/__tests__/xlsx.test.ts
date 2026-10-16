import { crc32 as nodeCrc32 } from "node:zlib";

import { buildXlsx, crc32, zipStore } from "@/lib/xlsx";

// Reads the files back from a stored (uncompressed) ZIP.
function unzip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = new Map<string, string>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    const crc = view.getUint32(offset + 14, true);
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const start = offset + 30 + nameLength;
    const content = bytes.slice(start, start + size);
    expect(crc32(content)).toBe(crc);
    files.set(name, decoder.decode(content));
    offset = start + size;
  }
  return files;
}

describe("crc32", () => {
  it("matches the standard CRC-32", () => {
    const bytes = new TextEncoder().encode("GymLog semana");
    expect(crc32(bytes)).toBe(nodeCrc32(bytes));
  });
});

describe("zipStore", () => {
  it("stores files that can be read back, with a closing directory", () => {
    const encoder = new TextEncoder();
    const zip = zipStore([
      { name: "a.txt", content: encoder.encode("olá") },
      { name: "pasta/b.txt", content: encoder.encode("adeus") },
    ]);
    const files = unzip(zip);
    expect(files.get("a.txt")).toBe("olá");
    expect(files.get("pasta/b.txt")).toBe("adeus");
    // End of central directory with the number of files.
    const view = new DataView(zip.buffer);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2);
  });
});

describe("buildXlsx", () => {
  it("writes a sheet with text, numbers, empty cells and bold rows", () => {
    const files = unzip(
      buildXlsx(
        "Semana",
        [
          ["Dia", "Peso (kg)"],
          ["Seg <6/10>", 72.4],
          ["Ter", null],
        ],
        { boldRows: [0], columnWidths: [12, 10] },
      ),
    );
    expect([...files.keys()].sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    const sheet = files.get("xl/worksheets/sheet1.xml") ?? "";
    expect(sheet).toContain(
      '<c r="A1" s="1" t="inlineStr"><is><t>Dia</t></is></c>',
    );
    expect(sheet).toContain("<t>Seg &lt;6/10&gt;</t>");
    expect(sheet).toContain('<c r="B2"><v>72.4</v></c>');
    expect(sheet).not.toContain('r="B3"');
    expect(sheet).toContain('<col min="1" max="1" width="12" customWidth="1"/>');
    expect(files.get("xl/workbook.xml")).toContain('name="Semana"');
  });
});
