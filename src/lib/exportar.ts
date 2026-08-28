import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, dataBR } from "./format";

export function exportarExcel(
  linhas: Record<string, unknown>[],
  arquivo: string,
  aba = "Dados",
) {
  const ws = XLSX.utils.json_to_sheet(linhas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, aba.slice(0, 30));
  XLSX.writeFile(wb, `${arquivo}.xlsx`);
}

export function exportarPDF({
  titulo,
  subtitulo,
  colunas,
  linhas,
  arquivo,
  resumo,
}: {
  titulo: string;
  subtitulo?: string;
  colunas: string[];
  linhas: (string | number)[][];
  arquivo: string;
  resumo?: string[];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(15);
  doc.text(titulo, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(subtitulo ?? `Grupo Otávio Lage — emitido em ${dataBR(new Date())}`, 40, 56);
  let y = 74;
  if (resumo?.length) {
    resumo.forEach((linha) => {
      doc.text(`• ${linha}`, 40, y);
      y += 13;
    });
    y += 6;
  }
  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: y,
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [31, 45, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(`${arquivo}.pdf`);
}

export const moeda = brl;
