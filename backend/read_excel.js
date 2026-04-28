const xlsx = require('xlsx');
const workbook = xlsx.readFile('c:\\\\Marcos\\\\Proyectos\\\\juschiri\\\\juschiri\\\\DESCUENTOS JUSCHIRI (1).xlsx');
const sheet_name_list = workbook.SheetNames;
console.log(xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]).slice(0, 5));
