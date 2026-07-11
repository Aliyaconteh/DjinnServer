const fs = require("fs/promises");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractTextFromTxt(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw.toString();
}

async function extractTextFromPdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data?.text || "";
}

async function extractTextFromDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result?.value || "";
}

async function extractTextFromFile(filePath, originalName) {
  const extension = path.extname(originalName || filePath).toLowerCase();

  if (extension === ".pdf") {
    return await extractTextFromPdf(filePath);
  }

  if (extension === ".docx") {
    return await extractTextFromDocx(filePath);
  }

  if (extension === ".txt") {
    return await extractTextFromTxt(filePath);
  }

  throw new Error("Unsupported file type. Only PDF, DOCX, and TXT are allowed.");
}

module.exports = {
  extractTextFromFile
};
