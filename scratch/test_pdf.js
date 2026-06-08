import { PDFParse } from "pdf-parse";

async function run() {
  console.log("Testing PDFParse with a valid minimal PDF...");
  
  // Valid minimal PDF structure
  const pdfContent = 
    "%PDF-1.4\n" +
    "1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n" +
    "2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n" +
    "3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>\nendobj\n" +
    "4 0 obj\n<</Length 44>>\n" +
    "stream\nBT\n/F1 12 Tf\n72 712 Td\n(Hello World) Tj\nET\nendstream\n" +
    "endobj\n" +
    "xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n307\n%%EOF";

  const buffer = Buffer.from(pdfContent, "utf-8");
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    console.log("SUCCESS! Extracted Text:", JSON.stringify(result.text));
  } catch (err) {
    console.error("PARSER EXCEPTION CAUGHT:");
    console.error(err);
  }
}

run();
