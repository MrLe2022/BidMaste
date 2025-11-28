import * as XLSX from 'xlsx';

// Helper to get the library object correctly whether it's a default export or named export
const getXLSX = () => {
  const lib = XLSX as any;
  // If 'read' exists on default, use default. Otherwise use lib directly.
  return (lib.default && lib.default.read) ? lib.default : lib;
};

export const readExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const X = getXLSX();

    if (!X.read || !X.utils) {
      reject(new Error("XLSX library not loaded correctly"));
      return;
    }
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = X.read(data, { type: 'array' });
        
        // Assume data is in the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = X.utils.sheet_to_json(sheet);
        resolve(jsonData);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (filename: string, data: any[]) => {
  const X = getXLSX();
  if (!X.utils || !X.writeFile) {
    console.error("XLSX library not loaded correctly");
    return;
  }

  const worksheet = X.utils.json_to_sheet(data);
  const workbook = X.utils.book_new();
  X.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  // Clean up filename
  if (!filename.endsWith('.xlsx')) {
    filename += '.xlsx';
  }
  
  X.writeFile(workbook, filename);
};