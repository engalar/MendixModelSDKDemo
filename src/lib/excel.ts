import * as XLSX from "xlsx";

const sheetName: string = "sheet1"; // 指定要读取的sheet页名称
const filePath = "path/to/your/excel.xlsx";

export function readData(
    cb: (attributeName: string, attributeType: string) => void,
) {
    const workbook: XLSX.WorkBook = XLSX.readFile(filePath);
    const worksheet: XLSX.WorkSheet = workbook.Sheets[sheetName];
    const range: XLSX.Range = XLSX.utils.decode_range(worksheet["!ref"]);

    // 从第2行开始遍历，打印E列、F列和H列的值
    for (let row = 2; row <= range.e.r; row++) {
        const cellE: XLSX.CellObject | undefined =
            worksheet[XLSX.utils.encode_cell({ r: row, c: 4 })]; // E列
        const cellF: XLSX.CellObject | undefined =
            worksheet[XLSX.utils.encode_cell({ r: row, c: 5 })]; // F列
        const cellH: XLSX.CellObject | undefined =
            worksheet[XLSX.utils.encode_cell({ r: row, c: 7 })]; // H列
        if (cellE && cellF && !cellH) {
            cb(cellE.v as string, cellF.v as string);
        }
    }
}
